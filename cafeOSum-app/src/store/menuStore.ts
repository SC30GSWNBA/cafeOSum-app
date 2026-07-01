import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import { useOnboardingStore, type MenuItem as OnboardingMenuItem } from './onboardingStore'
import { useAuthStore } from './authStore'

// Per-cafe seeded flag so different accounts on the same device never share it
function seededKey() {
  const cafeId = useAuthStore.getState().user?.cafeId ?? 'anon'
  return `cafeOSum-menu-seeded-${cafeId}`
}

export interface MenuItem {
  id: string
  name: string
  hindiName?: string
  price: number
  category: string
  taxRate: number   // numeric, e.g. 5 for 5%
  gstRate: string   // display string, e.g. "5%"
  isAvailable: boolean
}

interface ApiMenuItem {
  id: string
  name: string
  hindiName: string | null
  price: number | string
  category: string
  taxRate: number | string
  isAvailable: boolean
}

function fromApi(i: ApiMenuItem): MenuItem {
  const taxRate = Number(i.taxRate)
  return {
    id: i.id,
    name: i.name,
    hindiName: i.hindiName ?? undefined,
    price: Number(i.price),
    category: i.category,
    taxRate,
    gstRate: `${taxRate}%`,
    isAvailable: i.isAvailable,
  }
}

function fromOnboarding(item: OnboardingMenuItem): MenuItem {
  const taxRate = parseFloat(item.gstRate.replace('%', '')) || 0
  return {
    id: item.id,
    name: item.name,
    hindiName: item.hindiName,
    price: item.price,
    category: item.category,
    taxRate,
    gstRate: item.gstRate,
    isAvailable: true,
  }
}

interface AddPayload {
  name: string
  hindiName?: string
  category: string
  price: number
  taxRate: number
  isAvailable?: boolean
}

interface MenuStore {
  items: MenuItem[]
  loading: boolean
  offlineFallback: boolean  // true when backend is unreachable and items came from localStorage
  fetch: () => Promise<void>
  add: (data: AddPayload) => Promise<void>
  edit: (id: string, data: Partial<AddPayload>) => Promise<void>
  remove: (id: string) => Promise<void>
  clearData: () => void
}

let fetchInProgress = false

export const useMenuStore = create<MenuStore>()((set, get) => ({
  items: [],
  loading: false,
  offlineFallback: false,

  fetch: async () => {
    if (fetchInProgress) return
    fetchInProgress = true
    set({ loading: true })
    try {
      const items = await apiFetch<ApiMenuItem[]>('GET', '/cafe/menu')

      // First visit with empty DB — auto-migrate items the user added during onboarding
      if (items.length === 0 && !localStorage.getItem(seededKey())) {
        const { menuItems } = useOnboardingStore.getState()
        if (menuItems.length > 0) {
          const created: MenuItem[] = []
          for (const oi of menuItems) {
            try {
              const taxRate = parseFloat(oi.gstRate.replace('%', '')) || 0
              const m = await apiFetch<ApiMenuItem>('POST', '/cafe/menu', {
                name: oi.name,
                hindiName: oi.hindiName || undefined,
                price: oi.price,
                category: oi.category,
                taxRate,
              })
              created.push(fromApi(m))
            } catch { /* non-fatal — skip individual failures */ }
          }
          localStorage.setItem(seededKey(), '1')
          set({ items: created, loading: false, offlineFallback: false })
          return
        }
      }

      localStorage.setItem(seededKey(), '1')
      set({ items: items.map(fromApi), loading: false, offlineFallback: false })
    } catch {
      // Backend unreachable — show onboarding items as local fallback
      const { menuItems } = useOnboardingStore.getState()
      set({ items: menuItems.map(fromOnboarding), loading: false, offlineFallback: true })
    } finally {
      fetchInProgress = false
    }
  },

  add: async (data) => {
    const item = await apiFetch<ApiMenuItem>('POST', '/cafe/menu', data)
    set((s) => ({ items: [...s.items, fromApi(item)] }))
  },

  edit: async (id, data) => {
    const item = await apiFetch<ApiMenuItem>('PATCH', `/cafe/menu/${id}`, data)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? fromApi(item) : i)) }))
  },

  remove: async (id) => {
    // In offline fallback mode items only exist locally — skip the API call
    if (!get().offlineFallback) {
      await apiFetch('DELETE', `/cafe/menu/${id}`)
    }
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  clearData: () => set({ items: [], loading: false, offlineFallback: false }),
}))
