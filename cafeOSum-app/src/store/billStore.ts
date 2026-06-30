import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  addBill: (data: Omit<BillRecord, 'id'>) => string
  voidBill: (billId: string, reason: string) => void
}

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      bills: [],
      nextSeq: 1,

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
    }),
    { name: 'cafeOSum-bills' }
  )
)
