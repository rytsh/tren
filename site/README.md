# Tren · web atölyesi

Düz **Svelte 5 + TypeScript + Vite + Tailwind 4**, `svelte-spa-router` hash yönlendirmesi. SvelteKit veya sunucu gerektirmez. Paket yöneticisi **pnpm**.

```sh
pnpm install --frozen-lockfile
pnpm assets       # CAD manifestosu ve dosyalarını siteye al
pnpm figures      # Anatomy HTML/SVG üretimi
pnpm dev
```

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

Görsel hazırlıkta ImageMagick `convert` ve `identify` kullanılır. GitHub Actions bunları kurar. CAD yeniden üretimi için gereken SolidCraft, **site derlemesinde gerekmez**: repodaki CAD çıktıları kopyalanır.

## Sayfalar

- `#/`: model atölyesi, büyük Anatomy çizimi, model parçaları ve katalog.
- `#/modeller`: model türü ve arama filtresi.
- `#/lokomotif?model=bd-040` (veya `tender-160`, `sarj-250`, `yolcu-250` …): çizim, gerçek 3MF montajı ve Anatomy mekanizması. Gövdesi henüz modellenmemiş 250 vagonlarda 3D sekmesi ortak 250 şasiyi gösterir.
- `#/parcalar`: model filtreli STL / 3MF / STEP ve hazır bileşen tablosu.
- `#/kilavuz`: ilk baskı, ray birleştirme, çeki kolu ve TrenBus ara kablosu, döner kollu şarj (basılacaklar ve montaj sırası).
- `#/tasarla`: 3D hat düzeni, hazır kapalı hatlar, modül ekleme/değiştirme/silme, tren adedi, yerel kayıt, URL paylaşımı ve CSV parça listesi.

GitHub Pages `base: './'` ve hash router ile çalışır; alt sayfa yenilemesi sunucu rewrite istemez. `.github/workflows/pages.yml` `main` push ve elle tetikleme için hazırdır. **Bu dosyanın varlığı sitenin yayımlandığı anlamına gelmez.** Repo ayarlarında Pages kaynağı GitHub Actions seçilmeli ve workflow çalışmalıdır.

## Veri akışı

`cad/params.json` ve `cad/parts.json` → `scripts/assets.mjs` → `src/lib/generated/` ve `public/models/`. `assets.mjs` türetilmiş (ifade) parametreleri de çözer (`params.json` → `_values`); sitedeki `param()` CAD ile aynı sayıları okur.

`figures/` → Anatomy kiti → `public/figures/`. Katalog SVG'leri açıklayıcı çizimlerdir, üretim modeli değildir. Gerçek montajlar CAD'den dışa aktarılan `*_montaj.3mf` dosyalarından Three.js `ThreeMFLoader` ile okunur. Baskı yönündeki STL'ler web'de tahmini koordinatlarla tekrar birleştirilmez.

Modeller `src/lib/catalog.ts` içinde tanımlı; hat önizlemesindeki yerleşim ölçüleri `src/lib/vehicles.ts`'te. Yeni model için katalog girdisi, Anatomy SVG'si, CAD 3MF montajı, `vehicles.ts` girdisi ve manifestoda `qty_by_model` adetleri eklenir. Gövdesi modellenmeyen araçlar "Gövde sırada" olarak işaretlenir.

## Doğruluk sınırları

- Hiçbir parça basılmadı. CAD kontrolü fiziksel uyum, çekiş veya güvenli şarj kanıtı değildir.
- `mass_g_petg`, CAD katı hacmi × 1,27 g/cm³. Filament tüketimi/süre/maliyet tahmini değildir; dolgu ve destekler için dilimleyici gerekir.
- Hat tasarlayıcı görsel/geometrik yerleşim önizlemesidir; dinamik raydan çıkma, çarpışma, virajda kablo veya elektrik simülasyonu yapmaz.
- Hat önizlemesindeki araçlar CAD montaj 3MF'leridir (`src/lib/vehicles.ts`). Her araç kendi dingil veya boji pivotlarına oturur; araç aralığı çeki kolu pim aralığından gelir (lokomotif–tender 44, tender–250 86, 250–250 116 mm; 250 vagonlar arası adım 290 mm). Gövdesi henüz modellenmemiş 250 vagonlar gerçek ortak şasi (`sasi250_montaj`) üstünde `params.json` ölçüleriyle çizilmiş sade gövdeyle gösterilir. Şarj 250'nin kolları seyirde kapalı gösterilir.
- İstasyon rayı BOM'da bir düz ray, bir `sarj_istasyon` tutucusu, iki pirinç lama, iki işaret mıknatısı ve bir istasyon beslemesi sayılır. Besleme devresi seçilmedi.
- Aksesuar hattı (ışıklı vagonlar) ve şarj kontakları ayrı tasarlanır. Gerilim, konektör, akım sınırı açık kararlardır. 2S paket tam dolu 8,4 V'tur.
- Sonsuz vida geri sürüşü azaltabilir; sürtünme/baskı malzemesine bağlı kendinden kilitlenme, park freni garantisi değildir.

## Testler

`pnpm test`: saf hat geometrisi (hazır hat kapanması, aynalama, uzunluk, güvenli URL çözümleme) ve CAD tabanlı BOM.

`pnpm test:e2e`: derlenmiş site üzerinde Playwright. Önce `pnpm build`, ardından Chromium kurulmalı (`pnpm exec playwright install chromium`). Yerel Chrome kullanmak için:

```sh
CHROME_PATH=/usr/bin/google-chrome pnpm test:e2e
```

## Kaynaklar

- Anatomy: `anatomy/LICENSE`, upstream commit `anatomy/UPSTREAM`. Kit MIT lisansı korunur.
- Libre Franklin: yerel WOFF2, paket içindeki OFL lisansı.
- İlk tasarım araştırmasının tarihî görselleri `assets/credits.json` içinde kaynak/lisanslarıyla arşivlidir; mevcut model vitrini ürün fotoğrafı yerine açıklayıcı Anatomy çizimlerini kullanır.
