import { useCallback, useEffect, useState } from 'react'
import type {
  AppState,
  Bonus,
  Employee,
  Material,
  Product,
  Recipe,
  Sale,
} from '../types'
import { defaultState, recipeUnitCost } from '../data/seed'
import { loadState, saveState, uid } from '../lib/utils'

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const hardReset = useCallback(() => {
    setState(defaultState())
  }, [])

  const updateSettings = useCallback((patch: Partial<AppState['settings']>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const addEmployee = useCallback((name: string) => {
    const emp: Employee = {
      id: uid('emp'),
      name: name.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({ ...s, employees: [...s.employees, emp] }))
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

  const craft = useCallback((recipeId: string, qty: number) => {
    setState((s) => {
      const recipe = s.recipes.find((r) => r.id === recipeId)
      if (!recipe) return s

      const materials = s.materials.map((m) => {
        const need = recipe.ingredients.find((i) => i.materialId === m.id)
        if (!need) return m
        return { ...m, stock: Math.max(0, m.stock - need.qty * qty) }
      })

      const cost = recipeUnitCost(recipeId, s.materials, s.recipes)
      let products = s.products
      const existing = products.find((p) => p.recipeId === recipeId)
      if (existing) {
        products = products.map((p) =>
          p.recipeId === recipeId
            ? { ...p, stock: p.stock + qty, cost }
            : p,
        )
      }

      return { ...s, materials, products }
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
    updateSettings,
    addEmployee,
    toggleEmployee,
    removeEmployee,
    addBonus,
    removeBonus,
    addSale,
    removeSale,
    craft,
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
