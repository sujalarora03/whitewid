export type Category =
  | 'seeds'
  | 'fertilizer'
  | 'supplies'
  | 'smoking'
  | 'other'
  | 'external'

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
  /**
   * inventory = finished/shop stock (default).
   * external = service / outside job — no stock deduction.
   */
  kind?: 'inventory' | 'external'
  /** unit = $ per item; percent = unitPrice is % of qty (qty = principal) */
  pricingMode?: 'unit' | 'percent'
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
  /** Copied from product at sale time */
  kind?: 'inventory' | 'external'
  pricingMode?: 'unit' | 'percent'
  /** normal retail | family internal | gang cost-to-cost */
  dealType?: 'normal' | 'family' | 'gang'
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
  /** Redundant flag so personal never leaks into top crafter if purpose is lost */
  isPersonal?: boolean
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
  /** Discord channel for under-floor sales (cost alerts) */
  discordCostAlertWebhookUrl: string
  /** Optional channel for simple sale/craft alerts + inventory pings (falls back to main) */
  discordAlertsWebhookUrl: string
  discordPostSales: boolean
  discordPostBonuses: boolean
  discordPostCrafts: boolean
  discordPostStash: boolean
  discordPostMaterials: boolean
  /**
   * Set after stock is rebuilt from purchase/craft/sale logs.
   * Missing = run one-time migration on next load.
   */
  stockLedgerRebuiltAt?: string
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

/** Owner-facing activity trail (creates, deletes, clears, roster changes) */
export interface AuditEntry {
  id: string
  at: string
  actorId: string
  actorName: string
  action: 'create' | 'delete' | 'clear' | 'update' | 'reset'
  entity:
    | 'sale'
    | 'craft'
    | 'stash'
    | 'order'
    | 'bonus'
    | 'material_purchase'
    | 'employee'
    | 'stock'
    | 'settings'
    | 'system'
  entityId: string
  summary: string
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
  auditLogs: AuditEntry[]
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
  | 'audit'
