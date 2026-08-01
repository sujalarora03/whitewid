import type { AppState } from '../types'

type WithId = { id: string }

function byId<T extends WithId>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    if (item?.id) map.set(item.id, item)
  }
  return map
}

/** Union log rows by id. Prefer the copy with the later activity timestamp. */
export function mergeById<T extends WithId>(
  a: T[],
  b: T[],
  timeKey: (item: T) => string | undefined = defaultTime,
): T[] {
  const map = byId(a)
  for (const item of b) {
    if (!item?.id) continue
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    const ta = timeKey(prev) ?? ''
    const tb = timeKey(item) ?? ''
    map.set(item.id, tb >= ta ? item : prev)
  }
  return [...map.values()].sort((x, y) => {
    const tx = timeKey(x) ?? ''
    const ty = timeKey(y) ?? ''
    return ty.localeCompare(tx)
  })
}

function defaultTime(item: WithId & Record<string, unknown>): string | undefined {
  return (
    (item.updatedAt as string | undefined) ||
    (item.clearedAt as string | undefined) ||
    (item.fulfilledAt as string | undefined) ||
    (item.createdAt as string | undefined)
  )
}

function mergeStockRows<
  T extends { id: string; stock: number },
>(remote: T[], local: T[]): T[] {
  const map = byId(remote)
  for (const item of local) {
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    // Keep richer metadata from local/remote blend; stock takes the higher
    // value so concurrent crafts/buys don't wipe each other down to an old 0.
    map.set(item.id, {
      ...prev,
      ...item,
      stock: Math.max(prev.stock ?? 0, item.stock ?? 0),
    })
  }
  // Preserve remote order, then any local-only rows
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of remote) {
    const m = map.get(r.id)
    if (m) {
      out.push(m)
      seen.add(r.id)
    }
  }
  for (const l of local) {
    if (!seen.has(l.id)) out.push(map.get(l.id) ?? l)
  }
  return out
}

function mergeEmployees(
  remote: AppState['employees'],
  local: AppState['employees'],
): AppState['employees'] {
  const map = byId(remote)
  for (const e of local) {
    const prev = map.get(e.id)
    if (!prev) {
      map.set(e.id, e)
      continue
    }
    // Prefer local field updates (grade/password/active) when both exist
    map.set(e.id, { ...prev, ...e })
  }
  const byName = new Map<string, (typeof remote)[0]>()
  for (const e of map.values()) byName.set(e.name, e)
  return [...byName.values()]
}

/**
 * Merge two full app states for multiplayer sync.
 * `local` is this browser's state; `remote` is what is already in D1.
 * Log collections are unioned by id so concurrent sales/crafts are kept.
 */
export function mergeAppStates(remote: AppState, local: AppState): AppState {
  return {
    settings: { ...remote.settings, ...local.settings },
    materials: mergeStockRows(remote.materials, local.materials),
    recipes: mergeById(remote.recipes, local.recipes, () => ''),
    products: mergeStockRows(remote.products, local.products),
    employees: mergeEmployees(remote.employees, local.employees),
    sales: mergeById(remote.sales, local.sales),
    bonuses: mergeById(remote.bonuses, local.bonuses),
    stashBuys: mergeById(remote.stashBuys, local.stashBuys),
    pendingOrders: mergeById(remote.pendingOrders ?? [], local.pendingOrders ?? []),
    craftLogs: mergeById(remote.craftLogs, local.craftLogs),
    materialPurchases: mergeById(
      remote.materialPurchases,
      local.materialPurchases,
    ),
  }
}
