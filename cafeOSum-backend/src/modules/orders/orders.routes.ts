import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'
import { CreateOrderSchema, UpdateOrderLineSchema, SyncOrdersSchema } from '../../lib/validators.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'
import { broadcastOccupancy } from '../../shared/sse/occupancyHub.js'

export async function orderRoutes(app: FastifyInstance) {
  // POST /api/v1/orders  — create a new order for a table
  app.post('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const body = CreateOrderSchema.parse(req.body)

    const table = await prisma.table.findFirst({ where: { id: body.tableId, cafeId } })
    if (!table) return reply.code(404).send({ error: 'Table not found' })
    if (table.status !== 'FREE') return reply.code(400).send({ error: 'Table is not free' })

    // Resolve price snapshots
    const itemIds = body.lines.map(l => l.menuItemId)
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: itemIds }, cafeId } })
    const itemMap = new Map(menuItems.map(i => [i.id, i]))

    const order = await prisma.$transaction(async tx => {
      const o = await tx.order.create({
        data: { cafeId, tableId: body.tableId, createdById: sub, status: 'ACTIVE' },
      })
      await tx.orderLine.createMany({
        data: body.lines.map(l => {
          const item = itemMap.get(l.menuItemId)!
          return {
            orderId: o.id,
            menuItemId: l.menuItemId,
            qty: l.qty,
            note: l.note,
            isComp: l.isComp,
            priceSnapshot: item.price,
            taxRateSnapshot: item.taxRate,
          }
        }),
      })
      await tx.table.update({ where: { id: body.tableId }, data: { status: 'OCCUPIED' } })
      return o
    })

    emitAuditEvent({ eventType: 'ORDER_CREATED', cafeId, userId: sub, entityType: 'order', entityId: order.id, ipAddress: req.ip, payload: { tableId: body.tableId, lineCount: body.lines.length } })
    broadcastOccupancy(cafeId, { type: 'TABLE_STATUS', tableId: body.tableId, status: 'OCCUPIED' })

    const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { orderLines: true } })
    return reply.code(201).send(full)
  })

  // GET /api/v1/orders/:orderId
  app.get('/:orderId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { orderId } = req.params as { orderId: string }
    const order = await prisma.order.findFirst({ where: { id: orderId, cafeId: cafeId ?? undefined }, include: { orderLines: { include: { menuItem: true } } } })
    if (!order) return reply.code(404).send({ error: 'Order not found' })
    return reply.send(order)
  })

  // GET /api/v1/orders/table/:tableId  — active order for a table
  app.get('/table/:tableId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { tableId } = req.params as { tableId: string }
    const order = await prisma.order.findFirst({
      where: { tableId, cafeId: cafeId ?? undefined, status: 'ACTIVE' },
      include: { orderLines: { include: { menuItem: true } } },
    })
    if (!order) return reply.code(404).send({ error: 'No active order for this table' })
    return reply.send(order)
  })

  // PATCH /api/v1/orders/:orderId/lines/:lineId
  app.patch('/:orderId/lines/:lineId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { orderId, lineId } = req.params as { orderId: string; lineId: string }
    const body = UpdateOrderLineSchema.parse(req.body)

    const order = await prisma.order.findFirst({ where: { id: orderId, cafeId: cafeId ?? undefined, status: 'ACTIVE' } })
    if (!order) return reply.code(404).send({ error: 'Active order not found' })

    if (body.qty === 0) {
      await prisma.orderLine.delete({ where: { id: lineId } })
      emitAuditEvent({ eventType: 'ORDER_LINE_REMOVED', cafeId: cafeId ?? undefined, userId: sub, entityType: 'order', entityId: orderId, ipAddress: req.ip })
      return reply.code(204).send()
    }

    const line = await prisma.orderLine.update({ where: { id: lineId }, data: { qty: body.qty, note: body.note, isComp: body.isComp } })
    emitAuditEvent({ eventType: 'ORDER_LINE_UPDATED', cafeId: cafeId ?? undefined, userId: sub, entityType: 'order', entityId: orderId, ipAddress: req.ip })
    return reply.send(line)
  })

  // POST /api/v1/orders/:orderId/lines  — add a line to existing order
  app.post('/:orderId/lines', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { orderId } = req.params as { orderId: string }
    const body = (req.body as { menuItemId: string; qty: number; note?: string; isComp?: boolean })

    const order = await prisma.order.findFirst({ where: { id: orderId, cafeId: cafeId ?? undefined, status: 'ACTIVE' } })
    if (!order) return reply.code(404).send({ error: 'Active order not found' })

    const item = await prisma.menuItem.findFirst({ where: { id: body.menuItemId, cafeId: cafeId ?? undefined } })
    if (!item) return reply.code(404).send({ error: 'Menu item not found' })

    const line = await prisma.orderLine.create({
      data: { orderId, menuItemId: body.menuItemId, qty: body.qty, note: body.note, isComp: body.isComp ?? false, priceSnapshot: item.price, taxRateSnapshot: item.taxRate },
    })
    emitAuditEvent({ eventType: 'ORDER_LINE_ADDED', cafeId: cafeId ?? undefined, userId: sub, entityType: 'order', entityId: orderId, ipAddress: req.ip })
    return reply.code(201).send(line)
  })

  // POST /api/v1/orders/:orderId/kitchen-sent
  app.post('/:orderId/kitchen-sent', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { orderId } = req.params as { orderId: string }
    const order = await prisma.order.findFirst({ where: { id: orderId, cafeId: cafeId ?? undefined, status: 'ACTIVE' } })
    if (!order) return reply.code(404).send({ error: 'Active order not found' })
    await prisma.orderLine.updateMany({ where: { orderId }, data: { isKitchenSent: true } })
    emitAuditEvent({ eventType: 'KITCHEN_SENT', cafeId: cafeId ?? undefined, userId: sub, entityType: 'order', entityId: orderId, ipAddress: req.ip })
    return reply.send({ message: 'Sent to kitchen' })
  })

  // POST /api/v1/orders/sync  — offline bulk sync
  app.post('/sync', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const { orders } = SyncOrdersSchema.parse(req.body)
    const results: Array<{ localId: string; orderId: string; status: string }> = []

    for (const syncOrder of orders) {
      try {
        const table = await prisma.table.findFirst({ where: { id: syncOrder.tableId, cafeId } })
        if (!table || table.status !== 'FREE') {
          results.push({ localId: syncOrder.localId, orderId: '', status: 'skipped:table_not_free' })
          continue
        }
        const itemIds = syncOrder.lines.map(l => l.menuItemId)
        const menuItems = await prisma.menuItem.findMany({ where: { id: { in: itemIds }, cafeId } })
        const itemMap = new Map(menuItems.map(i => [i.id, i]))

        const order = await prisma.$transaction(async tx => {
          const o = await tx.order.create({ data: { cafeId, tableId: syncOrder.tableId, createdById: sub, status: 'ACTIVE', createdAt: new Date(syncOrder.createdAt) } })
          await tx.orderLine.createMany({
            data: syncOrder.lines.map(l => ({ orderId: o.id, menuItemId: l.menuItemId, qty: l.qty, note: l.note, isComp: l.isComp ?? false, priceSnapshot: itemMap.get(l.menuItemId)!.price, taxRateSnapshot: itemMap.get(l.menuItemId)!.taxRate })),
          })
          await tx.table.update({ where: { id: syncOrder.tableId }, data: { status: 'OCCUPIED' } })
          return o
        })
        results.push({ localId: syncOrder.localId, orderId: order.id, status: 'ok' })
        broadcastOccupancy(cafeId, { type: 'TABLE_STATUS', tableId: syncOrder.tableId, status: 'OCCUPIED' })
      } catch {
        results.push({ localId: syncOrder.localId, orderId: '', status: 'error' })
      }
    }
    return reply.send({ results })
  })
}
