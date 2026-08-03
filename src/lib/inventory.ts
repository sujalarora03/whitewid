import type { AppState, Material, Product } from '../types'

export type StockLine = { name: string; stock: number; kind: 'material' | 'crafted' }

/** Finished products that are craftable / sellable shop stock (not external services). */
export function craftedStockLines(state: AppState): StockLine[] {
  return state.products
    .filter((p) => (p.kind ?? 'inventory') !== 'external')
    .filter((p) => p.recipeId || p.category === 'smoking' || p.stock > 0)
    .map((p) => ({ name: p.name, stock: p.stock, kind: 'crafted' as const }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function materialStockLines(state: AppState): StockLine[] {
  return [...state.materials]
    .map((m) => ({ name: m.name, stock: m.stock, kind: 'material' as const }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function formatStockBlock(lines: StockLine[], emptyLabel: string): string {
  const nonzero = lines.filter((l) => l.stock > 0)
  const list = (nonzero.length ? nonzero : lines).slice(0, 25)
  if (list.length === 0) return emptyLabel
  return list.map((l) => `• **${l.name}** — ${l.stock}`).join('\n')
}

export function productStockAfter(
  products: Product[],
  productId: string,
  delta: number,
): number {
  const p = products.find((x) => x.id === productId)
  return Math.max(0, (p?.stock ?? 0) + delta)
}

export function materialStockAfterCraft(
  materials: Material[],
  recipeId: string,
  qty: number,
  recipes: AppState['recipes'],
  deduct: boolean,
): { name: string; before: number; after: number }[] {
  if (!deduct) return []
  const recipe = recipes.find((r) => r.id === recipeId)
  if (!recipe) return []
  return recipe.ingredients.map((ing) => {
    const mat = materials.find((m) => m.id === ing.materialId)
    const before = mat?.stock ?? 0
    const after = Math.max(0, before - ing.qty * qty)
    return { name: mat?.name ?? ing.materialId, before, after }
  })
}

export function finishedStockAfterCraft(
  state: AppState,
  recipeId: string,
  qty: number,
  personal: boolean,
): { name: string; after: number } | null {
  if (personal) return null
  const product = state.products.find((p) => p.recipeId === recipeId)
  const recipe = state.recipes.find((r) => r.id === recipeId)
  const name = product?.name ?? recipe?.name ?? 'Item'
  const before = product?.stock ?? 0
  return { name, after: before + qty }
}
