import type { FastifyReply } from 'fastify'

// cafeId → Set of SSE reply objects
const clients = new Map<string, Set<FastifyReply>>()

export function addOccupancyClient(cafeId: string, reply: FastifyReply) {
  if (!clients.has(cafeId)) clients.set(cafeId, new Set())
  clients.get(cafeId)!.add(reply)
}

export function removeOccupancyClient(cafeId: string, reply: FastifyReply) {
  clients.get(cafeId)?.delete(reply)
}

export function broadcastOccupancy(cafeId: string, payload: unknown) {
  const conns = clients.get(cafeId)
  if (!conns?.size) return
  const data = `data: ${JSON.stringify(payload)}\n\n`
  for (const reply of conns) {
    try {
      reply.raw.write(data)
    } catch {
      conns.delete(reply)
    }
  }
}
