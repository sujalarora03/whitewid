/**
 * Rate card floors — filled as sale prices are known for each craft.
 * Used for Cost Info and Discord cost-alert when a sale is under the floor.
 */

export type PriceGuideKind = 'crafted' | 'supply' | 'external'

export interface PriceTier {
  qtyFrom: number
  qtyTo?: number
  sellMin: number
  sellMax?: number
}

export interface PriceGuideItem {
  id: string
  name: string
  kind: PriceGuideKind
  productId: string
  makingCost: number
  pricingMode: 'unit' | 'percent'
  makingLabel?: string
  tiers: PriceTier[]
}

export const PRICE_GUIDE: PriceGuideItem[] = []

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

/** Family internal unit prices (no cost alert). Empty until this shop sets them. */
export const FAMILY_UNIT_PRICE: Record<string, number> = {}

export function familyUnitPrice(productId: string): number | null {
  return FAMILY_UNIT_PRICE[productId] ?? null
}

export function hasFamilyDeals(): boolean {
  return Object.keys(FAMILY_UNIT_PRICE).length > 0
}
