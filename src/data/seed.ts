import type { AppState } from '../types'
import {
  CATALOG_MATERIALS,
  CATALOG_PRODUCTS,
  CATALOG_RECIPES,
} from './recipes'

export const STORAGE_KEY = 'second-shop-manager-v1'

export const defaultState = (): AppState => ({
  settings: {
    businessName: 'New Shop',
    ownerName: 'Pablo the II Escobar',
    ownerPassword: 'sujal@3301',
    commissionRate: 0.15,
    weekStartsOn: 1,
    discordWebhookUrl: '',
    discordResourcesWebhookUrl: '',
    discordCostAlertWebhookUrl: '',
    discordAlertsWebhookUrl: '',
    discordPostSales: true,
    discordPostBonuses: true,
    discordPostCrafts: true,
    discordPostStash: true,
    discordPostMaterials: true,
  },
  materials: CATALOG_MATERIALS.map((m) => ({ ...m })),
  recipes: CATALOG_RECIPES.map((r) => ({
    ...r,
    ingredients: r.ingredients.map((i) => ({ ...i })),
  })),
  products: CATALOG_PRODUCTS.map((p) => ({ ...p })),
  employees: [
    {
      id: 'emp-owner',
      name: 'Pablo The II Escobar',
      password: 'sujal@3301',
      grade: 'Owner',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  sales: [],
  bonuses: [],
  stashBuys: [],
  pendingOrders: [],
  craftLogs: [],
  materialPurchases: [],
  deletedIds: {
    sales: [],
    bonuses: [],
    stashBuys: [],
    pendingOrders: [],
    craftLogs: [],
    materialPurchases: [],
    employees: [],
  },
  auditLogs: [],
})

/** Production cost for one craft from current material prices */
export function recipeUnitCost(
  recipeId: string,
  materials: AppState['materials'],
  recipes: AppState['recipes'],
): number {
  const recipe = recipes.find((r) => r.id === recipeId)
  if (!recipe) return 0
  return recipe.ingredients.reduce((sum, ing) => {
    const mat = materials.find((m) => m.id === ing.materialId)
    return sum + (mat?.cost ?? 0) * ing.qty
  }, 0)
}
