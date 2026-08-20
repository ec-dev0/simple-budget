<script lang="ts">
import { Check, FileUp, Upload, X } from "lucide-svelte";
import { store } from "../lib/store.svelte.ts";
import { btnGhost, btnPrimary, labelCls } from "../lib/ui.ts";
import { t, i18n } from "../lib/i18n/index.svelte.ts";
import type { ExportPayload } from "../lib/types.ts";

let { onClose }: { onClose: () => void } = $props();

let payload = $state<ExportPayload | null>(null);
let preview = $state<{ budgets: number; categories: number; items: number } | null>(null);
let fileName = $state<string | null>(null);
let parseError = $state<string | null>(null);
let confirming = $state(false);
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

function reset() {
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
  confirming = false;
}

function close() {
  reset();
  onClose();
}

async function onPickFile(e: Event) {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  reset();
  parseError = null;
  if (!file) {
    payload = null;
    preview = null;
    fileName = null;
    return;
  }
  fileName = file.name;
  try {
    const p = await store.readImportFile(file);
    payload = p;
    preview = store.summarizeImport(p);
  } catch (err) {
    payload = null;
    preview = null;
    parseError = i18n.resolveError(err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : null, err instanceof Error ? err.message : t("import.invalidFile"));
  }
}

async function doImport() {
  if (!payload) return;
  if (!confirming) {
    confirming = true;
    confirmTimer = setTimeout(() => {
      confirming = false;
      confirmTimer = null;
    }, 3500);
    return;
  }
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
  confirming = false;
  try {
    await store.importPayload(payload);
    close();
  } catch {
    /* el error ya queda en store.error para mostrarlo como banner */
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}
</script>

<svelte:window onkeydown={onKey} />

<div
  class="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) close();
  }}
>
  <div
    class="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-paper"
    role="dialog"
    aria-modal="true"
    aria-labelledby="imp-title"
  >
    <div class="flex items-center justify-between">
      <h3 id="imp-title" class="flex items-center gap-2 text-sm font-semibold">
        <FileUp size={16} aria-hidden="true" />
        {t("import.title")}
      </h3>
      <button class={btnGhost} type="button" onclick={close} aria-label={t("form.closeAria")}>
        <X size={15} aria-hidden="true" />
      </button>
    </div>

    <p class="text-sm text-ink-soft">{t("import.body")}</p>

    <div>
      <label class={labelCls} for="imp-file">{t("import.fileLabel")}</label>
      <label
        for="imp-file"
        class="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-paper/40 px-3 py-3 transition hover:border-accent hover:bg-accent-soft/40"
      >
        <Upload size={18} aria-hidden="true" class="text-muted" />
        <span class="min-w-0 flex-1 truncate text-sm text-ink-soft">
          {#if fileName}{fileName}{:else}{t("import.noFile")}{/if}
        </span>
      </label>
      <input
        id="imp-file"
        type="file"
        accept="application/json,.json"
        class="sr-only"
        onchange={onPickFile}
      />
    </div>

    {#if parseError}
      <div
        class="rounded-xl border border-danger-soft bg-danger-soft/60 px-4 py-3 text-sm text-danger"
        role="alert"
      >
        {parseError}
      </div>
    {:else if preview}
      <div class="rounded-xl border border-line bg-paper/50 px-4 py-3">
        <p class="text-[11px] uppercase tracking-[0.08em] text-muted">{t("import.previewLabel")}</p>
        <p class="mt-1 text-[15px]">
          <strong class="font-semibold tnum">{preview.budgets}</strong>
          {preview.budgets === 1 ? t("import.previewBudgetsOne") : t("import.previewBudgetsMany")},
          <strong class="font-semibold tnum">{preview.categories}</strong>
          {preview.categories === 1 ? t("import.previewCategoriesOne") : t("import.previewCategoriesMany")},
          <strong class="font-semibold tnum">{preview.items}</strong>
          {preview.items === 1 ? t("import.previewItemsOne") : t("import.previewItemsMany")}.
        </p>
      </div>
    {/if}

    <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
      <button class={btnGhost} type="button" onclick={close} disabled={store.importing}>
        {t("import.cancel")}
      </button>
      <button
        class={confirming
          ? "inline-flex items-center justify-center gap-1.5 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-accent-ink shadow-sm hover:opacity-90 active:scale-[0.98] transition"
          : btnPrimary}
        type="button"
        onclick={doImport}
        disabled={!payload || store.importing}
        aria-label={confirming ? t("import.confirmAria") : t("import.submit")}
      >
        {#if store.importing}
          {t("import.importing")}
        {:else if confirming}
          <Check size={15} aria-hidden="true" />
          {t("import.confirm")}
        {:else}
          <Upload size={15} aria-hidden="true" />
          {t("import.submit")}
        {/if}
      </button>
    </div>
  </div>
</div>
