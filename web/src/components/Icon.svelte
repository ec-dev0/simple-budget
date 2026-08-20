<script lang="ts">
import { budgetIcon, categoryIcon, type IconComponent } from "../lib/icons.ts";

let {
  name,
  type = "category",
  size = 16,
  strokeWidth = 1.9,
  class: className = "",
}: {
  name: string;
  type?: "category" | "budget";
  size?: number;
  strokeWidth?: number;
  class?: string;
} = $props();

const Icon: IconComponent = $derived(type === "budget" ? budgetIcon(name) : categoryIcon(name));
</script>

<Icon {size} {strokeWidth} class={className} aria-hidden="true" />
