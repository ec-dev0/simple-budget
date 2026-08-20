<script lang="ts">
import { Download, Monitor, Moon, Plus, Sun, Upload } from "lucide-svelte";
import { theme } from "../lib/theme.svelte.ts";
import { btnPrimary } from "../lib/ui.ts";
import { store } from "../lib/store.svelte.ts";
import { downloadExport } from "../lib/api.ts";
import { t, i18n } from "../lib/i18n/index.svelte.ts";
import ImportDialog from "./ImportDialog.svelte";
import LanguagePicker from "./LanguagePicker.svelte";

let { onNewBudget }: { onNewBudget?: () => void } = $props();

const ThemeIcon = $derived(theme.current === "dark" ? Moon : theme.current === "light" ? Sun : Monitor);
const nextKey = $derived(theme.current === "system" ? "light" : theme.current === "light" ? "dark" : "system");

let exporting = $state(false);
let importOpen = $state(false);

$effect(() => {
  theme.apply(theme.current);
});

async function onExport() {
  if (exporting) return;
  exporting = true;
  try {
    await downloadExport();
  } catch (e) {
    store.error = i18n.resolveError(e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : null, e instanceof Error ? e.message : "");
  } finally {
    exporting = false;
  }
}
</script>

<header class="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-sm"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" class="h-5 w-5" fill="none">
        <path d="M16 22h32M16 32h32M16 42h22" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
      </svg>
    </div>
    <div class="min-w-0 leading-tight">
      <p class="truncate text-[15px] font-semibold tracking-tight">{t("app.name")}</p>
      <p class="hidden text-xs text-muted sm:block">{t("app.tagline")}</p>
    </div>

    <div class="ml-auto flex items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-surface2 hover:text-ink disabled:opacity-50"
        onclick={onExport}
        disabled={exporting}
        aria-label={t("header.exportAria")}
        title={t("header.exportTitle")}
      >
        <Download size={16} aria-hidden="true" />
        <span class="hidden sm:inline">{exporting ? t("header.exporting") : t("header.exportButton")}</span>
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-surface2 hover:text-ink"
        onclick={() => (importOpen = true)}
        aria-label={t("header.importAria")}
        aria-expanded={importOpen}
        title={t("header.importTitle")}
      >
        <Upload size={16} aria-hidden="true" />
        <span class="hidden sm:inline">{t("header.importButton")}</span>
      </button>
      <button
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-surface2 hover:text-ink"
        onclick={() => theme.cycle()}
        aria-label={t("theme.cycleTo", t(`theme.${nextKey}`))}
        title={t("theme.currentTitle", t(`theme.${theme.current}`))}
      >
        <ThemeIcon size={16} aria-hidden="true" />
        <span class="hidden sm:inline">{t(`theme.${theme.current}`)}</span>
      </button>
      <LanguagePicker />
      {#if onNewBudget}
        <button class={btnPrimary} onclick={onNewBudget}>
          <Plus size={15} aria-hidden="true" />
          <span class="hidden sm:inline">{t("header.newBudget")}</span>
        </button>
      {/if}
    </div>
  </div>
</header>

{#if importOpen}
  <ImportDialog onClose={() => (importOpen = false)} />
{/if}
