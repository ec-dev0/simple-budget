import { api, ApiError } from "./api.ts";
import type {
  BudgetDetail,
  BudgetInput,
  BudgetRow,
  CategoryDetail,
  CategoryInput,
  CategorySummary,
  ExportPayload,
  ImportResult,
  ItemInput,
  ItemRow,
} from "./types.ts";
import { i18n, t } from "./i18n/index.svelte.ts";

class ImportParseError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ImportParseError";
    this.code = code;
  }
}

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return i18n.resolveError(e.code, e.message);
  if (e instanceof ImportParseError) return i18n.resolveError(e.code, e.message);
  if (e instanceof Error) return e.message || t("api.unexpected");
  return t("api.unexpected");
}

function categoryStatusInner(cat: CategoryDetail): void {
  let spent = 0;
  let pending = 0;
  let purchasedCount = 0;
  for (const it of cat.items) {
    if (it.purchased === 1) {
      spent += it.actual_cost ?? it.estimated_cost ?? 0;
      purchasedCount++;
    } else {
      pending += it.estimated_cost ?? 0;
    }
  }
  const s: CategorySummary = {
    limit: cat.limit_amount === null ? null : Math.round(cat.limit_amount * 100) / 100,
    spent: Math.round(spent * 100) / 100,
    pendingEstimated: Math.round(pending * 100) / 100,
    purchasedCount,
    pendingCount: cat.items.length - purchasedCount,
    totalCount: cat.items.length,
    remaining: null,
    usedPct: null,
  };
  if (cat.limit_amount !== null) {
    s.remaining = Math.round((cat.limit_amount - spent) * 100) / 100;
    s.usedPct = cat.limit_amount > 0 ? Math.min(100, Math.round((spent / cat.limit_amount) * 1000) / 10) : 0;
  }
  cat.summary = s;
}

class SimpleBudgetStore {
  budgets = $state<BudgetRow[]>([]);
  current = $state<BudgetDetail | null>(null);
  activeCategoryId = $state<string | null>(null);
  loadingBudgets = $state(true);
  loadingBudget = $state(false);
  error = $state<string | null>(null);
  importing = $state(false);

  activeCategory = $derived.by<CategoryDetail | null>(() => {
    const c = this.current;
    if (!c) return null;
    return c.categories.find((cat) => cat.id === this.activeCategoryId) ?? c.categories[0] ?? null;
  });

  clearError() {
    this.error = null;
  }

  async loadBudgets(): Promise<void> {
    this.loadingBudgets = true;
    try {
      this.budgets = await api.listBudgets();
      if (!this.current && this.budgets.length > 0) {
        await this.selectBudget(this.budgets[0]!.id);
      } else if (this.current) {
        const still = this.budgets.find((b) => b.id === this.current!.id);
        if (!still) await this.selectBudget(this.budgets[0]?.id ?? "");
        else await this.refresh();
      }
    } catch (e) {
      this.error = errMessage(e);
    } finally {
      this.loadingBudgets = false;
    }
  }

  async selectBudget(id: string): Promise<void> {
    this.current = null;
    this.activeCategoryId = null;
    this.loadingBudget = true;
    this.error = null;
    try {
      const detail = await api.getBudget(id);
      this.current = detail;
      const first = detail.categories[0];
      this.activeCategoryId = first ? first.id : null;
    } catch (e) {
      this.error = errMessage(e);
    } finally {
      this.loadingBudget = false;
    }
  }

  selectCategory(id: string): void {
    this.activeCategoryId = id;
  }

  async refresh(): Promise<void> {
    if (!this.current) return;
    try {
      const detail = await api.getBudget(this.current.id);
      const keep = this.activeCategoryId;
      this.current = detail;
      if (keep && detail.categories.some((c) => c.id === keep)) {
        this.activeCategoryId = keep;
      } else {
        this.activeCategoryId = detail.categories[0]?.id ?? null;
      }
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  // ─── Presupuestos ─────────────────────────────────────────────────────────

  async createBudget(input: BudgetInput): Promise<void> {
    try {
      const b = await api.createBudget(input);
      this.budgets = [...this.budgets, b];
      await this.selectBudget(b.id);
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  async updateBudget(input: BudgetInput): Promise<void> {
    if (!this.current) return;
    try {
      await api.updateBudget(this.current.id, input);
      await this.loadBudgets();
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  async deleteBudget(): Promise<void> {
    if (!this.current) return;
    try {
      await api.deleteBudget(this.current.id);
      this.current = null;
      await this.loadBudgets();
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  // ─── Categorías ───────────────────────────────────────────────────────────

  async createCategory(input: CategoryInput): Promise<boolean> {
    if (!this.current) return false;
    try {
      const cat = await api.createCategory(this.current.id, input);
      this.current.categories = [...this.current.categories, { ...cat, items: [], summary: emptySummary() }];
      this.activeCategoryId = cat.id;
      return true;
    } catch (e) {
      this.error = errMessage(e);
      return false;
    }
  }

  async updateCategory(id: string, input: CategoryInput): Promise<boolean> {
    try {
      const updated = await api.updateCategory(id, input);
      const cat = this.current?.categories.find((c) => c.id === id);
      if (cat && this.current) {
        const idx = this.current.categories.indexOf(cat);
        this.current.categories[idx] = { ...cat, ...updated };
        categoryStatusInner(this.current.categories[idx]!);
      }
      return true;
    } catch (e) {
      this.error = errMessage(e);
      return false;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.deleteCategory(id);
      if (!this.current) return;
      this.current.categories = this.current.categories.filter((c) => c.id !== id);
      if (this.activeCategoryId === id) {
        this.activeCategoryId = this.current.categories[0]?.id ?? null;
      }
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  // ─── Artículos ────────────────────────────────────────────────────────────

  async createItem(input: ItemInput): Promise<void> {
    const cat = this.activeCategory;
    if (!cat) return;
    try {
      const item = await api.createItem(cat.id, input);
      cat.items = [...cat.items, item];
      categoryStatusInner(cat);
      this.recomputeBudgetSummary();
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  async updateItem(itemId: string, input: ItemInput): Promise<void> {
    const cat = this.activeCategory;
    if (!cat) return;
    try {
      const updated = await api.updateItem(itemId, input);
      const idx = cat.items.findIndex((i) => i.id === itemId);
      if (idx !== -1) cat.items[idx] = { ...cat.items[idx]!, ...updated };
      categoryStatusInner(cat);
      this.recomputeBudgetSummary();
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    const cat = this.activeCategory;
    if (!cat) return;
    try {
      await api.deleteItem(itemId);
      cat.items = cat.items.filter((i) => i.id !== itemId);
      categoryStatusInner(cat);
      this.recomputeBudgetSummary();
    } catch (e) {
      this.error = errMessage(e);
    }
  }

  async togglePurchased(item: ItemRow, purchased: boolean, actualCost?: number | null): Promise<void> {
    const cat = this.activeCategory;
    if (!cat) return;
    const idx = cat.items.findIndex((i) => i.id === item.id);
    if (idx === -1) return;
    const prev = cat.items[idx]!;
    const optimistic: ItemRow = {
      ...prev,
      purchased: purchased ? 1 : 0,
      purchased_at: purchased ? new Date().toISOString() : null,
      actual_cost: actualCost ?? prev.actual_cost,
    };
    cat.items[idx] = optimistic;
    categoryStatusInner(cat);
    this.recomputeBudgetSummary();
    try {
      const updated = await api.purchaseItem(item.id, purchased, actualCost ?? undefined);
      cat.items[idx] = { ...optimistic, ...updated };
    } catch (e) {
      cat.items[idx] = prev;
      categoryStatusInner(cat);
      this.recomputeBudgetSummary();
      this.error = errMessage(e);
    }
  }

  recomputeBudgetSummary(): void {
    if (!this.current) return;
    let spent = 0;
    let committed = 0;
    let itemCount = 0;
    let purchasedCount = 0;
    for (const c of this.current.categories) {
      for (const it of c.items) {
        itemCount++;
        if (it.purchased === 1) {
          spent += it.actual_cost ?? it.estimated_cost ?? 0;
          purchasedCount++;
        } else {
          committed += it.estimated_cost ?? 0;
        }
      }
    }
    const initial = this.current.initial_amount ?? 0;
    this.current.summary = {
      initialAmount: Math.round(initial * 100) / 100,
      spent: Math.round(spent * 100) / 100,
      committed: Math.round(committed * 100) / 100,
      remaining: Math.round((initial - spent) * 100) / 100,
      usedPct: initial > 0 ? Math.min(100, Math.round((spent / initial) * 1000) / 10) : 0,
      itemCount,
      purchasedCount,
      pendingCount: itemCount - purchasedCount,
      categoryCount: this.current.categories.length,
    };
  }

  async readImportFile(file: File): Promise<ExportPayload> {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ImportParseError("ERR_IMPORT_NOT_JSON", "ERR_IMPORT_NOT_JSON");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new ImportParseError("ERR_IMPORT_BAD_PAYLOAD", "ERR_IMPORT_BAD_PAYLOAD");
    }
    const p = parsed as Record<string, unknown>;
    if (p.format !== "simple-budget/export") {
      throw new ImportParseError("ERR_IMPORT_BAD_FORMAT", "ERR_IMPORT_BAD_FORMAT");
    }
    if (p.version !== 1) {
      throw new ImportParseError(
        `ERR_IMPORT_VERSION (versión ${String(p.version)})`,
        "ERR_IMPORT_VERSION"
      );
    }
    if (!Array.isArray(p.budgets)) {
      throw new ImportParseError("ERR_IMPORT_NO_BUDGETS", "ERR_IMPORT_NO_BUDGETS");
    }
    return parsed as ExportPayload;
  }

  summarizeImport(payload: ExportPayload): { budgets: number; categories: number; items: number } {
    let categories = 0;
    let items = 0;
    for (const b of payload.budgets) {
      categories += b.categories?.length ?? 0;
      for (const c of b.categories ?? []) {
        items += c.items?.length ?? 0;
      }
    }
    return { budgets: payload.budgets.length, categories, items };
  }

  async importPayload(payload: ExportPayload): Promise<ImportResult> {
    this.importing = true;
    this.error = null;
    try {
      const result = await api.importAll(payload);
      await this.loadBudgets();
      return result;
    } catch (e) {
      this.error = errMessage(e);
      throw e;
    } finally {
      this.importing = false;
    }
  }
}

function emptySummary(): CategorySummary {
  return {
    limit: null,
    spent: 0,
    pendingEstimated: 0,
    purchasedCount: 0,
    pendingCount: 0,
    totalCount: 0,
    remaining: null,
    usedPct: null,
  };
}

export const store = new SimpleBudgetStore();
