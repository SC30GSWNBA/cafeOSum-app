import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'
import { UpdateCafeSchema, MenuItemSchema } from '../../lib/validators.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'

export async function cafeRoutes(app: FastifyInstance) {
  // GET /api/v1/cafe  — fetch own cafe profile
  app.get('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked to this account' })
    const cafe = await prisma.cafe.findUniqueOrThrow({ where: { id: cafeId } })
    return reply.send(cafe)
  })

  // PATCH /api/v1/cafe  — update cafe profile
  app.patch('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const data = UpdateCafeSchema.parse(req.body)
    const before = await prisma.cafe.findUniqueOrThrow({ where: { id: cafeId } })
    const cafe = await prisma.cafe.update({ where: { id: cafeId }, data })
    emitAuditEvent({
      eventType: 'CAFE_UPDATED', cafeId, userId: sub,
      entityType: 'cafe', entityId: cafeId, ipAddress: req.ip,
      payload: { before, after: cafe },
    })
    return reply.send(cafe)
  })

  // ── Menu items ────────────────────────────────────────────────────────────

  // GET /api/v1/cafe/menu
  app.get('/menu', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const items = await prisma.menuItem.findMany({ where: { cafeId }, orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    return reply.send(items)
  })

  // POST /api/v1/cafe/menu
  app.post('/menu', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const data = MenuItemSchema.parse(req.body)
    const item = await prisma.menuItem.create({ data: { ...data, cafeId } })
    emitAuditEvent({ eventType: 'MENU_ITEM_CREATED', cafeId, userId: sub, entityType: 'menu_item', entityId: item.id, ipAddress: req.ip })
    return reply.code(201).send(item)
  })

  // PATCH /api/v1/cafe/menu/:itemId
  app.patch('/menu/:itemId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { itemId } = req.params as { itemId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.menuItem.findFirst({ where: { id: itemId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Item not found' })
    const data = MenuItemSchema.partial().parse(req.body)
    const item = await prisma.menuItem.update({ where: { id: itemId }, data })
    emitAuditEvent({ eventType: 'MENU_ITEM_UPDATED', cafeId, userId: sub, entityType: 'menu_item', entityId: itemId, ipAddress: req.ip, payload: { before: existing, after: item } })
    return reply.send(item)
  })

  // DELETE /api/v1/cafe/menu/:itemId
  app.delete('/menu/:itemId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { itemId } = req.params as { itemId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.menuItem.findFirst({ where: { id: itemId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Item not found' })
    await prisma.menuItem.delete({ where: { id: itemId } })
    emitAuditEvent({ eventType: 'MENU_ITEM_DELETED', cafeId, userId: sub, entityType: 'menu_item', entityId: itemId, ipAddress: req.ip })
    return reply.code(204).send()
  })
}
