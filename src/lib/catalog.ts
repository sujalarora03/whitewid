import type { AppState } from '../types'
import { defaultState } from '../data/seed'

/** Ensure catalog products (incl. external services) exist on loaded state. */
export function ensureCatalogProducts(state: AppState): AppState {
  const base = defaultState().products
  const byId = new Map(state.products.map((p) => [p.id, p]))
  let changed = false
  const products = base.map((seed) => {
    const existing = byId.get(seed.id)
    if (!existing) {
      changed = true
      return { ...seed }
    }
    // Sync store making costs for cigarettes / lighter from seed catalog
    const syncCostIds = new Set([
      'prod-silver-ember',
      'prod-royal-drift',
      'prod-black-velvet',
      'prod-lighter',
      'prod-rolling-paper',
      'prod-empty-bag',
    ])
    const next = {
      ...existing,
      kind: existing.kind ?? seed.kind,
      pricingMode: existing.pricingMode ?? seed.pricingMode,
      category: existing.category || seed.category,
      cost: syncCostIds.has(seed.id) ? seed.cost : existing.cost,
      salePrice:
        syncCostIds.has(seed.id) && (existing.salePrice === 0 || existing.salePrice === 500)
          ? seed.salePrice
          : existing.salePrice,
    }
    if (
      next.kind !== existing.kind ||
      next.pricingMode !== existing.pricingMode ||
      next.category !== existing.category ||
      next.cost !== existing.cost ||
      next.salePrice !== existing.salePrice
    ) {
      changed = true
    }
    byId.delete(seed.id)
    return next
  })
  for (const extra of byId.values()) {
    products.push(extra)
  }
  if (!changed && products.length === state.products.length) return state
  return { ...state, products }
}
