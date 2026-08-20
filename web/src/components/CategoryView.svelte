<script lang="ts">
import { Plus, Trash2 } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { money } from "../lib/format.ts";
import { btnDangerGhost, btnPrimary, chipCls } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import type { ItemRow as ItemRowType } from "../lib/types.ts";
import Icon from "./Icon.svelte";
import ItemRow from "./ItemRow.svelte";
import ItemForm from "./ItemForm.svelte";
import ProgressBar from "./ProgressBar.svelte";

type FormState =
  | { mode: "create" }
  | { mode: "edit"; item: ItemRowType }
  | { mode: "purchase"; item: ItemRowType }
  | null;

let form = $state<FormState>(null);

let confirmingCategory = $state(false);
let deleteTimer: ReturnType<typeof setTimeout> | null = null;

let hint = $state<string | null>(null);
let hintKey = $state(0);
let hintTimer: ReturnType<typeof setTimeout> | null = null;

function showHint(msg: string) {
  hint = msg;
  hintKey++;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hint = null;
    hintTimer = null;
  }, 6000);
}

const cat = $derived(store.activeCategory);
const currency = $derived(store.current?.currency ?? "EUR");

const statusMeta = $derived.by<{ label: string; cls: string; tone: "success" | "warning" | "danger" } | null>(() => {
  const c = cat;
  if (!c || c.summary.limit === null) return null;
  const pct = c.summary.usedPct ?? 0;
  if (pct >= 100) return { label: t("statusChip.over"), cls: chipCls + " bg-danger-soft text-danger", tone: "danger" as const };
  if (pct >= 80) return { label: t("statusChip.tight"), cls: chipCls + " bg-warning-soft text-warning", tone: "warning" as const };
  return { label: t("statusChip.slack"), cls: chipCls + " bg-success-soft text-success", tone: "success" as const };
});

async function handleCheck(item: ItemRowType, purchased: boolean) {
  await store.togglePurchased(item, purchased);
  if (purchased && item.actual_cost == null) {
    showHint(t("item.missingActualCostHint"));
  }
}

async function askDeleteCategory() {
  if (confirmingCategory) {
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
    confirmingCategory = false;
    const id = store.activeCategory?.id;
    if (id) await store.deleteCategory(id);
    return;
  }
  confirmingCategory = true;
  deleteTimer = setTimeout(() => {
    confirmingCategory = false;
    deleteTimer = null;
  }, 3000);
}

$effect(() => {
  void cat?.id;
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  confirmingCategory = false;
});

$effect(() => {
  return () => {
    if (deleteTimer) clearTimeout(deleteTimer);
    if (hintTimer) clearTimeout(hintTimer);
  };
});
</script>

{#if cat}
  {#key cat.id}
  <section class="page-in rounded-2xl border border-line bg-surface p-5 shadow-paper">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style:background-color={cat.color + "22"}
          style:color={cat.color}
        >
          <Icon name={cat.icon} size={19} />
        </span>
        <div class="min-w-0">
          <h2 class="truncate text-lg font-semibold tracking-tight">{cat.name}</h2>
          {#if cat.description}
            <p class="truncate text-sm text-ink-soft">{cat.description}</p>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if statusMeta}
          <span class={statusMeta.cls}>{statusMeta.label}</span>
        {/if}
        <button
          class={confirmingCategory
            ? "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-danger bg-danger-soft transition"
            : btnDangerGhost}
          onclick={askDeleteCategory}
          aria-label={confirmingCategory ? t("category.deleteConfirmed") : t("category.delete")}
          title={confirmingCategory ? t("category.deleteConfirmed") : t("category.delete")}
        >
          <Trash2 size={15} aria-hidden="true" />
          {confirmingCategory ? t("category.deleteInProgress") : ""}
        </button>
      </div>
    </div>

    {#if cat.summary.limit !== null}
      <div class="mt-4">
        <div class="mb-1.5 flex items-center justify-between text-xs">
          <span class="tnum text-muted">
            {t("categoryView.spentOfLimit", money(cat.summary.spent, currency), money(cat.summary.limit, currency))}
          </span>
          <span class="tnum font-medium">
            {cat.summary.remaining != null && cat.summary.remaining >= 0
              ? t("categoryView.remainingUnder", money(cat.summary.remaining, currency))
              : t("categoryView.remainingOver", money(Math.abs(cat.summary.remaining ?? 0), currency))}
          </span>
        </div>
        <ProgressBar pct={cat.summary.usedPct ?? 0} tone={statusMeta?.tone ?? "accent"} />
      </div>
    {/if}

    {#if form}
      {#key (form.mode === "create" ? "create" : form.item.id + ":" + form.mode)}
        <div class="mt-4">
          {#if form.mode === "create"}
            <ItemForm
              purchaseMode={false}
              onDone={() => (form = null)}
              onCancel={() => (form = null)}
            />
          {:else if form.mode === "edit"}
            <ItemForm
              item={form.item}
              onDone={() => (form = null)}
              onCancel={() => (form = null)}
            />
          {:else}
            <ItemForm
              item={form.item}
              purchaseMode={true}
              onDone={() => (form = null)}
              onCancel={() => (form = null)}
            />
          {/if}
        </div>
      {/key}
    {:else}
      <div class="mt-4 flex items-center justify-between gap-3">
        <p class="text-xs text-muted">
          {t("categoryView.pendingPurchased", cat.summary.pendingCount, cat.summary.purchasedCount)}
        </p>
        <button class={btnPrimary} onclick={() => (form = { mode: "create" })}>
          <Plus size={15} aria-hidden="true" />
          {t("categoryView.addItem")}
        </button>
      </div>
    {/if}

    {#if cat.items.length > 0}
      <ul class="mt-3 divide-y divide-line">
        {#each cat.items as item}
          <ItemRow
            {item}
            {currency}
            onCheck={(p) => handleCheck(item, p)}
            onEdit={() => (form = { mode: "edit", item })}
            onDelete={() => store.deleteItem(item.id)}
          />
        {/each}
      </ul>
    {:else}
      <div class="mt-6 rounded-xl border border-dashed border-line-strong p-8 text-center">
        <p class="text-sm text-ink-soft">{t("categoryView.emptyTitle")}</p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-muted">
          {t("categoryView.emptyBody")}
        </p>
      </div>
    {/if}
  </section>
  {/key}
{/if}

{#if hint}
  {#key hintKey}
    <div
      role="status"
      aria-live="polite"
      class="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-md items-center gap-3 rounded-full border border-warning/40 bg-warning-soft px-4 py-2.5 text-sm text-ink shadow-paper page-in"
    >
      <span>{hint}</span>
      <button
        type="button"
        class="shrink-0 rounded-full p-1 text-muted transition hover:text-ink"
        onclick={() => (hint = null)}
        aria-label={t("form.cancel")}
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/key}
{/if}
