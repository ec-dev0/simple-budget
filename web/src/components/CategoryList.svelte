<script lang="ts">
import { Plus } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { money } from "../lib/format.ts";
import { btnPrimary } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import type { CategoryDetail } from "../lib/types.ts";
import Icon from "./Icon.svelte";
import CategoryForm from "./CategoryForm.svelte";

let formOpen = $state(false);

const activeId = $derived(store.activeCategoryId);
const currency = $derived(store.current?.currency ?? "EUR");
const empty = $derived((store.current?.categories.length ?? 0) === 0);

function statusTone(cat: CategoryDetail): string {
  if (cat.summary.limit === null) return "text-muted";
  const pct = cat.summary.usedPct ?? 0;
  if (pct >= 100) return "text-danger";
  if (pct >= 80) return "text-warning";
  return "text-success";
}
</script>

<section class="rounded-2xl border border-line bg-surface p-3 shadow-paper">
  <div class="flex items-center justify-between px-2 pb-2 pt-1">
    <h3 class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t("category.title")}</h3>
    <span class="tnum text-xs text-muted">{store.current?.categories.length ?? 0}</span>
  </div>

  <ul class="space-y-1">
    {#each store.current?.categories ?? [] as cat}
      {@const tone = statusTone(cat)}
      <li>
        <button
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition {activeId === cat.id ? 'bg-accent-soft' : 'hover:bg-surface2'}"
          onclick={() => store.selectCategory(cat.id)}
          aria-pressed={activeId === cat.id}
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style:background-color={cat.color + "22"}
            style:color={cat.color}
          >
            <Icon name={cat.icon} size={16} />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{cat.name}</span>
            <span class="tnum block truncate text-xs text-muted">
              {#if cat.summary.limit !== null}
                {t("category.spentOf", money(cat.summary.spent, currency), money(cat.summary.limit, currency))}
              {:else}
                {t("category.spentOnly", money(cat.summary.spent, currency))}{cat.summary.totalCount > 0 ? ` · ${t("category.itemCount", cat.summary.totalCount)}` : ""}
              {/if}
            </span>
          </span>
          {#if cat.summary.limit !== null}
            <span class="tnum shrink-0 text-xs font-semibold {tone}">{cat.summary.usedPct}%</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  {#if empty}
    <div class="px-3 py-4 text-center">
      <p class="text-sm text-ink-soft">{t("category.emptyTitle")}</p>
      <p class="mt-1 text-xs text-muted">{t("category.emptyBody")}</p>
    </div>
  {/if}

  <div class="px-2 pt-2">
    {#if formOpen}
      <CategoryForm
        onDone={() => (formOpen = false)}
        onCancel={() => (formOpen = false)}
      />
    {:else}
      <button class={btnPrimary + " w-full"} onclick={() => (formOpen = true)}>
        <Plus size={15} aria-hidden="true" />
        {t("category.create")}
      </button>
    {/if}
  </div>
</section>
