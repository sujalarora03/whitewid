import type { AppState, Material, Recipe } from '../types'
import { defaultState, recipeUnitCost } from '../data/seed'
import { migrateInventoryIfNeeded } from './inventory'

export interface StashNeedLine {
  materialId: string
  name: string
  perCraft: number
  need: number
  cost: number
  stock: number
  short: number
}

/** How much stash is needed to craft `qty` of this recipe. */
export function stashNeeded(
  recipe: Recipe | undefined,
  qty: number,
  materials: Material[],
): StashNeedLine[] {
  if (!recipe) return []
  const n = Math.max(1, qty)
  return recipe.ingredients.map((ing) => {
    const mat = materials.find((m) => m.id === ing.materialId)
    const need = ing.qty * n
    const stock = mat?.stock ?? 0
    return {
      materialId: ing.materialId,
      name: mat?.name ?? 'Unknown',
      perCraft: ing.qty,
      need,
      cost: (mat?.cost ?? 0) * need,
      stock,
      short: Math.max(0, need - stock),
    }
  })
}

function mergeById<T extends { id: string }>(
  seed: T[],
  existing: T[],
  mergeRow: (seedRow: T, existingRow: T) => T,
): T[] {
  const byId = new Map(existing.map((row) => [row.id, row]))
  const out = seed.map((seedRow) => {
    const current = byId.get(seedRow.id)
    if (!current) return { ...seedRow }
    byId.delete(seedRow.id)
    return mergeRow(seedRow, current)
  })
  for (const extra of byId.values()) out.push(extra)
  return out
}

/**
 * Keep live stock / prices, but pull new screenshot recipes into shared state
 * so adding a craftable item in the catalog appears without a full reset.
 */
export function ensureCatalogProducts(state: AppState): AppState {
  const seed = defaultState()

  const materials = mergeById(seed.materials, state.materials, (s, e) => ({
    ...e,
    name: s.name,
    category: s.category,
    cost: e.cost,
    stock: e.stock,
  }))

  const recipes = mergeById(seed.recipes, state.recipes, (s, e) => ({
    ...e,
    name: s.name,
    category: s.category,
    ingredients: s.ingredients.map((i) => ({ ...i })),
    salePrice: e.salePrice || s.salePrice,
  }))

  const products = mergeById(seed.products, state.products, (s, e) => ({
    ...e,
    name: s.name,
    category: s.category || e.category,
    kind: e.kind ?? s.kind,
    pricingMode: e.pricingMode ?? s.pricingMode,
    recipeId: s.recipeId ?? e.recipeId,
    cost:
      s.recipeId != null
        ? recipeUnitCost(s.recipeId, materials, recipes) || e.cost
        : e.cost,
    salePrice: e.salePrice,
    stock: e.stock,
  }))

  const next: AppState = {
    ...state,
    materials,
    recipes,
    products,
  }
  return migrateInventoryIfNeeded(next)
}
