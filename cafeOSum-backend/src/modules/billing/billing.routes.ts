import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'
import { SettleBillSchema, VoidBillSchema } from '../../lib/validators.js'
import { computeGST } from '../../lib/gst.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'
import { broadcastOccupancy } from '../../shared/sse/occupancyHub.js'

export async function billingRoutes(app: FastifyInstance) {
  // POST /api/v1/billing/:orderId/generate  — generate a bill from an active order
  app.post('/:orderId/generate', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { orderId } = req.params as { orderId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const order = await prisma.order.findFirst({
      where: { id: orderId, cafeId, status: 'ACTIVE' },
      include: { orderLines: true },
    })
    if (!order) return reply.code(404).send({ error: 'Active order not found' })

    const existing = await prisma.bill.findUnique({ where: { orderId } })
    if (existing) return reply.send(existing)

    const gst = computeGST(
      order.orderLines.map(l => ({
        price: Number(l.priceSnapshot),
        qty: l.qty,
        taxRate: Number(l.taxRateSnapshot),
        isComp: l.isComp,
      })),
      0,
      undefined
    )

    const [bill] = await prisma.$transaction([
      prisma.bill.create({
        data: {
          cafeId, orderId, tableId: order.tableId, status: 'PENDING',
          subtotal: gst.subtotal, taxableAmount: gst.taxableAmount,
          cgst: gst.cgst, sgst: gst.sgst, grandTotal: gst.grandTotal,
        },
      }),
      prisma.table.update({ where: { id: order.tableId }, data: { status: 'BILL_PENDING' } }),
    ])

    emitAuditEvent({ eventType: 'BILL_GENERATED', cafeId, userId: sub, entityType: 'bill', entityId: bill.id, ipAddress: req.ip, payload: { orderId, grandTotal: gst.grandTotal } })
    broadcastOccupancy(cafeId, { type: 'TABLE_STATUS', tableId: order.tableId, status: 'BILL_PENDING' })
    return reply.code(201).send(bill)
  })

  // GET /api/v1/billing/recent?limit=50  — settled/voided bills for the orders page
  app.get('/recent', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? '50'), 200)

    const bills = await prisma.bill.findMany({
      where: { cafeId, status: { in: ['SETTLED', 'VOIDED'] } },
      include: {
        order: {
          include: {
            table: { select: { name: true } },
            orderLines: {
              include: { menuItem: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { settledAt: 'desc' },
      take: limit,
    })

    return reply.send(bills.map(b => {
      const order = b.order
      return {
        id: b.id,
        tableId: b.tableId,
        tableName: order?.table?.name ?? '',
        customerName: '',
        guests: 0,
        grandTotal: Number(b.grandTotal),
        subtotal: Number(b.subtotal),
        cgst: Number(b.cgst),
        sgst: Number(b.sgst),
        taxable: Number(b.taxableAmount),
        discountAmt: Number(b.discountValue),
        discType: (b.discountType ?? 'none') as 'none' | 'flat' | 'pct',
        discVal: Number(b.discountValue),
        payMode: (b.paymentMode ?? 'cash') as 'upi' | 'cash' | 'card',
        settledAt: b.settledAt ? new Date(b.settledAt).getTime() : Date.now(),
        billedAt: new Date(b.createdAt).getTime(),
        status: b.status === 'SETTLED' ? 'settled' : 'voided' as const,
        voidReason: b.voidReason ?? undefined,
        lines: (order?.orderLines ?? []).map(l => ({
          id: l.id,
          menuItemId: l.menuItemId,
          name: l.menuItem?.name ?? '',
          emoji: '☕',
          price: Number(l.priceSnapshot),
          qty: l.qty,
          note: l.note ?? '',
          sentToKitchen: true,
        })),
        compIds: (order?.orderLines ?? []).filter(l => l.isComp).map(l => l.id),
      }
    }))
  })

  // GET /api/v1/billing/table/:tableId/pending  — pending bill for a BILL_PENDING table
  app.get('/table/:tableId/pending', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { tableId } = req.params as { tableId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const bill = await prisma.bill.findFirst({
      where: { tableId, cafeId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })
    if (!bill) return reply.code(404).send({ error: 'No pending bill for this table' })
    return reply.send(bill)
  })

  // GET /api/v1/billing/:billId
  app.get('/:billId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { billId } = req.params as { billId: string }
    const bill = await prisma.bill.findFirst({
      where: { id: billId, cafeId: cafeId ?? undefined },
      include: { order: { include: { orderLines: { include: { menuItem: true } } } } },
    })
    if (!bill) return reply.code(404).send({ error: 'Bill not found' })
    return reply.send(bill)
  })

  // POST /api/v1/billing/:billId/settle
  app.post('/:billId/settle', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { billId } = req.params as { billId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const bill = await prisma.bill.findFirst({
      where: { id: billId, cafeId, status: 'PENDING' },
      include: { order: { include: { orderLines: true } } },
    })
    if (!bill) return reply.code(404).send({ error: 'Pending bill not found' })

    const body = SettleBillSchema.parse(req.body)

    // Recompute with discount and comp toggles
    const lines = bill.order.orderLines.map(l => ({
      price: Number(l.priceSnapshot),
      qty: l.qty,
      taxRate: Number(l.taxRateSnapshot),
      isComp: body.compLineIds.includes(l.id) ? true : l.isComp,
    }))
    const gst = computeGST(lines, body.discountValue, body.discountType)

    const settled = await prisma.$transaction(async tx => {
      const b = await tx.bill.update({
        where: { id: billId },
        data: {
          status: 'SETTLED',
          subtotal: gst.subtotal,
          discountValue: body.discountValue,
          discountType: body.discountType,
          taxableAmount: gst.taxableAmount,
          cgst: gst.cgst,
          sgst: gst.sgst,
          grandTotal: gst.grandTotal,
          paymentMode: body.paymentMode,
          cashTendered: body.cashTendered,
          settledAt: new Date(),
        },
      })
      await tx.order.update({ where: { id: bill.orderId }, data: { status: 'BILLED' } })
      await tx.table.update({ where: { id: bill.tableId }, data: { status: 'FREE' } })
      return b
    })

    emitAuditEvent({
      eventType: 'BILL_SETTLED', cafeId, userId: sub,
      entityType: 'bill', entityId: billId, ipAddress: req.ip,
      payload: { grandTotal: gst.grandTotal, paymentMode: body.paymentMode, discountValue: body.discountValue },
    })
    broadcastOccupancy(cafeId, { type: 'TABLE_STATUS', tableId: bill.tableId, status: 'FREE' })

    // Trigger inventory auto-deduct (fire-and-forget)
    deductInventory(cafeId, bill.order.orderLines, billId).catch(() => {})

    return reply.send(settled)
  })

  // POST /api/v1/billing/:billId/void
  app.post('/:billId/void', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { billId } = req.params as { billId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const bill = await prisma.bill.findFirst({ where: { id: billId, cafeId } })
    if (!bill) return reply.code(404).send({ error: 'Bill not found' })
    if (bill.status === 'VOIDED') return reply.code(400).send({ error: 'Bill already voided' })

    const { reason } = VoidBillSchema.parse(req.body)

    const voided = await prisma.$transaction(async tx => {
      const b = await tx.bill.update({
        where: { id: billId },
        data: { status: 'VOIDED', voidedById: sub, voidReason: reason },
      })
      if (bill.status === 'PENDING') {
        await tx.order.update({ where: { id: bill.orderId }, data: { status: 'CANCELLED' } })
        await tx.table.update({ where: { id: bill.tableId }, data: { status: 'FREE' } })
      }
      return b
    })

    emitAuditEvent({
      eventType: 'BILL_VOIDED', cafeId, userId: sub,
      entityType: 'bill', entityId: billId, ipAddress: req.ip,
      payload: { voidReason: reason, originalGrandTotal: bill.grandTotal, originalStatus: bill.status },
    })
    if (bill.status === 'PENDING') {
      broadcastOccupancy(cafeId, { type: 'TABLE_STATUS', tableId: bill.tableId, status: 'FREE' })
    }

    return reply.send(voided)
  })

  // GET /api/v1/billing/eod-summary  — end-of-day summary
  app.get('/eod-summary', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const bills = await prisma.bill.findMany({
      where: { cafeId, status: 'SETTLED', settledAt: { gte: today, lt: tomorrow } },
    })

    const summary = bills.reduce(
      (acc, b) => ({
        totalRevenue: acc.totalRevenue + Number(b.grandTotal),
        totalBills: acc.totalBills + 1,
        totalCgst: acc.totalCgst + Number(b.cgst),
        totalSgst: acc.totalSgst + Number(b.sgst),
        totalDiscount: acc.totalDiscount + Number(b.discountValue),
        byPaymentMode: {
          ...acc.byPaymentMode,
          [b.paymentMode ?? 'unknown']: (acc.byPaymentMode[b.paymentMode ?? 'unknown'] ?? 0) + Number(b.grandTotal),
        },
      }),
      { totalRevenue: 0, totalBills: 0, totalCgst: 0, totalSgst: 0, totalDiscount: 0, byPaymentMode: {} as Record<string, number> }
    )

    return reply.send(summary)
  })
}

// ─── Inventory auto-deduct (called after settle) ──────────────────────────────

async function deductInventory(
  cafeId: string,
  orderLines: Array<{ menuItemId: string; qty: number; isComp: boolean }>,
  billId: string
) {
  const billableLines = orderLines.filter(l => !l.isComp)
  for (const line of billableLines) {
    const recipes = await prisma.recipe.findMany({ where: { menuItemId: line.menuItemId }, include: { ingredient: true } })
    for (const recipe of recipes) {
      const deductQty = Number(recipe.qtyPerUnit) * line.qty
      await prisma.ingredient.update({
        where: { id: recipe.ingredientId },
        data: { stock: { decrement: deductQty } },
      })
    }
  }
  emitAuditEvent({ eventType: 'INVENTORY_AUTO_DEDUCTED', cafeId, entityType: 'bill', entityId: billId })
}
