<script lang="ts">
  import { onMount } from "svelte";

  let { id, title, theme = "light", stageOnly = false }: { id: string; title: string; theme?: "light" | "dark"; stageOnly?: boolean } = $props();

  let height = $state(0);
  let missing = $state(false);
  let frame = $state<HTMLIFrameElement>();
  const src = $derived(`figures/${id}${theme === "light" ? "-light" : ""}.html${stageOnly ? "?embed=stage" : ""}`);

  onMount(() => {
    fetch(src, { method: "HEAD" })
      .then((r) => (missing = !r.ok))
      .catch(() => (missing = true));
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame?.contentWindow) return;
      const d = e.data as { type?: string; height?: number };
      if (d?.type === "anatomy-height" && typeof d.height === "number") height = Math.ceil(d.height);
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  });
</script>

{#if missing}
  <div class="figure empty" data-theme={theme}>
    <p>{title}: çizim henüz üretilmedi. <code>pnpm figures</code> ile oluşturulur.</p>
  </div>
{:else}
  <div class="figure" class:fill={stageOnly} data-theme={theme} style={stageOnly ? undefined : height ? `height:${height}px` : "aspect-ratio: 3 / 2"}>
    <iframe bind:this={frame} {src} {title} loading="lazy" scrolling="no"></iframe>
  </div>
{/if}

<style>
  .figure {
    width: 100%;
    transition: height var(--t-ui) var(--ease-out);
    background: transparent;
  }
  .figure.fill {
    height: 100%;
    min-height: 0;
  }
  .figure[data-theme="dark"] {
    background: #131313;
  }
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: transparent;
  }
  .empty {
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 2;
    padding: 1.5rem;
    color: var(--color-muted);
    font-size: var(--step-small);
  }
  .figure[data-theme="dark"].empty {
    color: #b5b5b5;
  }
</style>
