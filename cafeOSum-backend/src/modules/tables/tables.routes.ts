import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'
import { TableSchema, TableStatusSchema } from '../../lib/validators.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'
import { addOccupancyClient, removeOccupancyClient, broadcastOccupancy } from '../../shared/sse/occupancyHub.js'

export async function tableRoutes(app: FastifyInstance) {
  // GET /api/v1/tables
  app.get('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const tables = await prisma.table.findMany({ where: { cafeId }, orderBy: { name: 'asc' } })
    return reply.send(tables)
  })

  // POST /api/v1/tables
  app.post('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const count = await prisma.table.count({ where: { cafeId } })
    if (count >= 50) return reply.code(400).send({ error: 'Maximum 50 tables allowed' })
    const data = TableSchema.parse(req.body)
    const table = await prisma.table.create({ data: { ...data, cafeId } })
    emitAuditEvent({ eventType: 'TABLE_ADDED', cafeId, userId: sub, entityType: 'table', entityId: table.id, ipAddress: req.ip })
    broadcastOccupancy(cafeId, { type: 'TABLE_ADDED', table })
    return reply.code(201).send(table)
  })

  // PATCH /api/v1/tables/:tableId
  app.patch('/:tableId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { tableId } = req.params as { tableId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.table.findFirst({ where: { id: tableId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Table not found' })
    const data = TableSchema.partial().parse(req.body)
    const table = await prisma.table.update({ where: { id: tableId }, data })
    emitAuditEvent({ eventType: 'TABLE_UPDATED', cafeId, userId: sub, entityType: 'table', entityId: tableId, ipAddress: req.ip, payload: { before: existing, after: table } })
    broadcastOccupancy(cafeId, { type: 'TABLE_UPDATED', table })
    return reply.send(table)
  })

  // DELETE /api/v1/tables/:tableId
  app.delete('/:tableId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { tableId } = req.params as { tableId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const table = await prisma.table.findFirst({ where: { id: tableId, cafeId } })
    if (!table) return reply.code(404).send({ error: 'Table not found' })
    if (table.status !== 'FREE') return reply.code(400).send({ error: 'Cannot delete an occupied table' })
    await prisma.table.delete({ where: { id: tableId } })
    emitAuditEvent({ eventType: 'TABLE_DELETED', cafeId, userId: sub, entityType: 'table', entityId: tableId, ipAddress: req.ip })
    broadcastOccupancy(cafeId, { type: 'TABLE_DELETED', tableId })
    return reply.code(204).send()
  })

  // PATCH /api/v1/tables/:tableId/status  — update occupancy status (FREE | OCCUPIED | BILL_PENDING)
  app.patch('/:tableId/status', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { tableId } = req.params as { tableId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.table.findFirst({ where: { id: tableId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Table not found' })
    const { status } = TableStatusSchema.parse(req.body)
    const table = await prisma.table.update({ where: { id: tableId }, data: { status } })
    emitAuditEvent({ eventType: 'TABLE_STATUS_CHANGED', cafeId, userId: sub, entityType: 'table', entityId: tableId, ipAddress: req.ip, payload: { before: existing.status, after: status } })
    broadcastOccupancy(cafeId, { type: 'TABLE_UPDATED', table })
    return reply.send(table)
  })

  // GET /api/v1/tables/occupancy-stream  — SSE stream for real-time occupancy
  // Accepts Authorization header OR ?token= query param (EventSource cannot set headers)
  app.get('/occupancy-stream', async (req, reply) => {
    let cafeId: string | null | undefined
    try {
      await req.jwtVerify()
      cafeId = req.user.cafeId
    } catch {
      const { token } = req.query as { token?: string }
      if (!token) return reply.code(401).send({ error: 'Unauthorized' })
      try {
        const payload = app.jwt.verify<{ cafeId: string }>(token)
        cafeId = payload.cafeId
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
    }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders()

    // Send current state immediately on connect
    const tables = await prisma.table.findMany({ where: { cafeId } })
    reply.raw.write(`data: ${JSON.stringify({ type: 'INIT', tables })}\n\n`)

    addOccupancyClient(cafeId, reply)

    req.raw.on('close', () => removeOccupancyClient(cafeId, reply))

    // Heartbeat every 30s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      try { reply.raw.write(': ping\n\n') } catch { clearInterval(heartbeat) }
    }, 30_000)

    req.raw.on('close', () => clearInterval(heartbeat))

    await new Promise(() => {}) // keep async handler alive; cleaned up by close event
  })
}
