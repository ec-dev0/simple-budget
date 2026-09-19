<script lang="ts">
  import { Check, X } from "lucide-svelte";
  import { store } from "../lib/store.svelte.ts";
  import { btnGhost, btnPrimary, inputCls, inputNumCls, labelCls } from "../lib/ui.ts";
  import { t } from "../lib/i18n/index.svelte.ts";
  import type { ItemPayment } from "../lib/types.ts";

  let {
    itemId,
    payment = null,
    onDone,
    onCancel,
  }: {
    itemId: string;
    payment?: ItemPayment | null;
    onDone?: () => void;
    onCancel?: () => void;
  } = $props();

  // The component is recreated for each payment editor, so these are form snapshots.
  // svelte-ignore state_referenced_locally
  let amount = $state(payment ? String(payment.amount) : "");
  // svelte-ignore state_referenced_locally
  let paidAt = $state(payment ? payment.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
  // svelte-ignore state_referenced_locally
  let note = $state(payment?.note ?? "");
  let saving = $state(false);

  function isoDate(value: string): string | null {
    return value ? `${value}T12:00:00.000Z` : null;
  }

  async function submit() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !paidAt) return;
    saving = true;
    if (payment) {
      await store.updatePayment(payment.id, {
        amount: parsedAmount,
        paidAt: isoDate(paidAt),
        note: note.trim(),
      });
    } else {
      await store.addPayment(itemId, {
        amount: parsedAmount,
        paidAt: isoDate(paidAt),
        note: note.trim(),
      });
    }
    saving = false;
    onDone?.();
  }
</script>

<form
  class="mt-2 rounded-xl border border-line bg-surface2/60 p-3"
  onsubmit={(event) => {
    event.preventDefault();
    submit();
  }}
>
  <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1.5fr)]">
    <div>
      <label class={labelCls} for="payment-amount">{t("item.paymentAmount")}</label>
      <input id="payment-amount" class={inputNumCls} bind:value={amount} type="number" min="0.01" step="0.01" inputmode="decimal" required />
    </div>
    <div>
      <label class={labelCls} for="payment-date">{t("item.paymentDate")}</label>
      <input id="payment-date" class={inputCls} bind:value={paidAt} type="date" required />
    </div>
    <div>
      <label class={labelCls} for="payment-note">{t("item.paymentNote")}</label>
      <input id="payment-note" class={inputCls} bind:value={note} maxlength="500" placeholder={t("item.paymentNotePlaceholder")} />
    </div>
  </div>
  <div class="mt-3 flex justify-end gap-2">
    {#if onCancel}
      <button type="button" class={btnGhost} onclick={onCancel} disabled={saving}>
        <X size={14} aria-hidden="true" />
        {t("form.cancel")}
      </button>
    {/if}
    <button class={btnPrimary} disabled={saving || !amount || !paidAt}>
      <Check size={14} aria-hidden="true" />
      {payment ? t("item.savePayment") : t("item.submitPayment")}
    </button>
  </div>
</form>
