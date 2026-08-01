import type { AppState, Bonus, CraftLog, Sale } from '../types'
import {
  inRange,
  saleCommission,
  saleCost,
  saleProfit,
  saleRevenue,
  weekEnd,
  weekStart,
} from './utils'

export interface CraftBreakdown {
  recipeId: string
  recipeName: string
  qty: number
}

export interface EmployeeWeekStats {
  employeeId: string
  name: string
  /** Business crafts logged */
  craftCount: number
  craftUnits: number
  craftsByItem: CraftBreakdown[]
  salesCount: number
  unitsSold: number
  revenue: number
  cost: number
  profit: number
  commission: number
  bonuses: number
  payout: number
  netToBusiness: number
}

export interface ProductWeekStats {
  productId: string
  name: string
  units: number
  revenue: number
}

export interface WeekReport {
  start: Date
  end: Date
  sales: Sale[]
  bonuses: Bonus[]
  craftLogs: CraftLog[]
  revenue: number
  cost: number
  profit: number
  commission: number
  bonusTotal: number
  netToBusiness: number
  craftUnits: number
  employees: EmployeeWeekStats[]
  topProducts: ProductWeekStats[]
  /** Best seller by units sold (then revenue) */
  topSeller: EmployeeWeekStats | null
  /** Best crafter by units crafted */
  topCrafter: EmployeeWeekStats | null
  /** @deprecated use topSeller — kept for Discord embed compat */
  topEmployee: EmployeeWeekStats | null
}

export function buildWeekReport(
  state: AppState,
  refDate: Date = new Date(),
): WeekReport {
  const start = weekStart(refDate, state.settings.weekStartsOn)
  const end = weekEnd(start)
  const rate = state.settings.commissionRate

  const sales = state.sales.filter((s) => inRange(s.createdAt, start, end))
  const bonuses = state.bonuses.filter((b) => inRange(b.createdAt, start, end))
  const craftLogs = state.craftLogs.filter(
    (c) =>
      (c.purpose ?? 'business') === 'business' &&
      inRange(c.createdAt, start, end),
  )

  const revenue = sales.reduce((sum, s) => sum + saleRevenue(s), 0)
  const cost = sales.reduce((sum, s) => sum + saleCost(s), 0)
  const profit = sales.reduce((sum, s) => sum + saleProfit(s), 0)
  const commission = sales.reduce(
    (sum, s) => sum + saleCommission(s, rate),
    0,
  )
  const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0)
  const craftUnits = craftLogs.reduce((sum, c) => sum + c.qty, 0)

  const byEmp = new Map<string, EmployeeWeekStats>()
  for (const emp of state.employees) {
    byEmp.set(emp.id, {
      employeeId: emp.id,
      name: emp.name,
      craftCount: 0,
      craftUnits: 0,
      craftsByItem: [],
      salesCount: 0,
      unitsSold: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      commission: 0,
      bonuses: 0,
      payout: 0,
      netToBusiness: 0,
    })
  }

  function ensure(id: string, name = 'Unknown'): EmployeeWeekStats {
    let row = byEmp.get(id)
    if (!row) {
      row = {
        employeeId: id,
        name,
        craftCount: 0,
        craftUnits: 0,
        craftsByItem: [],
        salesCount: 0,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        commission: 0,
        bonuses: 0,
        payout: 0,
        netToBusiness: 0,
      }
      byEmp.set(id, row)
    }
    return row
  }

  const craftItemMaps = new Map<string, Map<string, CraftBreakdown>>()

  for (const c of craftLogs) {
    const row = ensure(c.employeeId)
    row.craftCount += 1
    row.craftUnits += c.qty
    let items = craftItemMaps.get(c.employeeId)
    if (!items) {
      items = new Map()
      craftItemMaps.set(c.employeeId, items)
    }
    const cur = items.get(c.recipeId) ?? {
      recipeId: c.recipeId,
      recipeName: c.recipeName,
      qty: 0,
    }
    cur.qty += c.qty
    items.set(c.recipeId, cur)
  }

  for (const [empId, items] of craftItemMaps) {
    const row = byEmp.get(empId)
    if (row) {
      row.craftsByItem = [...items.values()].sort((a, b) => b.qty - a.qty)
    }
  }

  for (const s of sales) {
    const row = ensure(s.employeeId)
    const rev = saleRevenue(s)
    const c = saleCost(s)
    const p = saleProfit(s)
    const comm = saleCommission(s, rate)
    row.salesCount += 1
    row.unitsSold += s.qty
    row.revenue += rev
    row.cost += c
    row.profit += p
    row.commission += comm
  }

  for (const b of bonuses) {
    const row = byEmp.get(b.employeeId)
    if (row) row.bonuses += b.amount
  }

  const employees = [...byEmp.values()]
    .map((e) => ({
      ...e,
      payout: e.commission + e.bonuses,
      netToBusiness: e.profit - e.commission,
    }))
    .sort(
      (a, b) =>
        b.commission - a.commission ||
        b.unitsSold - a.unitsSold ||
        b.craftUnits - a.craftUnits,
    )

  const prodMap = new Map<string, ProductWeekStats>()
  for (const s of sales) {
    const cur = prodMap.get(s.productId) ?? {
      productId: s.productId,
      name: s.productName,
      units: 0,
      revenue: 0,
    }
    cur.units += s.qty
    cur.revenue += saleRevenue(s)
    prodMap.set(s.productId, cur)
  }
  const topProducts = [...prodMap.values()].sort(
    (a, b) => b.units - a.units || b.revenue - a.revenue,
  )

  const topSeller =
    [...employees]
      .filter((e) => e.unitsSold > 0)
      .sort(
        (a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue,
      )[0] ?? null

  const topCrafter =
    [...employees]
      .filter((e) => e.craftUnits > 0)
      .sort(
        (a, b) => b.craftUnits - a.craftUnits || b.craftCount - a.craftCount,
      )[0] ?? null

  return {
    start,
    end,
    sales,
    bonuses,
    craftLogs,
    revenue,
    cost,
    profit,
    commission,
    bonusTotal,
    netToBusiness: profit - commission,
    craftUnits,
    employees,
    topProducts,
    topSeller,
    topCrafter,
    topEmployee: topSeller,
  }
}
