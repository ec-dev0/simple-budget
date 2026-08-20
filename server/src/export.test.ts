import { test, expect, describe } from "bun:test";

process.env.DB_PATH = `/tmp/opencode/sb-test/export-${Date.now()}.db`;

const repo = await import("./repo.ts");
const { db } = await import("./db.ts");
const { exportAll, importAll } = await import("./export.ts");
const { exportPayloadSchema } = await import("./validation.ts");
const { api } = await import("./api.ts");

function seed() {
  const b1 = repo.createBudget({
    name: "Casa",
    description: "Vivienda",
    initialAmount: 15000,
    currency: "EUR",
    color: "#3c7a53",
    icon: "home",
  });
  const c1 = repo.createCategory(b1.id, { name: "Cocina", limitAmount: 4000, icon: "chef-hat", color: "#f59e0b" });
  const c2 = repo.createCategory(b1.id, { name: "Salón", limitAmount: 3500 });

  repo.createItem(c1.id, {
    name: "Placa",
    estimatedCost: 549,
    actualCost: 529,
    purchased: true,
    priority: 3,
    store: "Media Markt",
    link: "https://example.test/placa",
    notes: "Beko 60T",
  });
  repo.createItem(c1.id, { name: "Horno", estimatedCost: 420, priority: 3 });
  repo.createItem(c2.id, { name: "Sofá", estimatedCost: 1200, priority: 3, dueDate: "2026-10-01" });

  const b2 = repo.createBudget({ name: "Viaje", initialAmount: 2000, currency: "USD" });
  const c3 = repo.createCategory(b2.id, { name: "Transporte" });
  repo.createItem(c3.id, { name: "Avión", estimatedCost: 800, priority: 2 });

  return { b1, c1, c2, b2, c3 };
}

function wipe(): void {
  db.exec("DELETE FROM items");
  db.exec("DELETE FROM categories");
  db.exec("DELETE FROM budgets");
}

function counts() {
  return {
    budgets: (db.query("SELECT COUNT(*) AS n FROM budgets").get() as { n: number }).n,
    categories: (db.query("SELECT COUNT(*) AS n FROM categories").get() as { n: number }).n,
    items: (db.query("SELECT COUNT(*) AS n FROM items").get() as { n: number }).n,
  };
}

describe("export / import — roundtrip", () => {
  test("el payload tiene los campos de cabecera correctos", () => {
    wipe();
    seed();
    const payload = exportAll();
    expect(payload.format).toBe("simple-budget/export");
    expect(payload.version).toBe(1);
    expect(payload.app).toBe("simple-budget");
    expect(typeof payload.exportedAt).toBe("string");
    expect(payload.schemaVersion).toBe(2);
    expect(payload.budgets).toHaveLength(2);
  });

  test("export → wipe → import preserva todos los campos", () => {
    wipe();
    const ids = seed();
    const payload = exportAll();

    // Capturar referencia al budget 1 antes para comparar
    const b1Before = repo.getBudgetDetail(ids.b1.id);

    wipe();
    expect(counts()).toEqual({ budgets: 0, categories: 0, items: 0 });

    const result = importAll(payload);
    expect(result.imported.budgets).toBe(2);
    expect(result.imported.categories).toBe(3);
    expect(result.imported.items).toBe(4);

    const c = counts();
    expect(c.budgets).toBe(2);
    expect(c.categories).toBe(3);
    expect(c.items).toBe(4);

    // Detalle idéntico tras import
    const b1After = repo.getBudgetDetail(ids.b1.id);
    expect(b1After.name).toBe(b1Before.name);
    expect(b1After.initial_amount).toBe(b1Before.initial_amount);
    expect(b1After.currency).toBe(b1Before.currency);
    expect(b1After.color).toBe(b1Before.color);
    expect(b1After.categories).toHaveLength(2);
    expect(b1After.categories[0]!.name).toBe("Cocina");
    expect(b1After.categories[0]!.limit_amount).toBe(4000);
    expect(b1After.categories[0]!.items).toHaveLength(2);
    const placa = b1After.categories[0]!.items.find((it) => it.name === "Placa");
    expect(placa).toBeDefined();
    expect(placa!.purchased).toBe(1);
    expect(placa!.actual_cost).toBe(529);
    expect(placa!.link).toBe("https://example.test/placa");
    const horno = b1After.categories[0]!.items.find((it) => it.name === "Horno");
    expect(horno).toBeDefined();
    expect(horno!.estimated_cost).toBe(420);
    expect(horno!.purchased).toBe(0);
    expect(b1After.categories[1]!.items[0]!.name).toBe("Sofá");
    expect(b1After.categories[1]!.items[0]!.due_date).toBe("2026-10-01");
    expect(b1After.summary.spent).toBe(529);
  });

  test("reimportar el mismo archivo no duplica filas", () => {
    wipe();
    seed();
    const payload = exportAll();
    importAll(payload);
    importAll(payload);
    importAll(payload);
    const c = counts();
    expect(c).toEqual({ budgets: 2, categories: 3, items: 4 });
  });

  test("modificar el payload antes de reimportar actualiza el registro", () => {
    wipe();
    const ids = seed();
    const payload = exportAll();
    payload.budgets[0]!.name = "Casa nueva";
    payload.budgets[0]!.initial_amount = 22000;
    payload.budgets[0]!.categories[0]!.name = "Cocina XL";
    payload.budgets[0]!.categories[0]!.limit_amount = 5500;
    // En el export el orden de Cocina es (por sort_order ASC): Placa, Horno.
    // Lo identificamos por nombre para no atarnos al orden.
    const placa = payload.budgets[0]!.categories[0]!.items.find((it) => it.name === "Placa")!;
    placa.name = "Placa de inducción";
    placa.estimated_cost = 600;
    const sofa = payload.budgets[0]!.categories[1]!.items[0]!;
    sofa.name = "Sofá chaise longue";
    sofa.estimated_cost = 1500;

    importAll(payload);

    const b1 = repo.getBudgetDetail(ids.b1.id);
    expect(b1.name).toBe("Casa nueva");
    expect(b1.initial_amount).toBe(22000);
    expect(b1.categories[0]!.name).toBe("Cocina XL");
    expect(b1.categories[0]!.limit_amount).toBe(5500);

    const placaAfter = b1.categories[0]!.items.find((it) => it.name === "Placa de inducción");
    expect(placaAfter).toBeDefined();
    expect(placaAfter!.estimated_cost).toBe(600);
    expect(placaAfter!.actual_cost).toBe(529);
    expect(placaAfter!.purchased).toBe(1);

    const sofaAfter = b1.categories[1]!.items.find((it) => it.name === "Sofá chaise longue");
    expect(sofaAfter).toBeDefined();
    expect(sofaAfter!.estimated_cost).toBe(1500);

    // El otro budget sigue intacto
    const b2 = repo.getBudget(ids.b2.id);
    expect(b2.name).toBe("Viaje");
  });

  test("import preserva IDs originales y enlaces reproducen el grafo", () => {
    wipe();
    const ids = seed();
    const payload = exportAll();
    wipe();
    importAll(payload);

    // IDs de budgets intactos
    expect(repo.getBudget(ids.b1.id).name).toBe("Casa");
    // Categorías siguen colgando del budget correcto
    const cat = repo.getCategory(ids.c1.id);
    expect(cat.budget_id).toBe(ids.b1.id);
    // Items siguen colgando de la categoría correcta
    const items = repo.listItems(ids.c1.id);
    expect(items).toHaveLength(2);
  });
});

describe("export / import — validación", () => {
  test("exportPayloadSchema acepta un payload válido", () => {
    wipe();
    seed();
    const payload = exportAll();
    const parsed = exportPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  test("rechaza format distinto", () => {
    wipe();
    seed();
    const payload = { ...exportAll(), format: "otro" };
    const parsed = exportPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  test("rechaza version futura", () => {
    wipe();
    seed();
    const payload = { ...exportAll(), version: 99 };
    const parsed = exportPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  test("rechaza color con formato incorrecto", () => {
    wipe();
    seed();
    const payload = exportAll();
    payload.budgets[0]!.color = "rojo";
    const parsed = exportPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe("API endpoints", () => {
  test("GET /api/export devuelve JSON con content-disposition", async () => {
    wipe();
    seed();
    const res = await api.request("/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(res.headers.get("content-disposition")).toMatch(/filename=/);
    const body = (await res.json()) as { format: string; budgets: unknown[] };
    expect(body.format).toBe("simple-budget/export");
    expect(body.budgets).toHaveLength(2);
  });

  test("POST /api/import acepta payload y devuelve conteos", async () => {
    wipe();
    seed();
    const payload = exportAll();
    wipe();
    const res = await api.request("/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as {
      imported: { budgets: number; categories: number; items: number };
    };
    expect(result.imported).toEqual({ budgets: 2, categories: 3, items: 4 });
    expect(counts()).toEqual({ budgets: 2, categories: 3, items: 4 });
  });

  test("POST /api/import rechaza payload con format incorrecto (400)", async () => {
    wipe();
    seed();
    const payload = { ...exportAll(), format: "no-es-simple-budget" };
    const res = await api.request("/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/import rechaza cuerpo JSON inválido (400)", async () => {
    const res = await api.request("/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "no es json {{{",
    });
    expect(res.status).toBe(400);
  });
});
