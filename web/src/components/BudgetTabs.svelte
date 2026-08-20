<script lang="ts">
import { Plus } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import Icon from "./Icon.svelte";

let { newOpen = false, onToggleNew }: { newOpen?: boolean; onToggleNew?: () => void } = $props();

const activeId = $derived(store.current?.id ?? null);
</script>

<div>
  <div class="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t("tabs.aria")}>
    {#each store.budgets as b}
      <button
        role="tab"
        aria-selected={activeId === b.id}
        class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition active:scale-[0.97] {activeId === b.id
          ? 'border-accent bg-accent text-accent-ink shadow-sm'
          : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'}"
        onclick={() => store.selectBudget(b.id)}
      >
        <Icon name={b.icon} type="budget" size={14} />
        <span class="font-medium">{b.name}</span>
        <span class="tnum text-xs opacity-70">{b.currency}</span>
      </button>
    {/each}
    {#if onToggleNew}
      <button
        class="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
        onclick={onToggleNew}
        aria-label={t("tabs.newBudgetAria")}
        aria-expanded={newOpen}
      >
        <Plus size={14} aria-hidden="true" />
        <span>{t("tabs.newBudgetLabel")}</span>
      </button>
    {/if}
  </div>
</div>
