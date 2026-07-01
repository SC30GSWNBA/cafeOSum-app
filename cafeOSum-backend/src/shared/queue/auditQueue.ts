import PgBoss from 'pg-boss'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'

const QUEUE_NAME = 'audit-events'

let boss: PgBoss | null = null

export async function startAuditQueue() {
  const db = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!db) throw new Error('DATABASE_URL not set')

  boss = new PgBoss({ connectionString: db, schema: 'pgboss' })
  await boss.start()

  await boss.work<AuditJobData>(QUEUE_NAME, async ([job]) => {
    const { eventType, cafeId, userId, entityType, entityId, ipAddress, payload } = job.data
    await prisma.auditEvent.create({
      data: { eventType, cafeId, userId, entityType, entityId, ipAddress, payload: (payload ?? {}) as Prisma.InputJsonValue },
    })
  })

  return boss
}

export interface AuditJobData {
  eventType: string
  cafeId?: string
  userId?: string
  entityType?: string
  entityId?: string
  ipAddress?: string
  payload?: Record<string, unknown>
}

export async function emitAuditEvent(data: AuditJobData) {
  if (!boss) return
  await boss.send(QUEUE_NAME, data)
}
