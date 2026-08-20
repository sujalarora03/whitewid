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
  /** Finished stock left after this sale (inventory products) */
  stockAfter?: number | null
}): DiscordPayload {
  return {
    content: `🧾 **Sale** — ${input.qty}× ${input.productName} by ${input.employeeName}`,
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
          ...(input.stockAfter != null
            ? [
                {
                  name: 'Inventory left',
                  value: `${input.stockAfter}× ${input.productName}`,
                  inline: true,
                },
              ]
            : []),
          {
            name: 'Full inventory',
            value: `[Live stock](${inventoryPublicUrl()})`,
            inline: true,
          },
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
  const topSeller = report.topSeller ?? report.topEmployee
  const topCrafter = report.topCrafter
  const topItems = report.topProducts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name} — ${p.units} sold (${money(p.revenue)})`)
    .join('\n')

  const crew = report.employees
    .filter((e) => e.salesCount > 0 || e.craftUnits > 0 || e.bonuses > 0)
    .slice(0, 8)
    .map(
      (e, i) =>
        `${i + 1}. **${e.name}** — ${e.craftUnits} crafted · ${e.unitsSold} sold · ${money(e.commission)} commission`,
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
            name: 'Units crafted',
            value: String(report.craftUnits),
            inline: true,
          },
          {
            name: 'Top crafter',
            value: topCrafter
              ? `${topCrafter.name} (${topCrafter.craftUnits} units)`
              : 'No crafts yet',
            inline: true,
          },
          {
            name: 'Top seller',
            value: topSeller?.unitsSold
              ? `${topSeller.name} (${topSeller.unitsSold} sold · ${money(topSeller.commission)} commission)`
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
        footer: { text: 'Shop Manager' },
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
  personal?: boolean
  /** Finished stock after this business craft */
  finishedStockAfter?: number | null
  /** Material balances after deduct */
  matsAfter?: { name: string; after: number }[]
}): DiscordPayload {
  const matLines =
    input.matsAfter && input.matsAfter.length > 0
      ? input.matsAfter.map((m) => `• ${m.name} — ${m.after} left`).join('\n')
      : null
  return {
    content: input.personal
      ? `🧪 **Personal craft** — ${input.qty}× ${input.recipeName} by ${input.employeeName}`
      : `🧪 **Craft** — ${input.qty}× ${input.recipeName} by ${input.employeeName}`,
    embeds: [
      {
        title: input.personal
          ? `${input.businessName} · Personal craft`
          : `${input.businessName} · Craft logged`,
        description: input.personal
          ? 'Crafted for themselves — not business stock / not a sale'
          : 'Production added to finished inventory (business)',
        color: GREEN,
        fields: [
          { name: 'Who crafted', value: input.employeeName, inline: true },
          {
            name: 'Crafted',
            value: `${input.qty}× ${input.recipeName}`,
            inline: true,
          },
          {
            name: 'Recipe cost (ref.)',
            value: money(input.totalCost),
            inline: true,
          },
          ...(input.finishedStockAfter != null
            ? [
                {
                  name: 'Finished stock now',
                  value: `${input.finishedStockAfter}× ${input.recipeName}`,
                  inline: true,
                },
              ]
            : []),
          ...(matLines
            ? [{ name: 'Raw materials left', value: matLines }]
            : []),
          {
            name: 'Full inventory',
            value: `[Live stock](${inventoryPublicUrl()})`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function stashPendingEmbed(input: {
  businessName: string
  sellerName: string
  crafterName?: string
  buyerName: string
  productName: string
  qty: number
  amount: number
  unitCost: number
  source: 'from_stock' | 'crafted_then_sold'
  commissionRate: number
}): DiscordPayload {
  const cost = input.unitCost * input.qty
  const profit = input.amount - cost
  const commission = Math.max(0, input.amount) * input.commissionRate
  const flow =
    input.source === 'crafted_then_sold'
      ? 'Crafted then sold'
      : 'Sold from finished stock'

  return {
    embeds: [
      {
        title: `${input.businessName} · Pending stash sale`,
        color: 0xf0c14a,
        description: 'Awaiting owner clear — seller gets commission when cleared',
        fields: [
          { name: 'Seller', value: input.sellerName, inline: true },
          {
            name: 'Crafter',
            value: input.crafterName || '—',
            inline: true,
          },
          { name: 'Buyer', value: input.buyerName, inline: true },
          { name: 'Flow', value: flow, inline: true },
          {
            name: 'Item',
            value: `${input.qty}× ${input.productName}`,
            inline: true,
          },
          { name: 'Amount', value: money(input.amount), inline: true },
          { name: 'Cost basis', value: money(cost), inline: true },
          { name: 'Est. profit', value: money(profit), inline: true },
          { name: 'Est. commission', value: money(commission), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function stashClearedEmbed(input: {
  businessName: string
  sellerName: string
  crafterName?: string
  buyerName: string
  productName: string
  qty: number
  amount: number
  unitCost: number
  source: 'from_stock' | 'crafted_then_sold'
  commissionRate: number
}): DiscordPayload {
  const cost = input.unitCost * input.qty
  const profit = input.amount - cost
  const commission = Math.max(0, input.amount) * input.commissionRate
  const flow =
    input.source === 'crafted_then_sold'
      ? 'Crafted then sold'
      : 'Sold from finished stock'

  return {
    embeds: [
      {
        title: `${input.businessName} · Stash sale confirmed`,
        color: GREEN,
        description: 'Owner cleared — sale counts for profit & seller commission',
        fields: [
          { name: 'Seller', value: input.sellerName, inline: true },
          {
            name: 'Crafter',
            value: input.crafterName || '—',
            inline: true,
          },
          { name: 'Buyer', value: input.buyerName, inline: true },
          { name: 'Flow', value: flow, inline: true },
          {
            name: 'Item',
            value: `${input.qty}× ${input.productName}`,
            inline: true,
          },
          { name: 'Amount', value: money(input.amount), inline: true },
          { name: 'Cost basis', value: money(cost), inline: true },
          { name: 'Profit', value: money(profit), inline: true },
          { name: 'Commission', value: money(commission), inline: true },
          {
            name: 'Owner keeps',
            value: money(profit - commission),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function materialPurchaseEmbed(input: {
  businessName: string
  buyerName: string
  materialName: string
  qty: number
  totalPaid: number
  note?: string
}): DiscordPayload {
  return {
    embeds: [
      {
        title: `${input.businessName} · Material purchase`,
        color: 0x5b8def,
        description: 'Store buy for business stock (not a craft)',
        fields: [
          { name: 'Who bought', value: input.buyerName, inline: true },
          {
            name: 'Material',
            value: `${input.qty}× ${input.materialName}`,
            inline: true,
          },
          { name: 'Paid', value: money(input.totalPaid), inline: true },
          ...(input.note
            ? [{ name: 'Note', value: input.note, inline: true }]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function discordReady(settings: AppSettings): boolean {
  return Boolean(settings.discordWebhookUrl?.trim())
}

/** Webhook for restock / material resource requests (falls back to main). */
export function resourcesWebhookUrl(settings: AppSettings): string {
  return (
    settings.discordResourcesWebhookUrl?.trim() ||
    settings.discordWebhookUrl?.trim() ||
    ''
  )
}

export function resourcesDiscordReady(settings: AppSettings): boolean {
  return Boolean(resourcesWebhookUrl(settings))
}

/** Cost-alert channel — no fallback (only posts when dedicated webhook is set). */
export function costAlertWebhookUrl(settings: AppSettings): string {
  return settings.discordCostAlertWebhookUrl?.trim() || ''
}

/** Simple sale/craft alerts + inventory posts (falls back to main). */
export function alertsWebhookUrl(settings: AppSettings): string {
  return (
    settings.discordAlertsWebhookUrl?.trim() ||
    settings.discordWebhookUrl?.trim() ||
    ''
  )
}

/** Public live-inventory URL (no Discord bot / developer key). */
export function inventoryPublicUrl(origin?: string): string {
  if (origin) return `${origin.replace(/\/$/, '')}/inv`
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/inv`
  }
  return '/inv'
}

export function inventorySnapshotEmbed(
  businessName: string,
  materials: { name: string; stock: number }[],
  crafted: { name: string; stock: number }[],
  liveUrl?: string,
): DiscordPayload {
  const mats = materials
    .filter((m) => m.stock > 0)
    .map((m) => `• **${m.name}** — ${m.stock}`)
    .join('\n')
  const fins = crafted
    .filter((p) => p.stock > 0)
    .map((p) => `• **${p.name}** — ${p.stock}`)
    .join('\n')
  const matsAll = materials.map((m) => `• **${m.name}** — ${m.stock}`).join('\n')
  const finsAll = crafted.map((p) => `• **${p.name}** — ${p.stock}`).join('\n')
  const link = liveUrl || inventoryPublicUrl()

  return {
    content: `📦 **${businessName} inventory**\nLive link (no bot key): ${link}`,
    embeds: [
      {
        title: `${businessName} · Inventory`,
        color: 0x5dade2,
        fields: [
          {
            name: 'Raw materials',
            value: (mats || matsAll || '_Empty_').slice(0, 1000),
          },
          {
            name: 'Crafted / finished',
            value: (fins || finsAll || '_Empty_').slice(0, 1000),
          },
          {
            name: 'Always up to date',
            value: `[Open live inventory](${link})`,
          },
        ],
        footer: {
          text: 'Pin this link in Discord — refresh anytime, no /command needed',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function costAlertEmbed(input: {
  businessName: string
  employeeName: string
  productName: string
  qty: number
  unitPrice: number
  floor: number
  mode: 'unit' | 'percent'
  revenue: number
  note?: string
}): DiscordPayload {
  const unitLabel =
    input.mode === 'percent'
      ? `${input.unitPrice}% (floor ${input.floor}%)`
      : `${money(input.unitPrice)} / unit (floor ${money(input.floor)})`
  return {
    content: `⚠️ **Cost alert** — sale below baseline`,
    embeds: [
      {
        title: `${input.businessName} · Under floor`,
        color: 0xe74c3c,
        fields: [
          { name: 'Seller', value: input.employeeName, inline: true },
          {
            name: 'Item',
            value: `${input.qty}× ${input.productName}`,
            inline: true,
          },
          { name: 'Price', value: unitLabel, inline: true },
          { name: 'Revenue', value: money(input.revenue), inline: true },
          ...(input.note
            ? [{ name: 'Note', value: input.note, inline: true }]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }
}
