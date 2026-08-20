<script lang="ts">
let {
  pct,
  tone = "accent",
  className = "",
}: {
  pct: number;
  tone?: "accent" | "success" | "warning" | "danger";
  className?: string;
} = $props();

const p = $derived(Math.min(100, Math.max(0, pct)));

const tones: Record<string, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};
</script>

<div
  class={`h-2 w-full overflow-hidden rounded-full bg-surface-2 transition-opacity ${className}`}
  role="progressbar"
  aria-valuenow={p}
  aria-valuemin={0}
  aria-valuemax={100}
>
  <div
    class="h-full rounded-full transition-[width] duration-300 ease-out"
    style:width="{p}%"
    style:background-color={tones[tone]}
  ></div>
</div>
