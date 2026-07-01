import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../lib/api'

export type EventCategory = 'Auth' | 'Billing' | 'Orders' | 'Setup' | 'Inventory' | 'Staff' | 'Analytics'
export type EventStatus = 'ok' | 'warn' | 'error'

export interface AuditEvent {
  eventId: string
  eventType: string
  category: EventCategory
  userId: string
  cafeId: string
  timestamp: number
  ipAddress: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  status: EventStatus
  summary: string
}

type AddEventParams = {
  eventType: string
  category: EventCategory
  userId: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  status: EventStatus
  summary: string
  ipAddress?: string
}

interface ApiAuditEvent {
  id: string
  eventType: string
  cafeId: string | null
  userId: string | null
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  payload: Record<string, unknown>
  createdAt: string
}

interface ApiAuditResponse {
  events: ApiAuditEvent[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

function deriveCategory(eventType: string): EventCategory {
  if (/^BILL_/.test(eventType)) return 'Billing'
  if (/^ORDER_/.test(eventType)) return 'Orders'
  if (/^(LOGIN|LOGOUT|FAILED_LOGIN|REGISTER|PASSWORD_|TOKEN_)/.test(eventType)) return 'Auth'
  if (/^(INGREDIENT_|RECIPE_|STOCK_|INVENTORY_)/.test(eventType)) return 'Inventory'
  if (/^ANALYTICS_/.test(eventType)) return 'Analytics'
  if (/^(STAFF_|PIN_)/.test(eventType)) return 'Staff'
  return 'Setup'
}

function deriveStatus(eventType: string): EventStatus {
  if (eventType === 'FAILED_LOGIN') return 'warn'
  if (/ERROR|FAIL|DENIED/.test(eventType)) return 'error'
  return 'ok'
}

function deriveSummary(eventType: string, payload: Record<string, unknown>): string {
  const p = payload as Record<string, string | number | undefined>
  switch (eventType) {
    case 'BILL_SETTLED':   return `Bill settled · ₹${p.grandTotal ?? ''} · ${String(p.paymentMode ?? '').toUpperCase()}`
    case 'BILL_GENERATED': return `Bill generated · ₹${p.grandTotal ?? ''}`
    case 'BILL_VOIDED':    return `Bill voided · ${p.voidReason ?? ''}`
    case 'ORDER_CREATED':  return `Order created`
    case 'ORDER_KITCHEN_SENT': return `Order sent to kitchen`
    case 'INGREDIENT_ADDED':   return `Ingredient added`
    case 'INGREDIENT_UPDATED': return `Ingredient updated`
    case 'INGREDIENT_DELETED': return `Ingredient deleted`
    case 'STOCK_RESTOCKED':    return `Stock restocked · +${p.qtyAdded ?? ''} units`
    case 'RECIPE_UPDATED':     return `Recipe updated`
    case 'INVENTORY_AUTO_DEDUCTED': return `Inventory auto-deducted`
    case 'TABLE_ADDED':    return `Table added`
    case 'TABLE_UPDATED':  return `Table updated`
    case 'TABLE_DELETED':  return `Table deleted`
    case 'LOGIN':          return `User signed in`
    case 'LOGOUT':         return `User signed out`
    case 'FAILED_LOGIN':   return `Failed login attempt`
    case 'REGISTER':       return `New account registered`
    default: return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
}

function apiEventToLocal(e: ApiAuditEvent): AuditEvent {
  return {
    eventId: e.id,
    eventType: e.eventType,
    category: deriveCategory(e.eventType),
    userId: e.userId ?? 'Owner',
    cafeId: e.cafeId ?? '',
    timestamp: new Date(e.createdAt).getTime(),
    ipAddress: e.ipAddress ?? '—',
    entityType: e.entityType ?? '',
    entityId: e.entityId ?? '',
    payload: e.payload,
    status: deriveStatus(e.eventType),
    summary: deriveSummary(e.eventType, e.payload),
  }
}

interface AuditState {
  events: AuditEvent[]
  _seq: number
  ownerCafeId: string | null
  fetch: () => Promise<void>
  addEvent: (params: AddEventParams) => void
  setOwner: (cafeId: string) => void
  clearData: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      events: [],
      _seq: 1001,
      ownerCafeId: null,

      fetch: async () => {
        try {
          const resp = await apiFetch<ApiAuditResponse>('GET', '/audit?limit=100')
          const backendEvents = resp.events.map(apiEventToLocal)
          set((s) => {
            // Merge: backend events are durable history.
            // Preserve ALL local events not in the current backend response:
            // - EVT-xxx events not yet written to DB (pg-boss is async)
            // - UUID events from a previous fetch that fell outside the 100-event window
            const backendIds = new Set(backendEvents.map(e => e.eventId))
            const localOnly = s.events.filter(e => !backendIds.has(e.eventId))
            const merged = [...backendEvents, ...localOnly].sort((a, b) => b.timestamp - a.timestamp)
            return { events: merged }
          })
        } catch { /* backend unreachable — keep local events */ }
      },

      addEvent: (params) => {
        const seq = get()._seq
        const event: AuditEvent = {
          eventId: `EVT-${seq}`,
          cafeId: get().ownerCafeId ?? '',
          timestamp: Date.now(),
          ipAddress: params.ipAddress ?? '—',
          eventType: params.eventType,
          category: params.category,
          userId: params.userId,
          entityType: params.entityType,
          entityId: params.entityId,
          payload: params.payload,
          status: params.status,
          summary: params.summary,
        }
        set((s) => ({ events: [event, ...s.events], _seq: s._seq + 1 }))
      },

      setOwner: (cafeId) => set({ ownerCafeId: cafeId }),
      clearData: () => set({ events: [], _seq: 1001, ownerCafeId: null }),
    }),
    { name: 'cafeOSum-audit' }
  )
)
