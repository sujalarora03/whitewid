export type Category = 'seeds' | 'fertilizer' | 'supplies' | 'smoking' | 'other'

export interface Ingredient {
  materialId: string
  qty: number
}

export interface Material {
  id: string
  name: string
  cost: number
  category: Category
  stock: number
}

export interface Recipe {
  id: string
  name: string
  category: Category
  ingredients: Ingredient[]
  /** Default sale price when sold (editable) */
  salePrice: number
}

export interface Product {
  id: string
  name: string
  category: Category
  cost: number
  salePrice: number
  stock: number
  /** If from a recipe, link for COGS calc */
  recipeId?: string
}

export interface Employee {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface Sale {
  id: string
  employeeId: string
  productId: string
  productName: string
  qty: number
  unitPrice: number
  unitCost: number
  createdAt: string
  note?: string
}

export interface Bonus {
  id: string
  employeeId: string
  amount: number
  reason: string
  createdAt: string
}

/** Customer/employee bought from shop stash — owner must clear */
export interface StashBuy {
  id: string
  employeeId: string
  buyerName: string
  productId: string
  productName: string
  qty: number
  amount: number
  status: 'pending' | 'cleared'
  createdAt: string
  clearedAt?: string
  note?: string
}

/** Craft completed by an employee (even if not sold yet).
 * Does NOT mean they bought the materials — those are separate. */
export interface CraftLog {
  id: string
  employeeId: string
  recipeId: string
  recipeName: string
  qty: number
  unitCost: number
  totalCost: number
  /** Whether business material stock was deducted */
  deductedStock: boolean
  createdAt: string
  note?: string
}

/** Someone bought materials for the business (separate from crafting) */
export interface MaterialPurchase {
  id: string
  /** Who ran the store buy — empty string = owner / business */
  employeeId: string
  materialId: string
  materialName: string
  qty: number
  unitCost: number
  totalPaid: number
  createdAt: string
  note?: string
}

export interface AppSettings {
  businessName: string
  commissionRate: number
  weekStartsOn: 0 | 1
  /** Discord channel incoming webhook URL */
  discordWebhookUrl: string
  discordPostSales: boolean
  discordPostBonuses: boolean
  discordPostCrafts: boolean
  discordPostStash: boolean
}

export interface AppState {
  materials: Material[]
  recipes: Recipe[]
  products: Product[]
  employees: Employee[]
  sales: Sale[]
  bonuses: Bonus[]
  stashBuys: StashBuy[]
  craftLogs: CraftLog[]
  materialPurchases: MaterialPurchase[]
  settings: AppSettings
}

export type TabId =
  | 'dashboard'
  | 'craft'
  | 'sales'
  | 'stash'
  | 'employees'
  | 'inventory'
  | 'prices'
