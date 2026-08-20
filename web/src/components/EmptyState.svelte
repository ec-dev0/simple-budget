<script lang="ts">
import { BookOpen } from "lucide-svelte";
import { btnPrimary } from "../lib/ui.ts";
import { t } from "../lib/i18n/index.svelte.ts";

let { onStart }: { onStart: () => void } = $props();
</script>

<div class="mx-auto max-w-md py-16 text-center">
  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent" aria-hidden="true">
    <BookOpen size={28} />
  </div>
  <h2 class="mt-6 text-2xl font-semibold tracking-tight">{t("empty.title")}</h2>
  <p class="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{t("empty.body")}</p>
  <div class="mt-6">
    <button class={btnPrimary} onclick={onStart}>{t("empty.cta")}</button>
  </div>

  <dl class="mx-auto mt-10 grid max-w-sm grid-cols-1 gap-4 text-left">
    <div class="rounded-xl border border-line bg-surface p-4">
      <dt class="text-xs font-semibold text-ink">{t("empty.step1Title")}</dt>
      <dd class="mt-1 text-sm text-muted">{t("empty.step1Body")}</dd>
    </div>
    <div class="rounded-xl border border-line bg-surface p-4">
      <dt class="text-xs font-semibold text-ink">{t("empty.step2Title")}</dt>
      <dd class="mt-1 text-sm text-muted">{t("empty.step2Body")}</dd>
    </div>
    <div class="rounded-xl border border-line bg-surface p-4">
      <dt class="text-xs font-semibold text-ink">{t("empty.step3Title")}</dt>
      <dd class="mt-1 text-sm text-muted">{t("empty.step3Body")}</dd>
    </div>
  </dl>
</div>
