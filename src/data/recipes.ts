/**
 * FastLane Mechanic craft catalog.
 *
 * Filled from in-game screenshots, one blueprint at a time.
 * Each recipe’s `ingredients` are the **stash needed per craft**.
 *
 * Still needed from screenshots:
 * Stage 4 Supercharger, 27mm Turbo,
 * Repair Kit, Advanced Repair Kit, Body Repair Kit,
 * Alternator Repair Kit, Fuel Pump Repair Kit, and the rest of the library.
 */

import type { Material, Product, Recipe } from '../types'

export const CATALOG_MATERIALS: Material[] = [
  { id: 'mat-scrap-metal', name: 'Scrap Metal', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-scrap-tin', name: 'Scrap Tin', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-steel-plate', name: 'Steel Plate', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-broken-carparts', name: 'Broken Carparts', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-polymer-strip', name: 'Polymer Strip', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-circuit-bundle', name: 'Circuit Bundle', cost: 0, category: 'parts', stock: 0 },
  { id: 'mat-lightweight-metal', name: 'Lightweight Metal', cost: 0, category: 'parts', stock: 0 },
]

export const CATALOG_RECIPES: Recipe[] = [
  {
    id: 'rec-engine-stage-1',
    name: 'Engine Stage 1',
    category: 'engines',
    salePrice: 0,
    ingredients: [
      { materialId: 'mat-scrap-metal', qty: 27 },
      { materialId: 'mat-scrap-tin', qty: 17 },
      { materialId: 'mat-steel-plate', qty: 17 },
      { materialId: 'mat-broken-carparts', qty: 15 },
      { materialId: 'mat-polymer-strip', qty: 20 },
      { materialId: 'mat-circuit-bundle', qty: 48 },
      { materialId: 'mat-lightweight-metal', qty: 12 },
    ],
  },
  {
    id: 'rec-engine-stage-2',
    name: 'Engine Stage 2',
    category: 'engines',
    salePrice: 0,
    ingredients: [
      { materialId: 'mat-scrap-metal', qty: 30 },
      { materialId: 'mat-scrap-tin', qty: 18 },
      { materialId: 'mat-steel-plate', qty: 18 },
      { materialId: 'mat-broken-carparts', qty: 18 },
      { materialId: 'mat-polymer-strip', qty: 23 },
      { materialId: 'mat-circuit-bundle', qty: 50 },
      { materialId: 'mat-lightweight-metal', qty: 12 },
    ],
  },
  {
    id: 'rec-engine-stage-3',
    name: 'Engine Stage 3',
    category: 'engines',
    salePrice: 0,
    ingredients: [
      { materialId: 'mat-scrap-metal', qty: 35 },
      { materialId: 'mat-scrap-tin', qty: 20 },
      { materialId: 'mat-steel-plate', qty: 20 },
      { materialId: 'mat-broken-carparts', qty: 20 },
      { materialId: 'mat-polymer-strip', qty: 25 },
      { materialId: 'mat-circuit-bundle', qty: 55 },
      { materialId: 'mat-lightweight-metal', qty: 12 },
    ],
  },
  {
    id: 'rec-engine-stage-4',
    name: 'Engine Stage 4',
    category: 'engines',
    salePrice: 0,
    ingredients: [
      { materialId: 'mat-scrap-metal', qty: 40 },
      { materialId: 'mat-scrap-tin', qty: 25 },
      { materialId: 'mat-steel-plate', qty: 25 },
      { materialId: 'mat-broken-carparts', qty: 22 },
      { materialId: 'mat-polymer-strip', qty: 30 },
      { materialId: 'mat-circuit-bundle', qty: 65 },
      { materialId: 'mat-lightweight-metal', qty: 14 },
    ],
  },
  {
    id: 'rec-stage-3-supercharger',
    name: 'Stage 3 Supercharger',
    category: 'forced-induction',
    salePrice: 0,
    ingredients: [
      { materialId: 'mat-scrap-metal', qty: 40 },
      { materialId: 'mat-scrap-tin', qty: 25 },
      { materialId: 'mat-steel-plate', qty: 25 },
      { materialId: 'mat-broken-carparts', qty: 22 },
      { materialId: 'mat-polymer-strip', qty: 30 },
      { materialId: 'mat-circuit-bundle', qty: 65 },
      { materialId: 'mat-lightweight-metal', qty: 14 },
    ],
  },
]

export const CATALOG_PRODUCTS: Product[] = [
  {
    id: 'prod-engine-stage-1',
    name: 'Engine Stage 1',
    category: 'engines',
    cost: 0,
    salePrice: 0,
    stock: 0,
    recipeId: 'rec-engine-stage-1',
  },
  {
    id: 'prod-engine-stage-2',
    name: 'Engine Stage 2',
    category: 'engines',
    cost: 0,
    salePrice: 0,
    stock: 0,
    recipeId: 'rec-engine-stage-2',
  },
  {
    id: 'prod-engine-stage-3',
    name: 'Engine Stage 3',
    category: 'engines',
    cost: 0,
    salePrice: 0,
    stock: 0,
    recipeId: 'rec-engine-stage-3',
  },
  {
    id: 'prod-engine-stage-4',
    name: 'Engine Stage 4',
    category: 'engines',
    cost: 0,
    salePrice: 0,
    stock: 0,
    recipeId: 'rec-engine-stage-4',
  },
  {
    id: 'prod-stage-3-supercharger',
    name: 'Stage 3 Supercharger',
    category: 'forced-induction',
    cost: 0,
    salePrice: 0,
    stock: 0,
    recipeId: 'rec-stage-3-supercharger',
  },
]
