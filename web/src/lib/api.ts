import type {
  BudgetDetail,
  BudgetInput,
  BudgetRow,
  CategoryInput,
  CategoryRow,
  CategorySummary,
  ExportPayload,
  ImportResult,
  ItemInput,
  ItemRow,
} from "./types.ts";
import type { Locale } from "./i18n/index.svelte.ts";

const BASE = "/api";

export type SettingsDto = {
  language: Locale;
  currency: string;
  onboarded: boolean;
  updatedAt: string;
};

export type SettingsPatch = Partial<{
  language: Locale;
  currency: string;
  onboarded: boolean;
}>;

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ErrorBody = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        issues?: { path?: (string | number)[]; message?: string; code?: string }[];
      };
};

function errorFromBody(body: ErrorBody, status: number): ApiError {
  if (typeof body?.error === "string") {
    return new ApiError(body.error, status);
  }
  if (body?.error && typeof body.error === "object") {
    const code = body.error.code ?? null;
    const message = body.error.message ?? "";
    return new ApiError(message, status, code);
  }
  return new ApiError(`Error ${status}`, status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let parsed: ErrorBody = {};
    try {
      parsed = (await res.json()) as ErrorBody;
    } catch {
      /* sin cuerpo JSON */
    }
    throw errorFromBody(parsed, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  getSettings: () => request<SettingsDto>("/settings"),
  updateSettings: (patch: SettingsPatch) =>
    request<SettingsDto>("/settings", { method: "PATCH", body: JSON.stringify(patch) }),

  listBudgets: () => request<BudgetRow[]>("/budgets"),
  getBudget: (id: string) => request<BudgetDetail>(`/budgets/${id}`),
  createBudget: (input: BudgetInput) =>
    request<BudgetRow>("/budgets", { method: "POST", body: JSON.stringify(input) }),
  updateBudget: (id: string, input: BudgetInput) =>
    request<BudgetRow>(`/budgets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteBudget: (id: string) => request<{ ok: boolean }>(`/budgets/${id}`, { method: "DELETE" }),

  createCategory: (budgetId: string, input: CategoryInput) =>
    request<CategoryRow>(`/budgets/${budgetId}/categories`, { method: "POST", body: JSON.stringify(input) }),
  updateCategory: (id: string, input: CategoryInput) =>
    request<CategoryRow>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCategory: (id: string) => request<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),
  categoryDetail: (id: string) =>
    request<{ category: CategoryRow; items: ItemRow[]; summary: CategorySummary }>(`/categories/${id}`),

  createItem: (categoryId: string, input: ItemInput) =>
    request<ItemRow>(`/categories/${categoryId}/items`, { method: "POST", body: JSON.stringify(input) }),
  updateItem: (id: string, input: ItemInput) =>
    request<ItemRow>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  purchaseItem: (id: string, purchased: boolean, actualCost?: number | null) =>
    request<ItemRow>(`/items/${id}/purchase`, {
      method: "PATCH",
      body: JSON.stringify({ purchased, actualCost }),
    }),
  deleteItem: (id: string) => request<{ ok: boolean }>(`/items/${id}`, { method: "DELETE" }),

  importAll: (payload: ExportPayload) =>
    request<ImportResult>("/import", { method: "POST", body: JSON.stringify(payload) }),
};

export async function downloadExport(): Promise<void> {
  const res = await fetch(BASE + "/export");
  if (!res.ok) {
    let parsed: ErrorBody = {};
    try {
      parsed = (await res.json()) as ErrorBody;
    } catch {
      /* sin cuerpo JSON */
    }
    throw errorFromBody(parsed, res.status);
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `simple-budget-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
