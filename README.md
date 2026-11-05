<p align="center"><img src="docs/logo.svg" alt="Tren" width="300"></p>

# Tren

45 mm plastik ray üzerinde çalışan, 3D baskıyla üretilebilir, bataryalı model demiryolu. Lokomotif, tender, ortak 250 mm şasili vagon ailesi, ray ve ortak parçalar SolidCraft ile parametrik modellenir; bütün araçlar aynı **T45 otomatik kuplörü** ve onun içinden geçen **TrenBus** (güç + CAN veri) hattını paylaşır.

**Durum:** dijital prototip. CAD dosyaları üretilmiştir; hiçbir parça fiziksel olarak basılıp denenmemiştir. Kuplör temasları, elektronik kontrol ve otomatik şarj henüz uygulanmış donanım değildir.

CAD'i hazır olanlar: BD 0-4-0, Tender 160, ortak 250 vagon şasisi (platform, boji, tampon, T45 kuplör kafası ve kolu), **Şarj 250** (döner şarj kolu, kasa, çatı) ve istasyon kontak tutucusu. Diğer beş 250 vagonun gövdesi sırada.

## Araç ailesi

| Model | Görev | TrenBus |
|---|---|---|
| BD 0-4-0 | lokomotif, çekiş, CAN yöneticisi | besler |
| Tender 160 | ana 2S pil | besler |
| Yolcu 250 | iç aydınlatma | tüketir |
| Enerji 250 | ek pil + gösterge | besler |
| Radar 250 | dönen anten, mesafe sensörü | tüketir |
| Şarj 250 | döner şarj kolları (CAD hazır), şarj durumu | ayrı devre |
| Ses 250 | hoparlör, düdük | tüketir |
| Gözlem 250 | kamera kubbesi, balkon | tüketir |

Ölçü, kuplör ve hat standardı: [docs/standart.md](docs/standart.md).

## Web atölyesi

```sh
cd site
pnpm install --frozen-lockfile
pnpm assets
pnpm figures
pnpm dev
```

Düz Svelte 5, TypeScript, Tailwind, Three.js ve `svelte-spa-router`. Anatomy ile etkileşimli teknik çizimler ve model kataloğu (ışık aç/kapa dahil); STL/3MF/STEP indirme, gerçek CAD montajlarıyla 3D inceleme, hat düzenleme, yerel kayıt ve CAD kaynaklı parça listesi.

Üretim derlemesi: `pnpm --dir site build`. Testler: `pnpm --dir site check` ve `pnpm --dir site test`.

GitHub Pages iş akışı `.github/workflows/pages.yml` içinde. Henüz yayına alındığı doğrulanmamıştır. Ayrıntılar: [site/README.md](site/README.md).

## CAD

- Parametreler: [`cad/params.json`](cad/params.json)
- Üreteç: [`cad/build.py`](cad/build.py)
- Parça manifestosu: [`cad/parts.json`](cad/parts.json)
- Baskı dosyaları: `cad/out/stl/`, `cad/out/3mf/`, `cad/out/step/`
- Düzenlenebilir tasarımlar: `cad/designs/`
- Ölçümler ve baskı/test notları: [`cad/README.md`](cad/README.md)

```sh
python3 cad/build.py ray_duz_200
python3 cad/build.py sarj250_montaj
python3 cad/parts_manifest.py
```

SolidCraft CLI `PATH`'te aranır (`solidcraft-cli`); `SOLIDCRAFT_CLI` ile değiştirilebilir, WSL'den Windows `.exe` de olur. Site derlemesi CLI çalıştırmaz, mevcut CAD çıktılarından beslenir.

## Ortak standart ve açık işler

200 mm düz ray, R750 / 15° viraj, 45 mm ray açıklığı, 4 mm aks, 250 × 90 mm vagon şasisi. Elektrik raylardan alınmaz. Kuplör pinleri: BAT+, CAN-H, CAN-L, GND, her biri iki paralel temasla. Şarj kontakları bu hattan ayrıdır: Şarj 250 iki döner kolla istasyondaki üst (+) ve alt (−) pirinç lamaya basar (`docs/standart.md` §5).

Öncelikli fiziksel doğrulamalar: tolerans kuponu, ray ekleri, sonsuz vida kavraması, T45 kuplörün mıknatıs tutuşu ve pogo temasları, R750'de kuplör açısı ve boji hareketi. Sonsuz vida tek başına güvenilir bir park freni kabul edilmez.

Logo: [Lucide `train-track`](https://lucide.dev/icons/train-track) (ISC). Anatomy kiti MIT lisanslıdır; kaynak ve lisans `site/anatomy/` altında korunur. Projenin kendi lisansı [`LICENSE`](LICENSE) dosyasındadır.
