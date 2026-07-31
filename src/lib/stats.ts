import type { AppState, Bonus, Sale } from '../types'
import {
  inRange,
  saleCommission,
  saleCost,
  saleProfit,
  saleRevenue,
  weekEnd,
  weekStart,
} from './utils'

export interface EmployeeWeekStats {
  employeeId: string
  name: string
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
  revenue: number
  cost: number
  profit: number
  commission: number
  bonusTotal: number
  netToBusiness: number
  employees: EmployeeWeekStats[]
  topProducts: ProductWeekStats[]
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

  const revenue = sales.reduce((sum, s) => sum + saleRevenue(s), 0)
  const cost = sales.reduce((sum, s) => sum + saleCost(s), 0)
  const profit = sales.reduce((sum, s) => sum + saleProfit(s), 0)
  const commission = sales.reduce(
    (sum, s) => sum + saleCommission(s, rate),
    0,
  )
  const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0)

  const byEmp = new Map<string, EmployeeWeekStats>()
  for (const emp of state.employees) {
    byEmp.set(emp.id, {
      employeeId: emp.id,
      name: emp.name,
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

  for (const s of sales) {
    let row = byEmp.get(s.employeeId)
    if (!row) {
      row = {
        employeeId: s.employeeId,
        name: 'Unknown',
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
      byEmp.set(s.employeeId, row)
    }
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
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)

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

  const topEmployee =
    employees.find((e) => e.salesCount > 0 || e.bonuses > 0) ?? null

  return {
    start,
    end,
    sales,
    bonuses,
    revenue,
    cost,
    profit,
    commission,
    bonusTotal,
    netToBusiness: profit - commission,
    employees,
    topProducts,
    topEmployee,
  }
}
