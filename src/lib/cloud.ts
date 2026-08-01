import type { AppState } from '../types'
import { defaultState } from '../data/seed'

export type SyncStatus =
  | 'booting'
  | 'loading'
  | 'synced'
  | 'saving'
  | 'offline'
  | 'error'

export async function fetchCloudState(): Promise<{
  state: AppState | null
  updatedAt: string | null
  ok: boolean
  error?: string
}> {
  try {
    const res = await fetch('/api/state')
    if (!res.ok) {
      const text = await res.text()
      return { state: null, updatedAt: null, ok: false, error: text }
    }
    const data = (await res.json()) as {
      state: AppState | null
      updatedAt: string | null
    }
    if (!data.state) {
      return { state: null, updatedAt: null, ok: true }
    }
    return {
      state: mergeWithDefaults(data.state),
      updatedAt: data.updatedAt,
      ok: true,
    }
  } catch (err) {
    return {
      state: null,
      updatedAt: null,
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

export async function saveCloudState(
  state: AppState,
): Promise<{ ok: boolean; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: text }
    }
    const data = (await res.json()) as { updatedAt?: string }
    return { ok: true, updatedAt: data.updatedAt }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  const base = defaultState()
  return {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...parsed.settings },
    materials: parsed.materials ?? base.materials,
    recipes: parsed.recipes ?? base.recipes,
    products: parsed.products ?? base.products,
    employees: parsed.employees ?? base.employees,
    sales: parsed.sales ?? [],
    bonuses: parsed.bonuses ?? [],
    stashBuys: parsed.stashBuys ?? [],
    craftLogs: parsed.craftLogs ?? [],
    materialPurchases: parsed.materialPurchases ?? [],
  }
}
