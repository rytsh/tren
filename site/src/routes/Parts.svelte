<script lang="ts">
  import { router, link } from "svelte-spa-router";
  import { PARTS, HARDWARE, tr } from "../lib/bom";
  import { MODELS, hasCad, qtyOf, partImage } from "../lib/catalog";
  import Topbar from "../lib/components/Topbar.svelte";
  import Footer from "../lib/components/Footer.svelte";
  const initial = new URLSearchParams(router.querystring ?? "");
  let scope = $state(initial.get("model") ?? "all");
  let query = $state(initial.get("q") ?? "");
  let tab = $state("Baskı dosyaları");
  const filtered = $derived(PARTS.filter((p) => (scope === "all" || scope === "track" ? scope === "all" || p.id.startsWith("ray_") : qtyOf(p, scope) > 0) && p.name_tr.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))));
</script>

<Topbar title="Parça kütüphanesi" />
<section class="wrap page">
  <div class="section-head">
    <div><span class="label">Kütüphane · {PARTS.length} parça</span><h1 class="page-title">Bir parçadan başlar.</h1><p class="page-lead">Gerçek CAD dosyaları, ortak parçalar ve hazır bileşenler. Bütün modeller 45 mm ray standardını paylaşır.</p></div>
    <a href="/kilavuz" use:link class="btn" data-tone="paper">Baskı kılavuzu</a>
  </div>

  <div class="controls">
    <div class="seg" role="group" aria-label="Parça kaynağı">{#each ["Baskı dosyaları", "Hazır bileşenler"] as t}<button class:active={tab === t} aria-pressed={tab === t} onclick={() => (tab = t)}>{t}</button>{/each}</div>
    {#if tab === "Baskı dosyaları"}
      <div class="fields">
        <label><span class="sr-only">Model</span><select bind:value={scope}><option value="all">Tüm parçalar</option><option value="track">Raylar</option>{#each MODELS.filter((m) => hasCad(m.id)) as m}<option value={m.id}>{m.name}</option>{/each}</select></label>
        <input type="search" bind:value={query} placeholder="Parça ara" aria-label="Parçalarda ara" />
      </div>
    {/if}
  </div>

  {#if tab === "Baskı dosyaları"}
    <p class="label meta">{filtered.length} parça · ölçüler CAD yönünde · kütle %100 dolu PETG, dilimleyici tahmini değil</p>
    <div class="plate table-wrap">
      <table>
        <thead><tr><th class="label">Parça</th><th class="label">CAD ölçüsü · mm</th><th class="label num">Dolu PETG</th><th class="label">Dosyalar</th></tr></thead>
        <tbody>
          {#each filtered as p}
            <tr>
              <td><div class="part-name">{#if partImage(p.id)}<img src={`figures/${partImage(p.id)}.svg`} width="44" height="36" alt="" />{:else}<svg class="ph" viewBox="0 0 40 34" aria-hidden="true"><path d="M20 5 34 12v12L20 31 6 24V12Z M6 12l14 7 14-7 M20 19v12" fill="#faf5e4" stroke="#998d6a" stroke-width="1"/></svg>{/if}<div><strong>{p.name_tr}</strong><span>{p.notes_tr}</span></div></div></td>
              <td class="mono">{p.bbox_mm?.map((v) => tr.format(v)).join(" × ")}</td>
              <td class="mono num">{tr.format(p.mass_g_petg ?? 0)} g</td>
              <td><div class="downloads"><a href={`models/${p.id}.stl`} download>STL</a><a href={`models/3mf/${p.id}.3mf`} download>3MF</a><a href={`models/step/${p.id}.step`} download>STEP</a></div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if !filtered.length}<div class="plate empty"><h2>Bu parça bulunamadı.</h2><p>Farklı bir sözcük veya model seç.</p><button class="btn" data-tone="paper" onclick={() => { query = ""; scope = "all"; }}>Filtreleri temizle</button></div>{/if}
  {:else}
    <p class="label meta">Adetler araç başına · elektronik bileşenler plan aşamasında</p>
    <div class="plate table-wrap">
      <table>
        <thead><tr><th class="label">Bileşen / özellik</th><th class="label num">Lokomotif</th><th class="label num">Tender</th><th class="label num">Vagon</th></tr></thead>
        <tbody>{#each HARDWARE as h}<tr><td><strong>{h.name_tr}</strong><p class="spec">{h.spec}</p></td><td class="mono num">{h.qty_per_loco || "—"}</td><td class="mono num">{h.qty_per_tender || "—"}</td><td class="mono num">{h.qty_per_coach || "—"}</td></tr>{/each}</tbody>
      </table>
    </div>
  {/if}
</section>
<Footer />

<style>
  .page { padding-top: 22px; min-height: 70svh; }
  .section-head .btn { flex: none; }
  .controls { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 10px; }
  .fields { display: flex; gap: 8px; }
  select, input { height: 30px; padding: 0 9px; font-size: 12.5px; background: var(--plate); box-shadow: 0 0 0 1px var(--hair); outline: none; }
  select:focus, input:focus { box-shadow: 0 0 0 1px var(--ink); }
  input { width: 170px; }
  input::placeholder { color: #8a7f5d; }
  .meta { margin: 18px 0 8px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--hair); font-weight: 450; white-space: nowrap; }
  td { padding: 10px 14px; vertical-align: middle; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #fff; }
  td.mono { font-size: 12px; white-space: nowrap; }
  .num { text-align: right; }
  .part-name { display: flex; align-items: center; gap: 12px; min-width: 220px; }
  .part-name img { flex: none; width: 44px; height: 36px; object-fit: contain; }
  .ph { flex: none; width: 44px; height: 32px; }
  .part-name strong { font-weight: 550; }
  .part-name span { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; max-width: 58ch; }
  .downloads { display: flex; box-shadow: 0 0 0 1px var(--hair); width: max-content; }
  .downloads a { font-family: var(--mono); font-size: 10.5px; letter-spacing: .06em; padding: 6px 9px; border-right: 1px solid var(--hair); color: var(--ink); transition: background-color var(--t-hover), color var(--t-hover); }
  .downloads a:last-child { border-right: 0; }
  .downloads a:hover { background: var(--ink); color: #fff; }
  .spec { color: var(--muted); font-size: 12px; margin-top: 3px; max-width: 70ch; }
  .empty { display: grid; justify-items: center; text-align: center; gap: 10px; padding: 44px 20px; margin-top: 12px; }
  .empty p { color: var(--muted); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
  @media (max-width: 760px) { .section-head .btn { display: none; } .controls { flex-direction: column; align-items: stretch; } .fields { width: 100%; } .fields label, input { flex: 1; width: auto; } select { width: 100%; } .part-name img, .ph { display: none; } }
</style>
