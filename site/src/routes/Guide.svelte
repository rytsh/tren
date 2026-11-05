<script lang="ts">
  import { router, link } from "svelte-spa-router";
  import Topbar from "../lib/components/Topbar.svelte";
  import Footer from "../lib/components/Footer.svelte";
  import AnatomyFigure from "../lib/components/AnatomyFigure.svelte";
    const tabs = [{ id: "mekanik", name: "İlk montaj" }, { id: "ray", name: "Ray bağlantısı" }, { id: "kuplor", name: "Kuplör ve TrenBus" }, { id: "elektrik", name: "Vagon elektriği" }, { id: "sarj", name: "Otomatik şarj" }];
  const asked = new URLSearchParams(router.querystring ?? "").get("bolum");
  let section = $state(tabs.some((t) => t.id === asked) ? asked! : "mekanik");
  const pins = [
    { n: 1, name: "BAT+", detail: "tren besleme hattı, 2S pil 6,0–8,4 V, sigortalı", tone: "bat" },
    { n: 2, name: "CAN-H", detail: "veri hattı, öneri 125 kbit/s", tone: "can" },
    { n: 3, name: "CAN-L", detail: "veri hattı", tone: "can" },
    { n: 4, name: "GND", detail: "ortak toprak", tone: "gnd" },
  ];
  const roles = [
    ["Besler", "BD 0-4-0, Tender 160, Enerji 250", "Pil paketi ideal diyot ve akım sınırıyla (öneri 2 A) BAT+ hattına bağlanır."],
    ["Tüketir", "Yolcu, Radar, Ses, Gözlem 250", "Her araç girişinde PTC/eFuse (öneri 1 A) ve kendi 5 V / 3,3 V regülatörü."],
    ["Ayrı devre", "Şarj 250", "İstasyon şarjı kendi döner kollarından; şarj akımı kuplör pinlerinden geçmez."],
  ];
  const steps = [
    ["Tolerans kuponunu bas", "4 mm çelik aksı Ø3,8–4,2 deliklerde; 684ZZ rulmanı Ø9,0–9,3 yuvalarda dene. Sıkı geçme tekerlekte, rahat dönme rulmanda olmalı."],
    ["Rayları ölç ve birleştir", "İç yüzler arası 45,0 mm hedef; başlangıç kontrolü ±0,2 mm. Üç düz modülün ek yerinde takılma ve basamak olmamalı."],
    ["Aksları ve tekerlekleri tak", "Arka yüzler arası 40 mm, iki aks arası 70 mm. Rulmanları şasiye yerleştir, pulları unutma."],
    ["Motor ve aktarmayı dene", "Önce güç vermeden elde kontrol et. Baskı sonsuz vidasının kavraması ve motor ölçüleri doğrulanmadı. Kendinden kilitlenme park freni sayılmaz."],
    ["Gövdeyi sökülebilir tut", "Platform şasiye M3 vidalarla, kazan ve kabin platforma takılır. İç parçalara ulaşmak için kalıcı yapıştırma yapma."],
  ];
  const charge = [
    ["sarj_kol", "tek parça göbek + üst (+) ve alt (−) kol"],
    ["sarj_govde", "kol cebi ve ışık çubuğu yarığı olan alçak kasa"],
    ["sarj_platform", "ortak 250 platformu + servo pedleri"],
    ["sarj_istasyon", "rayın yanına konan iki lamalı kontak tutucusu"],
  ];
  const print = [["Nozul / katman", "0,4 / 0,2 mm"], ["Nozul", "Üretici profili · örn. 250 °C"], ["Tabla", "70–80 °C · Textured PEI"], ["Raylar", "3 duvar · %20 gyroid"], ["Tekerlekler", "4 duvar · %40"], ["Şasi", "4 duvar · %30"]];
</script>

<Topbar title="Montaj ve standartlar" />
<div class="wrap guide">
  <div class="section-head">
    <div><span class="label">Kılavuz</span><h1 class="page-title">Birlikte nasıl çalışırlar?</h1><p class="page-lead">İlk baskıdan vagonlar arası bağlantıya. Uygulanan tasarım ile planlanan sistem ayrı tutulur.</p></div>
  </div>
  <div class="seg tabs" role="group" aria-label="Kılavuz konusu">{#each tabs as t}<button class:active={section === t.id} onclick={() => (section = t.id)} aria-pressed={section === t.id}>{t.name}</button>{/each}</div>

  {#if section === "mekanik"}
    <div class="grid">
      <div>
        <h2>Önce yürüyen şasi</h2>
        <p class="lead">Elektronik ve gövdeyi takmadan düz rayda elle hareketi doğrula. Parçalar henüz basılmadı; aşağıdaki sıra bir montaj ve test önerisidir.</p>
        <ol class="plate steps">
          {#each steps as [title, text], i}<li><span class="mono n">{String(i + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div></li>{/each}
        </ol>
        <a href="/parcalar" use:link class="btn">Baskı dosyaları</a>
      </div>
      <aside class="plate print">
        <span class="corner" data-at="tl">PETG başlangıç ayarı</span>
        <img src="figures/part-bogie.svg" alt="Şasi mekanizmasının açıklayıcı çizimi" width="240" height="200" />
        <dl>{#each print as [k, v]}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}</dl>
        <p>Kesin reçete değil; filament üreticisinin aralığı ve yazıcı kalibrasyonu öncelikli. Dış mekân için ASA düşünülüyor, UV ve ısı testi henüz yok.</p>
      </aside>
    </div>
  {:else if section === "ray"}
    <div class="diagram"><AnatomyFigure id="track-joint" title="Geçmeli rayın montajı" /></div>
    <div class="text-row"><h2>Bir dil, bir yuva</h2><p>200 mm modüller iki yönde takılabilir. Dil boynu 6 mm, ucu 9 mm; her yüzde 0,2 mm boşluk. Dil yukarıdan oturur; yandan zorlayarak geçirme. Ek yerinde raylar arasında 0,5 mm genleşme aralığı bırakılır.</p></div>
  {:else if section === "kuplor"}
    <div class="diagram"><AnatomyFigure id="coupler" title="T45 kuplör: güç ve veri" /></div>
    <div class="text-row"><h2>Bir kafa, iki iş.</h2><p>Her aracın iki ucunda aynı cinsiyetsiz kafa var. Kafanın yüzündeki koni karşı kafanın hunisine girer, arkadaki iki Ø10 mıknatıs araçları birbirine çeker ve temasları bastırır. Ağır tren ya da eğim için iki kafanın üstündeki delikten Ø3 kilit pimi düşürülür. Kafanın altında yan yana iki 4 pinli mıknatıslı pogo modülü var; karşı tarafta tersi geldiği için her sinyal iki paralel temastan geçer. Kablo kuvvet taşımaz: kafanın arkasında bir gerilim alıcıya bağlanır.</p></div>
    <div class="pins">
      <div class="plate pin-table">
        <span class="corner" data-at="tl">Pin sırası · yüzden bakınca</span>
        <ol>{#each pins as p}<li data-tone={p.tone}><span class="mono">{p.n}</span><b>{p.name}</b><span>{p.detail}</span></li>{/each}</ol>
      </div>
      <div class="plate pin-table">
        <span class="corner" data-at="tl">TrenBus rolleri</span>
        <ol>{#each roles as [r, who, how]}<li><b>{r}</b><span><em>{who}</em> — {how}</span></li>{/each}</ol>
      </div>
    </div>
    <div class="notes">
      <article><h3>Her araçta</h3><ul><li>Araç düğümü: mikrodenetleyici (ör. ESP32-C3) + 3,3 V CAN alıcı-verici (ör. SN65HVD230).</li><li>Lokomotif periyodik durum (hız, yön, pil) yayınlar; araçlar kalp atışı ve kendi telemetrisini gönderir.</li><li>Sonlandırma: lokomotifte sabit 120 Ω, son araçta arka kuplör boşsa düğümün açtığı 120 Ω.</li><li>Araç sırası kalp atışlarından çıkarılır; ışık, ses, radar komutla açılır.</li></ul></article>
      <article><h3>Henüz doğrulanmadı</h3><ul><li>Mıknatıs tutuşu ve kilit pimi olmadan çekme kuvveti.</li><li>Pogo temas direnci, akım değeri ve titreşimde kopma.</li><li>R750 ve S-virajda kafa açısı (hedef ±12° içinde).</li><li>CAN hattının uzun trende ve motor gürültüsünde davranışı.</li></ul></article>
    </div>
    <p class="safety"><span class="label">Durum</span>T45 bir tasarım önerisidir. Ölçüler <a class="link" href="https://github.com/rytsh/tren/blob/main/docs/standart.md">docs/standart.md</a> ve <code>cad/params.json</code> içinde; hiçbir parça basılıp denenmedi.</p>
  {:else if section === "elektrik"}
    <div class="electrical-head">
      <div><span class="pill proto">Tasarım önerisi · fiziksel test yok</span><h2>Aynı hat, ışıklı vagonlar.</h2><p class="lead">Işık, ses, radar ve ek pil artık ayrı kablolarla değil, kuplörün içinden geçen TrenBus ile bağlanır: BAT+ güç verir, CAN hangi vagonun ne yapacağını söyler. Çatı altında 12 mm LED şerit yüzeyi ve iç kablo bağlama noktaları kalır.</p></div>
      <div class="plate"><span class="corner" data-at="tl">Şekil — Yolcu 250 · ışık açık</span><img src="figures/car-yolcu-lit.svg" alt="Işıkları yanan yolcu vagonu" width="800" height="500" /></div>
    </div>
    <div class="plate connection" aria-label="Planlanan aksesuar hattı: tender, konektör, yolcu vagonu">
      <span class="corner" data-at="tl">Şema — aksesuar hattı</span>
      <div><strong>Tender</strong><span class="label">BAT+ besler</span></div>
      <span class="cable"><i></i><span class="label">T45 · 4 hat × 2 temas</span><i></i></span>
      <div><strong>Yolcu 250</strong><span class="label">ışık · CAN düğümü</span></div>
      <span class="cable"><i></i><span class="label">T45</span><i></i></span>
      <div><strong>Radar 250</strong><span class="label">anten · uyarı</span></div>
    </div>
    <div class="notes">
      <article><h3>Seçilenler (öneri)</h3><ul><li>Hat gerilimi: doğrudan 2S pil, 6,0–8,4 V; her araç kendi regülatörüyle düşürür.</li><li>Besleyici başına akım sınırı 2 A, tüketici girişinde 1 A PTC/eFuse.</li><li>Veri: CAN 2.0, 125 kbit/s, araç başına bir düğüm.</li><li>Rayda elektrik yok; şarj akımı kuplörden geçmez.</li></ul></article>
      <article><h3>Henüz doğrulanmayanlar</h3><ul><li>Pogo modül seçimi, temas direnci ve su koruması.</li><li>Uzun trende BAT+ gerilim düşümü ve toplam ışık yükü.</li><li>Önceki 2-pin aksesuar yuvaları T45'e geçince kaldırılacak.</li><li>R750 ve S-virajda gerçek kuplör ve kablo testi.</li></ul></article>
    </div>
    <p class="safety"><span class="label">Uyarı</span>Önceki 220 mm vagon hesabında R750'de tampon boşluğu 3,2 mm'ye düşüyordu. 250 mm şaside yan tamponlar yalnız görseldir ve geride durur; mesafeyi T45 kafası belirler. Yeni hesap CAD tarafında yapılıyor.</p>
    <p class="safety"><span class="label">Uyarı</span>2S Li-ion paket tam doluyken 8,4 V olur. Gerilim doğrulanmadan LED şerit veya 5 V modül doğrudan bağlanmamalı.</p>
  {:else}
    <div class="diagram"><AnatomyFigure id="charging-station" title="Planlanan otomatik şarj istasyonu" /></div>
    <div class="text-row"><h2>Önce bağlantı, sonra enerji.</h2><p>Şarj 250 durur, tek servo iki kolu cebinden kapı gibi çevirir; yaprak yaylı uçlar istasyondaki üst (+) ve alt (−) pirinç lamaya 1,5 mm bastırır. Lamalar temas doğrulanana kadar enerjisiz kalır, sonra uygun CC/CV şarj devreye girer. Şarj bitince kollar cebe döner ve gövdeden taşmaz; vagon ancak o zaman kalkar. Figür bir davranış açıklamasıdır; çalışan şarj donanımı veya onaylanmış devre değildir. İlk prototip manuel şarj kullanacak.</p></div>
    <div class="notes">
      <article><h3>Basılacaklar</h3><ul>{#each charge as [file, note]}<li><a class="link" href={`models/${file}.stl`} download><code>{file}</code></a> {note}</li>{/each}</ul></article>
      <article><h3>Montaj sırası</h3><ol class="charge-steps"><li>Servoyu platformun altındaki iki pede M2 ile vidala; mil yukarı, cebin altına gelir.</li><li>Yaprak yay şeritleri kol uçlarındaki yarığa yapıştır, dışa kıvır; telleri lehimleyip kol üstü kanaldan göbek deliğine indir.</li><li>Kolu servo merkezdeyken açık konumda (dışa dik) servo koluna oturt; kasayı platforma takarken göbeği cep tavanındaki yuvaya yandan kaydır.</li><li>İstasyon tutucusunu rayın yanına M3 ile sabitle; lamaları ceplere yerleştir, uçlarını direk yarığına bük.</li><li>Önce enerjisiz dene: kol açıkken iki pabuç da lamaya basmalı, kapalıyken kol gövdeden taşmamalı. Multimetreyle + ve − arasında kısa devre olmadığını ölç.</li></ol></article>
    </div>
    <p class="safety"><span class="label">Uyarı</span>Kol, servo ve lama ölçüleri varsayımdır; açık havada pirinç oksitlenir ve temas direnci artar. Lamalara besleme bağlamadan önce ters kutup koruması, sigorta ve "temas yoksa enerji yok" mantığı kurulmalıdır.</p>
  {/if}
</div>
<Footer />

<style>
  .guide { padding-top: 22px; }
  .tabs { margin: 4px 0 26px; flex-wrap: wrap; }
  h2 { font-size: 20px; margin-bottom: 8px; }
  h3 { font-size: 14px; }
  .lead { color: var(--muted); font-size: 14px; max-width: 64ch; }
  .grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, 1fr); gap: 32px; align-items: start; }
  .steps { margin: 18px 0 18px; }
  .steps li { display: grid; grid-template-columns: 34px 1fr; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--line-soft); }
  .steps li:last-child { border-bottom: 0; }
  .n { font-size: 11px; color: var(--red); padding-top: 2px; }
  .steps p { font-size: 13px; color: var(--muted); margin-top: 3px; }
  .print { padding: 36px 18px 18px; }
  .print img { display: block; margin: 0 auto 10px; width: 160px; }
  .print dl { border-top: 1px solid var(--hair); }
  .print dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
  dt { color: var(--muted); }
  dd { font-family: var(--mono); font-size: 11.5px; text-align: right; }
  .print p { font-size: 12.5px; color: var(--muted); margin-top: 12px; }
  .diagram { max-width: 980px; margin: 0 auto; }
  .text-row { display: grid; grid-template-columns: 1fr 1.8fr; gap: 30px; margin-top: 26px; }
  .text-row p { color: var(--muted); font-size: 14px; max-width: 68ch; }
  .electrical-head { display: grid; grid-template-columns: 1fr 1.1fr; gap: 28px; align-items: center; }
  .electrical-head h2 { font-size: 24px; margin-top: 12px; }
  .electrical-head .plate { padding: 28px 16px 8px; }
  .electrical-head img { width: 100%; }
  .connection { display: flex; justify-content: center; align-items: center; gap: 22px; padding: 42px 20px 26px; margin-block: 20px; }
  .connection > div { display: grid; justify-items: center; gap: 4px; text-align: center; }
  .connection strong { font-size: 14px; font-weight: 600; }
  .cable { display: flex; align-items: center; gap: 10px; }
  .cable i { width: 44px; height: 10px; border-bottom: 1.5px solid var(--red); border-radius: 0 0 50% 50%; }
  .notes { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .notes ul { margin-top: 8px; display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
  .notes li { position: relative; padding-left: 14px; }
  .notes li::before { content: ""; position: absolute; left: 0; top: .65em; width: 6px; height: 1px; background: var(--red); }
  .charge-steps { margin-top: 8px; display: grid; gap: 6px; font-size: 13px; color: var(--muted); counter-reset: s; }
  .charge-steps li { counter-increment: s; padding-left: 22px; }
  .charge-steps li::before { content: counter(s, decimal-leading-zero); left: 0; top: 0; width: auto; height: auto; background: none; font-family: var(--mono); font-size: 10.5px; color: #998d6a; }
  .notes code { font-family: var(--mono); font-size: 12px; }
  .safety { display: flex; align-items: baseline; gap: 12px; margin-top: 14px; padding: 10px 14px; border-left: 2px solid #c79a3d; background: #fbf5e8; font-size: 13px; color: #5e4419; }
  .safety .label { color: #7a5420; flex: none; }
  .pins { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .pin-table { padding-top: 32px; }
  .pin-table li { display: grid; grid-template-columns: 22px 64px 1fr; gap: 10px; align-items: baseline; padding: 9px 14px; border-top: 1px solid var(--line-soft); font-size: 13px; }
  .pin-table li:has(> b:first-child) { grid-template-columns: 90px 1fr; }
  .pin-table span { color: var(--muted); }
  .pin-table em { color: var(--ink); font-style: normal; font-weight: 550; }
  .pin-table li[data-tone] b::before { content: ""; display: inline-block; width: 8px; height: 8px; margin-right: 7px; box-shadow: 0 0 0 1px var(--ink); }
  .pin-table li[data-tone="bat"] b::before { background: var(--red); }
  .pin-table li[data-tone="can"] b::before { background: var(--signal); }
  .pin-table li[data-tone="gnd"] b::before { background: var(--ink); }
  code { font-family: var(--mono); font-size: 12px; }
  @media (max-width: 760px) {
    .pins { grid-template-columns: 1fr; }
    .grid, .electrical-head, .notes, .text-row { grid-template-columns: 1fr; gap: 22px; }
    .connection { flex-direction: column; }
    .cable i { display: none; }
  }
</style>
