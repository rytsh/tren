---
name: Tren
description: Anatomy teknik çizim plakası dilinde, sıcak kum/krem ve işaret sarısı model atölyesi ve kütüphanesi.
colors:
  ground: "#efe6c8"
  plate: "#faf5e4"
  ink: "#2b2616"
  mid: "#6e6448"
  muted: "#665c40"
  hair: "#d6caa3"
  hair-strong: "#b0a37a"
  line-soft: "#e4dabb"
  signal: "#e9b824"
  link-hover: "#9a6a06"
  red: "#b3262a"
  proto-ground: "#fbf5e8"
  proto-ink: "#7a5420"
  proto-line: "#dcc59b"
  stage-3d: "#ece2c0"
typography:
  display:
    fontFamily: '"Libre Franklin Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2rem, 1.4rem + 1.6vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '"Libre Franklin Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.5rem, 1.2rem + 1vw, 2.125rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  section:
    fontFamily: '"Libre Franklin Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: '"Libre Franklin Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "14px"
    lineHeight: 1.55
  small:
    fontFamily: '"Libre Franklin Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "13px"
  label:
    fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace'
    fontSize: "10.5px"
    letterSpacing: "0.08em"
    textTransform: uppercase
  number:
    fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace'
    fontSize: "12px"
rounded:
  none: "0px"
spacing:
  header: "48px"
  margin: "clamp(16px, 3vw, 40px)"
  gap: "16px"
  section: "44px"
components:
  plate:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.none}"
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    height: "34px"
    rounded: "{rounded.none}"
  button-paper:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    height: "34px"
  segment-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate}"
    height: "30px"
---

# Design System: Tren

## Overview

Site, Anatomy figürlerinin **çizim plakası** dilinden türetilmiştir: sıcak kum zemin, krem çizim kâğıdı, 1 px ince kontur, köşelerde mono büyük harf etiketler ("ŞEKİL 01 — BD 0-4-0", "AÇIKLAYICI ÇİZİM · ÖLÇEKSİZ"), keskin köşeler, kırmızı tekerlek ve **işaret sarısı** vurgu. Arayüz bir teknik dosya gibi okunur; büyük slogan, yuvarlak kart, gölge ve ikon kalabalığı kullanılmaz. Çizim (Anatomy SVG veya gerçek CAD 3MF) her sayfada ilk ve en büyük nesnedir.

Revizyon geçmişi (kullanıcı kararları): turuncu afiş reddedildi → açık mavi-gri atölye onaylandı → "her şey çok büyük, çok ikon" geri bildirimiyle plaka diline geçildi → 5 Kasım 2026'da "maviye değil sarıya çalan bir renk" istendi; palet sıcak kum/krem + işaret sarısına çevrildi. Logo: Lucide `train-track`, ad **Tren**.

## Colors

- `ground #efe6c8` sayfa zemini; `plate #faf5e4` bütün çizim ve veri plakaları (Anatomy light kâğıdıyla aynı).
- `ink #2b2616` sıcak koyu mürekkep: metin, kontur, etkin segment (üstünde sarı yazı).
- `mid #6e6448` mono etiketler; `muted #665c40` ikincil metin (plate üzerinde ≥4.5:1).
- `hair #d6caa3` plaka konturu; `line-soft #e4dabb` satır aralıkları; `hair-strong #b0a37a` kâğıt buton kenarı.
- `signal #e9b824` işaret sarısı: birincil buton dolgusu (ink yazı, ink kenar), logo zemini, etkin menü alt çizgisi, kuplör kafası, "besler" rol etiketi. Metin rengi olarak kullanılmaz.
- `link-hover #9a6a06` bağlantı hover ve odak halkası (sarı metin kontrastı yetmediği için koyu altın).
- `red #b3262a` tekerlek, tampon kirişi, adım numaraları, BAT+ işareti.
- Prototip/uyarı: `proto-*` krem/okra üçlüsü. Işık açık hâli: pencereler `#ffd779`, hale `#ffd25a` → şeffaf.

## Typography

İki aile, ikisi de self-hosted: **Libre Franklin Variable** (başlık ve gövde) ve **JetBrains Mono Variable** (etiket, ölçü, adet, dosya türü). Mono etiketler 10.5 px, büyük harf, `0.08em` aralık; Anatomy köşe yazılarının karşılığıdır. Ölçüler (`300 × 95`, `4×`, `0,4 m/s`) her zaman mono ve tabular. Başlıklar 600 ağırlık; sayfa başlığı en çok 2.75 rem. Gövde 14 px, yardımcı metin 13 px, mono etiketin altına inilmez.

## Layout

- **Üst bar** 48 px, yapışkan: sarı kare içinde Lucide `train-track` logosu + "Tren" + "45 mm" etiketi, numaralı metin menü (`01 Atölye … 05 Hat tasarla`, ikon yok), sağda arama ve GitHub. Etkin öğe 3 px sarı alt çizgi ve koyu altın numara. 1080 px altında GitHub ve ölçü etiketi, 860 px altında arama gizlenir; 680 px altında menü işaretin altında yatay kaydırılan ikinci satıra iner.
- **Atölye:** başlık satırı (etiket + başlık, açıklama, iki buton) → çalışma tezgâhı: büyük çizim plakası + 280 px parça listesi plakası → 3 sütun model kataloğu → 4 adımlı montaj şeridi → elektrik notu. 1180 px altında parça listesi çizimin altına, 900 px'de katalog 2, 680 px'de 1 sütun.
- **Model detayı:** çizim/3D/Anatomy plakası + 290 px künye plakası; altta parça listesi ve notlar.
- **Hat tasarlayıcı:** 3D sahne + 320 px panel, yükseklik `100svh − 48px`; 950 px altında üst üste.
- Boşluk: plakalar arası 16 px, bölümler arası 44 px.

## Elevation & Depth

Gölge yok. Derinlik yalnız `box-shadow: 0 0 0 1px` kontur ile verilir; hover'da kontur `hair` → `ink` olur. Üst bar %92 opak zemin + 8 px bulanıklık. 3D görüntüleyicide yalnız zemine düşen hafif `ShadowMaterial` (opaklık 0.14) kullanılır.

## Shapes

Bütün köşeler 0. Pill, segment, buton, input, tablo dahil. Daire yalnız çizimlerin içinde.

## Components

- **Plaka (`.plate`)** ve **köşe etiketi (`.corner[data-at=tl|tr|bl|br]`)**: her çizim, liste ve künye bir plakadır. Sol üst: şekil numarası ve ad; sağ üst: kontrol veya durum; alt köşeler: ölçü ve doğruluk notu.
- **Segment (`.seg`)**: mono büyük harf sekmeler, 1 px bölücü, etkin öğe ink dolgu. Görünüm, filtre, 3D renk kipi ve sahne kontrolleri hep bu bileşen.
- **Buton**: birincil sarı dolgu + ink kenar ve yazı (hover açık sarı), ink varyantı koyu dolgu, kâğıt şeffaf + `hair-strong` kontur. 34 px.
- **Ok bağlantı (`.arrow-link`)**: metin + mono "→" (ekran okuyucudan gizli), hover'da ok 3 px kayar.
- **Numaralı liste**: `01` mono numara, küçük çizim, ad, mono adet; satırlar `line-soft` ile ayrılır. Çizimi olmayan parça için izometrik kutu taslağı.
- **Not şeridi**: kontur + 2 px sol renk çizgisi (elektrik kırmızı, uyarı okra) ve mono etiket.
- **Işık anahtarı**: araç çizimlerinin `-lit.svg` kopyası; pencere, lamba, LED ve hale yanar. Köşe etiketi "Işık: … · temsili" der.
- **TrenBus rol etiketi**: `besler` sarı, `tüketir` kontur, `ayrı devre` beyaz; mono büyük harf.
- **3D görüntüleyici**: gerçek `*_montaj.3mf`; varsayılan "Atölye" kipi gövdeleri krem, tekerlekleri kırmızı, kenarları ink çizgiyle çizer; "Baskı renkleri" CAD'deki renkleri gösterir. Hat tasarlayıcı aynı dosyaları ve aynı kipi kullanır.
- Odak: 1.5 px koyu altın (`link-hover`) dış çizgi, 3 px boşluk.

## Do's and Don'ts

- Do: önce çizimi göster; her plakaya şekil numarası ve doğruluk notu koy ("açıklayıcı çizim", "temsili", "baskı testi bekliyor").
- Do: ölçü, adet ve dosya türünü mono yaz.
- Don't: ikonlu kalın sol menü, yuvarlak kart, renkli gölge, büyük afiş başlığı geri getirme.
- Don't: soğuk mavi-gri tonlara dönme; sarıyı metin rengi yapma; kırmızıyı geniş dolgu olarak kullanma (tekerlek ve kiriş hariç).
- Don't: kutu/tahmini geometriyle araç gösterme; 3D'de yalnız CAD'den dışa aktarılan montajlar.
