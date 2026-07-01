import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import { useOnboardingStore } from './onboardingStore'
import { useAuthStore } from './authStore'

function seededKey() {
  const cafeId = useAuthStore.getState().user?.cafeId ?? 'anon'
  return `cafeOSum-tables-seeded-${cafeId}`
}

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
  orderId: string | null
  billId: string | null
}

interface ApiTable {
  id: string
  name: string
  seats: number
  type: string | null
  status: string
}

interface ApiOrder {
  id: string
  tableId: string
  status: string
}

interface ApiBill {
  id: string
  orderId: string
  status: string
}

interface ApiOrderLine {
  id: string
  menuItemId: string
  qty: number
  note: string | null
  isComp: boolean
  isKitchenSent: boolean
  priceSnapshot: string | number
  menuItem: { name: string; category: string }
}

interface ApiOrderFull {
  id: string
  tableId: string
  status: string
  orderLines: ApiOrderLine[]
}

interface ApiBillBasic {
  id: string
  orderId: string
  status: string
  tableId: string
}

export interface TableStore {
  tables: TableRecord[]
  loading: boolean
  offlineFallback: boolean
  fetch: () => Promise<void>
  add: (name: string, seats: number, type: string) => Promise<void>
  edit: (id: string, name: string, seats: number, type: string) => Promise<void>
  remove: (id: string) => Promise<void>
  applySSE: (msg: unknown) => void
  openOrder: (id: string, customerName: string, guests: number) => void
  generateBill: (id: string) => Promise<void>
  settle: (id: string) => void
  addOrderLine: (tableId: string, item: { menuItemId: string; name: string; emoji: string; price: number }) => void
  updateOrderLineQty: (tableId: string, lineId: string, delta: number) => void
  removeOrderLine: (tableId: string, lineId: string) => void
  updateOrderLineNote: (tableId: string, lineId: string, note: string) => void
  markKitchenSent: (tableId: string) => Promise<void>
  clearData: () => void
}

function toStatus(s: string): TableStatus {
  if (s === 'OCCUPIED') return 'occupied'
  if (s === 'BILL_PENDING') return 'bill-pending'
  return 'free'
}

function fromApi(at: ApiTable, local?: TableRecord): TableRecord {
  return {
    id: at.id,
    name: at.name,
    seats: at.seats,
    type: at.type ?? 'Indoor',
    status: toStatus(at.status),
    customerName: local?.customerName ?? '',
    guests: local?.guests ?? 0,
    openedAt: local?.openedAt ?? null,
    orderTotal: local?.orderTotal ?? 0,
    orderItems: local?.orderItems ?? 0,
    orderLines: local?.orderLines ?? [],
    orderId: local?.orderId ?? null,
    billId: local?.billId ?? null,
  }
}

function computeTotals(lines: OrderLine[]) {
  return {
    total: lines.reduce((s, l) => s + l.price * l.qty, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  }
}

function orderLineFromApi(l: ApiOrderLine): OrderLine {
  return {
    id: l.id,
    menuItemId: l.menuItemId,
    name: l.menuItem.name,
    emoji: l.menuItem.category.split(' ')[0] ?? '☕',
    price: Number(l.priceSnapshot),
    qty: l.qty,
    note: l.note ?? '',
    sentToKitchen: l.isKitchenSent,
  }
}

function lineUid() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function toApiLines(lines: OrderLine[]) {
  return lines.map((l) => ({
    menuItemId: l.menuItemId,
    qty: l.qty,
    note: l.note || undefined,
    isComp: false,
  }))
}

let fetchInProgress = false

export const useTableStore = create<TableStore>()((set, get) => ({
  tables: [],
  loading: false,
  offlineFallback: false,

  fetch: async () => {
    if (fetchInProgress) return
    fetchInProgress = true
    set({ loading: true })
    try {
      const apiTables = await apiFetch<ApiTable[]>('GET', '/tables')

      // First visit with empty DB — auto-migrate tables the user added during onboarding
      if (apiTables.length === 0 && !localStorage.getItem(seededKey())) {
        const { tables: onboardingTables } = useOnboardingStore.getState()
        if (onboardingTables.length > 0) {
          const created: TableRecord[] = []
          for (const ot of onboardingTables) {
            try {
              const t = await apiFetch<ApiTable>('POST', '/tables', {
                name: ot.name,
                seats: ot.seats,
                type: 'Indoor',
              })
              created.push(fromApi(t))
            } catch { /* skip individual failures */ }
          }
          localStorage.setItem(seededKey(), '1')
          set({ tables: created, loading: false, offlineFallback: false })
          return
        }
      }

      localStorage.setItem(seededKey(), '1')

      // Restore active order state for every OCCUPIED/BILL_PENDING table.
      // tableStore is in-memory only, so navigation or refresh wipes orderId/orderLines.
      // Fetching the active order from the backend ensures the table panel shows the
      // correct items when the user returns to the Tables page.
      type OrderSnapshot = { orderId: string; orderLines: OrderLine[]; orderTotal: number; orderItems: number; billId: string | null }
      const orderMap = new Map<string, OrderSnapshot>()

      const occupied = apiTables.filter((t) => t.status === 'OCCUPIED' || t.status === 'BILL_PENDING')
      await Promise.all(
        occupied.map(async (t) => {
          try {
            const order = await apiFetch<ApiOrderFull>('GET', `/orders/table/${t.id}`)
            const lines = order.orderLines.map(orderLineFromApi)
            const { total, count } = computeTotals(lines)
            let billId: string | null = null
            if (t.status === 'BILL_PENDING') {
              try {
                const bill = await apiFetch<ApiBillBasic>('GET', `/billing/table/${t.id}/pending`)
                billId = bill.id
              } catch { /* no pending bill found — ignore */ }
            }
            orderMap.set(t.id, { orderId: order.id, orderLines: lines, orderTotal: total, orderItems: count, billId })
          } catch { /* no active order for this table — leave blank */ }
        })
      )

      set((state) => ({
        loading: false,
        offlineFallback: false,
        tables: apiTables.map((at) => {
          const local = state.tables.find((t) => t.id === at.id)
          const snap = orderMap.get(at.id)
          const base = fromApi(at, local)
          return snap ? { ...base, ...snap } : base
        }),
      }))
    } catch {
      // Backend unreachable — show onboarding tables as local fallback
      const { tables: onboardingTables } = useOnboardingStore.getState()
      set((state) => ({
        loading: false,
        offlineFallback: true,
        tables: onboardingTables.length > 0
          ? onboardingTables.map((ot) => {
              const local = state.tables.find((t) => t.id === ot.id)
              return fromApi({ id: ot.id, name: ot.name, seats: ot.seats, type: 'Indoor', status: 'FREE' }, local)
            })
          : state.tables,
      }))
    } finally {
      fetchInProgress = false
    }
  },

  add: async (name, seats, type) => {
    const table = await apiFetch<ApiTable>('POST', '/tables', { name, seats, type })
    set((state) => ({
      tables: state.tables.some((t) => t.id === table.id)
        ? state.tables
        : [...state.tables, fromApi(table)],
    }))
  },

  edit: async (id, name, seats, type) => {
    const table = await apiFetch<ApiTable>('PATCH', `/tables/${id}`, { name, seats, type })
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? fromApi(table, t) : t)),
    }))
  },

  remove: async (id) => {
    if (!get().offlineFallback) {
      await apiFetch('DELETE', `/tables/${id}`)
    }
    set((state) => ({ tables: state.tables.filter((t) => t.id !== id) }))
  },

  applySSE: (msg: unknown) => {
    const m = msg as { type: string; tables?: ApiTable[]; table?: ApiTable; tableId?: string; status?: string }
    set((state) => {
      if (m.type === 'INIT' && m.tables) {
        const localMap = new Map(state.tables.map((t) => [t.id, t]))
        return { tables: m.tables.map((at) => fromApi(at, localMap.get(at.id))) }
      }
      if (m.type === 'TABLE_ADDED' && m.table) {
        if (state.tables.some((t) => t.id === m.table!.id)) return state
        return { tables: [...state.tables, fromApi(m.table)] }
      }
      if (m.type === 'TABLE_UPDATED' && m.table) {
        return { tables: state.tables.map((t) => t.id === m.table!.id ? fromApi(m.table!, t) : t) }
      }
      if (m.type === 'TABLE_STATUS' && m.tableId) {
        // broadcast from orders/billing routes — update status only, preserve local cart state
        return {
          tables: state.tables.map((t) =>
            t.id === m.tableId ? { ...t, status: toStatus(m.status ?? '') } : t
          ),
        }
      }
      if (m.type === 'TABLE_DELETED') {
        return { tables: state.tables.filter((t) => t.id !== m.tableId) }
      }
      return state
    })
  },

  // openOrder is local-only until markKitchenSent — table gets OCCUPIED in DB when order is created
  openOrder: (id, customerName, guests) => {
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === id
          ? { ...t, status: 'occupied', customerName, guests, openedAt: Date.now(), orderTotal: 0, orderItems: 0, orderLines: [], orderId: null, billId: null }
          : t
      ),
    }))
  },

  markKitchenSent: async (tableId) => {
    const table = get().tables.find((t) => t.id === tableId)
    if (!table) return
    const lines = table.orderLines ?? []
    if (lines.length === 0) return

    let orderId = table.orderId

    try {
      if (!orderId) {
        // Create order in DB — this also marks table OCCUPIED in DB
        const order = await apiFetch<ApiOrder>('POST', '/orders', {
          tableId,
          lines: toApiLines(lines),
        })
        orderId = order.id
        set((s) => ({
          tables: s.tables.map((t) => t.id === tableId ? { ...t, orderId: order.id } : t),
        }))
      } else {
        // Add only the lines not yet sent to kitchen
        const unsent = lines.filter((l) => !l.sentToKitchen)
        if (unsent.length > 0) {
          await apiFetch('POST', `/orders/${orderId}/lines`, { lines: toApiLines(unsent) })
        }
      }
      await apiFetch('POST', `/orders/${orderId}/kitchen-sent`)
    } catch {
      // continue locally if API call fails
    }

    set((s) => ({
      tables: s.tables.map((t) =>
        t.id !== tableId ? t : {
          ...t,
          orderLines: (t.orderLines ?? []).map((l) => ({ ...l, sentToKitchen: true })),
        }
      ),
    }))
  },

  generateBill: async (id) => {
    const table = get().tables.find((t) => t.id === id)
    if (!table) return

    let orderId = table.orderId

    try {
      if (!orderId) {
        const lines = table.orderLines ?? []
        if (lines.length === 0) {
          // No lines — just update status locally and in DB
          set((s) => ({ tables: s.tables.map((t) => t.id === id ? { ...t, status: 'bill-pending' } : t) }))
          apiFetch('PATCH', `/tables/${id}/status`, { status: 'BILL_PENDING' }).catch(() => {})
          return
        }
        // Create the order first, then immediately generate the bill
        const order = await apiFetch<ApiOrder>('POST', '/orders', {
          tableId: id,
          lines: toApiLines(lines),
        })
        orderId = order.id
        set((s) => ({ tables: s.tables.map((t) => t.id === id ? { ...t, orderId: order.id } : t) }))
      } else {
        // Sync any unsent lines added after kitchen-send
        const unsent = (table.orderLines ?? []).filter((l) => !l.sentToKitchen)
        if (unsent.length > 0) {
          await apiFetch('POST', `/orders/${orderId}/lines`, { lines: toApiLines(unsent) })
        }
      }

      const bill = await apiFetch<ApiBill>('POST', `/billing/${orderId}/generate`)
      set((s) => ({
        tables: s.tables.map((t) =>
          t.id === id ? { ...t, status: 'bill-pending', billId: bill.id } : t
        ),
      }))
    } catch {
      // Fallback: update status locally + via status endpoint
      set((s) => ({ tables: s.tables.map((t) => t.id === id ? { ...t, status: 'bill-pending' } : t) }))
      apiFetch('PATCH', `/tables/${id}/status`, { status: 'BILL_PENDING' }).catch(() => {})
    }
  },

  settle: (id) => {
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === id
          ? { ...t, status: 'free', customerName: '', guests: 0, openedAt: null, orderTotal: 0, orderItems: 0, orderLines: [], orderId: null, billId: null }
          : t
      ),
    }))
    apiFetch('PATCH', `/tables/${id}/status`, { status: 'FREE' }).catch(() => {})
  },

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
      tables: s.tables.map((t) =>
        t.id !== tableId ? t : {
          ...t,
          orderLines: (t.orderLines ?? []).map((l) => l.id === lineId ? { ...l, note } : l),
        }
      ),
    })),

  clearData: () => set({ tables: [], loading: false, offlineFallback: false }),
}))
