<script lang="ts">
  import { link } from "svelte-spa-router";
</script>

<section class="wrap nf">
  <div class="plate">
    <span class="corner" data-at="tl">404 · hat sonu</span>
    <h1>Hat burada bitiyor.</h1>
    <p>Aradığın sayfa yok. Atölyeden devam et ya da kendi hattını kur.</p>
    <div class="row">
      <a href="/" use:link class="btn">Atölye</a>
      <a href="/tasarla" use:link class="btn" data-tone="paper">Hattını kur</a>
    </div>
  </div>
</section>

<style>
  .nf { min-height: calc(100svh - var(--header)); display: grid; place-items: center; }
  .plate { padding: 56px 40px 40px; max-width: 520px; display: grid; gap: 12px; }
  h1 { font-size: var(--step-head); }
  p { color: var(--muted); }
  .row { display: flex; gap: 8px; margin-top: 8px; }
</style>
