import type { AppState, Sale } from '../types'
import { STORAGE_KEY, defaultState } from '../data/seed'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const base = defaultState()
    return {
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
      })),
      craftLogs: parsed.craftLogs ?? [],
      materialPurchases: parsed.materialPurchases ?? [],
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/** Start of current week (Mon or Sun based on settings) */
export function weekStart(date: Date, weekStartsOn: 0 | 1): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff =
    weekStartsOn === 1
      ? day === 0
        ? -6
        : 1 - day
      : -day
  d.setDate(d.getDate() + diff)
  return d
}

export function weekEnd(start: Date): Date {
  const d = new Date(start)
  d.setDate(d.getDate() + 7)
  return d
}

export function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function saleRevenue(s: Sale): number {
  return s.unitPrice * s.qty
}

export function saleCost(s: Sale): number {
  return s.unitCost * s.qty
}

export function saleProfit(s: Sale): number {
  return saleRevenue(s) - saleCost(s)
}

export function saleCommission(s: Sale, rate: number): number {
  return Math.max(0, saleProfit(s)) * rate
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatWeekLabel(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}
