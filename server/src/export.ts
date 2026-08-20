import { db, nowIso } from "./db.ts";
import type { BudgetRow, CategoryRow, ItemRow } from "./repo.ts";

export const EXPORT_FORMAT = "simple-budget/export";
export const EXPORT_VERSION = 1;

export type ExportedBudget = BudgetRow & {
  categories: Array<CategoryRow & { items: ItemRow[] }>;
};

export type ExportPayload = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  schemaVersion: number;
  app: "simple-budget";
  budgets: ExportedBudget[];
};

export type ImportResult = {
  imported: { budgets: number; categories: number; items: number };
};

function currentSchemaVersion(): number {
  const row = db.query("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

function allBudgetsOrdered(): BudgetRow[] {
  return db
    .query("SELECT * FROM budgets ORDER BY sort_order ASC, created_at ASC")
    .all() as BudgetRow[];
}

function categoriesForBudgets(budgetIds: string[]): CategoryRow[] {
  if (budgetIds.length === 0) return [];
  const placeholders = budgetIds.map(() => "?").join(",");
  return db
    .query(
      `SELECT * FROM categories WHERE budget_id IN (${placeholders})
       ORDER BY budget_id ASC, sort_order ASC, created_at ASC`
    )
    .all(...budgetIds) as CategoryRow[];
}

function itemsForCategories(categoryIds: string[]): ItemRow[] {
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => "?").join(",");
  return db
    .query(
      `SELECT * FROM items WHERE category_id IN (${placeholders})
       ORDER BY category_id ASC, sort_order ASC, created_at ASC`
    )
    .all(...categoryIds) as ItemRow[];
}

export function exportAll(): ExportPayload {
  const budgets = allBudgetsOrdered();
  const categories = categoriesForBudgets(budgets.map((b) => b.id));
  const items = itemsForCategories(categories.map((c) => c.id));

  const itemsByCategory = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByCategory.get(it.category_id) ?? [];
    arr.push(it);
    itemsByCategory.set(it.category_id, arr);
  }
  const categoriesByBudget = new Map<string, Array<CategoryRow & { items: ItemRow[] }>>();
  for (const c of categories) {
    const arr = categoriesByBudget.get(c.budget_id) ?? [];
    arr.push({ ...c, items: itemsByCategory.get(c.id) ?? [] });
    categoriesByBudget.set(c.budget_id, arr);
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: nowIso(),
    schemaVersion: currentSchemaVersion(),
    app: "simple-budget",
    budgets: budgets.map((b) => ({
      ...b,
      categories: categoriesByBudget.get(b.id) ?? [],
    })),
  };
}

export function importAll(payload: ExportPayload): ImportResult {
  const counts = { budgets: 0, categories: 0, items: 0 };

  db.transaction(() => {
    const insertBudget = db.query(
      `INSERT OR REPLACE INTO budgets
        (id, name, description, initial_amount, currency, color, icon, archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertCategory = db.query(
      `INSERT OR REPLACE INTO categories
        (id, budget_id, name, description, icon, color, limit_amount, archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertItem = db.query(
      `INSERT OR REPLACE INTO items
        (id, category_id, name, description, quantity, unit, estimated_cost, actual_cost,
         purchased, purchased_at, priority, store, link, due_date, notes, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const b of payload.budgets) {
      insertBudget.run(
        b.id,
        b.name,
        b.description,
        b.initial_amount,
        b.currency,
        b.color,
        b.icon,
        b.archived,
        b.sort_order,
        b.created_at,
        b.updated_at
      );
      counts.budgets++;

      for (const c of b.categories) {
        insertCategory.run(
          c.id,
          b.id,
          c.name,
          c.description,
          c.icon,
          c.color,
          c.limit_amount,
          c.archived,
          c.sort_order,
          c.created_at,
          c.updated_at
        );
        counts.categories++;

        for (const it of c.items) {
          insertItem.run(
            it.id,
            c.id,
            it.name,
            it.description,
            it.quantity,
            it.unit,
            it.estimated_cost,
            it.actual_cost,
            it.purchased,
            it.purchased_at,
            it.priority,
            it.store,
            it.link,
            it.due_date,
            it.notes,
            it.sort_order,
            it.created_at,
            it.updated_at
          );
          counts.items++;
        }
      }
    }
  })();

  return { imported: counts };
}
