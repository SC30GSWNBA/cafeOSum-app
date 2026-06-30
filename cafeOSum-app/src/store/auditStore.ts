import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface AuditState {
  events: AuditEvent[]
  _seq: number
  addEvent: (params: AddEventParams) => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      events: [],
      _seq: 1001,
      addEvent: (params) => {
        const seq = get()._seq
        const event: AuditEvent = {
          eventId: `EVT-${seq}`,
          cafeId: 'CAFE-0001',
          timestamp: Date.now(),
          ipAddress: params.ipAddress ?? '192.168.1.1',
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
    }),
    { name: 'cafeOSum-audit' }
  )
)
