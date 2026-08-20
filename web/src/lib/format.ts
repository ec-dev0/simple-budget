import { i18n } from "./i18n/index.svelte.ts";

export const money = (amount: number | null | undefined, currency: string): string =>
  i18n.formatMoney(amount, currency);

export const moneyPlain = (amount: number | null | undefined): string =>
  i18n.formatMoneyPlain(amount);

export const fmtDate = (iso: string | null | undefined): string => i18n.formatDate(iso);
export const fmtDateStamp = (iso: string | null | undefined): string => i18n.formatDateStamp(iso);
export const relativeDate = (iso: string | null | undefined): string => i18n.formatRelative(iso);

export const priorityLabel = (level: number, inForm: boolean): string =>
  i18n.priorityLabel(level, inForm);
