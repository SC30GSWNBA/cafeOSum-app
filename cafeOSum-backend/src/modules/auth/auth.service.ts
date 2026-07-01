import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../../shared/db/prisma.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'
import type { FastifyInstance } from 'fastify'

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const LOCK_DURATION_MS = 15 * 60 * 1000                 // 15 minutes
const MAX_FAILED_ATTEMPTS = 5

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(
  app: FastifyInstance,
  email: string,
  password: string,
  cafeName: string,
  name: string | null,
  ip: string
) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw { statusCode: 409, message: 'Email already registered' }
  }

  const pwHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const { user, cafe } = await prisma.$transaction(async tx => {
    const cafe = await tx.cafe.create({ data: { name: cafeName } })
    const user = await tx.user.create({
      data: { email, pwHash, name, role: 'OWNER', cafeId: cafe.id },
    })
    return { user, cafe }
  })

  emitAuditEvent({ eventType: 'REGISTER', cafeId: cafe.id, userId: user.id, ipAddress: ip })

  const { accessToken, refreshToken } = await issueTokens(app, user.id, cafe.id, 'OWNER')
  return { user: { ...sanitise(user), cafeName: cafe.name }, accessToken, refreshToken }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string,
  ip: string
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { cafe: { select: { name: true } } },
  })

  if (!user) {
    await emitAuditEvent({ eventType: 'FAILED_LOGIN', ipAddress: ip, payload: { email, reason: 'user_not_found' } })
    throw { statusCode: 401, message: 'Invalid email or password' }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const secsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
    throw { statusCode: 423, message: `Account locked. Try again in ${secsLeft} seconds`, lockedUntil: user.lockedUntil.toISOString() }
  }

  const valid = await bcrypt.compare(password, user.pwHash)

  if (!valid) {
    const newAttempts = user.failedAttempts + 1
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    })
    emitAuditEvent({
      eventType: 'FAILED_LOGIN',
      cafeId: user.cafeId ?? undefined,
      userId: user.id,
      ipAddress: ip,
      payload: { attempt: newAttempts, locked: shouldLock },
    })
    const attemptsLeft = MAX_FAILED_ATTEMPTS - newAttempts
    throw { statusCode: 401, message: 'Invalid email or password', attemptsLeft }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  })

  emitAuditEvent({ eventType: 'LOGIN', cafeId: user.cafeId ?? undefined, userId: user.id, ipAddress: ip })

  const { accessToken, refreshToken } = await issueTokens(app, user.id, user.cafeId, user.role)
  return { user: { ...sanitise(user), cafeName: user.cafe?.name ?? '' }, accessToken, refreshToken }
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

export async function refreshSession(app: FastifyInstance, rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' }
  }

  // Rotate — revoke old, issue new
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } })
  return issueTokens(app, user.id, user.cafeId, user.role)
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(rawToken: string, userId: string, ip: string, cafeId?: string | null) {
  const tokenHash = hashToken(rawToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash, userId },
    data: { revokedAt: new Date() },
  })
  emitAuditEvent({ eventType: 'LOGOUT', cafeId: cafeId ?? undefined, userId, ipAddress: ip })
}

// ─── Forgot / Reset password ──────────────────────────────────────────────────
// Sprint 1: tokens are stored in DB. In production, send via email (Resend/SendGrid).

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  // Always return 200 to avoid email enumeration
  if (!user) return { message: 'If that email is registered, a reset link has been sent.' }

  const token = crypto.randomBytes(32).toString('hex')
  // Reuse refresh_tokens table for reset tokens (distinguished by tokenHash prefix)
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: 'reset:' + hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  })

  // TODO (production): send email via Resend/SendGrid with reset link containing `token`
  // For now log to console so manual testing is possible
  console.info(`[DEV] Password reset token for ${email}: ${token}`)

  return { message: 'If that email is registered, a reset link has been sent.' }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = 'reset:' + hashToken(token)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw { statusCode: 400, message: 'Reset link is invalid or has expired' }
  }

  const pwHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { pwHash, failedAttempts: 0, lockedUntil: null } }),
    prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    // Invalidate all active sessions for security
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null, tokenHash: { not: tokenHash } },
      data: { revokedAt: new Date() },
    }),
  ])

  return { message: 'Password reset successfully' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueTokens(
  app: FastifyInstance,
  userId: string,
  cafeId: string | null | undefined,
  role: string
) {
  const accessToken = app.jwt.sign(
    { sub: userId, cafeId: cafeId ?? null, role, type: 'access' },
    { expiresIn: ACCESS_TOKEN_TTL }
  )

  const rawRefresh = crypto.randomBytes(40).toString('hex')
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  })

  return { accessToken, refreshToken: rawRefresh }
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function sanitise(user: { id: string; email: string; name: string | null; role: string; isVerified: boolean; cafeId: string | null }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified, cafeId: user.cafeId }
}
