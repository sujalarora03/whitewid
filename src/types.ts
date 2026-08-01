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
  /** Last time stock changed — used so sync does not revive old higher counts */
  stockUpdatedAt?: string
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
  /** Last time stock changed — used so sync does not revive old higher counts */
  stockUpdatedAt?: string
  /** If from a recipe, link for COGS calc */
  recipeId?: string
}

export interface Employee {
  id: string
  name: string
  /** Static plaintext password set by owner (simple shop PIN) */
  password: string
  /** Role / grade for promote-demote */
  grade: string
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

/**
 * Stash sale: item left the shop stash.
 * Crafter and seller can be different people (common crew split).
 * Pending until owner clears (= confirms sale + seller commission).
 */
export interface StashBuy {
  id: string
  /** Who sold it (commission goes here when cleared) */
  employeeId: string
  /** Who crafted it — may differ from seller; empty if unknown / not craftable */
  crafterId?: string
  buyerName: string
  productId: string
  productName: string
  qty: number
  /** Total paid by customer */
  amount: number
  /** Unit production cost at time of log (for profit when cleared) */
  unitCost: number
  /** Sold from finished stock, or craft logged for the crafter then sold */
  source: 'from_stock' | 'crafted_then_sold'
  craftLogId?: string
  /** Linked pending order if this fulfilled one */
  orderId?: string
  /** Set when owner clears — the confirmed sale */
  saleId?: string
  status: 'pending' | 'cleared'
  createdAt: string
  clearedAt?: string
  note?: string
}

/** Customer order waiting to be crafted / sold */
export type OrderStatus =
  | 'open'
  | 'crafting'
  | 'ready'
  | 'fulfilled'
  | 'cancelled'

export interface PendingOrder {
  id: string
  customerName: string
  productId: string
  productName: string
  qty: number
  /** Expected / quoted total (optional) */
  amount: number
  /** Who logged the order */
  createdById: string
  /** Assigned crafter (type-1 workers) */
  crafterId?: string
  /** Assigned seller (type-2 workers) */
  sellerId?: string
  status: OrderStatus
  note?: string
  createdAt: string
  updatedAt: string
  fulfilledAt?: string
  /** Stash sale created when fulfilled */
  stashBuyId?: string
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
  /** business = shop production; personal = crafted for themselves */
  purpose: 'business' | 'personal'
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
  ownerName: string
  /** Static plaintext owner PIN to open Owner mode */
  ownerPassword: string
  commissionRate: number
  weekStartsOn: 0 | 1
  /** Discord channel incoming webhook URL (sales, bonuses, crafts, etc.) */
  discordWebhookUrl: string
  /** Separate Discord channel for material / restock resource requests */
  discordResourcesWebhookUrl: string
  discordPostSales: boolean
  discordPostBonuses: boolean
  discordPostCrafts: boolean
  discordPostStash: boolean
  discordPostMaterials: boolean
}

/** Ids removed on any client — kept so merge-sync does not revive them */
export interface DeletedIds {
  sales: string[]
  bonuses: string[]
  stashBuys: string[]
  pendingOrders: string[]
  craftLogs: string[]
  materialPurchases: string[]
  employees: string[]
}

export interface AppState {
  materials: Material[]
  recipes: Recipe[]
  products: Product[]
  employees: Employee[]
  sales: Sale[]
  bonuses: Bonus[]
  stashBuys: StashBuy[]
  pendingOrders: PendingOrder[]
  craftLogs: CraftLog[]
  materialPurchases: MaterialPurchase[]
  settings: AppSettings
  deletedIds: DeletedIds
}

export type TabId =
  | 'dashboard'
  | 'desk'
  | 'craft'
  | 'personal'
  | 'sales'
  | 'stash'
  | 'orders'
  | 'employees'
  | 'inventory'
  | 'prices'
