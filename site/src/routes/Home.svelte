<script lang="ts">
  import { link, router } from "svelte-spa-router";
  import Topbar from "../lib/components/Topbar.svelte";
  import Footer from "../lib/components/Footer.svelte";
  import AnatomyFigure from "../lib/components/AnatomyFigure.svelte";
  import { MODELS, modelById, modelParts, partCount, partImage, qtyOf, hasCad, type ModelId } from "../lib/catalog";
  import { PARTS } from "../lib/bom";

  let selected = $state<ModelId>("bd-040");
  let view = $state<"model" | "mechanism">("model");
  let category = $state("Tümü");
  let lit = $state(false);
  const query = $derived(new URLSearchParams(router.querystring ?? "").get("q")?.toLocaleLowerCase("tr") ?? "");
  const catalogOnly = $derived(router.location === "/modeller");
  const model = $derived(modelById(selected));
  const featured = $derived([...PARTS.filter((p) => model.featured.includes(p.id)), ...modelParts(model.id).filter((p) => !model.featured.includes(p.id))].slice(0, 8));
  const catalog = $derived(MODELS.filter((m) => (category === "Tümü" || (category === "Çekiş" ? m.family !== "Vagon" : m.family === "Vagon")) && `${m.name} ${m.kind} ${m.functions.map((f) => f.name).join(" ")}`.toLocaleLowerCase("tr").includes(query)));
  const img = (m: { image: string }) => `figures/${m.image}${lit ? "-lit" : ""}.svg`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const steps = [
    { title: "Tolerans kuponu", text: "Aks ve rulman deliğini kendi yazıcında ölç.", image: "part-wheel" },
    { title: "Yürüyen şasi", text: "Rulman, aks ve tekerlekleri tak; elde döndür.", image: "part-bogie" },
    { title: "Gövde", text: "Kazan ve kabini M3 vidalarla platforma al.", image: "part-boiler" },
    { title: "Hat", text: "Rayları birleştir, önce elle sürüş dene.", image: "part-track" },
  ];
  $effect(() => { if (!model.anatomy) view = "model"; });
</script>

<Topbar title={catalogOnly ? "Model kütüphanesi" : "Atölye"} />

{#if !catalogOnly}
  <section class="intro wrap">
    <div>
      <span class="label">Atölye · Sayfa 01</span>
      <h1>Küçük bir tren. Kendi dünyan.</h1>
    </div>
    <p>Parça parça bas, birleştir ve bahçene 45 mm bir demiryolu kur. Bütün modeller açık CAD dosyalarıyla gelir.</p>
    <div class="actions">
      <a href="/tasarla" use:link class="btn">Hattını tasarla</a>
      <a href="/kilavuz" use:link class="btn" data-tone="paper">Nereden başlamalı?</a>
    </div>
  </section>

  <section class="bench wrap">
    <div class="plate stage">
      <span class="corner" data-at="tl">Şekil 01 — {view === "model" ? model.name : "Tahrik"}</span>
      <div class="corner switch" data-at="tr">
        <div class="seg" role="group" aria-label="Görünüm">
          <button class:active={view === "model"} aria-pressed={view === "model"} onclick={() => (view = "model")}>Model</button>
          <button class:active={view === "mechanism"} aria-pressed={view === "mechanism"} onclick={() => (view = "mechanism")} disabled={!model.anatomy} title={!model.anatomy ? "Bu modelin anatomi çizimi henüz hazırlanmadı" : "Tahrik mekanizmasını incele"}>Anatomisi</button>
        </div>
        <div class="seg"><button class:active={lit} aria-pressed={lit} onclick={() => (lit = !lit)} disabled={view !== "model"} title="Araç ışıklarını aç/kapat">Işık {lit ? "açık" : "kapalı"}</button></div>
      </div>
      {#if view === "model"}
        <a href={`/lokomotif?model=${selected}`} use:link class="art" aria-label="{model.name} modelini incele">
          <img src={img(model)} alt={model.description} width="800" height="500" fetchpriority="high" />
        </a>
      {:else}
        <div class="art anat">{#key model.anatomy}<AnatomyFigure id={model.anatomy ?? "worm-drive"} title="{model.name}: mekanizma" stageOnly />{/key}</div>
      {/if}
      <div class="corner drawing-caption" data-at="bl"><strong>{view === "model" ? model.name : model.anatomy === "coupler" ? "T45 kuplör" : "Sonsuz vida tahriki"}</strong> · {view === "model" ? `${model.length} × ${model.width} mm` : model.anatomy === "coupler" ? "güç + veri · temsili" : "30:1 · temsili"}</div>
      <span class="corner" data-at="br">{lit && view === "model" ? `Işık: ${model.lights} · temsili` : "Açıklayıcı çizim · ölçeksiz"}</span>
    </div>

    <aside class="plate parts">
      <span class="corner" data-at="tl">Parçalar</span>
      <span class="corner" data-at="tr">{model.name}</span>
      {#if !hasCad(model.id)}<p class="pending"><span class="label">CAD hazırlanıyor</span>Bu vagonun parça dosyaları henüz üretilmedi. Ortak 250 mm şasi, boji ve T45 kuplör kullanır.</p>{/if}
      <ol>
        {#each featured as p, i}
          <li>
            <a href={`/parcalar?model=${selected}&q=${encodeURIComponent(p.name_tr.split(" ")[0])}`} use:link>
              <span class="mono idx">{pad(i + 1)}</span>
              {#if partImage(p.id)}<img src={`figures/${partImage(p.id)}.svg`} alt="" width="40" height="34" />{:else}<svg class="ph" viewBox="0 0 40 34" aria-hidden="true"><path d="M20 5 34 12v12L20 31 6 24V12Z M6 12l14 7 14-7 M20 19v12" fill="#faf5e4" stroke="#998d6a" stroke-width="1"/></svg>{/if}
              <span class="nm">{p.name_tr.replace(" (flanş Ø47)", "")}</span>
              <span class="mono qty">{qtyOf(p, model.id)}×</span>
            </a>
          </li>
        {/each}
      </ol>
      <div class="bus"><span class="label">TrenBus</span><span class="mono role" data-role={model.bus}>{model.bus}</span>{#each model.functions as f}<span class="fn"><b>{f.name}</b> {f.detail}</span>{/each}</div>
      {#if hasCad(model.id)}<a href={`/parcalar?model=${selected}`} use:link class="arrow-link all">{partCount(selected)} baskı parçasının hepsi</a>{/if}
    </aside>
  </section>
{/if}

<section class="catalog wrap" id="modeller">
  <div class="section-head">
    <div><span class="label">{catalogOnly ? "Kütüphane" : "Sayfa 02"}</span><h2>{catalogOnly ? "Model kütüphanesi" : "Atölyedeki modeller"}</h2></div>
    <div class="seg filters" role="group" aria-label="Model türü">
      {#each ["Tümü", "Çekiş", "Vagonlar"] as c}<button class:active={category === c} aria-pressed={category === c} onclick={() => (category = c)}>{c}</button>{/each}
    </div>
  </div>
  {#if query}<p class="search-result">“{query}” için {catalog.length} model. <a href="/modeller" use:link class="link">Aramayı temizle</a></p>{/if}
  <div class="grid">
    {#each catalog as m, i}
      <article class="plate model-card" data-rise style="--i:{i}">
        <span class="corner" data-at="tl">Şekil {pad(MODELS.indexOf(m) + 2)}</span>
        <span class="corner" data-at="tr"><span class="pill" class:proto={hasCad(m.id)}>{hasCad(m.id) ? "Prototip" : "CAD sırada"}</span></span>
        <a href={`/lokomotif?model=${m.id}`} use:link class="card-art" tabindex="-1" aria-hidden="true"><img src={img(m)} alt="" width="800" height="500" loading="lazy" /></a>
        <div class="card-body">
          <div class="name"><h3>{m.name}</h3><span class="mono">{m.length} × {m.width}</span></div>
          <div class="tags"><span class="mono role" data-role={m.bus}>{m.bus}</span>{#each m.functions.slice(0, 2) as f}<span class="tag">{f.name}</span>{/each}</div>
          <p>{m.description}</p>
          <div class="foot">
            <a href={`/lokomotif?model=${m.id}`} use:link class="arrow-link">Modeli incele</a>
            {#if !catalogOnly}<button class="label pin" onclick={() => { selected = m.id; view = "model"; scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }} aria-label="{m.name}, çalışma panosunda göster">Panoya al</button>{/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
  {#if !catalog.length}<div class="plate empty">Bu aramada model yok. Tür filtresini veya arama sözcüğünü değiştir.</div>{/if}
  <p class="note label">Bütün modeller dijital prototip · baskı ve sürüş testi bekliyor</p>
</section>

<section class="assembly wrap">
  <div class="section-head">
    <div><span class="label">Sayfa 03</span><h2>İlk montajın yol haritası</h2></div>
    <a href="/kilavuz" use:link class="arrow-link">Kılavuzu aç</a>
  </div>
  <ol class="plate steps">
    {#each steps as step, i}
      <li>
        <span class="mono step-n">{pad(i + 1)}</span>
        <img src={`figures/${step.image}.svg`} width="120" height="100" alt="" loading="lazy" />
        <h3>{step.title}</h3>
        <p>{step.text}</p>
      </li>
    {/each}
  </ol>
  <a href="/kilavuz?bolum=kuplor" use:link class="wire">
    <span class="label">Standart · T45</span>
    <span>Her araç aynı otomatik kuplörü taşır: koni–huni hizalama, mıknatıslı tutma ve 8 pogo temasla BAT+, CAN-H, CAN-L, GND. Tasarım önerisi; temas ve akım henüz test edilmedi.</span>
    <span class="arrow-link">Kuplör ve TrenBus</span>
  </a>
</section>
<Footer />

<style>
  .intro { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 12px 40px; padding-top: 28px; padding-bottom: 20px; }
  .intro h1 { font-size: var(--step-display); letter-spacing: -.03em; margin-top: 6px; }
  .intro p { max-width: 52ch; color: var(--muted); font-size: 14px; padding-bottom: 4px; }
  .actions { display: flex; gap: 8px; padding-bottom: 2px; }

  .bench { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 16px; }
  .stage { min-height: 0; aspect-ratio: 16 / 8.2; display: grid; }
  .art { display: grid; place-items: center; padding: 34px 28px; min-height: 0; }
  .art img { width: 100%; height: 100%; max-height: 460px; object-fit: contain; transition: transform 300ms var(--ease-out); }
  .art.anat { place-items: stretch; padding: 40px 8px 30px; }
  a.art:hover img { transform: translateY(-3px); }
  .art :global(.figure) { width: 100%; }
  .switch { padding: 6px; display: flex; gap: 6px; }
  .drawing-caption strong { color: var(--ink); font-weight: 500; }

  .parts { display: flex; flex-direction: column; padding: 34px 0 0; }
  .parts ol { border-top: 1px solid var(--hair); }
  .parts li a { display: grid; grid-template-columns: 22px 40px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 46px; padding: 6px 14px; border-bottom: 1px solid var(--line-soft); font-size: 13px; line-height: 1.3; transition: background-color var(--t-hover); }
  .parts li a:hover { background: #fff; }
  .parts img { width: 40px; height: 34px; object-fit: contain; }
  .ph { width: 40px; height: 30px; }
  .idx { font-size: 10.5px; color: #998d6a; }
  .qty { font-size: 12px; color: var(--ink); }
  .all { margin-top: auto; padding: 14px; border-top: 1px solid var(--hair); }
  .pending { padding: 12px 14px; font-size: 12.5px; color: var(--muted); display: grid; gap: 4px; border-top: 1px solid var(--hair); background: #fbf5e8; }
  .bus { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 12px 14px; border-top: 1px solid var(--hair); }
  .bus .fn { flex-basis: 100%; font-size: 12.5px; color: var(--muted); }
  .bus .fn b { color: var(--ink); font-weight: 550; }
  .role { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; padding: 2px 6px; box-shadow: 0 0 0 1px var(--hair-strong); }
  .role[data-role="besler"] { background: var(--signal); box-shadow: 0 0 0 1px var(--ink); }
  .role[data-role="ayrı devre"] { background: #fff; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .tag { font-size: 11.5px; padding: 1px 6px; color: var(--muted); box-shadow: 0 0 0 1px var(--line-soft); }

  .catalog { padding-top: 44px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 1400px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .model-card { display: flex; flex-direction: column; transition: box-shadow var(--t-hover); }
  .model-card:hover { box-shadow: 0 0 0 1px var(--ink); }
  .model-card .corner[data-at="tr"] { padding: 6px 8px; }
  .card-art { display: block; aspect-ratio: 16 / 9.5; padding: 30px 18px 4px; }
  .card-art img { width: 100%; height: 100%; object-fit: contain; transition: transform 260ms var(--ease-out); }
  .model-card:hover .card-art img { transform: translateY(-3px); }
  .card-body { border-top: 1px solid var(--line-soft); padding: 14px 16px 0; display: flex; flex-direction: column; flex: 1; }
  .name { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .name h3 { font-size: 17px; }
  .name .mono { font-size: 11px; color: var(--mid); }
  .card-body p { margin-top: 6px; font-size: 13px; color: var(--muted); }
  .foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding: 14px 0; }
  .card-body p + .foot { margin-top: 12px; border-top: 1px dashed var(--line-soft); }
  .pin { min-height: 30px; padding: 0 2px; }
  .pin:hover { color: var(--ink); }
  .note { margin-top: 12px; }
  .search-result { font-size: 13px; margin-bottom: 14px; }
  .empty { padding: 40px; text-align: center; color: var(--muted); }

  .assembly { padding-top: 44px; }
  .steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .steps li { position: relative; padding: 16px 18px 18px; border-right: 1px solid var(--hair); }
  .steps li:last-child { border-right: 0; }
  .step-n { font-size: 11px; color: var(--red); }
  .steps img { display: block; width: 100%; height: 78px; object-fit: contain; margin: 4px 0 12px; }
  .steps h3 { font-size: 14px; }
  .steps p { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .wire { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 20px; margin-top: 16px; padding: 12px 16px; box-shadow: 0 0 0 1px var(--hair); border-left: 2px solid var(--red); font-size: 13px; color: var(--muted); transition: background-color var(--t-hover); }
  .wire:hover { background: var(--plate); }

  @media (max-width: 1180px) {
    .intro { grid-template-columns: 1fr auto; } .intro p { grid-column: 1 / -1; grid-row: 2; }
    .bench { grid-template-columns: 1fr; }
    .parts ol { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } .steps { grid-template-columns: 1fr 1fr; } .steps li:nth-child(2) { border-right: 0; } .steps li:nth-child(-n+2) { border-bottom: 1px solid var(--hair); } }
  @media (max-width: 680px) {
    .intro { grid-template-columns: 1fr; padding-top: 20px; } .intro p { grid-row: auto; }
    .stage { aspect-ratio: auto; } .art { padding: 40px 6px 34px; height: 260px; }
    .drawing-caption + .corner { display: none; }
    .grid { grid-template-columns: 1fr; }
    .section-head { flex-direction: column; align-items: start; }
    .wire { grid-template-columns: 1fr; gap: 6px; }
  }
</style>
