<script lang="ts">
import { Check, X } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { BUDGET_ICON_KEYS } from "../lib/icons.ts";
import { COLORS, btnGhost, btnPrimary, inputCls, inputNumCls, labelCls } from "../lib/ui.ts";
import { t, i18n } from "../lib/i18n/index.svelte.ts";
import type { BudgetRow } from "../lib/types.ts";
import Icon from "./Icon.svelte";

let {
  budget = null,
  onDone,
  onCancel,
}: {
  budget?: BudgetRow | null;
  onDone?: () => void;
  onCancel?: () => void;
} = $props();

const CURRENCIES = $derived(
  ["EUR", "USD", "GBP", "CAD", "MXN", "ARS", "CLP", "COP", "PEN", "BRL"].map((c) => ({
    code: c,
    name: (i18n.locale === "es"
      ? {
          EUR: "Euro",
          USD: "Dólar estadounidense",
          GBP: "Libra esterlina",
          CAD: "Dólar canadiense",
          MXN: "Peso mexicano",
          ARS: "Peso argentino",
          CLP: "Peso chileno",
          COP: "Peso colombiano",
          PEN: "Sol peruano",
          BRL: "Real brasileño",
        }
      : {
          EUR: "Euro",
          USD: "US Dollar",
          GBP: "Pound Sterling",
          CAD: "Canadian Dollar",
          MXN: "Mexican Peso",
          ARS: "Argentine Peso",
          CLP: "Chilean Peso",
          COP: "Colombian Peso",
          PEN: "Peruvian Sol",
          BRL: "Brazilian Real",
        })[c] ?? c
  }))
);

// svelte-ignore state_referenced_locally
let name = $state(budget?.name ?? "");
// svelte-ignore state_referenced_locally
let description = $state(budget?.description ?? "");
// svelte-ignore state_referenced_locally
let initial = $state(budget ? String(budget.initial_amount) : "");
// svelte-ignore state_referenced_locally
let currency = $state(budget?.currency ?? "EUR");
// svelte-ignore state_referenced_locally
let color = $state(budget?.color ?? COLORS[0]!);
// svelte-ignore state_referenced_locally
let icon = $state(budget?.icon ?? "wallet");
let saving = $state(false);

async function submit() {
  if (!name.trim()) return;
  saving = true;
  const input = {
    name: name.trim(),
    description: description.trim(),
    initialAmount: initial === "" ? null : Number(initial),
    currency,
    color,
    icon,
  };
  if (budget) {
    await store.updateBudget(input);
  } else {
    await store.createBudget(input);
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
    <h3 class="text-sm font-semibold">{budget ? t("budget.edit") : t("budget.createTitle")}</h3>
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel} aria-label={t("form.cancelAria")}>
        <X size={15} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div>
    <label class={labelCls} for="bf-name">{t("form.name")}</label>
    <input id="bf-name" class={inputCls} bind:value={name} placeholder={t("budget.namePlaceholder")} autocomplete="off" required />
  </div>

  <div>
    <label class={labelCls} for="bf-desc">{t("form.description")}</label>
    <input id="bf-desc" class={inputCls} bind:value={description} placeholder={t("budget.descriptionPlaceholder")} autocomplete="off" />
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class={labelCls} for="bf-initial">{t("budget.initialAmount")}</label>
      <input
        id="bf-initial"
        class={inputNumCls}
        bind:value={initial}
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        placeholder={t("budget.initialAmountPlaceholder")}
      />
    </div>
    <div>
      <label class={labelCls} for="bf-currency">{t("budget.currency")}</label>
      <select id="bf-currency" class={inputCls} bind:value={currency}>
        {#each CURRENCIES as c}
          <option value={c.code}>{c.code} · {c.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div>
    <span class={labelCls}>{t("form.color")}</span>
    <div class="flex flex-wrap gap-2">
      {#each COLORS as c}
        <button
          type="button"
          class="h-7 w-7 rounded-full transition active:scale-90 {color === c ? 'ring-2 ring-offset-2 ring-accent ring-offset-surface' : ''}"
          style:background-color={c}
          aria-label={t("form.colorAria", c)}
          onclick={() => (color = c)}
        ></button>
      {/each}
    </div>
  </div>

  <div>
    <span class={labelCls}>{t("form.icon")}</span>
    <div class="grid grid-cols-8 gap-1.5">
      {#each BUDGET_ICON_KEYS as key}
        <button
          type="button"
          class="flex h-9 items-center justify-center rounded-lg transition {icon === key ? 'bg-accent text-accent-ink' : 'text-ink-soft hover:bg-surface2'}"
          aria-label={key}
          onclick={() => (icon = key)}
        >
          <Icon name={key} type="budget" size={17} />
        </button>
      {/each}
    </div>
  </div>

  <div class="flex justify-end gap-2 pt-1">
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel}>{t("form.cancel")}</button>
    {/if}
    <button class={btnPrimary} disabled={saving || !name.trim()}>
      <Check size={15} aria-hidden="true" />
      {budget ? t("budget.save") : t("budget.create")}
    </button>
  </div>
</form>
