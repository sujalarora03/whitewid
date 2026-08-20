/**
 * Craft catalog for this shop.
 *
 * Filled from in-game screenshots, one craftable item at a time.
 * Each recipe’s `ingredients` are the **stash needed per craft**.
 * Sale prices go on the matching product (Rate Card).
 *
 * Paste the next screenshot and this file is what gets updated.
 */

import type { Material, Product, Recipe } from '../types'

export const CATALOG_MATERIALS: Material[] = [
  // Example after a screenshot:
  // { id: 'mat-steel', name: 'Steel', cost: 0, category: 'supplies', stock: 0 },
]

export const CATALOG_RECIPES: Recipe[] = [
  // Example:
  // {
  //   id: 'rec-example',
  //   name: 'Example Item',
  //   category: 'other',
  //   salePrice: 0,
  //   ingredients: [{ materialId: 'mat-steel', qty: 2 }],
  // },
]

export const CATALOG_PRODUCTS: Product[] = [
  // Example:
  // {
  //   id: 'prod-example',
  //   name: 'Example Item',
  //   category: 'other',
  //   cost: 0,
  //   salePrice: 0,
  //   stock: 0,
  //   recipeId: 'rec-example',
  // },
]
