<script lang="ts">
import { CalendarClock, Pencil, Store, Trash2 } from "lucide-svelte";
import { fmtDateStamp, money, relativeDate } from "../lib/format.ts";
import { btnIcon, btnDangerGhost } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import type { ItemRow } from "../lib/types.ts";

let {
  item,
  currency,
  onCheck,
  onEdit,
  onDelete,
}: {
  item: ItemRow;
  currency: string;
  onCheck: (purchased: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
} = $props();

const bought = $derived(item.purchased === 1);
const overdue = $derived(
  !bought && !!item.due_date && new Date(item.due_date + "T00:00:00").getTime() < Date.now()
);
const overEstimate = $derived(
  !bought && item.actual_cost != null && item.estimated_cost != null && item.actual_cost > item.estimated_cost
);

const qty = $derived(item.quantity !== 1 || item.unit ? `${Number(item.quantity)}${item.unit ? " " + item.unit : ""}` : "");
</script>

<li
  class="group relative flex items-start gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface2/60"
  class:opacity-55={bought}
>
  <button
    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-line-strong transition active:scale-90 {bought ? 'border-accent bg-accent' : 'hover:border-accent'}"
    onclick={() => onCheck(!bought)}
    role="checkbox"
    aria-checked={bought}
    aria-label={bought ? t("item.markAsPending", item.name) : t("item.markAsBought", item.name)}
  >
    {#if bought}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-accent-ink" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12l5 5L20 7" />
      </svg>
    {/if}
  </button>

  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <p class="relative min-w-0 truncate text-[15px] {bought ? 'text-muted' : 'font-medium'}">
        {#if item.priority === 3}
          <span class="mr-1.5 inline-block h-2 w-2 rounded-full bg-danger align-middle" aria-label={t("item.priorityHighAria")}></span>
        {:else if item.priority === 2}
          <span class="mr-1.5 inline-block h-2 w-2 rounded-full bg-warning align-middle" aria-label={t("item.priorityMediumAria")}></span>
        {/if}
        {#if item.link}
          <a
            class="underline decoration-line-strong underline-offset-2 hover:text-accent"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
          >{item.name}</a>
        {:else}
          {item.name}
        {/if}
        {#if bought}
          <span class="absolute inset-y-0 left-0 h-px bg-muted strike-line" style:width="100%" aria-hidden="true"></span>
        {/if}
      </p>
      {#if bought}
        <span class="stamp-in shrink-0 rounded border border-danger px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-danger stamp-rotate">
          {t("item.boughtStamp", fmtDateStamp(item.purchased_at ?? item.updated_at))}
        </span>
      {/if}
    </div>

    <p class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
      {#if qty}<span class="tnum">{qty} ×</span>{/if}
      {#if item.store}
        <span class="inline-flex items-center gap-1"><Store size={11} aria-hidden="true" />{item.store}</span>
      {/if}
      {#if item.due_date && !bought}
        <span
          class="inline-flex items-center gap-1 {overdue ? 'font-medium text-danger' : ''}"
          title={t("item.dueDateTitle", item.due_date)}
        >
          <CalendarClock size={11} aria-hidden="true" />
          {relativeDate(item.due_date)}
        </span>
      {/if}
      {#if item.notes}<span class="truncate max-w-[28ch]">{item.notes}</span>{/if}
    </p>
  </div>

  <div class="flex shrink-0 items-center gap-3">
    <div class="text-right">
      {#if item.estimated_cost != null}
        <p class="tnum text-xs text-muted">~{money(item.estimated_cost, currency)}</p>
      {/if}
      {#if item.actual_cost != null}
        <p class="tnum text-[15px] font-semibold {overEstimate || (bought && item.actual_cost > (item.estimated_cost ?? 0)) ? 'text-danger' : 'text-ink'}">
          {money(item.actual_cost, currency)}
        </p>
      {/if}
      {#if item.estimated_cost == null && item.actual_cost == null}
        <p class="text-xs text-muted">{t("item.noPrice")}</p>
      {/if}
    </div>
    <div class="item-actions flex items-center transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <button
        class={btnIcon + " min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-2"}
        onclick={onEdit}
        aria-label={t("item.editAria", item.name)}
        title={t("item.editActionLabel")}
      >
        <Pencil size={15} aria-hidden="true" />
      </button>
      <button
        class={btnDangerGhost + " min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"}
        onclick={onDelete}
        aria-label={t("item.deleteAria", item.name)}
        title={t("item.deleteActionLabel")}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  </div>
</li>

<style>
  .stamp-rotate {
    transform: rotate(-3deg);
  }
</style>
