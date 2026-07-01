import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../lib/api'
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

interface ApiRecipeGroup {
  menuItemId: string
  menuItemName: string
  menuItemCategory: string
  ingredients: { ingredientId: string; qty: number }[]
}

interface ApiIngredient {
  id: string
  name: string
  unit: string
  stock: string | number
  threshold: string | number
  supplier: string | null
}

interface ApiRestock {
  id: string
  ingredientId: string
  qtyAdded: string | number
  date: string
  note: string | null
  createdAt: string
}

function recipeFromApi(r: ApiRecipeGroup): RecipeMapping {
  return {
    menuItemId: r.menuItemId,
    menuItemName: r.menuItemName,
    menuItemEmoji: r.menuItemCategory.split(' ')[0] ?? '☕',
    ingredients: r.ingredients,
  }
}

function ingFromApi(i: ApiIngredient): Ingredient {
  return {
    id: i.id,
    name: i.name,
    unit: i.unit as IngredientUnit,
    stock: Number(i.stock),
    threshold: Number(i.threshold),
    supplier: i.supplier ?? undefined,
  }
}

function restockFromApi(r: ApiRestock, loggedBy?: string): RestockEntry {
  return {
    id: r.id,
    ingredientId: r.ingredientId,
    qty: Number(r.qtyAdded),
    date: r.date.split('T')[0],
    note: r.note ?? undefined,
    loggedAt: new Date(r.createdAt).getTime(),
    loggedBy,
  }
}

function toIsoDate(date: string): string {
  return date.includes('T') ? date : `${date}T00:00:00.000Z`
}

interface InventoryStore {
  // API-backed (not persisted — reloaded on mount)
  ingredients: Ingredient[]
  restockEntries: RestockEntry[]
  loading: boolean
  offlineFallback: boolean  // true when backend is unreachable and data came from old localStorage

  // Local-persisted (recipes contain display metadata not in DB)
  recipes: RecipeMapping[]
  deductionLogs: DeductionLog[]

  fetch: () => Promise<void>

  addIngredient: (data: Omit<Ingredient, 'id'>) => Promise<void>
  updateIngredient: (id: string, data: Partial<Omit<Ingredient, 'id'>>) => Promise<void>
  deleteIngredient: (id: string) => Promise<void>

  addOrUpdateRecipe: (recipe: RecipeMapping) => Promise<void>
  removeRecipe: (menuItemId: string) => Promise<void>

  logRestock: (data: Omit<RestockEntry, 'id' | 'loggedAt'>) => Promise<void>
  deductForBill: (lines: OrderLine[], compIds: string[], billId: string, at: number) => void
  clearData: () => void
}

let fetchInProgress = false

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      ingredients: [],
      restockEntries: [],
      loading: false,
      offlineFallback: false,
      recipes: [],
      deductionLogs: [],

      fetch: async () => {
        if (fetchInProgress) return
        fetchInProgress = true
        set({ loading: true })
        try {
          const [ings, restocks, apiRecipes] = await Promise.all([
            apiFetch<ApiIngredient[]>('GET', '/inventory/ingredients'),
            apiFetch<ApiRestock[]>('GET', '/inventory/restock'),
            apiFetch<ApiRecipeGroup[]>('GET', '/inventory/recipes'),
          ])
          set({
            ingredients: ings.map(ingFromApi),
            restockEntries: restocks.map((r) => restockFromApi(r)),
            recipes: apiRecipes.map(recipeFromApi),
            loading: false,
            offlineFallback: false,
          })
        } catch {
          set({
            loading: false,
            offlineFallback: true,
            // recipes left untouched — local persisted copy survives offline
          })
        } finally {
          fetchInProgress = false
        }
      },

      addIngredient: async (data) => {
        const ing = await apiFetch<ApiIngredient>('POST', '/inventory/ingredients', {
          name: data.name,
          unit: data.unit,
          stock: data.stock,
          threshold: data.threshold,
          supplier: data.supplier,
        })
        set((s) => ({ ingredients: [...s.ingredients, ingFromApi(ing)] }))
      },

      updateIngredient: async (id, data) => {
        const ing = await apiFetch<ApiIngredient>('PATCH', `/inventory/ingredients/${id}`, data)
        set((s) => ({
          ingredients: s.ingredients.map((i) => (i.id === id ? ingFromApi(ing) : i)),
        }))
      },

      deleteIngredient: async (id) => {
        if (!get().offlineFallback) {
          await apiFetch('DELETE', `/inventory/ingredients/${id}`)
        }
        set((s) => ({
          ingredients: s.ingredients.filter((i) => i.id !== id),
          recipes: s.recipes.map((r) => ({
            ...r,
            ingredients: r.ingredients.filter((ri) => ri.ingredientId !== id),
          })),
        }))
      },

      addOrUpdateRecipe: async (recipe) => {
        await apiFetch('PUT', `/inventory/recipes/${recipe.menuItemId}`, {
          lines: recipe.ingredients.map((ri) => ({
            ingredientId: ri.ingredientId,
            qtyPerUnit: ri.qty,
          })),
        })
        set((s) => {
          const idx = s.recipes.findIndex((r) => r.menuItemId === recipe.menuItemId)
          if (idx >= 0) {
            const updated = [...s.recipes]
            updated[idx] = recipe
            return { recipes: updated }
          }
          return { recipes: [...s.recipes, recipe] }
        })
      },

      removeRecipe: async (menuItemId) => {
        await apiFetch('PUT', `/inventory/recipes/${menuItemId}`, { lines: [] })
        set((s) => ({ recipes: s.recipes.filter((r) => r.menuItemId !== menuItemId) }))
      },

      logRestock: async (data) => {
        const entry = await apiFetch<ApiRestock>('POST', '/inventory/restock', {
          ingredientId: data.ingredientId,
          qtyAdded: data.qty,
          date: toIsoDate(data.date),
          note: data.note,
        })
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === data.ingredientId ? { ...i, stock: i.stock + data.qty } : i
          ),
          restockEntries: [restockFromApi(entry, data.loggedBy), ...s.restockEntries],
        }))
      },

      // Local-only deduction for the auto-deduct audit view.
      // DB stock is not updated here — the backend billing/settle route is responsible for DB deduction.
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
          entries.push({ ingredientId: ing.id, ingredientName: ing.name, unit: ing.unit, before, qty, after, why: d.whyParts.join(' + ') })
          return { ...ing, stock: after }
        })

        set((s) => ({
          ingredients: updatedIngredients,
          deductionLogs: [{ billId, at, entries }, ...s.deductionLogs],
        }))
      },

      clearData: () => set({ ingredients: [], restockEntries: [], recipes: [], deductionLogs: [], loading: false, offlineFallback: false }),
    }),
    {
      name: 'cafeOSum-inventory-v2',
      // Only persist the local-derived fields; ingredients/restock come from API on mount
      partialize: (s) => ({ recipes: s.recipes, deductionLogs: s.deductionLogs }),
    }
  )
)
