import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator, type Hook } from "@hono/zod-validator";
import { z } from "zod";
import {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetDetail,
  getBudgetSummary,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySummary,
  listItems,
  getItem,
  createItem,
  updateItem,
  setPurchased,
  deleteItem,
  getSettings,
  updateSettings,
  NotFoundError,
} from "./repo.ts";
import {
  budgetCreateSchema,
  budgetUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  itemCreateSchema,
  itemUpdateSchema,
  purchaseSchema,
  exportPayloadSchema,
  settingsUpdateSchema,
} from "./validation.ts";
import { exportAll, importAll } from "./export.ts";

const idParam = z.object({ id: z.string().min(1) });
const budgetIdParam = z.object({ budgetId: z.string().min(1) });
const categoryIdParam = z.object({ categoryId: z.string().min(1) });

const ERR_FALLBACK: Record<string, string> = {
  ERR_REQUIRED_NAME: "El nombre es obligatorio",
  ERR_INVALID_URL: "El enlace debe ser una URL válida",
  ERR_INVALID_DATE: "La fecha debe tener formato YYYY-MM-DD",
  ERR_INVALID_COLOR: "El color debe ser un código hex de 6 dígitos",
  ERR_NAME_TOO_LONG: "El nombre es demasiado largo",
  ERR_DESCRIPTION_TOO_LONG: "La descripción es demasiado larga",
  ERR_NOTES_TOO_LONG: "Las notas son demasiado largas",
  ERR_INVALID_PRIORITY: "La prioridad debe estar entre 0 y 3",
  ERR_INVALID_CURRENCY: "La moneda debe tener exactamente 3 caracteres",
  ERR_STORE_TOO_LONG: "El nombre de la tienda es demasiado largo",
  ERR_UNIT_TOO_LONG: "La unidad es demasiado larga",
  ERR_ICON_TOO_LONG: "El identificador de icono es demasiado largo",
  ERR_PURCHASED_REQUIRED: "El estado de comprado es obligatorio",
  ERR_INVALID_QUANTITY: "La cantidad debe ser positiva",
  ERR_EMPTY_PATCH: "Debes enviar al menos un campo",
  ERR_NOT_FOUND: "Recurso no encontrado",
  ERR_INTERNAL: "Error interno del servidor",
  ERR_IMPORT_TOO_LARGE: "El archivo supera el tamaño máximo permitido (5 MB)",
};

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function lookUpCode(text: string): string | null {
  if (!text) return null;
  for (const code of Object.keys(ERR_FALLBACK)) {
    if (text === ERR_FALLBACK[code] || text.startsWith(code)) return code;
  }
  return null;
}

type ZodIssuesBundle = { path: (string | number)[]; message: string; code: string }[];
type ValidationFailure = { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };

function buildValidationResponse(failure: ValidationFailure): Response {
  const issues: ZodIssuesBundle = failure.error.issues.map((i) => ({
    path: i.path ?? [],
    message: i.message ?? "",
    code: lookUpCode(i.message ?? "") ?? "ERR_INVALID",
  }));
  const top = issues[0]?.message;
  const code = top ? lookUpCode(top) ?? "ERR_INVALID" : "ERR_INVALID";
  return new Response(
    JSON.stringify({
      error: {
        code,
        message: top ?? "Datos inválidos",
        issues,
      },
    }),
    { status: 400, headers: { "content-type": "application/json; charset=utf-8" } }
  );
}

const validationHook: Hook<unknown, any, string, "json" | "param"> = (result, _c) => {
  if (result.success) return undefined;
  return buildValidationResponse(result as ValidationFailure);
};

export const api = new Hono();

api.get("/health", (c) => c.json({ status: "ok", service: "simple-budget" }));

// ─── Settings ───────────────────────────────────────────────────────────────

api.get("/settings", (c) => c.json(getSettings()));

api.patch("/settings", zValidator("json", settingsUpdateSchema, validationHook), (c) => {
  const input = c.req.valid("json");
  return c.json(updateSettings(input));
});

// ─── Budgets ────────────────────────────────────────────────────────────────

api.get("/budgets", (c) => c.json(listBudgets()));

api.post("/budgets", zValidator("json", budgetCreateSchema, validationHook), (c) => {
  const input = c.req.valid("json");
  return c.json(createBudget(input), 201);
});

api.get("/budgets/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  return c.json(getBudgetDetail(id));
});

api.patch("/budgets/:id", zValidator("param", idParam), zValidator("json", budgetUpdateSchema, validationHook), (c) => {
  const { id } = c.req.valid("param");
  return c.json(updateBudget(id, c.req.valid("json")));
});

api.delete("/budgets/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  deleteBudget(id);
  return c.json({ ok: true });
});

api.get("/budgets/:id/summary", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  return c.json(getBudgetSummary(id));
});

// ─── Categories ─────────────────────────────────────────────────────────────

api.get("/budgets/:budgetId/categories", zValidator("param", budgetIdParam), (c) => {
  const { budgetId } = c.req.valid("param");
  return c.json(listCategories(budgetId));
});

api.post(
  "/budgets/:budgetId/categories",
  zValidator("param", budgetIdParam),
  zValidator("json", categoryCreateSchema, validationHook),
  (c) => {
    const { budgetId } = c.req.valid("param");
    return c.json(createCategory(budgetId, c.req.valid("json")), 201);
  }
);

api.get("/categories/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  return c.json({ category: getCategory(id), items: listItems(id), summary: getCategorySummary(id) });
});

api.patch("/categories/:id", zValidator("param", idParam), zValidator("json", categoryUpdateSchema, validationHook), (c) => {
  const { id } = c.req.valid("param");
  return c.json(updateCategory(id, c.req.valid("json")));
});

api.delete("/categories/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  deleteCategory(id);
  return c.json({ ok: true });
});

// ─── Items ──────────────────────────────────────────────────────────────────

api.post(
  "/categories/:categoryId/items",
  zValidator("param", categoryIdParam),
  zValidator("json", itemCreateSchema, validationHook),
  (c) => {
    const { categoryId } = c.req.valid("param");
    return c.json(createItem(categoryId, c.req.valid("json")), 201);
  }
);

api.get("/items/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  return c.json(getItem(id));
});

api.patch("/items/:id", zValidator("param", idParam), zValidator("json", itemUpdateSchema, validationHook), (c) => {
  const { id } = c.req.valid("param");
  return c.json(updateItem(id, c.req.valid("json")));
});

api.patch("/items/:id/purchase", zValidator("param", idParam), zValidator("json", purchaseSchema, validationHook), (c) => {
  const { id } = c.req.valid("param");
  const { purchased, actualCost, purchasedAt } = c.req.valid("json");
  return c.json(setPurchased(id, purchased, actualCost, purchasedAt));
});

api.delete("/items/:id", zValidator("param", idParam), (c) => {
  const { id } = c.req.valid("param");
  deleteItem(id);
  return c.json({ ok: true });
});

// ─── Export / Import ─────────────────────────────────────────────────────────

api.get("/export", (c) => {
  const payload = exportAll();
  const stamp = payload.exportedAt.replace(/[:.]/g, "-").replace(/Z$/, "Z");
  const filename = `simple-budget-${stamp}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});

api.post("/import", async (c, next) => {
  const len = Number(c.req.header("content-length") ?? 0);
  if (len > MAX_IMPORT_BYTES) {
    return c.json(
      { error: { code: "ERR_IMPORT_TOO_LARGE", message: ERR_FALLBACK.ERR_IMPORT_TOO_LARGE } },
      413
    );
  }
  return next();
}, zValidator("json", exportPayloadSchema, validationHook), (c) => {
  const payload = c.req.valid("json");
  const result = importAll(payload);
  return c.json(result);
});

// ─── Errors ─────────────────────────────────────────────────────────────────

api.onError((err, c) => {
  if (err instanceof NotFoundError) {
    return c.json(
      {
        error: {
          code: "ERR_NOT_FOUND",
          message: err.message || ERR_FALLBACK.ERR_NOT_FOUND,
        },
      },
      404
    );
  }
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error("[api] error:", err);
  return c.json(
    { error: { code: "ERR_INTERNAL", message: ERR_FALLBACK.ERR_INTERNAL } },
    500
  );
});
