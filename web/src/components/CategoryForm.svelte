<script lang="ts">
import { Check, X } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { CATEGORY_ICON_KEYS } from "../lib/icons.ts";
import { COLORS, btnGhost, btnPrimary, inputCls, inputNumCls, labelCls } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import type { CategoryRow } from "../lib/types.ts";
import Icon from "./Icon.svelte";

let {
  category = null,
  onDone,
  onCancel,
}: {
  category?: CategoryRow | null;
  onDone?: () => void;
  onCancel?: () => void;
} = $props();

// svelte-ignore state_referenced_locally
let name = $state(category?.name ?? "");
// svelte-ignore state_referenced_locally
let description = $state(category?.description ?? "");
// svelte-ignore state_referenced_locally
let limit = $state(category?.limit_amount != null ? String(category.limit_amount) : "");
// svelte-ignore state_referenced_locally
let color = $state(category?.color ?? COLORS[0]!);
// svelte-ignore state_referenced_locally
let icon = $state(category?.icon ?? "package");
let saving = $state(false);

async function submit() {
  if (!name.trim()) return;
  saving = true;
  const input = {
    name: name.trim(),
    description: description.trim(),
    limitAmount: limit === "" ? null : Number(limit),
    color,
    icon,
  };
  if (category) {
    const updated = await store.updateCategory(category.id, input);
    if (!updated) {
      saving = false;
      return;
    }
  } else {
    const created = await store.createCategory(input);
    if (!created) {
      saving = false;
      return;
    }
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
    <h3 class="text-sm font-semibold">{category ? t("category.edit") : t("category.createTitle")}</h3>
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel} aria-label={t("form.cancelAria")}>
        <X size={15} aria-hidden="true" />
      </button>
    {/if}
  </div>

  <div>
    <label class={labelCls} for="cf-name">{t("form.name")}</label>
    <input id="cf-name" class={inputCls} bind:value={name} placeholder={t("category.namePlaceholder")} autocomplete="off" required />
  </div>

  <div>
    <label class={labelCls} for="cf-desc">{t("form.description")}</label>
    <input id="cf-desc" class={inputCls} bind:value={description} placeholder={t("category.descriptionPlaceholder")} autocomplete="off" />
  </div>

  <div>
    <label class={labelCls} for="cf-limit">{t("category.limit")}</label>
    <input
      id="cf-limit"
      class={inputNumCls}
      bind:value={limit}
      type="number"
      inputmode="decimal"
      min="0"
      step="0.01"
      placeholder={t("category.limitPlaceholder")}
    />
  </div>

  <div>
    <span class={labelCls}>{t("form.color")}</span>
    <div class="flex flex-wrap gap-2">
      {#each COLORS as c (c)}
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
      {#each CATEGORY_ICON_KEYS as key (key)}
        <button
          type="button"
          class="flex h-9 items-center justify-center rounded-lg transition {icon === key ? 'bg-accent text-accent-ink' : 'text-ink-soft hover:bg-surface2'}"
          aria-label={key}
          onclick={() => (icon = key)}
        >
          <Icon name={key} size={17} />
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
      {category ? t("category.save") : t("category.create")}
    </button>
  </div>
</form>
