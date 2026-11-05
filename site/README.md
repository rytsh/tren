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
- `#/lokomotif?model=bd-040` (veya `tender-160`, `coach-220`): çizim, gerçek 3MF montajı ve Anatomy mekanizması.
- `#/parcalar`: model filtreli STL / 3MF / STEP ve hazır bileşen tablosu.
- `#/kilavuz`: ilk baskı, ray birleştirme, aksesuar elektriği, planlanan şarj.
- `#/tasarla`: 3D hat düzeni, hazır kapalı hatlar, modül ekleme/değiştirme/silme, tren adedi, yerel kayıt, URL paylaşımı ve CSV parça listesi.

GitHub Pages `base: './'` ve hash router ile çalışır; alt sayfa yenilemesi sunucu rewrite istemez. `.github/workflows/pages.yml` `main` push ve elle tetikleme için hazırdır. **Bu dosyanın varlığı sitenin yayımlandığı anlamına gelmez.** Repo ayarlarında Pages kaynağı GitHub Actions seçilmeli ve workflow çalışmalıdır.

## Veri akışı

`cad/params.json` ve `cad/parts.json` → `scripts/assets.mjs` → `src/lib/generated/` ve `public/models/`.

`figures/` → Anatomy kiti → `public/figures/`. Katalog SVG'leri açıklayıcı çizimlerdir, üretim modeli değildir. Gerçek montajlar CAD'den dışa aktarılan `*_montaj.3mf` dosyalarından Three.js `ThreeMFLoader` ile okunur. Baskı yönündeki STL'ler web'de tahmini koordinatlarla tekrar birleştirilmez.

Modeller `src/lib/catalog.ts` içinde tanımlı. Yeni model için katalog girdisi, Anatomy SVG'si, CAD 3MF montajı ve manifestoda ilgili parça adetleri eklenir. Henüz üretilmeyen modeller katalogda varmış gibi gösterilmez.

## Doğruluk sınırları

- Hiçbir parça basılmadı. CAD kontrolü fiziksel uyum, çekiş veya güvenli şarj kanıtı değildir.
- `mass_g_petg`, CAD katı hacmi × 1,27 g/cm³. Filament tüketimi/süre/maliyet tahmini değildir; dolgu ve destekler için dilimleyici gerekir.
- Hat tasarlayıcı görsel/geom­etrik yerleşim önizlemesidir; dinamik raydan çıkma, çarpışma, virajda kablo veya elektrik simülasyonu yapmaz. Araç görünümü şematiktir.
- İstasyon işareti BOM'da düz ray sayılır, şarj donanımı üretilmiş parça gibi sayılmaz.
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
