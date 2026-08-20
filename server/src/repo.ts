import type { SQLQueryBindings } from "bun:sqlite";
import { db, nowIso, newId, round2 } from "./db.ts";

export type BudgetRow = {
  id: string;
  name: string;
  description: string;
  initial_amount: number;
  currency: string;
  color: string;
  icon: string;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  budget_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  limit_amount: number | null;
  archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  purchased: number;
  purchased_at: string | null;
  priority: number;
  store: string | null;
  link: string | null;
  due_date: string | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategorySummary = {
  limit: number | null;
  spent: number;
  pendingEstimated: number;
  purchasedCount: number;
  pendingCount: number;
  totalCount: number;
  remaining: number | null;
  usedPct: number | null;
};

export type BudgetSummary = {
  initialAmount: number;
  spent: number;
  committed: number;
  remaining: number;
  usedPct: number;
  itemCount: number;
  purchasedCount: number;
  pendingCount: number;
  categoryCount: number;
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

function clampInt(v: number | undefined): number {
  return Math.trunc(v ?? 0);
}

function insertAtEnd(table: "budgets" | "categories" | "items", parentCol: string, parentId: string): number {
  const q = `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table} WHERE ${parentCol} = ?`;
  const row = db.query(q).get(parentId) as { next: number };
  return row.next;
}

// ─── Budgets ────────────────────────────────────────────────────────────────

export function listBudgets(includeArchived = true): BudgetRow[] {
  const rows = db
    .query(
      `SELECT * FROM budgets
       WHERE archived = 0 OR ? = 1
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(includeArchived ? 1 : 0);
  return rows as BudgetRow[];
}

export function getBudget(id: string): BudgetRow {
  const row = db.query("SELECT * FROM budgets WHERE id = ?").get(id);
  if (!row) throw new NotFoundError("Presupuesto no encontrado");
  return row as BudgetRow;
}

export function createBudget(input: {
  name: string;
  description?: string;
  initialAmount?: number | null;
  currency?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}): BudgetRow {
  const id = newId();
  const now = nowIso();
  const order = clampInt(input.sortOrder) || insertAtEnd("budgets", "id", "");
  db.query(
    `INSERT INTO budgets (id, name, description, initial_amount, currency, color, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.description ?? "",
    round2(input.initialAmount) ?? 0,
    input.currency ?? "EUR",
    input.color ?? "#6366f1",
    input.icon ?? "wallet",
    order,
    now,
    now
  );
  return getBudget(id);
}

export function updateBudget(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    initialAmount: number | null;
    currency: string;
    color: string;
    icon: string;
    archived: number | boolean;
  }>
): BudgetRow {
  getBudget(id);
  const fields: string[] = [];
  const values: SQLQueryBindings[] = [];
  if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.initialAmount !== undefined) { fields.push("initial_amount = ?"); values.push(round2(input.initialAmount)); }
  if (input.currency !== undefined) { fields.push("currency = ?"); values.push(input.currency); }
  if (input.color !== undefined) { fields.push("color = ?"); values.push(input.color); }
  if (input.icon !== undefined) { fields.push("icon = ?"); values.push(input.icon); }
  if (input.archived !== undefined) { fields.push("archived = ?"); values.push(input.archived ? 1 : 0); }
  if (fields.length === 0) return getBudget(id);
  fields.push("updated_at = ?");
  values.push(nowIso());
  db.query(`UPDATE budgets SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  return getBudget(id);
}

export function deleteBudget(id: string): void {
  getBudget(id);
  db.query("DELETE FROM budgets WHERE id = ?").run(id);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function listCategories(budgetId: string, includeArchived = true): CategoryRow[] {
  getBudget(budgetId);
  const rows = db
    .query(
      `SELECT * FROM categories
       WHERE budget_id = ? AND (archived = 0 OR ? = 1)
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(budgetId, includeArchived ? 1 : 0);
  return rows as CategoryRow[];
}

export function getCategory(id: string): CategoryRow {
  const row = db.query("SELECT * FROM categories WHERE id = ?").get(id);
  if (!row) throw new NotFoundError("Categoría no encontrada");
  return row as CategoryRow;
}

export function createCategory(
  budgetId: string,
  input: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    limitAmount?: number | null;
    sortOrder?: number;
  }
): CategoryRow {
  getBudget(budgetId);
  const id = newId();
  const now = nowIso();
  const order = clampInt(input.sortOrder) || insertAtEnd("categories", "budget_id", budgetId);
  db.query(
    `INSERT INTO categories (id, budget_id, name, description, icon, color, limit_amount, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    budgetId,
    input.name,
    input.description ?? "",
    input.icon ?? "package",
    input.color ?? "#6366f1",
    round2(input.limitAmount),
    order,
    now,
    now
  );
  return getCategory(id);
}

export function updateCategory(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    limitAmount: number | null;
    archived: number | boolean;
  }>
): CategoryRow {
  getCategory(id);
  const fields: string[] = [];
  const values: SQLQueryBindings[] = [];
  if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.icon !== undefined) { fields.push("icon = ?"); values.push(input.icon); }
  if (input.color !== undefined) { fields.push("color = ?"); values.push(input.color); }
  if (input.limitAmount !== undefined) { fields.push("limit_amount = ?"); values.push(round2(input.limitAmount)); }
  if (input.archived !== undefined) { fields.push("archived = ?"); values.push(input.archived ? 1 : 0); }
  if (fields.length === 0) return getCategory(id);
  fields.push("updated_at = ?");
  values.push(nowIso());
  db.query(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  return getCategory(id);
}

export function deleteCategory(id: string): void {
  getCategory(id);
  db.query("DELETE FROM categories WHERE id = ?").run(id);
}

// ─── Items ──────────────────────────────────────────────────────────────────

export function listItems(categoryId: string, includePurchased = true): ItemRow[] {
  getCategory(categoryId);
  const rows = db
    .query(
      `SELECT * FROM items
       WHERE category_id = ? AND (purchased = 0 OR ? = 1)
       ORDER BY purchased ASC, sort_order ASC, created_at ASC`
    )
    .all(categoryId, includePurchased ? 1 : 0);
  return rows as ItemRow[];
}

export function getItem(id: string): ItemRow {
  const row = db.query("SELECT * FROM items WHERE id = ?").get(id);
  if (!row) throw new NotFoundError("Artículo no encontrado");
  return row as ItemRow;
}

export function createItem(
  categoryId: string,
  input: {
    name: string;
    description?: string;
    quantity?: number;
    unit?: string | null;
    estimatedCost?: number | null;
    actualCost?: number | null;
    purchased?: boolean;
    priority?: number;
    store?: string | null;
    link?: string | null;
    dueDate?: string | null;
    notes?: string;
    sortOrder?: number;
  }
): ItemRow {
  getCategory(categoryId);
  const id = newId();
  const now = nowIso();
  const purchased = input.purchased === true;
  const order = clampInt(input.sortOrder) || insertAtEnd("items", "category_id", categoryId);
  db.query(
    `INSERT INTO items
      (id, category_id, name, description, quantity, unit, estimated_cost, actual_cost,
       purchased, purchased_at, priority, store, link, due_date, notes, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    categoryId,
    input.name,
    input.description ?? "",
    input.quantity ?? 1,
    input.unit ?? null,
    round2(input.estimatedCost),
    round2(input.actualCost),
    purchased ? 1 : 0,
    purchased ? now : null,
    clampInt(input.priority),
    input.store ?? null,
    input.link ?? null,
    input.dueDate ?? null,
    input.notes ?? "",
    order,
    now,
    now
  );
  return getItem(id);
}

export function updateItem(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    quantity: number;
    unit: string | null;
    estimatedCost: number | null;
    actualCost: number | null;
    purchased: boolean;
    priority: number;
    store: string | null;
    link: string | null;
    dueDate: string | null;
    notes: string;
  }>
): ItemRow {
  const existing = getItem(id);
  const fields: string[] = [];
  const values: SQLQueryBindings[] = [];

  if (input.name !== undefined) { fields.push("name = ?"); values.push(input.name); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.quantity !== undefined) { fields.push("quantity = ?"); values.push(input.quantity); }
  if (input.unit !== undefined) { fields.push("unit = ?"); values.push(input.unit ?? null); }
  if (input.estimatedCost !== undefined) { fields.push("estimated_cost = ?"); values.push(round2(input.estimatedCost)); }
  if (input.actualCost !== undefined) { fields.push("actual_cost = ?"); values.push(round2(input.actualCost)); }
  if (input.priority !== undefined) { fields.push("priority = ?"); values.push(clampInt(input.priority)); }
  if (input.store !== undefined) { fields.push("store = ?"); values.push(input.store ?? null); }
  if (input.link !== undefined) { fields.push("link = ?"); values.push(input.link ?? null); }
  if (input.dueDate !== undefined) { fields.push("due_date = ?"); values.push(input.dueDate ?? null); }
  if (input.notes !== undefined) { fields.push("notes = ?"); values.push(input.notes); }

  if (input.purchased !== undefined) {
    const nextPurchased = input.purchased ? true : false;
    const isPurchased = existing.purchased === 1;
    if (nextPurchased !== isPurchased) {
      fields.push("purchased = ?");
      fields.push("purchased_at = ?");
      values.push(nextPurchased ? 1 : 0, nextPurchased ? existing.purchased_at ?? nowIso() : null);
    }
  }

  if (fields.length === 0) return existing;
  fields.push("updated_at = ?");
  values.push(nowIso());
  db.query(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  return getItem(id);
}

export function setPurchased(
  id: string,
  purchased: boolean,
  actualCost?: number | null,
  purchasedAt?: string | null
): ItemRow {
  getItem(id);
  const fields: string[] = ["purchased = ?", "purchased_at = ?", "updated_at = ?"];
  const values: SQLQueryBindings[] = [purchased ? 1 : 0, purchased ? purchasedAt ?? nowIso() : null, nowIso()];
  if (actualCost !== undefined) {
    fields.push("actual_cost = ?");
    values.push(round2(actualCost));
  }
  db.query(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  return getItem(id);
}

export function deleteItem(id: string): void {
  getItem(id);
  db.query("DELETE FROM items WHERE id = ?").run(id);
}

// ─── Summaries ──────────────────────────────────────────────────────────────

function categorySummary(rows: ItemRow[]): CategorySummary {
  let spent = 0;
  let pendingEstimated = 0;
  let purchasedCount = 0;
  for (const it of rows) {
    if (it.purchased === 1) {
      spent += it.actual_cost ?? it.estimated_cost ?? 0;
      purchasedCount++;
    } else {
      pendingEstimated += it.estimated_cost ?? 0;
    }
  }
  return {
    limit: null,
    spent: round2(spent) ?? 0,
    pendingEstimated: round2(pendingEstimated) ?? 0,
    purchasedCount,
    pendingCount: rows.length - purchasedCount,
    totalCount: rows.length,
    remaining: null,
    usedPct: null,
  };
}

export function getCategorySummary(categoryId: string): CategorySummary {
  const cat = getCategory(categoryId);
  const rows = listItems(categoryId, true);
  const s = categorySummary(rows);
  const limit = cat.limit_amount;
  if (limit !== null) {
    s.limit = round2(limit);
    s.remaining = round2(limit - s.spent);
    s.usedPct = limit > 0 ? Math.min(100, Math.round((s.spent / limit) * 1000) / 10) : 0;
  }
  return s;
}

export function getBudgetSummary(budgetId: string): BudgetSummary {
  const budget = getBudget(budgetId);
  const cats = listCategories(budgetId, true);
  let spent = 0;
  let committed = 0;
  let itemCount = 0;
  let purchasedCount = 0;
  for (const c of cats) {
    const rows = listItems(c.id, true);
    for (const it of rows) {
      itemCount++;
      if (it.purchased === 1) {
        spent += it.actual_cost ?? it.estimated_cost ?? 0;
        purchasedCount++;
      } else {
        committed += it.estimated_cost ?? 0;
      }
    }
  }
  const initial = budget.initial_amount ?? 0;
  return {
    initialAmount: round2(initial) ?? 0,
    spent: round2(spent) ?? 0,
    committed: round2(committed) ?? 0,
    remaining: round2(initial - spent) ?? 0,
    usedPct: initial > 0 ? Math.min(100, Math.round((spent / initial) * 1000) / 10) : 0,
    itemCount,
    purchasedCount,
    pendingCount: itemCount - purchasedCount,
    categoryCount: cats.length,
  };
}

export type CategoryDetail = CategoryRow & { items: ItemRow[]; summary: CategorySummary };
export type BudgetDetail = BudgetRow & { categories: CategoryDetail[]; summary: BudgetSummary };

export function getBudgetDetail(budgetId: string): BudgetDetail {
  const budget = getBudget(budgetId);
  const cats = listCategories(budgetId, true);
  const categories: CategoryDetail[] = cats.map((c) => {
    const items = listItems(c.id, true);
    const s = categorySummary(items);
    if (c.limit_amount !== null) {
      s.limit = round2(c.limit_amount);
      s.remaining = round2(c.limit_amount - s.spent);
      s.usedPct = c.limit_amount > 0 ? Math.min(100, Math.round((s.spent / c.limit_amount) * 1000) / 10) : 0;
    }
    return { ...c, items, summary: s };
  });
  return { ...budget, categories, summary: getBudgetSummary(budgetId) };
}

export type Locale = "es" | "en";

export type Settings = {
  language: Locale;
  currency: string;
  onboarded: boolean;
  updatedAt: string;
};

const DEFAULTS: Omit<Settings, "updatedAt"> = {
  language: "es",
  currency: "EUR",
  onboarded: false,
};

function readSetting(key: string): string | undefined {
  const row = db
    .query<{ value: string }, [string]>("SELECT value FROM settings WHERE key = ?")
    .get(key);
  return row?.value;
}

export function getSettings(): Settings {
  const langRaw = readSetting("language") ?? DEFAULTS.language;
  const language: Locale = langRaw === "en" ? "en" : "es";
  const currency = (readSetting("currency") ?? DEFAULTS.currency).toUpperCase();
  const onboardedRaw = readSetting("onboarded") ?? "0";
  const onboarded = onboardedRaw === "1" || onboardedRaw === "true";
  const stamp = (db
    .query<{ updated_at: string }, []>("SELECT MAX(updated_at) AS updated_at FROM settings")
    .get())?.updated_at ?? nowIso();
  return { language, currency, onboarded, updatedAt: stamp };
}

export type SettingsPatch = {
  language?: Locale;
  currency?: string;
  onboarded?: boolean;
};

export function updateSettings(patch: SettingsPatch): Settings {
  const stamp = nowIso();
  if (patch.language !== undefined) {
    db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'language'").run(
      patch.language,
      stamp
    );
  }
  if (patch.currency !== undefined) {
    db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'currency'").run(
      patch.currency.toUpperCase(),
      stamp
    );
  }
  if (patch.onboarded !== undefined) {
    db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'onboarded'").run(
      patch.onboarded ? "1" : "0",
      stamp
    );
  }
  return getSettings();
}
