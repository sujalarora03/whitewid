import type { AppState, DeletedIds } from '../types'

type WithId = { id: string }

const EMPTY_DELETED: DeletedIds = {
  sales: [],
  bonuses: [],
  stashBuys: [],
  pendingOrders: [],
  craftLogs: [],
  materialPurchases: [],
  employees: [],
}

function byId<T extends WithId>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    if (item?.id) map.set(item.id, item)
  }
  return map
}

function unionIds(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])]
}

function mergeDeleted(
  remote?: DeletedIds,
  local?: DeletedIds,
): DeletedIds {
  const r = remote ?? EMPTY_DELETED
  const l = local ?? EMPTY_DELETED
  return {
    sales: unionIds(r.sales, l.sales),
    bonuses: unionIds(r.bonuses, l.bonuses),
    stashBuys: unionIds(r.stashBuys, l.stashBuys),
    pendingOrders: unionIds(r.pendingOrders, l.pendingOrders),
    craftLogs: unionIds(r.craftLogs, l.craftLogs),
    materialPurchases: unionIds(r.materialPurchases, l.materialPurchases),
    employees: unionIds(r.employees, l.employees),
  }
}

function defaultTime(item: WithId): string | undefined {
  const row = item as WithId & {
    updatedAt?: string
    clearedAt?: string
    fulfilledAt?: string
    createdAt?: string
  }
  return row.updatedAt || row.clearedAt || row.fulfilledAt || row.createdAt
}

/** Union log rows by id. Prefer the copy with the later activity timestamp. */
export function mergeById<T extends WithId>(
  a: T[],
  b: T[],
  timeKey: (item: T) => string | undefined = defaultTime,
  deleted: string[] = [],
): T[] {
  const dead = new Set(deleted)
  const map = byId(a.filter((x) => x?.id && !dead.has(x.id)))
  for (const item of b) {
    if (!item?.id || dead.has(item.id)) continue
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

type StockRow = { id: string; stock: number; stockUpdatedAt?: string }

/**
 * Merge inventory rows. Prefer the stock with the newer stockUpdatedAt.
 * Never use Math.max — that made deductions undo themselves across browsers
 * and inflated material counts.
 */
function mergeStockRows<T extends StockRow>(remote: T[], local: T[]): T[] {
  const map = byId(remote)
  for (const item of local) {
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    const tr = prev.stockUpdatedAt ?? ''
    const tl = item.stockUpdatedAt ?? ''
    let stock: number
    let stockUpdatedAt: string | undefined
    if (tl && tr) {
      if (tl >= tr) {
        stock = item.stock ?? 0
        stockUpdatedAt = item.stockUpdatedAt
      } else {
        stock = prev.stock ?? 0
        stockUpdatedAt = prev.stockUpdatedAt
      }
    } else if (tl) {
      stock = item.stock ?? 0
      stockUpdatedAt = item.stockUpdatedAt
    } else if (tr) {
      stock = prev.stock ?? 0
      stockUpdatedAt = prev.stockUpdatedAt
    } else {
      // Legacy unstamped rows (both sides): prefer local write so a craft
      // deduction in this save is not overwritten by an older cloud copy.
      stock = item.stock ?? 0
      stockUpdatedAt = undefined
    }
    map.set(item.id, {
      ...prev,
      ...item,
      stock,
      stockUpdatedAt,
    })
  }
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
  deleted: string[],
): AppState['employees'] {
  const dead = new Set(deleted)
  const map = byId(remote.filter((e) => !dead.has(e.id)))
  for (const e of local) {
    if (dead.has(e.id)) continue
    const prev = map.get(e.id)
    if (!prev) {
      map.set(e.id, e)
      continue
    }
    map.set(e.id, { ...prev, ...e })
  }
  const byName = new Map<string, (typeof remote)[0]>()
  for (const e of map.values()) byName.set(e.name, e)
  return [...byName.values()]
}

/**
 * Merge two full app states for multiplayer sync.
 * `local` is this browser's state; `remote` is what is already in D1.
 * Log collections are unioned by id; `deletedIds` keep removals from reviving.
 */
export function mergeAppStates(remote: AppState, local: AppState): AppState {
  const deletedIds = mergeDeleted(remote.deletedIds, local.deletedIds)
  return {
    settings: { ...remote.settings, ...local.settings },
    materials: mergeStockRows(remote.materials, local.materials),
    recipes: mergeById(remote.recipes, local.recipes, () => ''),
    products: mergeStockRows(remote.products, local.products),
    employees: mergeEmployees(
      remote.employees,
      local.employees,
      deletedIds.employees,
    ),
    sales: mergeById(remote.sales, local.sales, defaultTime, deletedIds.sales),
    bonuses: mergeById(
      remote.bonuses,
      local.bonuses,
      defaultTime,
      deletedIds.bonuses,
    ),
    stashBuys: mergeById(
      remote.stashBuys,
      local.stashBuys,
      defaultTime,
      deletedIds.stashBuys,
    ),
    pendingOrders: mergeById(
      remote.pendingOrders ?? [],
      local.pendingOrders ?? [],
      defaultTime,
      deletedIds.pendingOrders,
    ),
    craftLogs: mergeById(
      remote.craftLogs,
      local.craftLogs,
      defaultTime,
      deletedIds.craftLogs,
    ),
    materialPurchases: mergeById(
      remote.materialPurchases,
      local.materialPurchases,
      defaultTime,
      deletedIds.materialPurchases,
    ),
    deletedIds,
  }
}

export function emptyDeletedIds(): DeletedIds {
  return {
    sales: [],
    bonuses: [],
    stashBuys: [],
    pendingOrders: [],
    craftLogs: [],
    materialPurchases: [],
    employees: [],
  }
}

export function markDeleted(
  state: AppState,
  collection: keyof DeletedIds,
  id: string,
): DeletedIds {
  const base = state.deletedIds ?? emptyDeletedIds()
  const list = base[collection] ?? []
  if (list.includes(id)) return base
  return { ...base, [collection]: [...list, id] }
}

/** Ensure deletedIds shape exists (older saved states omit it). */
export function normalizeDeletedIds(raw?: Partial<DeletedIds> | null): DeletedIds {
  const base = emptyDeletedIds()
  if (!raw) return base
  return {
    sales: unionIds(base.sales, raw.sales),
    bonuses: unionIds(base.bonuses, raw.bonuses),
    stashBuys: unionIds(base.stashBuys, raw.stashBuys),
    pendingOrders: unionIds(base.pendingOrders, raw.pendingOrders),
    craftLogs: unionIds(base.craftLogs, raw.craftLogs),
    materialPurchases: unionIds(base.materialPurchases, raw.materialPurchases),
    employees: unionIds(base.employees, raw.employees),
  }
}

/** Drop any rows whose ids are in deletedIds (local hydrate / cloud load). */
export function stripDeletedRows(state: AppState): AppState {
  const deletedIds = normalizeDeletedIds(state.deletedIds)
  const dead = (key: keyof DeletedIds) => new Set(deletedIds[key])
  return {
    ...state,
    deletedIds,
    sales: state.sales.filter((x) => !dead('sales').has(x.id)),
    bonuses: state.bonuses.filter((x) => !dead('bonuses').has(x.id)),
    stashBuys: state.stashBuys.filter((x) => !dead('stashBuys').has(x.id)),
    pendingOrders: (state.pendingOrders ?? []).filter(
      (x) => !dead('pendingOrders').has(x.id),
    ),
    craftLogs: state.craftLogs.filter((x) => !dead('craftLogs').has(x.id)),
    materialPurchases: state.materialPurchases.filter(
      (x) => !dead('materialPurchases').has(x.id),
    ),
    employees: state.employees.filter((x) => !dead('employees').has(x.id)),
  }
}
