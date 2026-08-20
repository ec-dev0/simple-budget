import { z } from "zod";

export function code(message: string, code: string) {
  return { message, code };
}

const msg = {
  nameRequired: code("ERR_REQUIRED_NAME", "El nombre es obligatorio"),
  urlInvalid: code("ERR_INVALID_URL", "El enlace debe ser una URL válida"),
  dateInvalid: code("ERR_INVALID_DATE", "La fecha debe tener formato YYYY-MM-DD"),
  colorInvalid: code("ERR_INVALID_COLOR", "El color debe ser un código hex de 6 dígitos"),
  nameTooLong: code("ERR_NAME_TOO_LONG", "El nombre es demasiado largo"),
  descTooLong: code("ERR_DESCRIPTION_TOO_LONG", "La descripción es demasiado larga"),
  notesTooLong: code("ERR_NOTES_TOO_LONG", "Las notas son demasiado largas"),
  priorityInvalid: code("ERR_INVALID_PRIORITY", "La prioridad debe estar entre 0 y 3"),
  currencyInvalid: code("ERR_INVALID_CURRENCY", "La moneda debe tener exactamente 3 caracteres"),
  storeTooLong: code("ERR_STORE_TOO_LONG", "El nombre de la tienda es demasiado largo"),
  unitTooLong: code("ERR_UNIT_TOO_LONG", "La unidad es demasiado larga"),
  iconTooLong: code("ERR_ICON_TOO_LONG", "El identificador de icono es demasiado largo"),
  purchasedRequired: code("ERR_PURCHASED_REQUIRED", "El estado de comprado es obligatorio"),
  quantityInvalid: code("ERR_INVALID_QUANTITY", "La cantidad debe ser positiva"),
};

const optionalMoney = z
  .union([z.number().finite(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  });

const optionalBool = z
  .union([z.boolean(), z.number().int().min(0).max(1), z.string()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    return v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined;
  });

const optionalLink = z
  .string()
  .url({ message: msg.urlInvalid.message })
  .max(500)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, msg.dateInvalid.message)
  .nullable()
  .optional();

export const budgetCreateSchema = z.object({
  name: z.string().min(1, msg.nameRequired.message).max(120, msg.nameTooLong.message).default("Presupuesto"),
  description: z.string().max(1000, msg.descTooLong.message).default(""),
  initialAmount: optionalMoney,
  currency: z.string().length(3, msg.currencyInvalid.message).default("EUR"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, msg.colorInvalid.message).default("#6366f1"),
  icon: z.string().max(40, msg.iconTooLong.message).default("wallet"),
  sortOrder: z.number().int().optional(),
});

export const budgetUpdateSchema = budgetCreateSchema.partial().omit({ sortOrder: true });

export const categoryCreateSchema = z.object({
  name: z.string().min(1, msg.nameRequired.message).max(120, msg.nameTooLong.message),
  description: z.string().max(1000, msg.descTooLong.message).default(""),
  icon: z.string().max(40, msg.iconTooLong.message).default("package"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, msg.colorInvalid.message).default("#6366f1"),
  limitAmount: optionalMoney,
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial().omit({ sortOrder: true });

export const itemCreateSchema = z.object({
  name: z.string().min(1, msg.nameRequired.message).max(200, msg.nameTooLong.message),
  description: z.string().max(1000, msg.descTooLong.message).default(""),
  quantity: z.number().positive(msg.quantityInvalid.message).default(1),
  unit: z.string().max(20, msg.unitTooLong.message).nullable().optional(),
  estimatedCost: optionalMoney,
  actualCost: optionalMoney,
  purchased: optionalBool,
  priority: z.number().int().min(0).max(3, msg.priorityInvalid.message).default(0),
  store: z.string().max(120, msg.storeTooLong.message).nullable().optional(),
  link: optionalLink,
  dueDate: optionalDate,
  notes: z.string().max(2000, msg.notesTooLong.message).default(""),
  sortOrder: z.number().int().optional(),
});

export const itemUpdateSchema = itemCreateSchema.partial().omit({ sortOrder: true });

export const purchaseSchema = z.object({
  purchased: z.boolean({
    message: msg.purchasedRequired.message,
  }),
  actualCost: optionalMoney,
  purchasedAt: z.string().nullable().optional(),
});

// ─── Export / Import ────────────────────────────────────────────────────────

const exportedItemSchema = z.object({
  id: z.string().min(1),
  category_id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string().nullable(),
  estimated_cost: z.number().nullable(),
  actual_cost: z.number().nullable(),
  purchased: z.number().int().min(0).max(1),
  purchased_at: z.string().nullable(),
  priority: z.number().int().min(0).max(3),
  store: z.string().nullable(),
  link: z.string().nullable(),
  due_date: z.string().nullable(),
  notes: z.string(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

const exportedCategorySchema = z.object({
  id: z.string().min(1),
  budget_id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  limit_amount: z.number().nullable(),
  archived: z.number().int().min(0).max(1),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  items: z.array(exportedItemSchema),
});

const exportedBudgetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  initial_amount: z.number(),
  currency: z.string().length(3),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string(),
  archived: z.number().int().min(0).max(1),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  categories: z.array(exportedCategorySchema),
});

export const exportPayloadSchema = z.object({
  format: z.literal("simple-budget/export"),
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  schemaVersion: z.number().int().nonnegative(),
  app: z.literal("simple-budget"),
  budgets: z.array(exportedBudgetSchema),
});

// ─── Settings ──────────────────────────────────────────────────────────────

export const localeSchema = z.enum(["es", "en"]);

const settingsMessages = {
  emptyPatch: code("ERR_EMPTY_PATCH", "Debes enviar al menos un campo"),
};

export const settingsUpdateSchema = z
  .object({
    language: localeSchema,
    currency: z.string().length(3, msg.currencyInvalid.message),
    onboarded: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: settingsMessages.emptyPatch.message });
