import type { AppState, AuditEntry, DeletedIds } from '../types'
import { emptyDeletedIds } from './mergeState'
import { uid } from './utils'

function idsOf(rows: { id: string }[] | undefined): string[] {
  return (rows ?? []).map((r) => r.id).filter(Boolean)
}

function unionIds(...lists: (string[] | undefined)[]): string[] {
  return [...new Set(lists.flatMap((x) => x ?? []))]
}

/**
 * Wipe operational history for a clean re-entry, keeping the same employees
 * (same ids / passwords / grades) and catalog settings.
 * Tombstones every cleared log id so merge-sync cannot revive old rows.
 */
export function buildFreshStartState(
  current: AppState,
  actorName = 'Owner',
): AppState {
  const now = new Date().toISOString()
  const prev = current.deletedIds ?? emptyDeletedIds()

  const deletedIds: DeletedIds = {
    sales: unionIds(prev.sales, idsOf(current.sales)),
    bonuses: unionIds(prev.bonuses, idsOf(current.bonuses)),
    stashBuys: unionIds(prev.stashBuys, idsOf(current.stashBuys)),
    pendingOrders: unionIds(
      prev.pendingOrders,
      idsOf(current.pendingOrders),
    ),
    craftLogs: unionIds(prev.craftLogs, idsOf(current.craftLogs)),
    materialPurchases: unionIds(
      prev.materialPurchases,
      idsOf(current.materialPurchases),
    ),
    // Keep prior employee tombstones only — do not delete the live roster
    employees: [...(prev.employees ?? [])],
  }

  const audit: AuditEntry = {
    id: uid('aud'),
    at: now,
    actorId: '',
    actorName,
    action: 'reset',
    entity: 'system',
    entityId: 'fresh-start',
    summary:
      'Fresh start — cleared sales, crafts, stash, orders, purchases, bonuses, and stock; kept employees',
  }

  return {
    ...current,
    settings: {
      ...current.settings,
      stockLedgerRebuiltAt: now,
      dataEpoch: now,
    },
    materials: current.materials.map((m) => ({
      ...m,
      stock: 0,
      stockUpdatedAt: now,
    })),
    products: current.products.map((p) => ({
      ...p,
      stock: 0,
      stockUpdatedAt: now,
    })),
    employees: current.employees.map((e) => ({ ...e })),
    sales: [],
    bonuses: [],
    stashBuys: [],
    pendingOrders: [],
    craftLogs: [],
    materialPurchases: [],
    deletedIds,
    auditLogs: [audit],
  }
}
