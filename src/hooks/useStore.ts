import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AppState,
  AuditEntry,
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
import { markDeleted, mergeAppStates } from '../lib/mergeState'
import {
  canDeleteRecord,
  type ActorCtx,
} from '../lib/permissions'
import { rebuildInventoryFromLedger } from '../lib/inventory'
import { buildFreshStartState } from '../lib/freshStart'
import { loadState, saveState, uid } from '../lib/utils'

const AUDIT_CAP = 400

function touchStock<T extends { stock: number; stockUpdatedAt?: string }>(
  row: T,
  stock: number,
): T {
  return {
    ...row,
    stock: Math.max(0, stock),
    stockUpdatedAt: new Date().toISOString(),
  }
}

function pushAudit(
  logs: AuditEntry[] | undefined,
  entry: Omit<AuditEntry, 'id' | 'at'>,
): AuditEntry[] {
  const row: AuditEntry = {
    id: uid('aud'),
    at: new Date().toISOString(),
    ...entry,
  }
  return [row, ...(logs ?? [])].slice(0, AUDIT_CAP)
}

function nameOf(state: AppState, employeeId: string): string {
  if (!employeeId) return state.settings.ownerName || 'Owner'
  return state.employees.find((e) => e.id === employeeId)?.name ?? 'Unknown'
}

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

  const hardReset = useCallback((actor?: ActorCtx) => {
    const fresh = defaultState()
    if (actor) {
      fresh.auditLogs = pushAudit([], {
        actorId: '',
        actorName: actor.displayName,
        action: 'reset',
        entity: 'system',
        entityId: 'hard-reset',
        summary: 'Reset all business data to defaults',
      })
    }
    setState(fresh)
    void saveCloudState(fresh, { replace: true }).then((r) => {
      if (r.ok) {
        if (r.state) {
          skipNextSave.current = true
          setState(r.state)
          saveState(r.state)
        }
        setLastSyncedAt(r.updatedAt ?? null)
        setSyncStatus('synced')
      }
    })
  }, [])

  /** Clear sales/crafts/stock/etc. Keep employees (same ids) + settings + catalog. */
  const freshStartKeepEmployees = useCallback((actor?: ActorCtx) => {
    setSyncStatus('saving')
    void (async () => {
      const latest = await fetchCloudState()
      const base =
        latest.ok && latest.state
          ? mergeAppStates(latest.state, stateRef.current)
          : stateRef.current
      const next = buildFreshStartState(
        base,
        actor?.displayName || base.settings.ownerName || 'Owner',
      )
      skipNextSave.current = true
      setState(next)
      saveState(next)
      const r = await saveCloudState(next, { replace: true })
      if (r.ok) {
        if (r.state) {
          skipNextSave.current = true
          setState(r.state)
          saveState(r.state)
        }
        setLastSyncedAt(r.updatedAt ?? null)
        setSyncStatus('synced')
        setSyncError(null)
      } else {
        setSyncStatus('error')
        setSyncError(r.error ?? 'Fresh start save failed')
      }
    })()
  }, [])

  const clearAuditLogs = useCallback((actor: ActorCtx) => {
    if (!actor.isOwner) return
    setState((s) => ({
      ...s,
      auditLogs: pushAudit([], {
        actorId: '',
        actorName: actor.displayName,
        action: 'reset',
        entity: 'system',
        entityId: 'audit-clear',
        summary: 'Cleared audit log history',
      }),
    }))
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

  const removeEmployee = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      if (!actor.isOwner) return s
      const emp = s.employees.find((e) => e.id === id)
      if (!emp) return s
      return {
        ...s,
        employees: s.employees.filter((e) => e.id !== id),
        deletedIds: markDeleted(s, 'employees', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'employee',
          entityId: id,
          summary: `Removed crew member ${emp.name}`,
        }),
      }
    })
  }, [])

  const addBonus = useCallback(
    (employeeId: string, amount: number, reason: string, actor?: ActorCtx) => {
      const bonus: Bonus = {
        id: uid('bon'),
        employeeId,
        amount,
        reason: reason.trim() || 'Bonus',
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({
        ...s,
        bonuses: [bonus, ...s.bonuses],
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor?.isOwner ? '' : actor?.employeeId || '',
          actorName: actor?.displayName || s.settings.ownerName || 'Owner',
          action: 'create',
          entity: 'bonus',
          entityId: bonus.id,
          summary: `Bonus $${Math.round(amount)} → ${nameOf(s, employeeId)} (${bonus.reason})`,
        }),
      }))
    },
    [],
  )

  const removeBonus = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      if (!actor.isOwner) return s
      const bonus = s.bonuses.find((b) => b.id === id)
      if (!bonus) return s
      return {
        ...s,
        bonuses: s.bonuses.filter((b) => b.id !== id),
        deletedIds: markDeleted(s, 'bonuses', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'bonus',
          entityId: id,
          summary: `Deleted bonus $${Math.round(bonus.amount)} for ${nameOf(s, bonus.employeeId)}`,
        }),
      }
    })
  }, [])

  const addSale = useCallback(
    (input: {
      employeeId: string
      productId: string
      qty: number
      unitPrice: number
      note?: string
      dealType?: 'normal' | 'family' | 'gang'
    }) => {
      setState((s) => {
        const product = s.products.find((p) => p.id === input.productId)
        if (!product) return s

        const kind = product.kind ?? 'inventory'
        const pricingMode = product.pricingMode ?? 'unit'
        let unitCost = product.cost
        if (product.recipeId && pricingMode === 'unit') {
          unitCost = recipeUnitCost(product.recipeId, s.materials, s.recipes)
        }

        const dealType = input.dealType ?? 'normal'
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
          kind,
          pricingMode,
          dealType,
        }

        const products =
          kind === 'external'
            ? s.products
            : s.products.map((p) =>
                p.id === input.productId
                  ? touchStock(p, p.stock - input.qty)
                  : p,
              )

        const priceLabel =
          pricingMode === 'percent'
            ? `${sale.unitPrice}% of ${sale.qty}`
            : `$${sale.unitPrice}`
        const dealLabel =
          dealType === 'family'
            ? ' · family'
            : dealType === 'gang'
              ? ' · gang'
              : ''

        return {
          ...s,
          sales: [sale, ...s.sales],
          products,
          auditLogs: pushAudit(s.auditLogs, {
            actorId: input.employeeId,
            actorName: nameOf(s, input.employeeId),
            action: 'create',
            entity: 'sale',
            entityId: sale.id,
            summary: `Sale ${sale.productName} · ${priceLabel}${dealLabel}${kind === 'external' ? ' (external)' : ''}`,
          }),
        }
      })
    },
    [],
  )

  const removeSale = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      const sale = s.sales.find((x) => x.id === id)
      if (!sale) return s
      if (!canDeleteRecord(actor, sale.employeeId)) return s
      return {
        ...s,
        sales: s.sales.filter((x) => x.id !== id),
        deletedIds: markDeleted(s, 'sales', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor.isOwner ? '' : actor.employeeId || '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'sale',
          entityId: id,
          summary: `Deleted sale ${sale.qty}× ${sale.productName} (${nameOf(s, sale.employeeId)})`,
        }),
      }
    })
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
                return touchStock(m, m.stock - need.qty * input.qty)
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
              ? touchStock(p, p.stock - input.qty)
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
        auditLogs: pushAudit(s.auditLogs, {
          actorId: '',
          actorName: s.settings.ownerName || 'Owner',
          action: 'clear',
          entity: 'stash',
          entityId: id,
          summary: `Cleared stash ${buy.qty}× ${buy.productName} → ${buy.buyerName}`,
        }),
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
        auditLogs: pushAudit(s.auditLogs, {
          actorId: '',
          actorName: s.settings.ownerName || 'Owner',
          action: 'clear',
          entity: 'stash',
          entityId: 'all-pending',
          summary: `Cleared ${newSales.length} pending stash sale(s)`,
        }),
      }
    })
  }, [])

  const removeStashBuy = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      const buy = s.stashBuys.find((b) => b.id === id)
      if (!buy) return s
      if (!canDeleteRecord(actor, buy.employeeId)) return s
      return {
        ...s,
        stashBuys: s.stashBuys.filter((b) => b.id !== id),
        deletedIds: markDeleted(s, 'stashBuys', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor.isOwner ? '' : actor.employeeId || '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'stash',
          entityId: id,
          summary: `Deleted stash ${buy.qty}× ${buy.productName} (${buy.buyerName})`,
        }),
      }
    })
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

  const removePendingOrder = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      const order = s.pendingOrders.find((o) => o.id === id)
      if (!order) return s
      if (!canDeleteRecord(actor, order.createdById)) return s
      return {
        ...s,
        pendingOrders: s.pendingOrders.filter((o) => o.id !== id),
        deletedIds: markDeleted(s, 'pendingOrders', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor.isOwner ? '' : actor.employeeId || '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'order',
          entityId: id,
          summary: `Deleted order ${order.qty}× ${order.productName} for ${order.customerName}`,
        }),
      }
    })
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
    ): boolean => {
      let applied = false
      setState((s) => {
        const recipe = s.recipes.find((r) => r.id === recipeId)
        if (!recipe || !employeeId) return s

        const purpose = opts?.purpose ?? 'business'
        const isPersonal = purpose === 'personal'
        // Business crafts always deduct shared mats; personal is optional
        const deductStock = isPersonal ? opts?.deductStock !== false : true

        if (deductStock) {
          const short = recipe.ingredients.some((ing) => {
            const mat = s.materials.find((m) => m.id === ing.materialId)
            return (mat?.stock ?? 0) < ing.qty * qty
          })
          if (short) return s
        }

        const materials = deductStock
          ? s.materials.map((m) => {
              const need = recipe.ingredients.find((i) => i.materialId === m.id)
              if (!need) return m
              return touchStock(m, m.stock - need.qty * qty)
            })
          : s.materials

        const unitCost = recipeUnitCost(recipeId, s.materials, s.recipes)
        let products = s.products
        if (!isPersonal) {
          const existing = products.find((p) => p.recipeId === recipeId)
          if (existing) {
            products = products.map((p) =>
              p.recipeId === recipeId
                ? { ...touchStock(p, p.stock + qty), cost: unitCost }
                : p,
            )
          } else {
            products = [
              ...products,
              {
                id: uid('prod'),
                name: recipe.name,
                category: recipe.category,
                cost: unitCost,
                salePrice: recipe.salePrice,
                stock: qty,
                stockUpdatedAt: new Date().toISOString(),
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
          purpose: isPersonal ? 'personal' : 'business',
          isPersonal,
          createdAt: new Date().toISOString(),
          note: opts?.note,
        }

        applied = true
        return {
          ...s,
          materials,
          products,
          craftLogs: [log, ...s.craftLogs],
          auditLogs: pushAudit(s.auditLogs, {
            actorId: employeeId,
            actorName: nameOf(s, employeeId),
            action: 'create',
            entity: 'craft',
            entityId: log.id,
            summary: `${isPersonal ? 'Personal' : 'Business'} craft ${qty}× ${recipe.name}${deductStock ? ' · mats deducted' : ''}`,
          }),
        }
      })
      return applied
    },
    [],
  )

  const rebuildStockFromLogs = useCallback((actor?: ActorCtx) => {
    setState((s) => {
      const next = rebuildInventoryFromLedger(s)
      return {
        ...next,
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor?.isOwner ? '' : actor?.employeeId || '',
          actorName: actor?.displayName || s.settings.ownerName || 'Owner',
          action: 'update',
          entity: 'stock',
          entityId: 'ledger-rebuild',
          summary:
            'Rebuilt material + crafted stock from purchases, crafts, and sales',
        }),
      }
    })
  }, [])

  const removeCraftLog = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      const craft = s.craftLogs.find((c) => c.id === id)
      if (!craft) return s
      if (!canDeleteRecord(actor, craft.employeeId)) return s
      return {
        ...s,
        craftLogs: s.craftLogs.filter((c) => c.id !== id),
        deletedIds: markDeleted(s, 'craftLogs', id),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor.isOwner ? '' : actor.employeeId || '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'craft',
          entityId: id,
          summary: `Deleted craft ${craft.qty}× ${craft.recipeName} (${nameOf(s, craft.employeeId)})`,
        }),
      }
    })
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
            m.id === mat.id ? touchStock(m, m.stock + input.qty) : m,
          ),
          auditLogs: pushAudit(s.auditLogs, {
            actorId: input.employeeId,
            actorName: nameOf(s, input.employeeId),
            action: 'create',
            entity: 'material_purchase',
            entityId: purchase.id,
            summary: `Bought ${purchase.qty}× ${purchase.materialName} for $${Math.round(purchase.totalPaid)}`,
          }),
        }
      })
    },
    [],
  )

  const removeMaterialPurchase = useCallback((id: string, actor: ActorCtx) => {
    setState((s) => {
      const purchase = s.materialPurchases.find((p) => p.id === id)
      if (!purchase) return s
      if (!canDeleteRecord(actor, purchase.employeeId || null)) return s
      const deletedIds = markDeleted(s, 'materialPurchases', id)
      return {
        ...s,
        materialPurchases: s.materialPurchases.filter((p) => p.id !== id),
        deletedIds,
        materials: s.materials.map((m) =>
          m.id === purchase.materialId
            ? touchStock(m, m.stock - purchase.qty)
            : m,
        ),
        auditLogs: pushAudit(s.auditLogs, {
          actorId: actor.isOwner ? '' : actor.employeeId || '',
          actorName: actor.displayName,
          action: 'delete',
          entity: 'material_purchase',
          entityId: id,
          summary: `Deleted mat buy ${purchase.qty}× ${purchase.materialName}`,
        }),
      }
    })
  }, [])

  const setMaterialStock = useCallback(
    (id: string, stock: number, actor?: ActorCtx) => {
      setState((s) => {
        const mat = s.materials.find((m) => m.id === id)
        if (!mat) return s
        const next = touchStock(mat, stock)
        return {
          ...s,
          materials: s.materials.map((m) => (m.id === id ? next : m)),
          auditLogs: actor
            ? pushAudit(s.auditLogs, {
                actorId: actor.isOwner ? '' : actor.employeeId || '',
                actorName: actor.displayName,
                action: 'update',
                entity: 'stock',
                entityId: id,
                summary: `Set ${mat.name} stock ${mat.stock} → ${next.stock}`,
              })
            : s.auditLogs,
        }
      })
    },
    [],
  )

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

  const setProductStock = useCallback(
    (id: string, stock: number, actor?: ActorCtx) => {
      setState((s) => {
        const product = s.products.find((p) => p.id === id)
        if (!product) return s
        const next = touchStock(product, stock)
        return {
          ...s,
          products: s.products.map((p) => (p.id === id ? next : p)),
          auditLogs: actor
            ? pushAudit(s.auditLogs, {
                actorId: actor.isOwner ? '' : actor.employeeId || '',
                actorName: actor.displayName,
                action: 'update',
                entity: 'stock',
                entityId: id,
                summary: `Set ${product.name} finished stock ${product.stock} → ${next.stock}`,
              })
            : s.auditLogs,
        }
      })
    },
    [],
  )

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
    rebuildStockFromLogs,
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
    freshStartKeepEmployees,
    clearAuditLogs,
  }
}

export type StoreApi = ReturnType<typeof useStore>
