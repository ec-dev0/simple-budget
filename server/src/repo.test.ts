import { test, expect, describe } from "bun:test";

process.env.DB_PATH = `/tmp/opencode/sb-test/repo-${Date.now()}.db`;

const repo = await import("./repo.ts");
const { db } = await import("./db.ts");

describe("budgets", () => {
  test("crea, lee y actualiza", () => {
    const b = repo.createBudget({ name: "Casa", initialAmount: 15000, currency: "EUR" });
    expect(b.name).toBe("Casa");
    expect(repo.getBudget(b.id).initial_amount).toBe(15000);

    const updated = repo.updateBudget(b.id, { name: "Casa nueva", initialAmount: 18000 });
    expect(updated.name).toBe("Casa nueva");
    expect(updated.initial_amount).toBe(18000);
    expect(repo.listBudgets()).toHaveLength(1);

    repo.deleteBudget(b.id);
    expect(() => repo.getBudget(b.id)).toThrow();
  });

  test("resumen refleja gastado, pendiente y restante", () => {
    const b = repo.createBudget({ name: "Test", initialAmount: 1000 });
    const c = repo.createCategory(b.id, { name: "Cat" });
    repo.createItem(c.id, { name: "Comprado", estimatedCost: 100, actualCost: 90, purchased: true });
    repo.createItem(c.id, { name: "Pendiente", estimatedCost: 150 });

    const s = repo.getBudgetSummary(b.id);
    expect(s.spent).toBe(90);
    expect(s.committed).toBe(150);
    expect(s.remaining).toBe(910);
    expect(s.purchasedCount).toBe(1);
    expect(s.pendingCount).toBe(1);
  });
});

describe("categories", () => {
  test("crea y actualiza una categoría", () => {
    const b = repo.createBudget({ name: "Category update" });
    const c = repo.createCategory(b.id, { name: "Original", limitAmount: 1000 });

    const updated = repo.updateCategory(c.id, {
      name: "Renombrada",
      description: "Nueva descripción",
      limitAmount: 1250,
    });

    expect(updated.name).toBe("Renombrada");
    expect(updated.description).toBe("Nueva descripción");
    expect(updated.limit_amount).toBe(1250);
    expect(repo.getCategory(c.id).name).toBe("Renombrada");
  });

  test("límite: holgado / justo / desbordado", () => {
    const b = repo.createBudget({ name: "Cat test", initialAmount: 5000 });
    const c = repo.createCategory(b.id, { name: "Obra", limitAmount: 1000 });

    repo.createItem(c.id, { name: "A", actualCost: 500, purchased: true });
    expect(repo.getCategorySummary(c.id).usedPct).toBe(50);
    expect(repo.getCategorySummary(c.id).remaining).toBe(500);

    repo.createItem(c.id, { name: "B", actualCost: 350, purchased: true });
    const tight = repo.getCategorySummary(c.id);
    expect(tight.usedPct).toBe(85);

    repo.createItem(c.id, { name: "C", actualCost: 300, purchased: true });
    const over = repo.getCategorySummary(c.id);
    expect(over.usedPct).toBe(100);
    expect(over.remaining).toBe(-150);
  });
});

describe("items", () => {
  test("marcar comprado registra fecha y coste real", () => {
    const b = repo.createBudget({ name: "Items" });
    const c = repo.createCategory(b.id, { name: "C" });
    const i = repo.createItem(c.id, { name: "Sartén", estimatedCost: 40 });

    expect(repo.getItem(i.id).purchased).toBe(0);
    const bought = repo.setPurchased(i.id, true, 38);
    expect(bought.purchased).toBe(1);
    expect(bought.actual_cost).toBe(38);
    expect(bought.purchased_at).not.toBeNull();

    const pending = repo.setPurchased(i.id, false);
    expect(pending.purchased).toBe(0);
    expect(pending.purchased_at).toBeNull();
  });

  test("borrar categoría borra sus artículos en cascada", () => {
    const b = repo.createBudget({ name: "Cascada" });
    const c = repo.createCategory(b.id, { name: "C" });
    const i = repo.createItem(c.id, { name: "X" });
    repo.deleteCategory(c.id);
    expect(() => repo.getItem(i.id)).toThrow();
  });

  test("detalle anida categorías con resumen", () => {
    const b = repo.createBudget({ name: "Detalle" });
    const c = repo.createCategory(b.id, { name: "C", limitAmount: 200 });
    repo.createItem(c.id, { name: "Y", actualCost: 80, purchased: true });
    const d = repo.getBudgetDetail(b.id);
    expect(d.categories).toHaveLength(1);
    expect(d.categories[0]!.summary.spent).toBe(80);
    expect(d.categories[0]!.items).toHaveLength(1);
  });
});

describe("settings", () => {
  test("defaults razonables al arranque limpio", () => {
    const s = repo.getSettings();
    expect(s.language).toBe("es");
    expect(s.currency).toBe("EUR");
    expect(s.onboarded).toBe(false);
    expect(typeof s.updatedAt).toBe("string");
  });

  test("patch parcial persiste solo lo enviado", () => {
    repo.updateSettings({ language: "en" });
    const s1 = repo.getSettings();
    expect(s1.language).toBe("en");
    expect(s1.currency).toBe("EUR");
    expect(s1.onboarded).toBe(false);

    repo.updateSettings({ onboarded: true, currency: "USD" });
    const s2 = repo.getSettings();
    expect(s2.language).toBe("en");
    expect(s2.currency).toBe("USD");
    expect(s2.onboarded).toBe(true);
  });

  test("PATCH /api/settings expone los nuevos valores", async () => {
    const api = (await import("./api.ts")).api;
    const res = await api.request("/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "es", onboarded: true }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { language: string; onboarded: boolean };
    expect(body.language).toBe("es");
    expect(body.onboarded).toBe(true);
  });

  test("PATCH /api/settings con cuerpo vacío devuelve 400 con código ERR_EMPTY_PATCH", async () => {
    const api = (await import("./api.ts")).api;
    const res = await api.request("/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("ERR_EMPTY_PATCH");
  });

  test("PATCH /api/budgets con nombre vacío devuelve ERR_REQUIRED_NAME", async () => {
    const api = (await import("./api.ts")).api;
    const res = await api.request("/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ERR_REQUIRED_NAME");
  });
});
