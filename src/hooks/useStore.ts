import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AppState,
  Bonus,
  CraftLog,
  Employee,
  Material,
  MaterialPurchase,
  OrderStatus,
  PendingOrder,
  Product,
  Recipe,
  Sale,
  StashBuy,
} from '../types'
import { defaultState, recipeUnitCost } from '../data/seed'
import { fetchCloudState, saveCloudState, type SyncStatus } from '../lib/cloud'
import { mergeAppStates } from '../lib/mergeState'
import { loadState, saveState, uid } from '../lib/utils'

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('booting')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const readyToSave = useRef(false)
  const skipNextSave = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setSyncStatus('loading')
      const result = await fetchCloudState()
      if (cancelled) return

      if (!result.ok) {
        setSyncStatus('offline')
        setSyncError(result.error ?? 'Could not reach cloud DB')
        readyToSave.current = true
        return
      }

      if (result.state) {
        // Keep any local-only rows that haven't synced yet (e.g. typed offline)
        const merged = mergeAppStates(result.state, stateRef.current)
        skipNextSave.current = true
        setState(merged)
        saveState(merged)
        setLastSyncedAt(result.updatedAt)
        setSyncStatus('synced')
        setSyncError(null)
        readyToSave.current = true
        // Push union to cloud so the other browser can see our offline rows
        void saveCloudState(merged).then((save) => {
          if (cancelled || !save.ok || !save.state) return
          skipNextSave.current = true
          setState(save.state)
          saveState(save.state)
          setLastSyncedAt(save.updatedAt ?? null)
        })
      } else {
        const seed = loadState()
        const save = await saveCloudState(seed)
        if (cancelled) return
        if (save.ok) {
          if (save.state) {
            skipNextSave.current = true
            setState(save.state)
            saveState(save.state)
          }
          setLastSyncedAt(save.updatedAt ?? null)
          setSyncStatus('synced')
          setSyncError(null)
        } else {
          setSyncStatus('error')
          setSyncError(save.error ?? 'Failed to seed cloud DB')
        }
      }
      readyToSave.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    saveState(state)
    if (!readyToSave.current) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    setSyncStatus('saving')
    const timer = window.setTimeout(() => {
      void (async () => {
        const snapshot = stateRef.current
        const result = await saveCloudState(snapshot)
        if (result.ok) {
          setLastSyncedAt(result.updatedAt ?? new Date().toISOString())
          setSyncStatus('synced')
          setSyncError(null)
          if (result.state) {
            // Apply merged cloud result (includes other people's sales)
            skipNextSave.current = true
            setState(result.state)
            saveState(result.state)
          }
        } else {
          setSyncStatus('error')
          setSyncError(result.error ?? 'Save failed')
        }
      })()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [state])

  // Pull teammates' changes every few seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!readyToSave.current) return
      if (syncStatus === 'saving' || syncStatus === 'loading') return
      void (async () => {
        const result = await fetchCloudState()
        if (!result.ok || !result.state) return
        const merged = mergeAppStates(result.state, stateRef.current)
        const sameSales =
          merged.sales.length === stateRef.current.sales.length &&
          merged.sales.every((s) =>
            stateRef.current.sales.some((x) => x.id === s.id),
          )
        const sameCrafts =
          merged.craftLogs.length === stateRef.current.craftLogs.length &&
          merged.craftLogs.every((c) =>
            stateRef.current.craftLogs.some((x) => x.id === c.id),
          )
        const sameStock =
          merged.materials.every(
            (m) =>
              stateRef.current.materials.find((x) => x.id === m.id)?.stock ===
              m.stock,
          ) &&
          merged.products.every(
            (p) =>
              stateRef.current.products.find((x) => x.id === p.id)?.stock ===
              p.stock,
          )
        if (sameSales && sameCrafts && sameStock) {
          setLastSyncedAt(result.updatedAt)
          return
        }
        skipNextSave.current = true
        setState(merged)
        saveState(merged)
        setLastSyncedAt(result.updatedAt)
        setSyncStatus('synced')
        setSyncError(null)
      })()
    }, 4000)
    return () => window.clearInterval(id)
  }, [syncStatus])

  const refreshFromCloud = useCallback(async () => {
    setSyncStatus('loading')
    const result = await fetchCloudState()
    if (!result.ok) {
      setSyncStatus('offline')
      setSyncError(result.error ?? 'Could not reach cloud DB')
      return
    }
    if (result.state) {
      const merged = mergeAppStates(result.state, stateRef.current)
      skipNextSave.current = true
      setState(merged)
      saveState(merged)
      setLastSyncedAt(result.updatedAt)
      // Persist union so both sides stay
      void saveCloudState(merged).then((save) => {
        if (save.ok && save.state) {
          skipNextSave.current = true
          setState(save.state)
          saveState(save.state)
          setLastSyncedAt(save.updatedAt ?? null)
        }
      })
    }
    setSyncStatus('synced')
    setSyncError(null)
  }, [])

  const hardReset = useCallback(() => {
    const fresh = defaultState()
    setState(fresh)
    void saveCloudState(fresh).then((r) => {
      if (r.ok) {
        setLastSyncedAt(r.updatedAt ?? null)
        setSyncStatus('synced')
      }
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppState['settings']>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const addEmployee = useCallback(
    (name: string, password: string, grade = 'Junior Seller') => {
      const emp: Employee = {
        id: uid('emp'),
        name: name.trim(),
        password: password.trim() || '1234',
        grade,
        active: true,
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({ ...s, employees: [...s.employees, emp] }))
    },
    [],
  )

  const setEmployeePassword = useCallback((id: string, password: string) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === id ? { ...e, password: password.trim() || e.password } : e,
      ),
    }))
  }, [])

  const setEmployeeGrade = useCallback((id: string, grade: string) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === id ? { ...e, grade } : e,
      ),
    }))
  }, [])

  const seedCrewRoster = useCallback(() => {
    const seed = defaultState()
    setState((s) => ({
      ...s,
      employees: seed.employees,
      settings: {
        ...s.settings,
        ownerName: seed.settings.ownerName,
        ownerPassword: seed.settings.ownerPassword,
      },
    }))
  }, [])

  const toggleEmployee = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === id ? { ...e, active: !e.active } : e,
      ),
    }))
  }, [])

  const removeEmployee = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      employees: s.employees.filter((e) => e.id !== id),
    }))
  }, [])

  const addBonus = useCallback(
    (employeeId: string, amount: number, reason: string) => {
      const bonus: Bonus = {
        id: uid('bon'),
        employeeId,
        amount,
        reason: reason.trim() || 'Bonus',
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({ ...s, bonuses: [bonus, ...s.bonuses] }))
    },
    [],
  )

  const removeBonus = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bonuses: s.bonuses.filter((b) => b.id !== id),
    }))
  }, [])

  const addSale = useCallback(
    (input: {
      employeeId: string
      productId: string
      qty: number
      unitPrice: number
      note?: string
    }) => {
      setState((s) => {
        const product = s.products.find((p) => p.id === input.productId)
        if (!product) return s

        let unitCost = product.cost
        if (product.recipeId) {
          unitCost = recipeUnitCost(product.recipeId, s.materials, s.recipes)
        }

        const sale: Sale = {
          id: uid('sale'),
          employeeId: input.employeeId,
          productId: input.productId,
          productName: product.name,
          qty: input.qty,
          unitPrice: input.unitPrice,
          unitCost,
          createdAt: new Date().toISOString(),
          note: input.note,
        }

        return {
          ...s,
          sales: [sale, ...s.sales],
          products: s.products.map((p) =>
            p.id === input.productId
              ? { ...p, stock: Math.max(0, p.stock - input.qty) }
              : p,
          ),
        }
      })
    },
    [],
  )

  const removeSale = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      sales: s.sales.filter((x) => x.id !== id),
    }))
  }, [])

  const addStashBuy = useCallback(
    (input: {
      /** Seller — commission on clear */
      employeeId: string
      /** Crafter — may differ from seller */
      crafterId?: string
      buyerName: string
      productId: string
      qty: number
      amount: number
      note?: string
      orderId?: string
      /** Log a craft for the crafter + pending stash sale */
      craftedThenSold?: boolean
      deductMaterials?: boolean
    }) => {
      setState((s) => {
        const product = s.products.find((p) => p.id === input.productId)
        if (!product) return s

        const sellerId = input.employeeId
        const crafterId = input.crafterId || sellerId
        const craftedThenSold = Boolean(
          input.craftedThenSold && product.recipeId,
        )
        let materials = s.materials
        let products = s.products
        let craftLogs = s.craftLogs
        let craftLogId: string | undefined
        let unitCost = product.cost

        if (product.recipeId) {
          unitCost = recipeUnitCost(product.recipeId, s.materials, s.recipes)
        }

        if (craftedThenSold && product.recipeId) {
          const recipe = s.recipes.find((r) => r.id === product.recipeId)
          if (recipe) {
            const deductMaterials = input.deductMaterials !== false
            if (deductMaterials) {
              materials = s.materials.map((m) => {
                const need = recipe.ingredients.find(
                  (i) => i.materialId === m.id,
                )
                if (!need) return m
                return {
                  ...m,
                  stock: Math.max(0, m.stock - need.qty * input.qty),
                }
              })
            }

            craftLogId = uid('craft')
            const seller = s.employees.find((e) => e.id === sellerId)
            const log: CraftLog = {
              id: craftLogId,
              employeeId: crafterId,
              recipeId: recipe.id,
              recipeName: recipe.name,
              qty: input.qty,
              unitCost,
              totalCost: unitCost * input.qty,
              deductedStock: deductMaterials,
              purpose: 'business',
              createdAt: new Date().toISOString(),
              note: `Stash · sold by ${seller?.name ?? 'seller'} → ${input.buyerName.trim() || 'Customer'}`,
            }
            craftLogs = [log, ...s.craftLogs]
            // Crafted and sold in one step — finished stock unchanged
          }
        } else {
          // Sold from existing finished stock
          products = s.products.map((p) =>
            p.id === input.productId
              ? { ...p, stock: Math.max(0, p.stock - input.qty) }
              : p,
          )
        }

        const buy: StashBuy = {
          id: uid('stash'),
          employeeId: sellerId,
          crafterId: craftedThenSold || input.crafterId ? crafterId : input.crafterId,
          buyerName: input.buyerName.trim() || 'Customer',
          productId: input.productId,
          productName: product.name,
          qty: input.qty,
          amount: input.amount,
          unitCost,
          source: craftedThenSold ? 'crafted_then_sold' : 'from_stock',
          craftLogId,
          orderId: input.orderId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          note: input.note,
        }

        let pendingOrders = s.pendingOrders
        if (input.orderId) {
          const now = new Date().toISOString()
          pendingOrders = s.pendingOrders.map((o) =>
            o.id === input.orderId
              ? {
                  ...o,
                  status: 'fulfilled' as const,
                  fulfilledAt: now,
                  updatedAt: now,
                  stashBuyId: buy.id,
                }
              : o,
          )
        }

        return {
          ...s,
          materials,
          products,
          craftLogs,
          stashBuys: [buy, ...s.stashBuys],
          pendingOrders,
        }
      })
    },
    [],
  )

  const clearStashBuy = useCallback((id: string) => {
    setState((s) => {
      const buy = s.stashBuys.find((b) => b.id === id)
      if (!buy || buy.status !== 'pending') return s

      const unitPrice = buy.qty > 0 ? buy.amount / buy.qty : buy.amount
      const saleId = uid('sale')
      const crafter = buy.crafterId
        ? s.employees.find((e) => e.id === buy.crafterId)
        : undefined
      const craftNote =
        crafter && buy.crafterId !== buy.employeeId
          ? ` · crafted by ${crafter.name}`
          : ''
      const sale: Sale = {
        id: saleId,
        employeeId: buy.employeeId,
        productId: buy.productId,
        productName: buy.productName,
        qty: buy.qty,
        unitPrice,
        unitCost: buy.unitCost ?? 0,
        createdAt: new Date().toISOString(),
        note: `Stash cleared · ${buy.buyerName}${craftNote}${buy.note ? ` · ${buy.note}` : ''}`,
      }

      return {
        ...s,
        sales: [sale, ...s.sales],
        stashBuys: s.stashBuys.map((b) =>
          b.id === id
            ? {
                ...b,
                status: 'cleared',
                clearedAt: new Date().toISOString(),
                saleId,
              }
            : b,
        ),
      }
    })
  }, [])

  const clearAllPendingStash = useCallback(() => {
    setState((s) => {
      const now = new Date().toISOString()
      const newSales: Sale[] = []
      const stashBuys = s.stashBuys.map((buy) => {
        if (buy.status !== 'pending') return buy
        const saleId = uid('sale')
        const unitPrice = buy.qty > 0 ? buy.amount / buy.qty : buy.amount
        newSales.push({
          id: saleId,
          employeeId: buy.employeeId,
          productId: buy.productId,
          productName: buy.productName,
          qty: buy.qty,
          unitPrice,
          unitCost: buy.unitCost ?? 0,
          createdAt: now,
          note: `Stash cleared · ${buy.buyerName}${buy.note ? ` · ${buy.note}` : ''}`,
        })
        return {
          ...buy,
          status: 'cleared' as const,
          clearedAt: now,
          saleId,
        }
      })

      return {
        ...s,
        sales: [...newSales, ...s.sales],
        stashBuys,
      }
    })
  }, [])

  const removeStashBuy = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      stashBuys: s.stashBuys.filter((b) => b.id !== id),
    }))
  }, [])

  const addPendingOrder = useCallback(
    (input: {
      customerName: string
      productId: string
      qty: number
      amount?: number
      createdById: string
      crafterId?: string
      sellerId?: string
      note?: string
    }) => {
      setState((s) => {
        const product = s.products.find((p) => p.id === input.productId)
        if (!product || !input.createdById || input.qty < 1) return s
        const now = new Date().toISOString()
        const order: PendingOrder = {
          id: uid('ord'),
          customerName: input.customerName.trim() || 'Customer',
          productId: product.id,
          productName: product.name,
          qty: input.qty,
          amount:
            input.amount ??
            (product.salePrice || product.cost || 0) * input.qty,
          createdById: input.createdById,
          crafterId: input.crafterId || undefined,
          sellerId: input.sellerId || undefined,
          status: 'open',
          note: input.note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        }
        return { ...s, pendingOrders: [order, ...s.pendingOrders] }
      })
    },
    [],
  )

  const updatePendingOrder = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          PendingOrder,
          'status' | 'crafterId' | 'sellerId' | 'note' | 'amount' | 'qty'
        >
      >,
    ) => {
      setState((s) => ({
        ...s,
        pendingOrders: s.pendingOrders.map((o) => {
          if (o.id !== id) return o
          const nextStatus = (patch.status ?? o.status) as OrderStatus
          return {
            ...o,
            ...patch,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
            fulfilledAt:
              nextStatus === 'fulfilled'
                ? o.fulfilledAt || new Date().toISOString()
                : o.fulfilledAt,
          }
        }),
      }))
    },
    [],
  )

  const removePendingOrder = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      pendingOrders: s.pendingOrders.filter((o) => o.id !== id),
    }))
  }, [])

  const craft = useCallback(
    (
      recipeId: string,
      qty: number,
      employeeId: string,
      opts?: {
        note?: string
        deductStock?: boolean
        purpose?: 'business' | 'personal'
      },
    ) => {
      setState((s) => {
        const recipe = s.recipes.find((r) => r.id === recipeId)
        if (!recipe || !employeeId) return s

        const purpose = opts?.purpose ?? 'business'
        const deductStock = opts?.deductStock !== false
        const materials = deductStock
          ? s.materials.map((m) => {
              const need = recipe.ingredients.find((i) => i.materialId === m.id)
              if (!need) return m
              return { ...m, stock: Math.max(0, m.stock - need.qty * qty) }
            })
          : s.materials

        const unitCost = recipeUnitCost(recipeId, s.materials, s.recipes)
        let products = s.products
        // Business crafts always bump finished stock for the matching product
        if (purpose === 'business') {
          const existing = products.find((p) => p.recipeId === recipeId)
          if (existing) {
            products = products.map((p) =>
              p.recipeId === recipeId
                ? { ...p, stock: p.stock + qty, cost: unitCost }
                : p,
            )
          } else {
            // Recipe has no linked product yet — create one so stock is visible
            products = [
              ...products,
              {
                id: uid('prod'),
                name: recipe.name,
                category: recipe.category,
                cost: unitCost,
                salePrice: recipe.salePrice,
                stock: qty,
                recipeId: recipe.id,
              },
            ]
          }
        }

        const log: CraftLog = {
          id: uid('craft'),
          employeeId,
          recipeId,
          recipeName: recipe.name,
          qty,
          unitCost,
          totalCost: unitCost * qty,
          deductedStock: deductStock,
          purpose,
          createdAt: new Date().toISOString(),
          note: opts?.note,
        }

        return {
          ...s,
          materials,
          products,
          craftLogs: [log, ...s.craftLogs],
        }
      })
    },
    [],
  )

  const removeCraftLog = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      craftLogs: s.craftLogs.filter((c) => c.id !== id),
    }))
  }, [])

  const addMaterialPurchase = useCallback(
    (input: {
      employeeId: string
      materialId: string
      qty: number
      totalPaid: number
      note?: string
    }) => {
      setState((s) => {
        const mat = s.materials.find((m) => m.id === input.materialId)
        if (!mat || input.qty < 1) return s

        const purchase: MaterialPurchase = {
          id: uid('mp'),
          employeeId: input.employeeId,
          materialId: mat.id,
          materialName: mat.name,
          qty: input.qty,
          unitCost: mat.cost,
          totalPaid: input.totalPaid,
          createdAt: new Date().toISOString(),
          note: input.note,
        }

        return {
          ...s,
          materialPurchases: [purchase, ...s.materialPurchases],
          materials: s.materials.map((m) =>
            m.id === mat.id ? { ...m, stock: m.stock + input.qty } : m,
          ),
        }
      })
    },
    [],
  )

  const removeMaterialPurchase = useCallback((id: string) => {
    setState((s) => {
      const purchase = s.materialPurchases.find((p) => p.id === id)
      if (!purchase) {
        return {
          ...s,
          materialPurchases: s.materialPurchases.filter((p) => p.id !== id),
        }
      }
      return {
        ...s,
        materialPurchases: s.materialPurchases.filter((p) => p.id !== id),
        materials: s.materials.map((m) =>
          m.id === purchase.materialId
            ? { ...m, stock: Math.max(0, m.stock - purchase.qty) }
            : m,
        ),
      }
    })
  }, [])

  const setMaterialStock = useCallback((id: string, stock: number) => {
    setState((s) => ({
      ...s,
      materials: s.materials.map((m) =>
        m.id === id ? { ...m, stock: Math.max(0, stock) } : m,
      ),
    }))
  }, [])

  const setMaterialCost = useCallback((id: string, cost: number) => {
    setState((s) => {
      const materials = s.materials.map((m) =>
        m.id === id ? { ...m, cost: Math.max(0, cost) } : m,
      )
      const products = s.products.map((p) => {
        if (!p.recipeId) {
          const mat = materials.find(
            (m) => m.name.toLowerCase() === p.name.toLowerCase(),
          )
          if (mat) return { ...p, cost: mat.cost, salePrice: mat.cost }
          return p
        }
        return {
          ...p,
          cost: recipeUnitCost(p.recipeId, materials, s.recipes),
        }
      })
      return { ...s, materials, products }
    })
  }, [])

  const setProductSalePrice = useCallback((id: string, salePrice: number) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === id ? { ...p, salePrice: Math.max(0, salePrice) } : p,
      ),
      recipes: s.recipes.map((r) => {
        const prod = s.products.find((p) => p.id === id)
        if (prod?.recipeId === r.id) {
          return { ...r, salePrice: Math.max(0, salePrice) }
        }
        return r
      }),
    }))
  }, [])

  const setProductStock = useCallback((id: string, stock: number) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, stock) } : p,
      ),
    }))
  }, [])

  const addMaterial = useCallback((name: string, cost: number) => {
    const mat: Material = {
      id: uid('mat'),
      name: name.trim(),
      cost,
      category: 'other',
      stock: 0,
    }
    setState((s) => ({ ...s, materials: [...s.materials, mat] }))
  }, [])

  const addRecipe = useCallback(
    (
      name: string,
      ingredients: Recipe['ingredients'],
      salePrice: number,
    ) => {
      setState((s) => {
        const recipe: Recipe = {
          id: uid('rec'),
          name: name.trim(),
          category: 'other',
          ingredients,
          salePrice,
        }
        const cost = recipeUnitCost(recipe.id, s.materials, [
          ...s.recipes,
          recipe,
        ])
        const product: Product = {
          id: uid('prod'),
          name: recipe.name,
          category: 'other',
          cost,
          salePrice,
          stock: 0,
          recipeId: recipe.id,
        }
        return {
          ...s,
          recipes: [...s.recipes, recipe],
          products: [...s.products, product],
        }
      })
    },
    [],
  )

  return {
    state,
    syncStatus,
    syncError,
    lastSyncedAt,
    refreshFromCloud,
    updateSettings,
    addEmployee,
    setEmployeePassword,
    setEmployeeGrade,
    seedCrewRoster,
    toggleEmployee,
    removeEmployee,
    addBonus,
    removeBonus,
    addSale,
    removeSale,
    addStashBuy,
    clearStashBuy,
    clearAllPendingStash,
    removeStashBuy,
    addPendingOrder,
    updatePendingOrder,
    removePendingOrder,
    craft,
    removeCraftLog,
    addMaterialPurchase,
    removeMaterialPurchase,
    setMaterialStock,
    setMaterialCost,
    setProductSalePrice,
    setProductStock,
    addMaterial,
    addRecipe,
    hardReset,
  }
}

export type StoreApi = ReturnType<typeof useStore>
