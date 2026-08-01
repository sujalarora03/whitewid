import type { AppSettings } from '../types'
import type { WeekReport } from './stats'
import { formatWeekLabel, money, pct } from './utils'

export interface DiscordPayload {
  content?: string
  embeds?: DiscordEmbed[]
}

export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

const GREEN = 0x7cff9a

export async function postToDiscord(
  webhookUrl: string,
  payload: DiscordPayload,
): Promise<{ ok: boolean; error?: string }> {
  const url = webhookUrl.trim()
  if (!url) return { ok: false, error: 'No webhook URL set' }

  try {
    const res = await fetch('/api/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: url, ...payload }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

export function saleEmbed(input: {
  businessName: string
  employeeName: string
  productName: string
  qty: number
  revenue: number
  profit: number
  commission: number
  note?: string
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Sale`,
        color: GREEN,
        fields: [
          { name: 'Employee', value: input.employeeName, inline: true },
          { name: 'Item', value: `${input.qty}× ${input.productName}`, inline: true },
          { name: 'Revenue', value: money(input.revenue), inline: true },
          { name: 'Profit', value: money(input.profit), inline: true },
          { name: 'Commission', value: money(input.commission), inline: true },
          ...(input.note
            ? [{ name: 'Note', value: input.note, inline: true }]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function bonusEmbed(input: {
  businessName: string
  employeeName: string
  amount: number
  reason: string
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Bonus`,
        color: 0xf0c14a,
        description: `**${input.employeeName}** received **${money(input.amount)}**`,
        fields: [{ name: 'Reason', value: input.reason || 'Bonus' }],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function weekReportEmbed(
  businessName: string,
  report: WeekReport,
  commissionRate: number,
): DiscordPayload {
  const topEmp = report.topEmployee
  const topItems = report.topProducts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name} — ${p.units} sold (${money(p.revenue)})`)
    .join('\n')

  const crew = report.employees
    .filter((e) => e.salesCount > 0 || e.bonuses > 0)
    .slice(0, 8)
    .map(
      (e, i) =>
        `${i + 1}. **${e.name}** — ${money(e.revenue)} sales · ${money(e.payout)} payout`,
    )
    .join('\n')

  return {
    embeds: [
      {
        title: `${businessName} · Weekly Report`,
        description: formatWeekLabel(report.start),
        color: GREEN,
        fields: [
          { name: 'Revenue', value: money(report.revenue), inline: true },
          { name: 'Gross profit', value: money(report.profit), inline: true },
          {
            name: `Commissions (${pct(commissionRate)})`,
            value: money(report.commission),
            inline: true,
          },
          { name: 'Bonuses', value: money(report.bonusTotal), inline: true },
          {
            name: 'Net to business',
            value: money(report.netToBusiness),
            inline: true,
          },
          {
            name: 'Top performer',
            value: topEmp?.salesCount
              ? `${topEmp.name} (${money(topEmp.profit)} profit)`
              : 'No sales yet',
            inline: true,
          },
          {
            name: 'Most sold',
            value: topItems || '—',
          },
          {
            name: 'Crew leaderboard',
            value: crew || '—',
          },
        ],
        footer: { text: 'White Widow Manager' },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function craftRestockEmbed(input: {
  businessName: string
  recipeName: string
  qty: number
  lines: { name: string; short: number; cost: number }[]
  shopTotal: number
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Restock needed`,
        description: `For **${input.qty}× ${input.recipeName}**`,
        color: 0xf0c14a,
        fields: [
          {
            name: 'Buy list',
            value:
              input.lines
                .map((l) => `• ${l.short}× ${l.name} (${money(l.cost)})`)
                .join('\n') || 'Nothing missing',
          },
          {
            name: 'Store total',
            value: money(input.shopTotal),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function craftLogEmbed(input: {
  businessName: string
  employeeName: string
  recipeName: string
  qty: number
  totalCost: number
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Craft logged`,
        color: GREEN,
        fields: [
          { name: 'Employee', value: input.employeeName, inline: true },
          {
            name: 'Crafted',
            value: `${input.qty}× ${input.recipeName}`,
            inline: true,
          },
          { name: 'Material cost', value: money(input.totalCost), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function stashPendingEmbed(input: {
  businessName: string
  employeeName: string
  buyerName: string
  productName: string
  qty: number
  amount: number
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Stash buy (pending)`,
        color: 0xf0c14a,
        description: 'Waiting for owner to clear',
        fields: [
          { name: 'Employee', value: input.employeeName, inline: true },
          { name: 'Buyer', value: input.buyerName, inline: true },
          {
            name: 'Item',
            value: `${input.qty}× ${input.productName}`,
            inline: true,
          },
          { name: 'Amount', value: money(input.amount), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function stashClearedEmbed(input: {
  businessName: string
  employeeName: string
  buyerName: string
  productName: string
  qty: number
  amount: number
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Stash buy cleared`,
        color: GREEN,
        fields: [
          { name: 'Employee', value: input.employeeName, inline: true },
          { name: 'Buyer', value: input.buyerName, inline: true },
          {
            name: 'Item',
            value: `${input.qty}× ${input.productName}`,
            inline: true,
          },
          { name: 'Amount', value: money(input.amount), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function discordReady(settings: AppSettings): boolean {
  return Boolean(settings.discordWebhookUrl?.trim())
}
