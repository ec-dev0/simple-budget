import es, { type Dict } from "./es.ts";
import en from "./en.ts";

export type Locale = "es" | "en";
export type ErrorCode =
  | "ERR_REQUIRED_NAME"
  | "ERR_INVALID_URL"
  | "ERR_INVALID_DATE"
  | "ERR_INVALID_COLOR"
  | "ERR_NAME_TOO_LONG"
  | "ERR_DESCRIPTION_TOO_LONG"
  | "ERR_NOTES_TOO_LONG"
  | "ERR_INVALID_PRIORITY"
  | "ERR_INVALID_CURRENCY"
  | "ERR_STORE_TOO_LONG"
  | "ERR_UNIT_TOO_LONG"
  | "ERR_ICON_TOO_LONG"
  | "ERR_PURCHASED_REQUIRED"
  | "ERR_INVALID_QUANTITY"
  | "ERR_EMPTY_PATCH"
  | "ERR_NOT_FOUND"
  | "ERR_INTERNAL"
  | "ERR_INVALID"
  | "ERR_IMPORT_NOT_JSON"
  | "ERR_IMPORT_BAD_PAYLOAD"
  | "ERR_IMPORT_BAD_FORMAT"
  | "ERR_IMPORT_VERSION"
  | "ERR_IMPORT_NO_BUDGETS"
  | "ERR_IMPORT_TOO_LARGE";

const TABLES: Record<Locale, Dict> = { es, en };

// Los formateadores Intl son caros de crear: se cachean por locale/moneda.
function intlLocale(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(locale: Locale, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

const plainFormatters = new Map<string, Intl.NumberFormat>();
function plainFormatter(locale: Locale): Intl.NumberFormat {
  let f = plainFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 });
    plainFormatters.set(locale, f);
  }
  return f;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(locale: Locale, month: "2-digit" | "short", year: "numeric" | "2-digit"): Intl.DateTimeFormat {
  const key = `${locale}|${month}|${year}`;
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month, year });
    dateFormatters.set(key, f);
  }
  return f;
}
export const LOCALES: { value: Locale; key: keyof Dict["language"]; hint: string }[] = [
  { value: "es", key: "es", hint: "esHint" as keyof Dict["language"] },
  { value: "en", key: "en", hint: "enHint" as keyof Dict["language"] },
];

function applyHtmlLang(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

class I18nStore {
  locale = $state<Locale>("es");

  constructor() {
    applyHtmlLang(this.locale);
  }

  get current(): Locale {
    return this.locale;
  }

  apply(locale: Locale): void {
    this.locale = locale;
    applyHtmlLang(locale);
  }

  lookup(path: string): string | undefined {
    const dict = TABLES[this.locale] ?? TABLES.en;
    const fallback = TABLES.en;
    const parts = path.split(".");
    let cur: unknown = dict;
    let fb: unknown = fallback;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        cur = undefined;
      }
      if (fb && typeof fb === "object" && p in (fb as Record<string, unknown>)) {
        fb = (fb as Record<string, unknown>)[p];
      } else {
        fb = undefined;
      }
    }
    if (typeof cur === "string") return cur;
    if (typeof fb === "string") return fb;
    return undefined;
  }

  resolveError(code: string | null | undefined, fallback?: string): string {
    if (code && TABLES[this.locale].error[code as ErrorCode] !== undefined) {
      return TABLES[this.locale].error[code as ErrorCode];
    }
    if (code && TABLES.en.error[code as ErrorCode] !== undefined) {
      return TABLES.en.error[code as ErrorCode];
    }
    if (fallback) return fallback;
    return TABLES[this.locale].error.ERR_INTERNAL;
  }

  formatMoney(amount: number | null | undefined, currency: string): string {
    if (amount === null || amount === undefined) return "—";
    try {
      return moneyFormatter(this.locale, currency).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  formatMoneyPlain(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return "—";
    return plainFormatter(this.locale).format(amount);
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (Number.isNaN(d.getTime())) return "";
    return dateFormatter(this.locale, "2-digit", "numeric").format(d);
  }

  formatDateStamp(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (Number.isNaN(d.getTime())) return "";
    return dateFormatter(this.locale, "short", "2-digit").format(d);
  }

  formatRelative(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    const abs = Math.abs(diffDays);
    return this._relative(diffDays, abs);
  }

  private _relative(diffDays: number, abs: number): string {
    if (this.locale === "es") {
      if (diffDays === 0) return "hoy";
      if (diffDays === 1) return "mañana";
      if (diffDays === -1) return "ayer";
      if (diffDays < 0) return `hace ${abs} d`;
      return `en ${abs} d`;
    }
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === -1) return "yesterday";
    if (diffDays < 0) return `${abs}d ago`;
    return `in ${abs}d`;
  }

  priorityLabel(level: number, inForm: boolean): string {
    const dict = TABLES[this.locale];
    if (level === 0) return inForm ? dict.priority.noneForm : dict.priority.none;
    if (level === 1) return dict.priority.low;
    if (level === 2) return dict.priority.medium;
    return dict.priority.high;
  }
}

export const i18n = new I18nStore();

function resolve(path: string, dict: Dict): unknown {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function t(path: string): string;
export function t(path: string, ...args: (string | number)[]): string;
export function t(path: string, ...args: (string | number)[]): string {
  const dict = TABLES[i18n.locale];
  const value = resolve(path, dict) ?? resolve(path, TABLES.en) ?? path;
  if (typeof value === "string") return value;
  if (typeof value === "function") {
    return (value as (...a: (string | number)[]) => string)(...args);
  }
  return path;
}

export function localeFlagStyle(): Record<Locale, { emoji: string; name: string }> {
  return {
    es: { emoji: "🇪🇸", name: "Español" },
    en: { emoji: "🇬🇧", name: "English" },
  };
}
