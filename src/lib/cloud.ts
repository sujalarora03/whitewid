import type { AppState } from '../types'
import { defaultState } from '../data/seed'
import {
  mergeAppStates,
  normalizeDeletedIds,
  stripDeletedRows,
} from './mergeState'

export type SyncStatus =
  | 'booting'
  | 'loading'
  | 'synced'
  | 'saving'
  | 'offline'
  | 'error'

function describeFetchFailure(status: number, text: string): string {
  const looksLikeChallenge =
    text.includes('Just a moment') ||
    text.includes('cf-mitigated') ||
    text.includes('challenge-platform')
  if (looksLikeChallenge) {
    return 'Cloudflare blocked /api/state (bot check). Refresh the page, or the preview worker may have expired.'
  }
  if (status === 0 || !status) {
    return 'Could not reach /api/state — preview worker may be offline/expired.'
  }
  const short = text.replace(/\s+/g, ' ').trim().slice(0, 160)
  return `Cloud API HTTP ${status}${short ? `: ${short}` : ''}`
}

export async function fetchCloudState(): Promise<{
  state: AppState | null
  updatedAt: string | null
  ok: boolean
  error?: string
}> {
  try {
    const res = await fetch('/api/state')
    const text = await res.text()
    if (!res.ok) {
      return {
        state: null,
        updatedAt: null,
        ok: false,
        error: describeFetchFailure(res.status, text),
      }
    }
    if (text.trimStart().startsWith('<')) {
      return {
        state: null,
        updatedAt: null,
        ok: false,
        error: describeFetchFailure(res.status, text),
      }
    }
    const data = JSON.parse(text) as {
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
      error:
        err instanceof Error
          ? `${err.message} (preview worker may be offline/expired)`
          : 'Network error',
    }
  }
}

export async function saveCloudState(
  state: AppState,
): Promise<{
  ok: boolean
  updatedAt?: string
  state?: AppState
  error?: string
}> {
  try {
    // Pull latest first so we don't wipe another person's sales/crafts
    const latest = await fetchCloudState()
    const toSave =
      latest.ok && latest.state
        ? mergeAppStates(latest.state, state)
        : state

    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: toSave }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: text }
    }
    const data = (await res.json()) as {
      updatedAt?: string
      state?: AppState
    }
    const saved = data.state
      ? mergeWithDefaults(data.state)
      : mergeWithDefaults(toSave)
    return { ok: true, updatedAt: data.updatedAt, state: saved }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

const STALE_OWNER_PASSWORDS = new Set([
  'owner',
  'Owner',
  'pablo',
  'Pablo',
  '',
])

/** Ensure in-game roster + passwords exist on shared cloud state. */
function ensureCrewRoster(state: AppState): AppState {
  const baseCrew = defaultState().employees
  const names = new Set(state.employees.map((e) => e.name))
  const missing = baseCrew.some((d) => !names.has(d.name))
  const ownerPw = state.settings.ownerPassword
  const staleOwner = STALE_OWNER_PASSWORDS.has(ownerPw)
  if (!missing && !staleOwner) return state

  const byName = new Map(state.employees.map((e) => [e.name, e]))
  const employees = baseCrew.map((d) => {
    const existing = byName.get(d.name)
    if (existing) {
      return {
        ...existing,
        grade: d.grade,
        password: d.password,
        active: true,
      }
    }
    return { ...d }
  })
  for (const e of state.employees) {
    if (!baseCrew.some((d) => d.name === e.name)) {
      employees.push({
        ...e,
        password: e.password ?? '1234',
        grade: e.grade ?? 'Junior Seller',
      })
    }
  }

  return {
    ...state,
    employees,
    settings: {
      ...state.settings,
      ownerPassword: 'sujal@3301',
      ownerName: state.settings.ownerName || 'Pablo the II Escobar',
    },
  }
}

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  const base = defaultState()
  const merged: AppState = {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...parsed.settings },
    materials: parsed.materials ?? base.materials,
    recipes: parsed.recipes ?? base.recipes,
    products: parsed.products ?? base.products,
    employees: (parsed.employees ?? base.employees).map((e) => ({
      ...e,
      password: e.password ?? '1234',
      grade: e.grade ?? 'Junior Seller',
    })),
    sales: parsed.sales ?? [],
    bonuses: parsed.bonuses ?? [],
    stashBuys: (parsed.stashBuys ?? []).map((b) => ({
      ...b,
      unitCost: b.unitCost ?? 0,
      source: b.source ?? ('from_stock' as const),
      crafterId: b.crafterId,
    })),
    pendingOrders: parsed.pendingOrders ?? [],
    craftLogs: (parsed.craftLogs ?? []).map((c) => ({
      ...c,
      purpose: c.purpose ?? ('business' as const),
    })),
    materialPurchases: parsed.materialPurchases ?? [],
    deletedIds: normalizeDeletedIds(parsed.deletedIds),
  }
  return ensureCrewRoster(stripDeletedRows(merged))
}
