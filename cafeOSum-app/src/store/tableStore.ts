import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TableStatus = 'free' | 'occupied' | 'bill-pending'

export interface OrderLine {
  id: string
  menuItemId: string
  name: string
  emoji: string
  price: number
  qty: number
  note: string
  sentToKitchen: boolean
}

export interface TableRecord {
  id: string
  name: string
  seats: number
  type: string
  status: TableStatus
  customerName: string
  guests: number
  openedAt: number | null
  orderTotal: number
  orderItems: number
  orderLines: OrderLine[]
}

interface TableStore {
  tables: TableRecord[]
  add: (name: string, seats: number, type: string) => void
  edit: (id: string, name: string, seats: number, type: string) => void
  remove: (id: string) => void
  openOrder: (id: string, customerName: string, guests: number) => void
  generateBill: (id: string) => void
  settle: (id: string) => void
  seed: (items: Array<{ id: string; name: string; seats: number }>) => void
  addOrderLine: (tableId: string, item: { menuItemId: string; name: string; emoji: string; price: number }) => void
  updateOrderLineQty: (tableId: string, lineId: string, delta: number) => void
  removeOrderLine: (tableId: string, lineId: string) => void
  updateOrderLineNote: (tableId: string, lineId: string, note: string) => void
  markKitchenSent: (tableId: string) => void
}

function uid() {
  return `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function lineUid() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function computeTotals(lines: OrderLine[]) {
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  return { total, count }
}

export const useTableStore = create<TableStore>()(
  persist(
    (set) => ({
      tables: [],

      add: (name, seats, type) =>
        set((s) => ({
          tables: [
            ...s.tables,
            {
              id: uid(), name, seats, type, status: 'free',
              customerName: '', guests: 0, openedAt: null,
              orderTotal: 0, orderItems: 0, orderLines: [],
            },
          ],
        })),

      edit: (id, name, seats, type) =>
        set((s) => ({
          tables: s.tables.map((t) => t.id === id ? { ...t, name, seats, type } : t),
        })),

      remove: (id) =>
        set((s) => ({ tables: s.tables.filter((t) => t.id !== id) })),

      openOrder: (id, customerName, guests) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id
              ? {
                  ...t, status: 'occupied', customerName, guests,
                  openedAt: Date.now(),
                  orderTotal: 0, orderItems: 0, orderLines: [],
                }
              : t
          ),
        })),

      generateBill: (id) =>
        set((s) => ({
          tables: s.tables.map((t) => t.id === id ? { ...t, status: 'bill-pending' } : t),
        })),

      settle: (id) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id
              ? {
                  ...t, status: 'free', customerName: '', guests: 0,
                  openedAt: null, orderTotal: 0, orderItems: 0, orderLines: [],
                }
              : t
          ),
        })),

      seed: (items) =>
        set((s) => {
          if (s.tables.length > 0) return s
          return {
            tables: items.map((it) => ({
              id: it.id, name: it.name, seats: it.seats,
              type: 'Indoor', status: 'free' as TableStatus,
              customerName: '', guests: 0, openedAt: null,
              orderTotal: 0, orderItems: 0, orderLines: [],
            })),
          }
        }),

      addOrderLine: (tableId, { menuItemId, name, emoji, price }) =>
        set((s) => ({
          tables: s.tables.map((t) => {
            if (t.id !== tableId) return t
            const lines = t.orderLines ?? []
            const existing = lines.find((l) => l.menuItemId === menuItemId)
            const newLines = existing
              ? lines.map((l) => l.menuItemId === menuItemId ? { ...l, qty: l.qty + 1 } : l)
              : [...lines, { id: lineUid(), menuItemId, name, emoji, price, qty: 1, note: '', sentToKitchen: false }]
            const { total, count } = computeTotals(newLines)
            return { ...t, orderLines: newLines, orderTotal: total, orderItems: count }
          }),
        })),

      updateOrderLineQty: (tableId, lineId, delta) =>
        set((s) => ({
          tables: s.tables.map((t) => {
            if (t.id !== tableId) return t
            const lines = (t.orderLines ?? [])
              .map((l) => l.id === lineId ? { ...l, qty: l.qty + delta } : l)
              .filter((l) => l.qty > 0)
            const { total, count } = computeTotals(lines)
            return { ...t, orderLines: lines, orderTotal: total, orderItems: count }
          }),
        })),

      removeOrderLine: (tableId, lineId) =>
        set((s) => ({
          tables: s.tables.map((t) => {
            if (t.id !== tableId) return t
            const lines = (t.orderLines ?? []).filter((l) => l.id !== lineId)
            const { total, count } = computeTotals(lines)
            return { ...t, orderLines: lines, orderTotal: total, orderItems: count }
          }),
        })),

      updateOrderLineNote: (tableId, lineId, note) =>
        set((s) => ({
          tables: s.tables.map((t) => {
            if (t.id !== tableId) return t
            return {
              ...t,
              orderLines: (t.orderLines ?? []).map((l) =>
                l.id === lineId ? { ...l, note } : l
              ),
            }
          }),
        })),

      markKitchenSent: (tableId) =>
        set((s) => ({
          tables: s.tables.map((t) => {
            if (t.id !== tableId) return t
            return {
              ...t,
              orderLines: (t.orderLines ?? []).map((l) => ({ ...l, sentToKitchen: true })),
            }
          }),
        })),
    }),
    { name: 'cafeOSum-tables' }
  )
)
