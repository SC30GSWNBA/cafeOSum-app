import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/authGuard.js'
import { prisma } from '../../shared/db/prisma.js'
import { IngredientSchema, UpsertRecipeSchema, RestockSchema } from '../../lib/validators.js'
import { emitAuditEvent } from '../../shared/queue/auditQueue.js'

export async function inventoryRoutes(app: FastifyInstance) {
  // ── Ingredients ──────────────────────────────────────────────────────────

  app.get('/ingredients', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const ingredients = await prisma.ingredient.findMany({ where: { cafeId }, orderBy: { name: 'asc' } })
    return reply.send(ingredients)
  })

  app.post('/ingredients', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const data = IngredientSchema.parse(req.body)
    const ing = await prisma.ingredient.create({ data: { ...data, cafeId } })
    emitAuditEvent({ eventType: 'INGREDIENT_ADDED', cafeId, userId: sub, entityType: 'ingredient', entityId: ing.id, ipAddress: req.ip })
    return reply.code(201).send(ing)
  })

  app.patch('/ingredients/:ingId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { ingId } = req.params as { ingId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.ingredient.findFirst({ where: { id: ingId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Ingredient not found' })
    const data = IngredientSchema.partial().parse(req.body)
    const ing = await prisma.ingredient.update({ where: { id: ingId }, data })
    emitAuditEvent({ eventType: 'INGREDIENT_UPDATED', cafeId, userId: sub, entityType: 'ingredient', entityId: ingId, ipAddress: req.ip, payload: { before: existing, after: ing } })
    return reply.send(ing)
  })

  app.delete('/ingredients/:ingId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { ingId } = req.params as { ingId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const existing = await prisma.ingredient.findFirst({ where: { id: ingId, cafeId } })
    if (!existing) return reply.code(404).send({ error: 'Ingredient not found' })
    await prisma.ingredient.delete({ where: { id: ingId } })
    emitAuditEvent({ eventType: 'INGREDIENT_DELETED', cafeId, userId: sub, entityType: 'ingredient', entityId: ingId, ipAddress: req.ip })
    return reply.code(204).send()
  })

  // GET /api/v1/inventory/low-stock  — ingredients below threshold
  app.get('/low-stock', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const ingredients = await prisma.ingredient.findMany({
      where: { cafeId },
      orderBy: { name: 'asc' },
    })
    const lowStock = ingredients.filter(i => Number(i.stock) <= Number(i.threshold))
    return reply.send(lowStock)
  })

  // ── Recipes ───────────────────────────────────────────────────────────────

  // GET /api/v1/inventory/recipes  — all recipes for this cafe, grouped by menu item
  app.get('/recipes', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const lines = await prisma.recipe.findMany({
      where: { menuItem: { cafeId } },
      include: { menuItem: { select: { name: true, category: true } } },
    })

    const grouped = new Map<string, { menuItemId: string; menuItemName: string; menuItemCategory: string; ingredients: { ingredientId: string; qty: number }[] }>()
    for (const line of lines) {
      if (!grouped.has(line.menuItemId)) {
        grouped.set(line.menuItemId, {
          menuItemId: line.menuItemId,
          menuItemName: line.menuItem.name,
          menuItemCategory: line.menuItem.category,
          ingredients: [],
        })
      }
      grouped.get(line.menuItemId)!.ingredients.push({
        ingredientId: line.ingredientId,
        qty: Number(line.qtyPerUnit),
      })
    }

    return reply.send(Array.from(grouped.values()))
  })

  app.get('/recipes/:menuItemId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    const { menuItemId } = req.params as { menuItemId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, cafeId } })
    if (!item) return reply.code(404).send({ error: 'Menu item not found' })
    const recipes = await prisma.recipe.findMany({ where: { menuItemId }, include: { ingredient: true } })
    return reply.send(recipes)
  })

  // PUT /api/v1/inventory/recipes/:menuItemId  — full replace
  app.put('/recipes/:menuItemId', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    const { menuItemId } = req.params as { menuItemId: string }
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, cafeId } })
    if (!item) return reply.code(404).send({ error: 'Menu item not found' })
    const { lines } = UpsertRecipeSchema.parse(req.body)

    await prisma.$transaction([
      prisma.recipe.deleteMany({ where: { menuItemId } }),
      prisma.recipe.createMany({ data: lines.map(l => ({ menuItemId, ingredientId: l.ingredientId, qtyPerUnit: l.qtyPerUnit })) }),
    ])
    emitAuditEvent({ eventType: 'RECIPE_UPDATED', cafeId, userId: sub, entityType: 'menu_item', entityId: menuItemId, ipAddress: req.ip })
    const recipes = await prisma.recipe.findMany({ where: { menuItemId }, include: { ingredient: true } })
    return reply.send(recipes)
  })

  // ── Restock ───────────────────────────────────────────────────────────────

  app.post('/restock', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId, sub } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const body = RestockSchema.parse(req.body)

    const ing = await prisma.ingredient.findFirst({ where: { id: body.ingredientId, cafeId } })
    if (!ing) return reply.code(404).send({ error: 'Ingredient not found' })

    const [log] = await prisma.$transaction([
      prisma.restockLog.create({ data: { cafeId, ingredientId: body.ingredientId, qtyAdded: body.qtyAdded, date: new Date(body.date), note: body.note } }),
      prisma.ingredient.update({ where: { id: body.ingredientId }, data: { stock: { increment: body.qtyAdded } } }),
    ])

    emitAuditEvent({ eventType: 'STOCK_RESTOCKED', cafeId, userId: sub, entityType: 'ingredient', entityId: body.ingredientId, ipAddress: req.ip, payload: { qtyAdded: body.qtyAdded } })
    return reply.code(201).send(log)
  })

  app.get('/restock', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })
    const logs = await prisma.restockLog.findMany({ where: { cafeId }, orderBy: { createdAt: 'desc' }, take: 100, include: { ingredient: true } })
    return reply.send(logs)
  })

  // ── Daily report ──────────────────────────────────────────────────────────

  app.get('/daily-report', { preHandler: authGuard }, async (req, reply) => {
    const { cafeId } = req.user
    if (!cafeId) return reply.code(404).send({ error: 'No cafe linked' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [ingredients, todayRestocks] = await Promise.all([
      prisma.ingredient.findMany({ where: { cafeId } }),
      prisma.restockLog.findMany({ where: { cafeId, date: { gte: today, lt: tomorrow } } }),
    ])

    const report = ingredients.map(ing => {
      const restockedToday = todayRestocks.filter(r => r.ingredientId === ing.id).reduce((s, r) => s + Number(r.qtyAdded), 0)
      const current = Number(ing.stock)
      return {
        id: ing.id, name: ing.name, unit: ing.unit,
        closing: current,
        restockedToday,
        threshold: Number(ing.threshold),
        status: current <= 0 ? 'critical' : current <= Number(ing.threshold) ? 'low' : 'ok',
      }
    })

    return reply.send(report)
  })
}
