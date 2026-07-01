import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'

export async function auditRoutes(app: FastifyInstance) {
  // GET /api/v1/audit?from=ISO&to=ISO&userId=&eventType=&page=1&limit=20
  app.get('/', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const {
      from,
      to,
      userId,
      eventType,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>

    const take = Math.min(Number(limit), 100)
    const skip = (Number(page) - 1) * take

    const where = {
      cafeId,
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(userId ? { userId } : {}),
      ...(eventType ? { eventType } : {}),
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.auditEvent.count({ where }),
    ])

    return reply.send({
      events,
      pagination: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) },
    })
  })

  // GET /api/v1/audit/:eventId
  app.get('/:eventId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { eventId } = req.params as { eventId: string }
    const event = await prisma.auditEvent.findFirst({ where: { id: eventId, cafeId: cafeId ?? undefined } })
    if (!event) return reply.code(404).send({ error: 'Event not found' })
    return reply.send(event)
  })
}
