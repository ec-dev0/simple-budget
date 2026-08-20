<script lang="ts">
import { CalendarClock, CheckCircle2, Pencil, PiggyBank, Target, Trash2 } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { money } from "../lib/format.ts";
import { btnGhost, btnDangerGhost } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import type { BudgetSummary } from "../lib/types.ts";
import Icon from "./Icon.svelte";
import ProgressBar from "./ProgressBar.svelte";

let { onEdit }: { onEdit: () => void } = $props();

let confirming = $state(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const summary: BudgetSummary | null = $derived(store.current?.summary ?? null);
const budget = $derived(store.current);

function askDelete() {
  if (confirming) {
    if (timer) clearTimeout(timer);
    store.deleteBudget();
    return;
  }
  confirming = true;
  timer = setTimeout(() => {
    confirming = false;
  }, 3000);
}
</script>

{#if budget && summary}
  <section class="rounded-2xl border border-line bg-surface p-5 shadow-paper">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style:background-color={budget.color + "22"}
          style:color={budget.color}
        >
          <Icon name={budget.icon} type="budget" size={19} />
        </span>
        <div class="min-w-0">
          <h2 class="truncate text-lg font-semibold tracking-tight">{budget.name}</h2>
          {#if budget.description}
            <p class="truncate text-sm text-ink-soft">{budget.description}</p>
          {/if}
        </div>
      </div>
      <div class="flex items-center">
        <button class={btnGhost} onclick={onEdit} aria-label={t("budget.updateAria")} title={t("budget.updateAria")}>
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          class={confirming ? 'inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-danger bg-danger-soft transition' : btnDangerGhost}
          onclick={askDelete}
          aria-label={confirming ? t("budget.deleteConfirmed") : t("budget.deleteAria")}
        >
          <Trash2 size={15} aria-hidden="true" />
          {confirming ? t("budget.deleteInProgress") : ""}
        </button>
      </div>
    </div>

    <p class="mt-4 text-[11px] uppercase tracking-[0.12em] text-muted">{t("summary.initialAmount")}</p>
    <p class="tnum mt-0.5 text-3xl font-semibold tracking-tight">{money(summary.initialAmount, budget.currency)}</p>

    <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <p class="flex items-center gap-1 text-[11px] text-muted">
          <CheckCircle2 size={12} aria-hidden="true" /> {t("summary.spent")}
        </p>
        <p class="tnum mt-0.5 text-[15px] font-semibold {summary.spent > summary.initialAmount ? 'text-danger' : 'text-ink'}">
          {money(summary.spent, budget.currency)}
        </p>
      </div>
      <div>
        <p class="flex items-center gap-1 text-[11px] text-muted">
          <CalendarClock size={12} aria-hidden="true" /> {t("summary.pending")}
        </p>
        <p class="tnum mt-0.5 text-[15px] font-medium">{money(summary.committed, budget.currency)}</p>
      </div>
      <div>
        <p class="flex items-center gap-1 text-[11px] text-muted">
          <PiggyBank size={12} aria-hidden="true" /> {t("summary.remaining")}
        </p>
        <p
          class="tnum mt-0.5 text-[15px] font-semibold {summary.remaining < 0
            ? 'text-danger'
            : summary.remaining <= summary.initialAmount * 0.2 && summary.initialAmount > 0
              ? 'text-warning'
              : 'text-success'}"
        >
          {money(summary.remaining, budget.currency)}
        </p>
      </div>
    </div>

    <div class="mt-5">
      <div class="mb-1.5 flex items-center justify-between text-xs">
        <span class="flex items-center gap-1 text-muted">
          <Target size={12} aria-hidden="true" /> {t("summary.used")}
        </span>
        <span class="tnum font-medium">{summary.usedPct}%</span>
      </div>
      <ProgressBar
        pct={summary.usedPct}
        tone={summary.usedPct >= 100 ? "danger" : summary.usedPct >= 80 ? "warning" : "accent"}
      />
    </div>

    <p class="mt-4 text-xs text-muted">
      {t("summary.purchasedOfTotal", summary.purchasedCount, summary.itemCount)}
      {summary.itemCount === 0 ? t("summary.addFirstCategory") : ""}
    </p>
  </section>
{/if}
