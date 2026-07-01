import type { FastifyInstance } from 'fastify'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RefreshTokenSchema,
} from '../../lib/validators.js'
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  forgotPassword,
  resetPassword,
} from './auth.service.js'
import { authGuard } from '../../shared/middleware/authGuard.js'

export async function authRoutes(app: FastifyInstance) {
  // Tighter rate-limit for auth endpoints: 10 req / 1 min
  const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

  // POST /api/v1/auth/register
  app.post('/register', { ...authRateLimit }, async (req, reply) => {
    const body = RegisterSchema.parse(req.body)
    const ip = req.ip
    const result = await registerUser(app, body.email, body.password, body.cafeName, body.name ?? null, ip)
    return reply.code(201).send(result)
  })

  // POST /api/v1/auth/login
  app.post('/login', { ...authRateLimit }, async (req, reply) => {
    const body = LoginSchema.parse(req.body)
    const result = await loginUser(app, body.email, body.password, req.ip)
    return reply.send(result)
  })

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const body = RefreshTokenSchema.parse(req.body)
    const result = await refreshSession(app, body.refreshToken)
    return reply.send(result)
  })

  // POST /api/v1/auth/logout  (requires valid access token)
  app.post('/logout', { preHandler: authGuard }, async (req, reply) => {
    const body = RefreshTokenSchema.parse(req.body)
    const { sub, cafeId } = req.user
    await logoutUser(body.refreshToken, sub, req.ip, cafeId)
    return reply.send({ message: 'Logged out' })
  })

  // POST /api/v1/auth/forgot-password
  app.post('/forgot-password', { ...authRateLimit }, async (req, reply) => {
    const { email } = ForgotPasswordSchema.parse(req.body)
    const result = await forgotPassword(email)
    return reply.send(result)
  })

  // POST /api/v1/auth/reset-password
  app.post('/reset-password', { ...authRateLimit }, async (req, reply) => {
    const { token, password } = ResetPasswordSchema.parse(req.body)
    const result = await resetPassword(token, password)
    return reply.send(result)
  })

  // GET /api/v1/auth/me  (requires valid access token)
  app.get('/me', { preHandler: authGuard }, async (req, reply) => {
    const { sub } = req.user
    const { prisma } = await import('../../shared/db/prisma.js')
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sub },
      select: { id: true, email: true, name: true, role: true, isVerified: true, cafeId: true },
    })
    return reply.send(user)
  })
}
