import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderLine } from './tableStore'

export type IngredientUnit = 'g' | 'ml' | 'pcs' | 'kg' | 'L'

export interface Ingredient {
  id: string
  name: string
  unit: IngredientUnit
  stock: number
  threshold: number
  supplier?: string
}

export interface RecipeIngredient {
  ingredientId: string
  qty: number
}

export interface RecipeMapping {
  menuItemId: string
  menuItemName: string
  menuItemEmoji: string
  ingredients: RecipeIngredient[]
}

export interface RestockEntry {
  id: string
  ingredientId: string
  qty: number
  date: string
  note?: string
  loggedAt: number
  loggedBy?: string
}

export interface DeductionEntry {
  ingredientId: string
  ingredientName: string
  unit: IngredientUnit
  before: number
  qty: number
  after: number
  why: string
}

export interface DeductionLog {
  billId: string
  at: number
  entries: DeductionEntry[]
}

const SEED_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1',  name: 'Espresso Beans',  unit: 'g',   stock: 850,  threshold: 200, supplier: 'Coffee Empire India' },
  { id: 'ing-2',  name: 'Whole Milk',      unit: 'ml',  stock: 2400, threshold: 500, supplier: 'Arun Traders' },
  { id: 'ing-3',  name: 'Sugar',           unit: 'g',   stock: 180,  threshold: 200 },
  { id: 'ing-4',  name: 'Cardamom',        unit: 'g',   stock: 45,   threshold: 50  },
  { id: 'ing-5',  name: 'Tea Leaves',      unit: 'g',   stock: 320,  threshold: 100, supplier: 'Local Market' },
  { id: 'ing-6',  name: 'Bread Slices',    unit: 'pcs', stock: 12,   threshold: 20  },
  { id: 'ing-7',  name: 'Blueberry Jam',   unit: 'g',   stock: 400,  threshold: 150, supplier: 'Big Basket' },
  { id: 'ing-8',  name: 'Paper Cups',      unit: 'pcs', stock: 85,   threshold: 50  },
  { id: 'ing-9',  name: 'Coconut Oil',     unit: 'ml',  stock: 600,  threshold: 100 },
  { id: 'ing-10', name: 'Vanilla Extract', unit: 'ml',  stock: 30,   threshold: 20  },
]

const SEED_RECIPES: RecipeMapping[] = [
  {
    menuItemId: 'demo-1',
    menuItemName: 'Masala Chai',
    menuItemEmoji: '🍵',
    ingredients: [
      { ingredientId: 'ing-5', qty: 5 },
      { ingredientId: 'ing-2', qty: 100 },
      { ingredientId: 'ing-3', qty: 10 },
      { ingredientId: 'ing-4', qty: 2 },
    ],
  },
  {
    menuItemId: 'demo-2',
    menuItemName: 'Filter Coffee',
    menuItemEmoji: '☕',
    ingredients: [
      { ingredientId: 'ing-1', qty: 18 },
      { ingredientId: 'ing-2', qty: 120 },
    ],
  },
  {
    menuItemId: 'demo-3',
    menuItemName: 'Vada Pav',
    menuItemEmoji: '🥗',
    ingredients: [
      { ingredientId: 'ing-6', qty: 2 },
    ],
  },
]

interface InventoryStore {
  ingredients: Ingredient[]
  recipes: RecipeMapping[]
  restockEntries: RestockEntry[]
  deductionLogs: DeductionLog[]
  nextIngSeq: number
  nextRestockSeq: number

  addIngredient: (data: Omit<Ingredient, 'id'>) => void
  updateIngredient: (id: string, data: Partial<Omit<Ingredient, 'id'>>) => void
  deleteIngredient: (id: string) => void

  addOrUpdateRecipe: (recipe: RecipeMapping) => void
  removeRecipe: (menuItemId: string) => void

  logRestock: (data: Omit<RestockEntry, 'id' | 'loggedAt'>) => void
  deductForBill: (lines: OrderLine[], compIds: string[], billId: string, at: number) => void
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      ingredients: SEED_INGREDIENTS,
      recipes: SEED_RECIPES,
      restockEntries: [],
      deductionLogs: [],
      nextIngSeq: 11,
      nextRestockSeq: 1,

      addIngredient: (data) =>
        set((s) => ({
          ingredients: [...s.ingredients, { ...data, id: `ing-${s.nextIngSeq}` }],
          nextIngSeq: s.nextIngSeq + 1,
        })),

      updateIngredient: (id, data) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })),

      deleteIngredient: (id) =>
        set((s) => ({
          ingredients: s.ingredients.filter((i) => i.id !== id),
          recipes: s.recipes.map((r) => ({
            ...r,
            ingredients: r.ingredients.filter((ri) => ri.ingredientId !== id),
          })),
        })),

      addOrUpdateRecipe: (recipe) =>
        set((s) => {
          const idx = s.recipes.findIndex((r) => r.menuItemId === recipe.menuItemId)
          if (idx >= 0) {
            const updated = [...s.recipes]
            updated[idx] = recipe
            return { recipes: updated }
          }
          return { recipes: [...s.recipes, recipe] }
        }),

      removeRecipe: (menuItemId) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.menuItemId !== menuItemId) })),

      logRestock: (data) =>
        set((s) => {
          const entry: RestockEntry = { ...data, id: `rst-${s.nextRestockSeq}`, loggedAt: Date.now() }
          return {
            ingredients: s.ingredients.map((i) =>
              i.id === data.ingredientId ? { ...i, stock: i.stock + data.qty } : i
            ),
            restockEntries: [entry, ...s.restockEntries],
            nextRestockSeq: s.nextRestockSeq + 1,
          }
        }),

      deductForBill: (lines, compIds, billId, at) => {
        const { ingredients, recipes } = get()
        const compSet = new Set(compIds)

        const deductMap: Record<string, { totalQty: number; whyParts: string[] }> = {}

        for (const line of lines) {
          if (compSet.has(line.id)) continue
          const recipe = recipes.find((r) => r.menuItemId === line.menuItemId)
          if (!recipe) continue
          for (const ri of recipe.ingredients) {
            const ing = ingredients.find((i) => i.id === ri.ingredientId)
            if (!ing) continue
            if (!deductMap[ri.ingredientId]) deductMap[ri.ingredientId] = { totalQty: 0, whyParts: [] }
            deductMap[ri.ingredientId].totalQty += ri.qty * line.qty
            deductMap[ri.ingredientId].whyParts.push(`${line.qty}× ${line.name} × ${ri.qty}${ing.unit}`)
          }
        }

        if (Object.keys(deductMap).length === 0) return

        const entries: DeductionEntry[] = []
        const updatedIngredients = ingredients.map((ing) => {
          const d = deductMap[ing.id]
          if (!d) return ing
          const before = ing.stock
          const qty = d.totalQty
          const after = Math.max(0, before - qty)
          entries.push({
            ingredientId: ing.id,
            ingredientName: ing.name,
            unit: ing.unit,
            before,
            qty,
            after,
            why: d.whyParts.join(' + '),
          })
          return { ...ing, stock: after }
        })

        set((s) => ({
          ingredients: updatedIngredients,
          deductionLogs: [{ billId, at, entries }, ...s.deductionLogs],
        }))
      },
    }),
    { name: 'cafeOSum-inventory' }
  )
)
