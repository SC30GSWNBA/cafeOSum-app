import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /api/v1/analytics/summary?period=today|week|month&from=ISO&to=ISO
  app.get('/summary', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const { period, from, to } = req.query as { period?: string; from?: string; to?: string }
    const { start, end } = resolvePeriod(period, from, to)

    const bills = await prisma.bill.findMany({
      where: { cafeId, status: 'SETTLED', settledAt: { gte: start, lt: end } },
    })

    const totalRevenue = bills.reduce((s, b) => s + Number(b.grandTotal), 0)
    const totalBills = bills.length
    const avgBillValue = totalBills ? round2(totalRevenue / totalBills) : 0
    const gstCollected = bills.reduce((s, b) => s + Number(b.cgst) + Number(b.sgst), 0)

    // Hourly breakdown
    const hourly: Record<number, number> = {}
    for (const b of bills) {
      const h = b.settledAt!.getHours()
      hourly[h] = (hourly[h] ?? 0) + Number(b.grandTotal)
    }

    return reply.send({ period: { start, end }, totalRevenue: round2(totalRevenue), totalBills, avgBillValue, gstCollected: round2(gstCollected), hourly })
  })

  // GET /api/v1/analytics/top-items?period=today|week|month&by=qty|revenue
  app.get('/top-items', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const { period, from, to, by } = req.query as { period?: string; from?: string; to?: string; by?: string }
    const { start, end } = resolvePeriod(period, from, to)

    const lines = await prisma.orderLine.findMany({
      where: {
        isComp: false,
        order: { cafeId, status: 'BILLED', bill: { status: 'SETTLED', settledAt: { gte: start, lt: end } } },
      },
      include: { menuItem: { select: { id: true, name: true, category: true } } },
    })

    const itemMap = new Map<string, { name: string; category: string; qty: number; revenue: number }>()
    for (const l of lines) {
      const existing = itemMap.get(l.menuItemId) ?? { name: l.menuItem.name, category: l.menuItem.category, qty: 0, revenue: 0 }
      itemMap.set(l.menuItemId, {
        ...existing,
        qty: existing.qty + l.qty,
        revenue: existing.revenue + Number(l.priceSnapshot) * l.qty,
      })
    }

    const sorted = [...itemMap.entries()]
      .map(([id, v]) => ({ id, ...v, revenue: round2(v.revenue) }))
      .sort((a, b) => (by === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty))
      .slice(0, 10)

    return reply.send(sorted)
  })

  // GET /api/v1/analytics/table-performance
  app.get('/table-performance', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const { period, from, to } = req.query as { period?: string; from?: string; to?: string }
    const { start, end } = resolvePeriod(period, from, to)

    const bills = await prisma.bill.findMany({
      where: { cafeId, status: 'SETTLED', settledAt: { gte: start, lt: end } },
      select: { tableId: true, grandTotal: true },
    })
    const tables = await prisma.table.findMany({ where: { cafeId } })

    const tableMap = new Map(tables.map(t => [t.id, { id: t.id, name: t.name, revenue: 0, bills: 0 }]))
    for (const b of bills) {
      const t = tableMap.get(b.tableId)
      if (t) { t.revenue += Number(b.grandTotal); t.bills++ }
    }

    const result = [...tableMap.values()]
      .map(t => ({ ...t, revenue: round2(t.revenue), avgPerBill: t.bills ? round2(t.revenue / t.bills) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)

    return reply.send(result)
  })

  // GET /api/v1/analytics/gst-report?month=2026-06
  app.get('/gst-report', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const { month } = req.query as { month?: string }
    const [year, mon] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 1)

    const bills = await prisma.bill.findMany({
      where: { cafeId, status: 'SETTLED', settledAt: { gte: start, lt: end } },
      select: { grandTotal: true, cgst: true, sgst: true, discountValue: true },
    })

    const totals = bills.reduce(
      (acc, b) => ({
        netSales: acc.netSales + Number(b.grandTotal),
        cgst: acc.cgst + Number(b.cgst),
        sgst: acc.sgst + Number(b.sgst),
        totalDiscount: acc.totalDiscount + Number(b.discountValue),
        billCount: acc.billCount + 1,
      }),
      { netSales: 0, cgst: 0, sgst: 0, totalDiscount: 0, billCount: 0 }
    )

    return reply.send({
      month: `${year}-${String(mon).padStart(2, '0')}`,
      netSales: round2(totals.netSales),
      cgst: round2(totals.cgst),
      sgst: round2(totals.sgst),
      totalGst: round2(totals.cgst + totals.sgst),
      totalDiscount: round2(totals.totalDiscount),
      billCount: totals.billCount,
    })
  })
}

function resolvePeriod(period?: string, from?: string, to?: string) {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: now }
  }
  if (from && to) return { start: new Date(from), end: new Date(to) }
  // Default: today
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  return { start, end: now }
}

function round2(n: number) { return Math.round(n * 100) / 100 }
