<script lang="ts">
  import { link, push } from "svelte-spa-router";
  import Logo from "./Logo.svelte";
  let { path }: { path: string } = $props();
  const nav = [
    { href: "/", label: "Atölye", n: "01" },
    { href: "/modeller", label: "Modeller", n: "02" },
    { href: "/kilavuz", label: "Montaj", n: "03" },
    { href: "/parcalar", label: "Parçalar", n: "04" },
    { href: "/tasarla", label: "Hat tasarla", n: "05" },
  ];
  let query = $state("");
  const isActive = (href: string) => path === href || (href === "/modeller" && path === "/lokomotif");
</script>

<header class="bar">
  <a href="/" use:link class="mark" aria-label="Tren, ana sayfa">
    <span class="logo"><Logo size={16} stroke={2.2} /></span>
    <span>Tren</span>
    <span class="gauge">45 mm</span>
  </a>
  <nav aria-label="Ana menü">
    {#each nav as n}
      <a href={n.href} use:link aria-current={isActive(n.href) ? "page" : undefined}><span class="n" aria-hidden="true">{n.n}</span>{n.label}</a>
    {/each}
  </nav>
  <div class="tools">
    <form role="search" onsubmit={(e) => { e.preventDefault(); push(`/modeller?q=${encodeURIComponent(query)}`); }}>
      <input type="search" bind:value={query} placeholder="Model ara" aria-label="Model ara" />
      <button type="submit" aria-label="Modellerde ara">↵</button>
    </form>
    <a class="gh" lang="en" href="https://github.com/rytsh/tren">GitHub</a>
  </div>
</header>

<style>
  .bar { position: sticky; top: 0; z-index: 40; height: var(--header); display: flex; align-items: center; gap: 28px; padding-inline: var(--margin); background: color-mix(in srgb, var(--ground) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--hair); }
  .mark { display: flex; align-items: center; gap: 9px; flex: none; font-size: 15px; font-weight: 650; letter-spacing: -.02em; color: var(--ink); }
  .logo { display: grid; place-items: center; width: 26px; height: 26px; background: var(--signal); color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
  .gauge { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; color: var(--mid); padding: 2px 5px; box-shadow: 0 0 0 1px var(--hair); }
  nav { display: flex; align-self: stretch; gap: 2px; }
  nav a { position: relative; display: flex; align-items: center; gap: 7px; padding: 0 11px; font-size: 13px; color: var(--muted); transition: color var(--t-hover); }
  nav a:hover { color: var(--ink); }
  nav a[aria-current] { color: var(--ink); font-weight: 550; }
  nav a[aria-current]::after { content: ""; position: absolute; left: 11px; right: 11px; bottom: -1px; height: 3px; background: var(--signal); box-shadow: 0 -1px 0 var(--ink) inset; }
  .n { font-family: var(--mono); font-size: 9.5px; letter-spacing: .04em; color: #998d6a; }
  nav a[aria-current] .n { color: #9a6a06; }
  .tools { margin-left: auto; display: flex; align-items: center; gap: 16px; }
  form { display: flex; align-items: center; height: 28px; box-shadow: 0 0 0 1px var(--hair); background: var(--plate); }
  input { width: 128px; padding: 0 9px; font-size: 12px; background: transparent; outline: none; }
  input::placeholder { color: #8a7f5d; }
  form button { width: 26px; height: 28px; font-family: var(--mono); font-size: 12px; color: var(--mid); border-left: 1px solid var(--hair); }
  form button:hover { color: var(--ink); }
  form:focus-within { box-shadow: 0 0 0 1px var(--ink); }
  .gh { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--mid); }
  .gh:hover { color: var(--ink); }
  @media (max-width: 1080px) { .gh, .gauge { display: none; } nav a { padding: 0 8px; } nav a[aria-current]::after { left: 8px; right: 8px; } }
  @media (max-width: 860px) { .tools { display: none; } }
  @media (max-width: 680px) {
    .bar { height: auto; flex-wrap: wrap; gap: 0; padding: 0; }
    .mark { height: 44px; padding-inline: var(--margin); }
    nav { width: 100%; overflow-x: auto; scrollbar-width: none; border-top: 1px solid var(--hair); padding-inline: calc(var(--margin) - 8px); }
    nav a { height: 40px; flex: none; font-size: 13px; }
    .n { display: none; }
  }
</style>
