export type Theme = "light" | "dark" | "system";

const KEY = "sb-theme";

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

class ThemeStore {
  value = $state<Theme>(readStored());

  constructor() {
    this.apply(this.value);
  }

  get current(): Theme {
    return this.value;
  }

  isDark(t: Theme): boolean {
    if (typeof window === "undefined") return false;
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  apply(t: Theme): void {
    this.value = t;
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", this.isDark(t));
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, t);
  }

  cycle(): void {
    const order: Theme[] = ["system", "light", "dark"];
    this.apply(order[(order.indexOf(this.value) + 1) % order.length]);
  }

  label(): string {
    return `theme.${this.value}`;
  }
}

export const theme = new ThemeStore();
