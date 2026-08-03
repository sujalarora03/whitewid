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
    const next = {
      ...existing,
      kind: existing.kind ?? seed.kind,
      pricingMode: existing.pricingMode ?? seed.pricingMode,
      category: existing.category || seed.category,
    }
    if (
      next.kind !== existing.kind ||
      next.pricingMode !== existing.pricingMode ||
      next.category !== existing.category
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
