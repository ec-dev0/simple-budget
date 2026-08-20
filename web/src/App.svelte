<script lang="ts">
import { onMount, untrack } from "svelte";
import { X } from "lucide-svelte";
import { store } from "./lib/store.svelte.ts";
import { theme } from "./lib/theme.svelte.ts";
import { api } from "./lib/api.ts";
import { i18n } from "./lib/i18n/index.svelte.ts";
import { btnGhost } from "./lib/ui.ts";
import type { SettingsDto } from "./lib/api.ts";
import Header from "./components/Header.svelte";
import BudgetTabs from "./components/BudgetTabs.svelte";
import BudgetForm from "./components/BudgetForm.svelte";
import BudgetFormDialog from "./components/BudgetFormDialog.svelte";
import SummaryPanel from "./components/SummaryPanel.svelte";
import CategoryList from "./components/CategoryList.svelte";
import CategoryView from "./components/CategoryView.svelte";
import EmptyState from "./components/EmptyState.svelte";
import Onboarding from "./components/Onboarding.svelte";

let newOpen = $state(false);
let editOpen = $state(false);

let settings = $state<SettingsDto | null>(null);
let bootError = $state<string | null>(null);

async function bootstrap() {
  try {
    const s = await api.getSettings();
    settings = s;
    i18n.apply(s.language);
    if (s.onboarded) {
      await untrack(() => store.loadBudgets());
    }
  } catch (e) {
    bootError = e instanceof Error ? e.message : "No se pudo iniciar la aplicación";
  }
}

onMount(() => {
  bootstrap();
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => theme.apply(theme.current);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
});

async function onOnboarded() {
  const s = await api.getSettings();
  settings = s;
  await store.loadBudgets();
}

const ready = $derived(settings !== null);
const onboarded = $derived(settings?.onboarded ?? false);
</script>

{#if bootError}
  <div class="mx-auto max-w-md px-4 py-16 text-center">
    <p class="text-sm text-danger">{bootError}</p>
    <button class={btnGhost + " mt-4"} onclick={() => location.reload()}>{i18n.current === "es" ? "Reintentar" : "Retry"}</button>
  </div>
{:else if !ready}
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div class="space-y-5">
        <div class="skel h-48"></div>
        <div class="skel h-64"></div>
      </div>
      <div class="skel h-80"></div>
    </div>
  </div>
{:else if !onboarded}
  <Onboarding onDone={onOnboarded} />
{:else}
  <Header onNewBudget={() => (newOpen = !newOpen)} />

  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    {#if store.error}
      <div
        class="mb-5 flex items-center justify-between gap-3 rounded-xl border border-danger-soft bg-danger-soft/60 px-4 py-3"
        role="alert"
      >
        <p class="text-sm text-danger">{store.error}</p>
        <button class={btnGhost} onclick={() => store.clearError()} aria-label={i18n.current === "es" ? "Descartar error" : "Dismiss error"}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    {/if}

    {#if store.loadingBudgets}
      <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div class="space-y-5">
          <div class="skel h-48"></div>
          <div class="skel h-64"></div>
        </div>
        <div class="skel h-80"></div>
      </div>
    {:else if store.budgets.length === 0}
      <EmptyState onStart={() => (newOpen = true)} />
    {:else}
      <BudgetTabs {newOpen} onToggleNew={() => (newOpen = !newOpen)} />

      <div class="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div class="space-y-5">
          {#if editOpen}
            <BudgetForm
              budget={store.current}
              onDone={() => (editOpen = false)}
              onCancel={() => (editOpen = false)}
            />
          {:else}
            <SummaryPanel onEdit={() => (editOpen = true)} />
          {/if}
          <CategoryList />
        </div>
        <div>
          {#if store.loadingBudget || !store.current}
            <div class="skel h-96"></div>
          {:else}
            <CategoryView />
          {/if}
        </div>
      </div>
    {/if}
  </main>

  <BudgetFormDialog open={newOpen} onClose={() => (newOpen = false)} />

  <footer class="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
    <p class="text-center text-xs text-muted">
      Simple Budget · {i18n.current === "es" ? "tus datos viven en tu propia base SQLite" : "your data lives in your own SQLite DB"} · API en <a href="/api" class="underline hover:text-ink">/api</a> · <a href="/docs/API.md" class="underline hover:text-ink">documentación</a>
    </p>
    <p class="text-center text-[11px] text-muted mt-1">© {new Date().getFullYear()} · {i18n.current === "es" ? "creado por" : "created by"} <a href="https://github.com/ec-dev0" class="underline hover:text-ink" target="_blank" rel="noopener noreferrer">ec-dev0</a></p>
  </footer>
{/if}
