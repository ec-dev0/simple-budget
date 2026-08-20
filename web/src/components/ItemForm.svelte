<script lang="ts">
import { Check, ChevronDown, X } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { btnGhost, btnPrimary, inputCls, inputNumCls, labelCls } from "../lib/ui.ts";
import { priorityLabel } from "../lib/format.ts";
import { t, i18n } from "../lib/i18n/index.svelte.ts";
import type { ItemRow } from "../lib/types.ts";

let {
  item = null,
  purchaseMode = false,
  onDone,
  onCancel,
}: {
  item?: ItemRow | null;
  purchaseMode?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
} = $props();

// svelte-ignore state_referenced_locally
let name = $state(item?.name ?? "");
// svelte-ignore state_referenced_locally
let quantity = $state(item?.quantity ?? 1);
// svelte-ignore state_referenced_locally
let unit = $state(item?.unit ?? "");
// svelte-ignore state_referenced_locally
let estimated = $state(item?.estimated_cost != null ? String(item.estimated_cost) : "");
// svelte-ignore state_referenced_locally
let actual = $state(item?.actual_cost != null ? String(item.actual_cost) : "");
// svelte-ignore state_referenced_locally
let purchased = $state(item ? item.purchased === 1 : purchaseMode);
// svelte-ignore state_referenced_locally
let priority = $state(item?.priority ?? 0);
// svelte-ignore state_referenced_locally
let storeName = $state(item?.store ?? "");
// svelte-ignore state_referenced_locally
let link = $state(item?.link ?? "");
// svelte-ignore state_referenced_locally
let dueDate = $state(item?.due_date ?? "");
// svelte-ignore state_referenced_locally
let description = $state(item?.description ?? "");
// svelte-ignore state_referenced_locally
let notes = $state(item?.notes ?? "");
// svelte-ignore state_referenced_locally
let showDetails = $state(
  item ? Boolean(item.notes.length > 0 || item.description.length > 0 || item.link) : false
);
let saving = $state(false);

const PRIORITIES = [
  { v: 0, label: priorityLabel(0, true) },
  { v: 1, label: priorityLabel(1, true) },
  { v: 2, label: priorityLabel(2, true) },
  { v: 3, label: priorityLabel(3, true) },
];

let actualInput: HTMLInputElement | null = $state(null);
$effect(() => {
  void i18n.locale;
  if (purchaseMode) actualInput?.focus();
});

async function submit() {
  if (!name.trim()) return;
  saving = true;
  const input = {
    name: name.trim(),
    quantity: Number(quantity) || 1,
    unit: unit.trim() || null,
    estimatedCost: estimated === "" ? null : Number(estimated),
    actualCost: actual === "" ? null : Number(actual),
    purchased,
    priority,
    store: storeName.trim() || null,
    link: link.trim() || null,
    dueDate: dueDate || null,
    description: description.trim(),
    notes: notes.trim(),
  };
  if (item) {
    await store.updateItem(item.id, input);
  } else {
    await store.createItem(input);
  }
  saving = false;
  onDone?.();
}
</script>

<form
  class="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-paper"
  onsubmit={(e) => {
    e.preventDefault();
    submit();
  }}
>
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold">
      {purchaseMode ? t("item.purchaseTitle") : item ? t("item.editTitle") : t("item.createTitle")}
    </h3>
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel} aria-label={t("form.cancelAria")}>
        <X size={15} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div>
    <label class={labelCls} for="if-name">{t("form.name")}</label>
    <input id="if-name" class={inputCls} bind:value={name} placeholder={t("item.namePlaceholder")} autocomplete="off" required />
  </div>

  <div class="grid grid-cols-[7rem_1fr] gap-4">
    <div>
      <label class={labelCls} for="if-qty">{t("item.quantity")}</label>
      <input id="if-qty" class={inputNumCls} bind:value={quantity} type="number" inputmode="decimal" min="0.01" step="0.01" />
    </div>
    <div>
      <label class={labelCls} for="if-unit">{t("item.unit")}</label>
      <input id="if-unit" class={inputCls} bind:value={unit} placeholder={t("item.unitPlaceholder")} autocomplete="off" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class={labelCls} for="if-est">{t("item.estimatedCost")}</label>
      <input id="if-est" class={inputNumCls} bind:value={estimated} type="number" inputmode="decimal" min="0" step="0.01" placeholder={t("item.costPlaceholder")} />
    </div>
    <div>
      <label class={labelCls} for="if-actual">{t("item.actualCost")}</label>
      <input
        id="if-actual"
        class={inputNumCls}
        bind:value={actual}
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        placeholder={t("item.costPlaceholder")}
        bind:this={actualInput}
      />
    </div>
  </div>

  <div class="flex items-center justify-between gap-4">
    <label class="flex items-center gap-2 text-sm cursor-pointer select-none" for="if-purchased">
      <input
        id="if-purchased"
        class="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        bind:checked={purchased}
      />
      {t("item.purchased")}
    </label>
    <div class="flex rounded-full bg-surface2 p-0.5 text-xs">
      {#each PRIORITIES as p}
        <button
          type="button"
          class="rounded-full px-2.5 py-1 transition {priority === p.v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}"
          onclick={() => (priority = p.v)}
        >
          {p.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class={labelCls} for="if-store">{t("item.store")}</label>
      <input id="if-store" class={inputCls} bind:value={storeName} placeholder={t("item.storePlaceholder")} autocomplete="off" />
    </div>
    <div>
      <label class={labelCls} for="if-due">{t("item.dueDate")}</label>
      <input id="if-due" class={inputCls} bind:value={dueDate} type="date" />
    </div>
  </div>

  <button
    type="button"
    class="flex items-center gap-1 text-xs font-medium text-muted transition hover:text-ink"
    onclick={() => (showDetails = !showDetails)}
    aria-expanded={showDetails}
  >
    <ChevronDown size={14} class={showDetails ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
    {t("item.details")}
  </button>

  {#if showDetails}
    <div class="space-y-4">
      <div>
        <label class={labelCls} for="if-link">{t("item.link")}</label>
        <input id="if-link" class={inputCls} bind:value={link} type="url" placeholder={t("item.linkPlaceholder")} />
      </div>
      <div>
        <label class={labelCls} for="if-desc">{t("form.description")}</label>
        <input id="if-desc" class={inputCls} bind:value={description} placeholder={t("item.descriptionPlaceholder")} autocomplete="off" />
      </div>
      <div>
        <label class={labelCls} for="if-notes">{t("item.notesLabel")}</label>
        <textarea id="if-notes" class={inputCls} bind:value={notes} rows={2} placeholder={t("item.notesPlaceholder")}></textarea>
      </div>
    </div>
  {/if}

  <div class="flex justify-end gap-2 pt-1">
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel}>{t("form.cancel")}</button>
    {/if}
    <button class={btnPrimary} disabled={saving || !name.trim()}>
      <Check size={15} aria-hidden="true" />
      {purchaseMode ? t("item.submitBuy") : item ? t("item.submitSave") : t("item.submitAdd")}
    </button>
  </div>
</form>
