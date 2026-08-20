<script lang="ts">
import { Check, Languages, Wallet } from "lucide-svelte";
import { api } from "../lib/api.ts";
import { i18n, t, type Locale, LOCALES } from "../lib/i18n/index.svelte.ts";
import { btnGhost, btnPrimary, inputCls, labelCls } from "../lib/ui.ts";

let { onDone }: { onDone: () => void } = $props();

const POPULAR_CURRENCIES: Array<{ code: string; es: string; en: string }> = [
  { code: "EUR", es: "Euro", en: "Euro" },
  { code: "USD", es: "Dólar estadounidense", en: "US Dollar" },
  { code: "GBP", es: "Libra esterlina", en: "Pound Sterling" },
  { code: "CAD", es: "Dólar canadiense", en: "Canadian Dollar" },
  { code: "MXN", es: "Peso mexicano", en: "Mexican Peso" },
  { code: "ARS", es: "Peso argentino", en: "Argentine Peso" },
  { code: "BRL", es: "Real brasileño", en: "Brazilian Real" },
  { code: "CLP", es: "Peso chileno", en: "Chilean Peso" },
  { code: "COP", es: "Peso colombiano", en: "Colombian Peso" },
  { code: "PEN", es: "Sol peruano", en: "Peruvian Sol" },
  { code: "CHF", es: "Franco suizo", en: "Swiss Franc" },
  { code: "JPY", es: "Yen japonés", en: "Japanese Yen" },
];

let language = $state<Locale>(i18n.current);
let currency = $state("EUR");
let customCurrency = $state("");
let saving = $state(false);

let step = $state(1);

const CURRENCIES = $derived(
  POPULAR_CURRENCIES.map((c) => ({
    code: c.code,
    name: i18n.locale === "es" ? c.es : c.en,
  }))
);

async function submit() {
  saving = true;
  try {
    await api.updateSettings({
      language,
      currency,
      onboarded: true,
    });
    i18n.apply(language);
    onDone();
  } finally {
    saving = false;
  }
}

function pickLocale(loc: Locale) {
  language = loc;
  i18n.apply(loc);
}

function nextStep() {
  if (step === 1) {
    i18n.apply(language);
    step = 2;
  }
}

function prevStep() {
  if (step === 2) step = 1;
}

function pickCurrency(code: string) {
  currency = code;
  customCurrency = "";
}

function applyCustomCurrency(value: string) {
  const v = value.trim().toUpperCase();
  if (v.length === 3 && /^[A-Z]+$/.test(v)) {
    currency = v;
  }
}
</script>

<div class="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
  <div class="mb-8 flex items-center gap-3">
    <div
      class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-sm"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" class="h-6 w-6" fill="none">
        <path d="M16 22h32M16 32h32M16 42h22" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
      </svg>
    </div>
    <div class="leading-tight">
      <p class="text-base font-semibold tracking-tight">{t("app.name")}</p>
      <p class="text-xs text-muted">{t("app.tagline")}</p>
    </div>
  </div>

  <section class="rounded-2xl border border-line bg-surface p-6 shadow-paper">
    <h1 class="text-2xl font-semibold tracking-tight">{t("onboarding.welcomeTitle")}</h1>
    <p class="mt-2 text-sm text-ink-soft">{t("onboarding.welcomeBody")}</p>

    <div class="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted">
      <span class="rounded-full px-2 py-0.5 {step === 1 ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted'}">
        1 · {t("onboarding.stepLanguage")}
      </span>
      <span class="h-px w-6 bg-line"></span>
      <span class="rounded-full px-2 py-0.5 {step === 2 ? 'bg-accent text-accent-ink' : 'bg-surface2 text-muted'}">
        2 · {t("onboarding.stepCurrency")}
      </span>
    </div>

    {#if step === 1}
      <fieldset class="mt-6 grid gap-3">
        <legend class="sr-only">{t("onboarding.pickingLanguage")}</legend>
        {#each LOCALES as opt}
          {@const active = language === opt.value}
          <label
            class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition {active
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-paper/40 hover:border-line-strong'}"
          >
            <input
              type="radio"
              name="onboard-language"
              class="mt-1 h-4 w-4 accent-[var(--accent)]"
              value={opt.value}
              checked={active}
              onchange={() => pickLocale(opt.value)}
            />
            <div class="min-w-0">
              <p class="text-[15px] font-medium text-ink">{t(`language.${opt.key}`)}</p>
              <p class="mt-0.5 text-xs text-muted">
                {opt.value === "es" ? t("onboarding.esHint") : t("onboarding.enHint")}
              </p>
            </div>
          </label>
        {/each}
      </fieldset>

      <div class="mt-6 flex justify-end">
        <button class={btnPrimary} type="button" onclick={nextStep}>
          <Languages size={15} aria-hidden="true" />
          {t("onboarding.continue")}
        </button>
      </div>
    {:else}
      <fieldset class="mt-6">
        <legend class="sr-only">{t("onboarding.pickingCurrency")}</legend>
        <p class="text-xs text-muted">
          {t("budget.currency")} · <span class="tnum">{currency}</span>
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {#each CURRENCIES as c}
            <button
              type="button"
              class="flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition {currency === c.code
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-line bg-paper/40 text-ink-soft hover:border-line-strong hover:text-ink'}"
              onclick={() => pickCurrency(c.code)}
              aria-pressed={currency === c.code}
            >
              <span class="tnum text-[15px] font-semibold">{c.code}</span>
              <span class="text-xs text-muted">{c.name}</span>
            </button>
          {/each}
        </div>
        <div class="mt-4">
          <label class={labelCls} for="onboard-custom-currency">{t("form.description")}</label>
          <input
            id="onboard-custom-currency"
            class={inputCls}
            bind:value={customCurrency}
            placeholder="ISO 4217 (3 letras)"
            maxlength={3}
            autocomplete="off"
            oninput={(e) => applyCustomCurrency((e.currentTarget as HTMLInputElement).value)}
          />
        </div>
      </fieldset>

      <div class="mt-6 flex items-center justify-between gap-2">
        <button class={btnGhost} type="button" onclick={prevStep}>{t("form.cancel")}</button>
        <button class={btnPrimary} type="button" onclick={submit} disabled={saving || currency.length !== 3}>
          <Check size={15} aria-hidden="true" />
          <Wallet size={15} aria-hidden="true" class="hidden" />
          {t("onboarding.continue")}
        </button>
      </div>
    {/if}
  </section>
</div>
