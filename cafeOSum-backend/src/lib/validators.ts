import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  cafeName: z.string().min(2).max(100),
  name: z.string().min(1).max(100).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── Cafe ────────────────────────────────────────────────────────────────────

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const UpdateCafeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  gstin: z.string().regex(GSTIN_RE, 'Invalid GSTIN format').optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
})

// ─── Menu items ───────────────────────────────────────────────────────────────

export const MenuItemSchema = z.object({
  name: z.string().min(1).max(100),
  hindiName: z.string().max(100).optional(),
  category: z.string().min(1).max(50),
  price: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(5),
  isAvailable: z.boolean().default(true),
})

// ─── Tables ──────────────────────────────────────────────────────────────────

export const TableSchema = z.object({
  name: z.string().min(1).max(50),
  seats: z.number().int().min(1).max(50),
  type: z.string().max(30).optional(),
})

export const TableStatusSchema = z.object({
  status: z.enum(['FREE', 'OCCUPIED', 'BILL_PENDING']),
})

// ─── Orders ──────────────────────────────────────────────────────────────────

export const OrderLineSchema = z.object({
  menuItemId: z.string().cuid(),
  qty: z.number().int().min(1),
  note: z.string().max(100).optional(),
  isComp: z.boolean().default(false),
})

export const CreateOrderSchema = z.object({
  tableId: z.string().cuid(),
  lines: z.array(OrderLineSchema).min(1),
})

export const UpdateOrderLineSchema = z.object({
  qty: z.number().int().min(0),
  note: z.string().max(100).optional(),
  isComp: z.boolean().optional(),
})

export const SyncOrdersSchema = z.object({
  orders: z.array(
    z.object({
      localId: z.string(),
      tableId: z.string().cuid(),
      lines: z.array(OrderLineSchema).min(1),
      createdAt: z.string().datetime(),
    })
  ),
})

// ─── Billing ─────────────────────────────────────────────────────────────────

export const SettleBillSchema = z.object({
  paymentMode: z.enum(['cash', 'upi', 'card']),
  cashTendered: z.number().positive().optional(),
  discountValue: z.number().min(0).default(0),
  discountType: z.enum(['flat', 'percent']).optional(),
  compLineIds: z.array(z.string().cuid()).default([]),
})

export const VoidBillSchema = z.object({
  pin: z.string().length(4),
  reason: z.string().min(5).max(300),
})

// ─── Inventory ───────────────────────────────────────────────────────────────

export const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.enum(['g', 'ml', 'pcs', 'kg', 'L']),
  stock: z.number().min(0),
  threshold: z.number().min(0),
  supplier: z.string().max(100).optional(),
})

export const RecipeLineSchema = z.object({
  ingredientId: z.string().cuid(),
  qtyPerUnit: z.number().positive(),
})

export const UpsertRecipeSchema = z.object({
  lines: z.array(RecipeLineSchema),
})

export const RestockSchema = z.object({
  ingredientId: z.string().cuid(),
  qtyAdded: z.number().positive(),
  date: z.string().datetime(),
  note: z.string().max(200).optional(),
})
