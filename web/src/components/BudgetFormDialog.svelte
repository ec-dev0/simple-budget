<script lang="ts">
import { X } from "lucide-svelte";
import { btnGhost } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";
import BudgetForm from "./BudgetForm.svelte";
import type { BudgetRow } from "../lib/types.ts";

let {
  open = false,
  budget = null,
  onClose,
}: {
  open?: boolean;
  budget?: BudgetRow | null;
  onClose: () => void;
} = $props();

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open) onClose();
}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-8 backdrop-blur-sm sm:items-center"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      class="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-paper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bfd-title"
    >
      <button
        class={btnGhost + " absolute right-3 top-3 z-10"}
        type="button"
        onclick={onClose}
        aria-label={t("form.closeAria")}
      >
        <X size={15} aria-hidden="true" />
      </button>
      <h2 id="bfd-title" class="sr-only">{budget ? t("budget.edit") : t("budget.createTitle")}</h2>
      <BudgetForm
        {budget}
        onDone={onClose}
        onCancel={onClose}
      />
    </div>
  </div>
{/if}
