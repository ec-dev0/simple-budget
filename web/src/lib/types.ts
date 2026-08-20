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

export type CategoryDetail = CategoryRow & { items: ItemRow[]; summary: CategorySummary };
export type BudgetDetail = BudgetRow & { categories: CategoryDetail[]; summary: BudgetSummary };

export type BudgetInput = {
  name?: string;
  description?: string;
  initialAmount?: number | null;
  currency?: string;
  color?: string;
  icon?: string;
};

export type CategoryInput = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  limitAmount?: number | null;
};

export type ItemInput = {
  name?: string;
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
};

export type BudgetStatus = "slack" | "tight" | "over";

export function categoryStatus(summary: CategorySummary): BudgetStatus {
  if (summary.limit === null) return "slack";
  const pct = summary.usedPct ?? 0;
  if (pct >= 100) return "over";
  if (pct >= 80) return "tight";
  return "slack";
}

export type ExportPayload = {
  format: "simple-budget/export";
  version: 1;
  exportedAt: string;
  schemaVersion: number;
  app: "simple-budget";
  budgets: Array<
    BudgetRow & {
      categories: Array<CategoryRow & { items: ItemRow[] }>;
    }
  >;
};

export type ImportResult = {
  imported: {
    budgets: number;
    categories: number;
    items: number;
  };
};
