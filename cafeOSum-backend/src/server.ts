import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwtPlugin from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'

import { startAuditQueue } from './shared/queue/auditQueue.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { cafeRoutes } from './modules/cafe/cafe.routes.js'
import { tableRoutes } from './modules/tables/tables.routes.js'
import { orderRoutes } from './modules/orders/orders.routes.js'
import { billingRoutes } from './modules/billing/billing.routes.js'
import { inventoryRoutes } from './modules/inventory/inventory.routes.js'
import { analyticsRoutes } from './modules/analytics/analytics.routes.js'
import { auditRoutes } from './modules/audit/audit.routes.js'

const PORT = Number(process.env.PORT ?? 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5174'
const isDev = process.env.NODE_ENV !== 'production'

const app = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' } })

// ── Plugins ──────────────────────────────────────────────────────────────────

await app.register(helmet, { contentSecurityPolicy: false })
await app.register(cors, {
  origin: isDev
    ? (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
        cb(null, !origin || /^http:\/\/localhost(:\d+)?$/.test(origin))
      }
    : CORS_ORIGIN,
  credentials: true,
})
await app.register(cookie)
await app.register(jwtPlugin, {
  secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-in-production',
  sign: { expiresIn: '15m' },
  cookie: { cookieName: 'access_token', signed: false },
})
await app.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
})

// ── Error handler ────────────────────────────────────────────────────────────

app.setErrorHandler((err: any, req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'Validation failed', issues: err.issues })
  }
  if (typeof err?.statusCode === 'number') {
    const { statusCode, message, ...rest } = err
    return reply.code(statusCode).send({ error: message, ...rest })
  }
  req.log.error(err)
  return reply.code(500).send({ error: 'Internal server error' })
})

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// ── Routes (all under /api/v1) ───────────────────────────────────────────────

await app.register(authRoutes,      { prefix: '/api/v1/auth' })
await app.register(cafeRoutes,      { prefix: '/api/v1/cafe' })
await app.register(tableRoutes,     { prefix: '/api/v1/tables' })
await app.register(orderRoutes,     { prefix: '/api/v1/orders' })
await app.register(billingRoutes,   { prefix: '/api/v1/billing' })
await app.register(inventoryRoutes, { prefix: '/api/v1/inventory' })
await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
await app.register(auditRoutes,     { prefix: '/api/v1/audit' })

// ── Start ─────────────────────────────────────────────────────────────────────

try {
  try {
    await startAuditQueue()
  } catch (queueErr) {
    app.log.warn({ err: queueErr }, 'Audit queue failed to start — audit logging disabled')
  }
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`CafeOSum API running on port ${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
