<script lang="ts">
import { Languages } from "lucide-svelte";
import { i18n, t, type Locale, LOCALES, localeFlagStyle } from "../lib/i18n/index.svelte.ts";
import { api } from "../lib/api.ts";

let { onChange }: { onChange?: (locale: Locale) => void } = $props();

const flags = localeFlagStyle();
const currentName = $derived(flags[i18n.locale].name);

async function selectLocale(loc: Locale) {
  if (loc === i18n.locale) return;
  i18n.apply(loc);
  onChange?.(loc);
  try {
    await api.updateSettings({ language: loc });
  } catch {
    /* el ajuste de idioma persistirá al próximo PATCH manual */
  }
}
</script>

<details class="relative">
  <summary
    class="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft transition hover:bg-surface2 hover:text-ink"
    aria-label={t("language.label")}
    title={t("language.label")}
  >
    <Languages size={16} aria-hidden="true" />
    <span class="hidden sm:inline">{currentName}</span>
  </summary>
  <div
    class="absolute right-0 z-40 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-line bg-surface shadow-paper"
    role="menu"
  >
    {#each LOCALES as opt}
      {@const active = i18n.locale === opt.value}
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition {active ? 'bg-accent-soft text-ink font-medium' : 'text-ink-soft hover:bg-surface2 hover:text-ink'}"
        onclick={() => selectLocale(opt.value)}
        role="menuitemradio"
        aria-checked={active}
      >
        <span>{t(`language.${opt.key}`)}</span>
        <span class="tnum text-xs text-muted">{opt.value.toUpperCase()}</span>
      </button>
    {/each}
  </div>
</details>

<style>
  details > summary::-webkit-details-marker {
    display: none;
  }
</style>
