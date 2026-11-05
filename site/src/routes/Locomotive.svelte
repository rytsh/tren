<script lang="ts">
  import { router, link } from "svelte-spa-router";
  import { modelById, modelParts, partCount, qtyOf, hasCad } from "../lib/catalog";
  import Topbar from "../lib/components/Topbar.svelte";
  import AnatomyFigure from "../lib/components/AnatomyFigure.svelte";
  import ModelViewer from "../lib/components/ModelViewer.svelte";
  import Footer from "../lib/components/Footer.svelte";
  const model = $derived(modelById(new URLSearchParams(router.querystring ?? "").get("model") ?? undefined));
  const parts = $derived(modelParts(model.id));
  let view = $state("Çizim");
  let lit = $state(false);
  $effect(() => { if ((!model.anatomy && view === "Anatomy") || (!model.assembly && view === "3D model")) view = "Çizim"; });
  const consistQuery = $derived(`tren=${model.family === "Vagon" ? `bd-040:1,tender-160:1,${model.id}:2` : `${model.id}:1`}`);
</script>

<Topbar title={model.name} />
<section class="wrap page">
  <div class="head">
    <div>
      <a href="/modeller" use:link class="label back">← Modeller</a>
      <h1>{model.name}</h1>
      <p>{model.kind} · 45 mm seri</p>
    </div>
    <span class="pill proto">Dijital prototip · baskı testi bekliyor</span>
  </div>

  <div class="work">
    <div class="plate drawing">
      <span class="corner" data-at="tl">Şekil — {model.name} · {view}</span>
      <div class="corner tabs" data-at="tr">
        <div class="seg" role="group" aria-label="Model görünümü">
          {#each ["Çizim", "3D model", "Anatomy"] as v}<button class:active={view === v} aria-pressed={view === v} onclick={() => (view = v)} disabled={(v === "Anatomy" && !model.anatomy) || (v === "3D model" && !model.assembly)} title={v === "Anatomy" && !model.anatomy ? "Bu modelin anatomi çizimi henüz hazırlanmadı" : v === "3D model" && !model.assembly ? "CAD montajı henüz üretilmedi" : undefined}>{v}</button>{/each}
        </div>
        {#if view === "Çizim"}<div class="seg"><button class:active={lit} aria-pressed={lit} onclick={() => (lit = !lit)}>Işık {lit ? "açık" : "kapalı"}</button></div>{/if}
      </div>
      <div class="view" class:viewer={view === "3D model"} class:anat={view === "Anatomy"}>
        {#if view === "Çizim"}<img src={`figures/${model.image}${lit ? "-lit" : ""}.svg`} alt={model.description} width="800" height="500" />
        {:else if view === "3D model" && model.assembly}{#key model.id}<ModelViewer assembly={model.assembly} name={model.name} />{/key}
        {:else if model.anatomy}{#key model.anatomy}<AnatomyFigure id={model.anatomy} title="{model.name}: mekanizma" stageOnly />{/key}{/if}
      </div>
      <span class="corner drawing-note" data-at="bl">{view === "Çizim" ? (lit ? `Işık: ${model.lights} · temsili` : "Açıklayıcı çizim · ölçüler CAD'de") : view === "3D model" ? "Gerçek CAD montajı · sürükle / kaydır" : "Temsili hız · donanım testi yok"}</span>
    </div>

    <aside class="plate specs">
      <span class="corner" data-at="tl">Künye</span>
      <p class="desc">{model.description}</p>
      {#if model.anatomy === "coupler"}<p class="desc">Anatomy sekmesi bu vagonun iki ucundaki T45 kuplörü gösterir; vagonun kendi ayrıştırması henüz yok.</p>{/if}
      {#if !model.anatomy}<p class="desc">Bu modelin Anatomy ayrıştırması henüz yok.{model.assembly ? " Çizim ve 3D CAD montajı kullanılabilir." : ""}</p>{/if}
      {#if !hasCad(model.id)}<p class="desc pending"><span class="label">CAD hazırlanıyor</span> Parça dosyaları ve 3D montaj henüz üretilmedi; bu sayfadaki çizim açıklayıcıdır.</p>{/if}
      <dl>
        <div><dt>Uzunluk</dt><dd>{model.length} mm</dd></div>
        <div><dt>Genişlik</dt><dd>{model.width} mm</dd></div>
        <div><dt>Ray açıklığı</dt><dd>45 mm</dd></div>
        <div><dt>Baskı parçası</dt><dd>{partCount(model.id)}</dd></div>
      </dl>
      <ul>{#each model.notes as n}<li>{n}</li>{/each}</ul>
      <div class="bus"><span class="label">TrenBus · <span class="role" data-role={model.bus}>{model.bus}</span></span>{#each model.functions as f}<p><b>{f.name}</b> — {f.detail}</p>{/each}</div>
      <div class="cta">
        {#if hasCad(model.id)}<a href={`/parcalar?model=${model.id}`} use:link class="btn">Parça dosyaları</a>{/if}
        <a href={`/tasarla?${consistQuery}`} use:link class="btn" data-tone="paper">Hatta yerleştir</a>
      </div>
    </aside>
  </div>

  <div class="bottom">
    <section>
      <div class="section-head"><div><span class="label">Liste</span><h2>Montajın parçaları</h2></div><span class="label">{parts.length} tür</span></div>
      <ol class="plate list">
        {#each parts as p, i}
          <li><a href={`models/${p.id}.stl`} download><span class="mono i">{String(i + 1).padStart(2, "0")}</span><span class="nm">{p.name_tr}</span><span class="mono q">{qtyOf(p, model.id)}×</span><span class="label dl">STL ↓</span></a></li>
        {/each}
      </ol>
    </section>
    <section class="notes">
      <div class="section-head"><div><span class="label">Not</span><h2>Üretmeden önce</h2></div></div>
      <p>Önce tolerans kuponunu bas. Aks ve rulman ölçüleri yazıcıya göre değişebilir. Hiçbir model fiziksel olarak denenmedi.</p>
      <h3>Vagonlar arası elektrik</h3>
      <p>Ortak, sökülebilir bir aksesuar bağlantısı planlanıyor. Kablo çekme kuvvetini taşımaz; kuplör ve boji hareketinden ayrı yönlendirilir. Besleme gerilimi ve konektör henüz seçilmedi.</p>
      <a href="/kilavuz?bolum=elektrik" use:link class="arrow-link">Mekanik hazırlık ve açık kararlar</a>
    </section>
  </div>
</section>
<Footer />

<style>
  .page { padding-top: 22px; }
  .head { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 18px; }
  .back:hover { color: var(--ink); }
  .head h1 { font-size: var(--step-head); margin-top: 8px; }
  .head p { color: var(--muted); font-size: 13px; margin-top: 2px; }
  .work { display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 16px; }
  .drawing { display: grid; }
  .tabs { padding: 6px; }
  .view { display: grid; place-items: center; min-height: 420px; padding: 44px 24px 36px; }
  .view.anat { place-items: stretch; height: 520px; padding: 44px 8px 30px; }
  .view > img { width: 100%; max-height: 480px; object-fit: contain; }
  .view :global(.figure) { width: 100%; }
  .view.viewer { padding: 40px 0 0; }
  .view :global(.mv) { width: 100%; height: 480px; }
  .specs { padding: 38px 18px 18px; display: flex; flex-direction: column; gap: 14px; }
  .desc { font-size: 13px; color: var(--muted); }
  dl { display: grid; border-top: 1px solid var(--hair); }
  dl > div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
  dt { color: var(--muted); }
  dd { font-family: var(--mono); font-size: 12px; }
  ul { display: grid; gap: 6px; font-size: 13px; }
  li::marker { content: none; }
  ul li { padding-left: 14px; position: relative; }
  ul li::before { content: ""; position: absolute; left: 0; top: .6em; width: 6px; height: 1px; background: var(--red); }
  .cta { display: grid; gap: 8px; margin-top: auto; }
  .pending { background: #fbf5e8; padding: 8px 10px; box-shadow: 0 0 0 1px #dcc59b; }
  .bus { display: grid; gap: 4px; border-top: 1px solid var(--hair); padding-top: 10px; }
  .bus p { font-size: 12.5px; color: var(--muted); }
  .bus b { color: var(--ink); font-weight: 550; }
  .role { padding: 1px 5px; box-shadow: 0 0 0 1px var(--hair-strong); color: var(--ink); }
  .role[data-role="besler"] { background: var(--signal); }
  .tabs { display: flex; gap: 6px; }
  .bottom { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; margin-top: 40px; }
  .list li a { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; min-height: 40px; padding: 0 14px; border-bottom: 1px solid var(--line-soft); font-size: 13px; transition: background-color var(--t-hover); }
  .list li:last-child a { border-bottom: 0; }
  .list li a:hover { background: #fff; }
  .list li a:hover .dl { color: var(--blue); }
  .i { font-size: 10.5px; color: #998d6a; }
  .q { font-size: 12px; }
  .notes p { color: var(--muted); font-size: 13px; max-width: 62ch; }
  .notes h3 { margin: 20px 0 6px; font-size: 14px; }
  .notes .arrow-link { margin-top: 12px; }
  @media (max-width: 1000px) { .work { grid-template-columns: 1fr; } .cta { grid-template-columns: 1fr 1fr; } .bottom { grid-template-columns: 1fr; gap: 28px; } }
  @media (max-width: 680px) {
    .head { flex-direction: column; align-items: start; gap: 10px; }
    .tabs { position: static !important; padding: 34px 8px 0; }
    .drawing > .corner[data-at="tl"] { display: none; }
    .view { min-height: 240px; padding: 14px 6px 34px; }
    .view :global(.mv) { height: 340px; }
    .view.anat { height: 300px; padding: 8px 4px 30px; }
    .cta { grid-template-columns: 1fr; }
  }
</style>
