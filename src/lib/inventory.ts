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

/**
 * Apply material deductions for craft logs that never deducted
 * (business crafts with deduct off / false). Does not wipe current stock.
 */
export function applyMissingCraftDeductions(state: AppState): AppState {
  const now = new Date().toISOString()
  const matDelta = new Map<string, number>()
  let any = false

  const craftLogs = (state.craftLogs ?? []).map((c) => {
    const isPersonal = c.isPersonal === true || c.purpose === 'personal'
    // Personal with deduct explicitly off — leave alone
    if (isPersonal && c.deductedStock === false) return c
    // Already marked as deducted
    if (c.deductedStock === true) return c

    // Business (any) or personal with undefined/true intent but not marked:
    // business with false/undefined must now deduct; personal with undefined = legacy "did deduct"
    if (isPersonal && c.deductedStock === undefined) {
      // Legacy personal logs without flag — assume already handled
      return { ...c, deductedStock: true }
    }

    const recipe = state.recipes.find((r) => r.id === c.recipeId)
    if (!recipe) return { ...c, deductedStock: true }

    any = true
    for (const ing of recipe.ingredients) {
      matDelta.set(
        ing.materialId,
        (matDelta.get(ing.materialId) ?? 0) + ing.qty * c.qty,
      )
    }
    return { ...c, deductedStock: true }
  })

  if (!any) {
    const flagged = craftLogs.some(
      (c, i) => c.deductedStock !== state.craftLogs[i]?.deductedStock,
    )
    if (!flagged) return state
    return { ...state, craftLogs }
  }

  const materials = state.materials.map((m) => {
    const used = matDelta.get(m.id) ?? 0
    if (!used) return m
    return {
      ...m,
      stock: Math.max(0, m.stock - used),
      stockUpdatedAt: now,
    }
  })

  return { ...state, materials, craftLogs }
}

/**
 * Rebuild material + crafted (recipe) stock from purchases, crafts, sales, stash.
 * Source of truth for past logs — fixes crafts that never deducted due to sync bugs.
 * Non-recipe products (cigs, etc.) are left as-is.
 */
export function rebuildInventoryFromLedger(state: AppState): AppState {
  const now = new Date().toISOString()

  const matQty = new Map<string, number>()
  for (const m of state.materials) matQty.set(m.id, 0)

  for (const p of state.materialPurchases ?? []) {
    matQty.set(p.materialId, (matQty.get(p.materialId) ?? 0) + p.qty)
  }

  for (const c of state.craftLogs ?? []) {
    const isPersonal = c.isPersonal === true || c.purpose === 'personal'
    // Personal with deduct OFF skips mats; business crafts always deduct
    if (isPersonal && c.deductedStock === false) continue
    const recipe = state.recipes.find((r) => r.id === c.recipeId)
    if (!recipe) continue
    for (const ing of recipe.ingredients) {
      matQty.set(
        ing.materialId,
        (matQty.get(ing.materialId) ?? 0) - ing.qty * c.qty,
      )
    }
  }

  const hasPurchases = (state.materialPurchases ?? []).length > 0

  // Without purchase logs, deduct only crafts that never reduced mats (keep manual stock).
  const base = hasPurchases ? state : applyMissingCraftDeductions(state)

  const materials = hasPurchases
    ? state.materials.map((m) => ({
        ...m,
        stock: Math.max(0, Math.round(matQty.get(m.id) ?? 0)),
        stockUpdatedAt: now,
      }))
    : base.materials

  const prodQty = new Map<string, number>()
  for (const p of state.products) {
    if (p.recipeId) prodQty.set(p.id, 0)
  }

  for (const c of state.craftLogs ?? []) {
    if (c.isPersonal === true || c.purpose === 'personal') continue
    const prod = state.products.find((p) => p.recipeId === c.recipeId)
    if (!prod) continue
    prodQty.set(prod.id, (prodQty.get(prod.id) ?? 0) + c.qty)
  }

  for (const s of state.sales ?? []) {
    if (s.kind === 'external') continue
    if (!prodQty.has(s.productId)) continue
    prodQty.set(s.productId, (prodQty.get(s.productId) ?? 0) - s.qty)
  }

  for (const b of state.stashBuys ?? []) {
    if (b.status !== 'pending') continue
    if ((b.source ?? 'from_stock') !== 'from_stock') continue
    if (!prodQty.has(b.productId)) continue
    prodQty.set(b.productId, (prodQty.get(b.productId) ?? 0) - b.qty)
  }

  const products = state.products.map((p) => {
    if (!p.recipeId || !prodQty.has(p.id)) return p
    return {
      ...p,
      stock: Math.max(0, Math.round(prodQty.get(p.id) ?? 0)),
      stockUpdatedAt: now,
    }
  })

  const sourceLogs = base.craftLogs ?? state.craftLogs ?? []
  const craftLogs = sourceLogs.map((c) => {
    if (c.isPersonal === true || c.purpose === 'personal') {
      if (c.deductedStock === false) return c
      return c.deductedStock === true ? c : { ...c, deductedStock: true }
    }
    if (c.deductedStock) return c
    return { ...c, deductedStock: true }
  })

  return {
    ...state,
    materials,
    products,
    craftLogs,
    settings: {
      ...state.settings,
      stockLedgerRebuiltAt: now,
      dataEpoch: now,
    },
  }
}

/** One-time (or first-load) stock migration from craft/sale history. */
export function migrateInventoryIfNeeded(state: AppState): AppState {
  let next = applyMissingCraftDeductions(state)
  if (!next.settings.stockLedgerRebuiltAt) {
    next = rebuildInventoryFromLedger(next)
  }
  return next
}
