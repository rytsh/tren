<script lang="ts">
  /** Lucide "train-track" ikonu (ISC lisansı, lucide.dev). Projenin logosu. */
  let { size = 20, stroke = 2, label }: { size?: number; stroke?: number; label?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"}>
  <path d="M2 17 17 2" />
  <path d="m2 14 8 8" />
  <path d="m5 11 8 8" />
  <path d="m8 8 8 8" />
  <path d="m11 5 8 8" />
  <path d="m14 2 8 8" />
  <path d="M7 22 22 7" />
</svg>
