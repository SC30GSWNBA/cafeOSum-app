import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../lib/api'
import type { OrderLine } from './tableStore'

export interface BillRecord {
  id: string
  tableId: string
  tableName: string
  customerName: string
  guests: number
  lines: OrderLine[]
  compIds: string[]
  discType: 'none' | 'flat' | 'pct'
  discVal: number
  payMode: 'upi' | 'cash' | 'card'
  subtotal: number
  discountAmt: number
  taxable: number
  cgst: number
  sgst: number
  grandTotal: number
  billedAt: number
  settledAt: number
  status: 'settled' | 'voided'
  voidReason?: string
  voidedAt?: number
}

interface BillStore {
  bills: BillRecord[]
  nextSeq: number
  ownerCafeId: string | null
  fetch: () => Promise<void>
  addBill: (data: Omit<BillRecord, 'id'>) => string
  voidBill: (billId: string, reason: string) => void
  setOwner: (cafeId: string) => void
  clearData: () => void
}

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      bills: [],
      nextSeq: 1,
      ownerCafeId: null,

      fetch: async () => {
        try {
          const remote = await apiFetch<BillRecord[]>('GET', '/billing/recent')
          set((s) => {
            // Merge: keep any locally-added bills not yet in the remote list
            const remoteIds = new Set(remote.map(b => b.id))
            const localOnly = s.bills.filter(b => !remoteIds.has(b.id))
            const merged = [...remote, ...localOnly].sort((a, b) => b.settledAt - a.settledAt)
            return { bills: merged }
          })
        } catch { /* backend unreachable — keep local bills as-is */ }
      },

      addBill: (data) => {
        const seq = get().nextSeq
        const id = `BILL-${String(seq).padStart(4, '0')}`
        set((s) => ({
          bills: [...s.bills, { ...data, id }],
          nextSeq: s.nextSeq + 1,
        }))
        return id
      },

      voidBill: (billId, reason) =>
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId
              ? { ...b, status: 'voided', voidReason: reason, voidedAt: Date.now() }
              : b
          ),
        })),

      setOwner: (cafeId) => set({ ownerCafeId: cafeId }),

      clearData: () => set({ bills: [], nextSeq: 1, ownerCafeId: null }),
    }),
    { name: 'cafeOSum-bills' }
  )
)
