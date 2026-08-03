/**
 * Business baseline price list — making cost + sell floors by qty.
 * Used for Cost Info UI and Discord cost-alert when a sale is under the floor.
 */

export type PriceGuideKind = 'crafted' | 'supply' | 'external'

export interface PriceTier {
  /** Inclusive lower bound (default 1) */
  qtyFrom: number
  /** Inclusive upper bound; omit = no upper limit */
  qtyTo?: number
  /** Minimum allowed unit sell price (or % if pricingMode is percent) */
  sellMin: number
  /** Typical / max sell (display) */
  sellMax?: number
}

export interface PriceGuideItem {
  id: string
  name: string
  kind: PriceGuideKind
  /** Linked product id in inventory / sales */
  productId: string
  /** Making / our cost (unit $). For percent items this is our % cost. */
  makingCost: number
  pricingMode: 'unit' | 'percent'
  /** Short label for making cost column */
  makingLabel?: string
  tiers: PriceTier[]
}

export const PRICE_GUIDE: PriceGuideItem[] = [
  {
    id: 'guide-grape-ape',
    name: 'Grape Ape Seed',
    kind: 'crafted',
    productId: 'prod-grape-ape',
    makingCost: 420,
    pricingMode: 'unit',
    tiers: [
      { qtyFrom: 1, qtyTo: 999, sellMin: 800, sellMax: 850 },
      { qtyFrom: 1000, sellMin: 750, sellMax: 800 },
    ],
  },
  {
    id: 'guide-insecticide',
    name: 'Insecticide',
    kind: 'crafted',
    productId: 'prod-insecticide',
    makingCost: 120,
    pricingMode: 'unit',
    tiers: [
      { qtyFrom: 1, qtyTo: 999, sellMin: 350, sellMax: 350 },
      { qtyFrom: 1000, sellMin: 280, sellMax: 300 },
    ],
  },
  {
    id: 'guide-exodus',
    name: 'Exodus Seed',
    kind: 'crafted',
    productId: 'prod-exodus',
    makingCost: 210,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 300, sellMax: 300 }],
  },
  {
    id: 'guide-headband',
    name: 'Headband Seed',
    kind: 'crafted',
    productId: 'prod-headband',
    makingCost: 210,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 300, sellMax: 300 }],
  },
  {
    id: 'guide-rolling-paper',
    name: 'Rolling Paper',
    kind: 'supply',
    productId: 'prod-rolling-paper',
    makingCost: 70,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 200, sellMax: 200 }],
  },
  {
    id: 'guide-empty-bag',
    name: 'Empty Bag',
    kind: 'supply',
    productId: 'prod-empty-bag',
    makingCost: 100,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 200, sellMax: 200 }],
  },
  {
    id: 'guide-silver-ember',
    name: 'Silver Ember Cigarette',
    kind: 'supply',
    productId: 'prod-silver-ember',
    makingCost: 0,
    pricingMode: 'unit',
    makingLabel: '—',
    tiers: [{ qtyFrom: 1, sellMin: 2000, sellMax: 2000 }],
  },
  {
    id: 'guide-royal-drift',
    name: 'Royal Drift Cigarette',
    kind: 'supply',
    productId: 'prod-royal-drift',
    makingCost: 0,
    pricingMode: 'unit',
    makingLabel: '—',
    tiers: [{ qtyFrom: 1, sellMin: 2100, sellMax: 2100 }],
  },
  {
    id: 'guide-black-velvet',
    name: 'Black Velvet Cigarette',
    kind: 'supply',
    productId: 'prod-black-velvet',
    makingCost: 0,
    pricingMode: 'unit',
    makingLabel: '—',
    tiers: [{ qtyFrom: 1, sellMin: 2200, sellMax: 2200 }],
  },
  {
    id: 'guide-lighter',
    name: 'Lighter',
    kind: 'supply',
    productId: 'prod-lighter',
    makingCost: 200,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 1000, sellMax: 1000 }],
  },
  {
    id: 'guide-money-whitewash',
    name: 'Money Whitewash',
    kind: 'external',
    productId: 'prod-ext-money-whitewash',
    makingCost: 2,
    pricingMode: 'percent',
    makingLabel: '2% our cost',
    tiers: [{ qtyFrom: 1, sellMin: 3, sellMax: 5 }],
  },
  {
    id: 'guide-joints-premade',
    name: 'Joints PreMade',
    kind: 'external',
    productId: 'prod-ext-joints-premade',
    makingCost: 1000,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 1200, sellMax: 1200 }],
  },
  {
    id: 'guide-weed-proc-bags',
    name: 'Weed Processing (With Baggies)',
    kind: 'external',
    productId: 'prod-ext-weed-proc-bags',
    makingCost: 430,
    pricingMode: 'unit',
    makingLabel: '$330 + $100 baggies',
    tiers: [{ qtyFrom: 1, sellMin: 550, sellMax: 600 }],
  },
  {
    id: 'guide-weed-proc-plain',
    name: 'Weed Processing (W/O Baggies)',
    kind: 'external',
    productId: 'prod-ext-weed-proc-plain',
    makingCost: 330,
    pricingMode: 'unit',
    tiers: [{ qtyFrom: 1, sellMin: 400, sellMax: 450 }],
  },
]

export function guideForProduct(productId: string): PriceGuideItem | undefined {
  return PRICE_GUIDE.find((g) => g.productId === productId)
}

export function tierForQty(
  item: PriceGuideItem,
  qty: number,
): PriceTier | undefined {
  const q = Math.max(1, qty)
  return item.tiers.find((t) => {
    const from = t.qtyFrom ?? 1
    const to = t.qtyTo ?? Number.POSITIVE_INFINITY
    return q >= from && q <= to
  })
}

/** Minimum unit sell (or % rate) allowed for this product + qty. */
export function minSellForSale(
  productId: string,
  qty: number,
): { min: number; mode: 'unit' | 'percent'; item: PriceGuideItem } | null {
  const item = guideForProduct(productId)
  if (!item) return null
  const tier = tierForQty(item, qty)
  if (!tier) return null
  return { min: tier.sellMin, mode: item.pricingMode, item }
}

export function formatSellRange(tier: PriceTier, mode: 'unit' | 'percent'): string {
  const suffix = mode === 'percent' ? '%' : ''
  if (tier.sellMax != null && tier.sellMax !== tier.sellMin) {
    return `${tier.sellMin}${suffix} – ${tier.sellMax}${suffix}`
  }
  return `${tier.sellMin}${suffix}`
}

export function formatQtyBand(tier: PriceTier): string {
  if (tier.qtyTo == null) {
    return tier.qtyFrom <= 1 ? 'Any qty' : `${tier.qtyFrom}+`
  }
  if (tier.qtyFrom <= 1) return `Under ${tier.qtyTo + 1}`
  return `${tier.qtyFrom}–${tier.qtyTo}`
}
