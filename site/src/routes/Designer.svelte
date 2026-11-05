<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { router, replace } from "svelte-spa-router";
  import { TrackScene } from "../lib/scene";
  import {
    KIND_LABEL,
    PRESETS,
    bounds,
    closure,
    counts,
    decode,
    encode,
    endPose,
    rebuild,
    totalLength,
    type PieceKind,
  } from "../lib/track";
  import { billOf, filament, tr, tr0, type Consist } from "../lib/bom";
  import { MODELS } from "../lib/catalog";
  import Topbar from "../lib/components/Topbar.svelte";
  import Footer from "../lib/components/Footer.svelte";

  const initial = () => {
    const q = new URLSearchParams(router.querystring ?? "");
    const code = q.get("k");
    if (code) return decode(code);
    const preset = PRESETS.find((p) => p.id === q.get("hat")) ?? PRESETS[1];
    return [...preset.kinds];
  };

  let kinds = $state<PieceKind[]>(initial());
  let selected = $state<number | null>(null);
  const initialQuery = new URLSearchParams(router.querystring ?? "");
  const MAX: Record<string, number> = { "bd-040": 4, "tender-160": 4 };
  const maxOf = (id: string) => MAX[id] ?? 8;
  const clamp = (id: string, v: unknown) => Math.min(maxOf(id), Math.max(0, Math.round(Number(v)) || 0));
  const decodeConsist = (q: URLSearchParams): Consist => {
    const tren = q.get("tren");
    if (tren) return Object.fromEntries(MODELS.map((m) => [m.id, clamp(m.id, tren.split(",").find((p) => p.startsWith(m.id + ":"))?.split(":")[1])]));
    // eski bağlantılar: l / t / c
    return Object.fromEntries(MODELS.map((m) => [m.id, m.id === "bd-040" ? clamp(m.id, q.get("l") ?? 1) : m.id === "tender-160" ? clamp(m.id, q.get("t") ?? 1) : m.id === "yolcu-250" ? clamp(m.id, q.get("c") ?? 2) : 0]));
  };
  const encodeConsist = (c: Consist) => MODELS.filter((m) => c[m.id]).map((m) => `${m.id}:${c[m.id]}`).join(",");
  let consist = $state<Consist>(decodeConsist(initialQuery));
  let speed = $state(0.35);
  let running = $state(true);
  let canvas: HTMLCanvasElement;
  let scene = $state.raw<TrackScene | null>(null);
  let webgl = $state(true);
  let copied = $state(false);
  let notice = $state("");

  const pieces = $derived(rebuild(kinds));
  const close = $derived(closure(pieces));
  const box = $derived(bounds(pieces));
  const length = $derived(totalLength(pieces));
  const tally = $derived(counts(pieces));
  const bom = $derived(billOf(tally, consist));
  const fil = $derived(filament(bom));
  const lap = $derived(length / 1000 / Math.max(speed, 0.01));
  const stations = $derived(tally.station);

  onMount(() => {
    try {
      scene = new TrackScene({ canvas, onPick: (id) => (selected = id) });
      scene.setPieces(pieces, selected);
      scene.frameAll();
    } catch {
      webgl = false;
    }
    return () => scene?.dispose();
  });

  $effect(() => {
    scene?.setPieces(pieces, selected);
  });
  $effect(() => {
    const nextKind = selected === null ? "straight" : kinds[selected];
    scene?.setGhost(selected === null && !close.closed ? endPose(pieces) : null, nextKind);
  });
  $effect(() => {
    if (scene) {
      scene.speed = speed;
      scene.running = running;
    }
  });
  $effect(() => { scene?.setConsist(MODELS.flatMap((m) => Array(consist[m.id] ?? 0).fill(m.id))); });
  // Adres yalnız düzen değişince yazılır; sayfadan ayrılırken router değişimi tasarlayıcıya geri döndürmemeli.
  $effect(() => {
    const next = new URLSearchParams({ k:encode(kinds), tren:encodeConsist(consist) }).toString();
    untrack(() => {
      if (!location.hash.startsWith("#/tasarla")) return;
      if (location.hash === `#/tasarla?${next}`) return;
      replace(`/tasarla?${next}`);
    });
  });

  function add(kind: PieceKind) {
    if (kinds.length >= 500) { notice="Bir hat en fazla 500 modül içerebilir."; return; }
    if (selected !== null) {
      kinds.splice(selected + 1, 0, kind);
      selected = selected + 1;
    } else kinds.push(kind);
  }
  function setKind(kind: PieceKind) {
    if (selected !== null) kinds[selected] = kind;
  }
  function remove() {
    if (selected !== null) {
      kinds.splice(selected, 1);
      selected = kinds.length ? Math.min(selected, kinds.length - 1) : null;
    } else kinds.pop();
  }
  function load(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    kinds = [...p.kinds];
    selected = null;
    requestAnimationFrame(() => scene?.frameAll());
  }
  function clear() {
    kinds = [];
    selected = null;
  }
  function onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input, select, textarea, button, a") || e.ctrlKey || e.metaKey || e.altKey) return;
    const map: Record<string, PieceKind> = { s: "straight", d: "straight", l: "curveLeft", a: "curveLeft", r: "curveRight", e: "curveRight", t: "station", i: "station" };
    const k = map[e.key.toLowerCase()];
    if (k) {
      e.preventDefault();
      add(k);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      remove();
    } else if (e.key === "Escape") selected = null;
    else if (e.key === "ArrowRight" && kinds.length) selected = selected === null ? 0 : (selected + 1) % kinds.length;
    else if (e.key === "ArrowLeft" && kinds.length) selected = selected === null ? kinds.length - 1 : (selected - 1 + kinds.length) % kinds.length;
  }
  async function share() {
    try {
      if (!navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(location.href);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch { notice = "Kopyalanamadı. Paylaşmak için adres çubuğundaki bağlantıyı kopyala."; }
  }
  function save() { try { localStorage.setItem("tren-layout-v1",JSON.stringify({ kinds:[...kinds],consist:{...consist} })); notice="Hat bu tarayıcıya kaydedildi."; } catch { notice="Bu tarayıcıda kayıt kullanılamıyor. Paylaş bağlantısıyla saklayabilirsin."; } }
  function restore() { try { const stored = localStorage.getItem("tren-layout-v1"); if(!stored) { notice="Henüz kayıtlı hat yok."; return; } const d = JSON.parse(stored); if(!Array.isArray(d.kinds) || d.kinds.length > 500 || !d.kinds.every((k: string) => k in KIND_LABEL)) throw new Error(); kinds = d.kinds; selected = null; const old = d.consist ?? {}; const legacy: Record<string, unknown> = { "bd-040": old.locos, "tender-160": old.tenders, "yolcu-250": old.coaches }; for (const m of MODELS) consist[m.id] = clamp(m.id, old[m.id] ?? legacy[m.id]); requestAnimationFrame(() => scene?.frameAll()); notice="Kayıtlı hat açıldı."; } catch { notice="Kayıt açılamadı. Hazır bir hattan başlayabilirsin."; } }
  function downloadCsv() {
    const rows = [["grup", "parça", "adet", "%100 dolu PETG g (dilimleme tahmini degil)", "not"], ...bom.map((l) => [l.group, l.name, String(l.qty), l.massG ? l.massG.toFixed(0) : "", l.note ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "bahce-demiryolu-malzeme.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const status = $derived(
    close.closed
      ? "Hat kapandı"
      : pieces.length < 3
        ? "Parça ekle"
        : `Açık uç: ${tr0.format(close.gap)} mm, ${tr.format(close.angle)}°`,
  );
</script>

<svelte:window onkeydown={onKey} />

<Topbar title="Hat tasarlayıcı" search={false} />
<section class="designer">
  <div class="stage">
    <canvas bind:this={canvas} aria-label="Ray hattının 3D görünümü. Sürükleyerek çevir, tekerlekle yakınlaştır, bir parçaya tıklayarak seç."></canvas>
    {#if !webgl}
      <p class="nogl">Bu tarayıcı WebGL açamadı. Hat ve parça listesi yine de aşağıda hesaplanıyor.</p>
    {/if}
    <div class="readout" aria-live="polite">
      <strong class:ok={close.closed}>{status}</strong>
      <span class="tabular">{pieces.length} parça · {tr.format(length / 1000)} m · {tr.format(box.width / 1000)} × {tr.format(box.depth / 1000)} m</span>
    </div>
    <div class="view">
      <button onclick={() => scene?.frameAll()}>Hepsini gör</button>
      <button onclick={() => scene?.focusTrain()}>Trene git</button>
      <button onclick={() => (running = !running)} aria-pressed={!running}>{running ? "Durdur" : "Sür"}</button>
    </div>
  </div>

  <aside class="panel">
    <span class="label">Hat tasarlayıcı</span>
    <h1>Hattını kur</h1>
    <p class="hint">Parçayı uca ekle veya rayı seçip değiştir. S: düz, L/R: viraj, T: istasyon. Bu bir yerleşim önizlemesi; çarpışma ve elektrik simülasyonu değil.</p>

    <div class="group">
      <h2>{selected === null ? "Uca ekle" : `Seçili: ${selected + 1}. parça`}</h2>
      <div class="pieces">
        {#each ["straight", "curveLeft", "curveRight", "station"] as const as k}
          <button class="piece" onclick={() => add(k)} title={KIND_LABEL[k]}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              {#if k === "straight" || k === "station"}
                <rect x="20" y="4" width="8" height="40" fill={k === "station" ? "#c98a0b" : "#3a3320"} />
              {:else}
                <path d={k === "curveLeft" ? "M28 44 C28 24 20 12 8 6 L4 12 C14 17 20 27 20 44 Z" : "M20 44 C20 24 28 12 40 6 L44 12 C34 17 28 27 28 44 Z"} fill="#3a3320" />
              {/if}
            </svg>
            <span>{KIND_LABEL[k]}</span>
          </button>
        {/each}
      </div>
      {#if selected !== null}
        <div class="row">
          <label>
            Türünü değiştir
            <select value={kinds[selected]} onchange={(e) => setKind((e.currentTarget as HTMLSelectElement).value as PieceKind)}>
              {#each Object.entries(KIND_LABEL) as [k, label]}
                <option value={k}>{label}</option>
              {/each}
            </select>
          </label>
          <button class="btn" data-tone="paper" onclick={() => (selected = null)}>Seçimi bırak</button>
        </div>
      {/if}
      <div class="row">
        <button class="btn" data-tone="ink" onclick={remove} disabled={!kinds.length}>{selected === null ? "Son parçayı sil" : "Seçiliyi sil"}</button>
        <button class="btn" data-tone="paper" onclick={clear} disabled={!kinds.length}>Temizle</button>
      </div>
    </div>

    <div class="group">
      <h2>Hazır hatlar</h2>
      <ul class="presets">
        {#each PRESETS as p}
          <li><button onclick={() => load(p.id)}><strong>{p.name}</strong><span>{p.note}</span></button></li>
        {/each}
      </ul>
    </div>

    <div class="group">
      <h2>Tren</h2>
      <div class="consist">
        {#each MODELS as m}
          <label>
            <span>{m.name}</span>
            <span class="stepper">
              <button aria-label="{m.name} azalt" onclick={() => (consist[m.id] = Math.max(0, (consist[m.id] ?? 0) - 1))}>−</button>
              <output class="tabular">{consist[m.id] ?? 0}</output>
              <button aria-label="{m.name} artır" onclick={() => (consist[m.id] = Math.min(maxOf(m.id), (consist[m.id] ?? 0) + 1))}>+</button>
            </span>
          </label>
        {/each}
      </div>
      <label class="speed">
        <span>Hız <output class="tabular">{tr.format(speed)} m/s</output></span>
        <input type="range" min="0.1" max="0.5" step="0.01" bind:value={speed} />
      </label>
      <p class="fact tabular">{close.closed ? "Bir tur" : "Hat boyunca"} {lap < 60 ? `${tr0.format(lap)} sn` : `${tr.format(lap / 60)} dk`}{stations ? ` · ${stations} istasyon işareti` : " · istasyon yok"}</p>
    </div>

    <div class="actions">
      <button class="btn" onclick={share}>{copied ? "Bağlantı kopyalandı" : "Hattı paylaş"}</button>
      <button class="btn" data-tone="ink" onclick={() => document.getElementById("bom")?.scrollIntoView({ behavior:"smooth" })}>Malzeme listesi</button>
      <button class="btn" data-tone="paper" onclick={save}>Tarayıcıya kaydet</button>
      <button class="btn" data-tone="paper" onclick={restore}>Kaydı aç</button>
    </div>
    {#if notice}<p class="fact" role="status">{notice}</p>{/if}
  </aside>
</section>

<section class="bom" id="bom">
  <div class="wrap grid-12">
    <div class="sum">
      <span class="label">Malzeme listesi</span>
      <h2>Bu hat için</h2>
      <p class="big tabular">{tr0.format(fil.withWaste / 1000 < 1 ? fil.withWaste : fil.withWaste / 1000)}<small>{fil.withWaste / 1000 < 1 ? " g" : " kg"}</small></p>
      <p>%100 dolu PETG hacmi, %8 ek payla. Gerçek filament miktarı, maliyet ve süre değildir; duvar, dolgu ve desteklere göre dilimleyiciden alınmalı.</p>
      <p>İstasyon işareti şu an düz ray sayılır; şarj ünitesinin parçaları bu listede yok.</p>
      <button class="btn" data-tone="ink" onclick={downloadCsv}>CSV indir</button>
    </div>
    <div class="table">
      {#each [["ray", "Basılacak ray"], ["araç", "Basılacak araç parçaları"], ["satın alma", "Satın alınacaklar"]] as [g, title]}
        {@const rows = bom.filter((l) => l.group === g)}
        {#if rows.length}
          <h3>{title}</h3>
          <table>
            <thead><tr><th>Parça</th><th class="num">Adet</th><th class="num">Dolu PETG</th></tr></thead>
            <tbody>
              {#each rows as l}
                <tr>
                  <td>
                    {#if l.file}<a class="link" href={`models/${l.key}.stl`} download>{l.name}</a>{:else}{l.name}{/if}
                    {#if l.note}<span class="note">{l.note}</span>{/if}
                  </td>
                  <td class="num tabular">{l.qty}</td>
                  <td class="num tabular">{l.massG ? `${tr0.format(l.massG)} g` : ""}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/each}
      {#if !bom.some((l) => l.group !== "ray")}
        <p class="note">Araç parçaları ve satın alma listesi CAD manifestosu üretilince burada görünür.</p>
      {/if}
    </div>
  </div>
</section>
<Footer />

<style>
  .designer { display: grid; grid-template-columns: minmax(0, 1fr) 320px; height: calc(100svh - var(--header)); min-height: 520px; border-bottom: 1px solid var(--hair); }
  .stage { position: relative; min-width: 0; background: #ece2c0; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  canvas:active { cursor: grabbing; }
  .nogl { position: absolute; inset: auto 20px 90px; max-width: 36ch; font-size: 13px; }
  .readout { position: absolute; left: 14px; bottom: 14px; display: grid; gap: 3px; background: var(--plate); padding: 9px 12px; box-shadow: 0 0 0 1px var(--hair); font-family: var(--mono); font-size: 11px; color: var(--mid); }
  .readout strong { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--ink); }
  .readout strong.ok { color: #1f6b33; }
  .view { position: absolute; right: 14px; top: 14px; display: flex; box-shadow: 0 0 0 1px var(--hair); background: var(--plate); }
  .view button { font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--mid); padding: 0 11px; min-height: 30px; border-right: 1px solid var(--hair); transition: color var(--t-hover), background-color var(--t-hover); }
  .view button:last-child { border-right: 0; }
  .view button:hover { color: var(--ink); background: #fff; }
  .view button[aria-pressed="true"] { background: var(--ink); color: #faf5e4; }

  .panel { background: var(--plate); padding: 18px 18px 22px; display: grid; align-content: start; gap: 20px; overflow-y: auto; border-left: 1px solid var(--hair); }
  .panel h1 { font-size: 20px; margin-top: 4px; }
  .hint { font-size: 12.5px; color: var(--muted); margin-top: -12px; }
  .group { border-top: 1px solid var(--hair); padding-top: 12px; }
  .group h2 { font-family: var(--mono); font-size: 10.5px; font-weight: 450; letter-spacing: .08em; text-transform: uppercase; color: var(--mid); margin-bottom: 10px; }
  .pieces { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--hair); box-shadow: 0 0 0 1px var(--hair); }
  .piece { display: grid; grid-template-columns: 28px 1fr; align-items: center; gap: 8px; text-align: left; background: var(--plate); padding: 8px 10px; font-size: 12.5px; line-height: 1.2; transition: background-color var(--t-hover); }
  .piece:hover { background: #fff; }
  .piece:active { background: #eee5c8; }
  .piece svg { width: 28px; height: 28px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: end; margin-top: 10px; }
  .row label { display: grid; gap: 4px; flex: 1; font-size: 12px; color: var(--muted); }
  select { height: 34px; padding-inline: 8px; background: var(--plate); box-shadow: 0 0 0 1px var(--hair); font: inherit; font-size: 13px; color: var(--ink); }
  .btn:disabled { opacity: .45; pointer-events: none; }
  .presets { display: grid; box-shadow: 0 0 0 1px var(--hair); }
  .presets li + li { border-top: 1px solid var(--line-soft); }
  .presets button { width: 100%; text-align: left; display: grid; gap: 1px; padding: 8px 10px; transition: background-color var(--t-hover); }
  .presets button:hover { background: #fff; }
  .presets strong { font-size: 13px; font-weight: 550; }
  .presets span { font-size: 12px; color: var(--muted); }
  .consist { display: grid; gap: 6px; }
  .consist label { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
  .stepper { display: flex; align-items: center; box-shadow: 0 0 0 1px var(--hair); }
  .stepper button { width: 30px; height: 28px; font-family: var(--mono); font-size: 14px; color: var(--mid); transition: background-color var(--t-hover), color var(--t-hover); }
  .stepper button:hover { background: #fff; color: var(--ink); }
  .stepper output { min-width: 28px; text-align: center; font-family: var(--mono); font-size: 12px; border-inline: 1px solid var(--hair); line-height: 28px; }
  .speed { display: grid; gap: 4px; margin-top: 12px; font-size: 13px; }
  .speed span { display: flex; justify-content: space-between; }
  .speed output { font-family: var(--mono); font-size: 12px; }
  input[type="range"] { accent-color: var(--ink); }
  .fact { margin-top: 8px; font-family: var(--mono); font-size: 11px; color: var(--mid); }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid var(--hair); padding-top: 14px; }

  .bom { padding-block: 32px 8px; }
  .sum { grid-column: 1 / span 4; position: sticky; top: calc(var(--header) + 16px); align-self: start; display: grid; gap: 10px; justify-items: start; }
  .sum h2 { font-size: 20px; margin-top: -4px; }
  .sum p { font-size: 13px; color: var(--muted); }
  .big { font-family: var(--mono); font-weight: 500; font-size: 34px; letter-spacing: -.02em; line-height: 1; color: var(--ink) !important; }
  .big small { font-size: .45em; color: var(--mid); }
  .table { grid-column: 6 / span 7; }
  .table h3 { font-family: var(--mono); font-size: 10.5px; font-weight: 450; letter-spacing: .08em; text-transform: uppercase; color: var(--mid); margin: 24px 0 8px; }
  .table h3:first-child { margin-top: 0; }
  table { width: 100%; border-collapse: collapse; background: var(--plate); box-shadow: 0 0 0 1px var(--hair); }
  th { text-align: left; font-family: var(--mono); font-size: 10.5px; font-weight: 450; letter-spacing: .06em; text-transform: uppercase; color: var(--mid); padding: 8px 12px; border-bottom: 1px solid var(--hair); }
  td { padding: 8px 12px; vertical-align: top; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
  tbody tr:last-child td { border-bottom: 0; }
  .num { text-align: right; white-space: nowrap; font-family: var(--mono); font-size: 12px; }
  .note { display: block; color: var(--muted); font-size: 12px; }

  @media (max-width: 950px) {
    .designer { grid-template-columns: 1fr; height: auto; }
    .stage { height: 58svh; min-height: 340px; }
    .panel { border-left: 0; border-top: 1px solid var(--hair); }
    .readout { left: 10px; bottom: 10px; right: 10px; }
    .view { top: 10px; right: 10px; }
    .sum, .table { grid-column: 1 / -1; position: static; }
    .table { margin-top: 24px; }
  }
</style>