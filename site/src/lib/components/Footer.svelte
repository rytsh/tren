<script lang="ts">
  import { link } from "svelte-spa-router";
  import Logo from "./Logo.svelte";
</script>
<footer>
  <span class="brand"><Logo size={14} /> <span class="label">Tren · 45 mm · açık kaynak model atölyesi</span></span>
  <div><a href="https://github.com/wheresryan22/anatomy">Anatomy ile çizildi</a><a href="https://github.com/rytsh/tren" lang="en">GitHub</a><a href="/kilavuz" use:link>Baskı notları</a></div>
</footer>
<style>
  footer { margin-top: 48px; padding: 16px var(--margin); border-top: 1px solid var(--hair); display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .brand { display: inline-flex; align-items: center; gap: 8px; }
  div { display: flex; flex-wrap: wrap; gap: 18px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--mid); }
  a:hover { color: var(--ink); }
  @media (max-width: 680px) { footer { flex-direction: column; align-items: start; } }
</style>
