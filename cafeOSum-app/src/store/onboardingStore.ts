import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MenuItem {
  id: string
  name: string
  hindiName?: string
  price: number
  category: string
  gstRate: string
  isDemo: boolean
}

export interface TableItem {
  id: string
  name: string
  seats: number
}

const DEMO_ITEMS: MenuItem[] = [
  { id: 'demo-1', name: 'Masala Chai',   hindiName: 'मसाला चाय',     price: 60, category: '🍵 Tea',    gstRate: '5%', isDemo: true },
  { id: 'demo-2', name: 'Filter Coffee', hindiName: 'फ़िल्टर कॉफ़ी', price: 50, category: '☕ Coffee', gstRate: '5%', isDemo: true },
  { id: 'demo-3', name: 'Vada Pav',      hindiName: 'वड़ा पाव',       price: 40, category: '🥗 Food',   gstRate: '5%', isDemo: true },
]

export interface OnboardingData {
  cafeName: string
  mobile: string
  ownerName: string
  cafeType: string
  address: string
  city: string
  pincode: string
  opensAt: string
  closesAt: string
  isGstRegistered: boolean
  gstin: string
  gstType: string
  businessName: string
  defaultCgst: string
  defaultSgst: string
  printFooterNote: boolean
  showGstinOnBills: boolean
  autoWhatsappReceipt: boolean
  menuItems: MenuItem[]
  tables: TableItem[]
}

interface OnboardingStore extends OnboardingData {
  step: number
  isComplete: boolean
  ownerEmail: string | null        // set at login — detects stale data from a different user
  completedForEmail: string | null // set at finish — gates access to the dashboard
  goToStep: (n: number) => void
  update: (data: Partial<OnboardingData>) => void
  setOwner: (email: string) => void
  finish: (email: string) => void
  reset: () => void
}

const DEFAULT_DATA: OnboardingData = {
  cafeName: '',
  mobile: '',
  ownerName: '',
  cafeType: 'Coffee Shop',
  address: '',
  city: '',
  pincode: '',
  opensAt: '',
  closesAt: '',
  isGstRegistered: true,
  gstin: '',
  gstType: 'Regular Taxpayer',
  businessName: '',
  defaultCgst: '2.5% (Food — standard)',
  defaultSgst: '2.5% (auto-matched)',
  printFooterNote: true,
  showGstinOnBills: true,
  autoWhatsappReceipt: false,
  menuItems: DEMO_ITEMS,
  tables: [],
}

const DEMO_HINDI: Record<string, string> = {
  'demo-1': 'मसाला चाय',
  'demo-2': 'फ़िल्टर कॉफ़ी',
  'demo-3': 'वड़ा पाव',
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...DEFAULT_DATA,
      step: 1,
      isComplete: false,
      ownerEmail: null,
      completedForEmail: null,
      goToStep: (n) => set({ step: n }),
      update: (data) => set(data),
      setOwner: (email) => set({ ownerEmail: email }),
      finish: (email) => set({ isComplete: true, completedForEmail: email }),
      reset: () => set({ ...DEFAULT_DATA, step: 1, isComplete: false, ownerEmail: null, completedForEmail: null }),
    }),
    {
      name: 'cafeOSum-onboarding',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as OnboardingStore
        if (version < 1) {
          // Backfill hindiName onto persisted demo items that predate F-10
          state.menuItems = state.menuItems.map((item) =>
            DEMO_HINDI[item.id] && !item.hindiName
              ? { ...item, hindiName: DEMO_HINDI[item.id] }
              : item
          )
        }
        return state
      },
    }
  )
)
