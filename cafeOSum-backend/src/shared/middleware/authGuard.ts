import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Extend FastifyRequest with our JWT payload shape
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string    // userId
      cafeId: string | null
      role: string
      type: 'access'
    }
    user: {
      sub: string
      cafeId: string | null
      role: string
      type: 'access'
    }
  }
}
