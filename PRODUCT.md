# Tren

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Kullanıcının seçimi: Svelte 5 (SvelteKit değil), TypeScript, Tailwind, pnpm, svelte-spa-router ve GitHub Pages. Three.js 3D inceleme ve hat tasarımında, Anatomy etkileşimli teknik figürlerde kullanılır.

## Users

Kendi model demiryolunu üretmek isteyen kullanıcılar: lokomotif ve vagonları inceler, dosyaları indirir, hat kurar ve gereken basılı/satın alınacak parçaları hesaplar. Kullanıcı ilk prototipi şu an basamıyor; dijital tasarım ve inceleme devam edecek.

## Product Purpose

Tek bir trenin tanıtımından ziyade zamanla birçok lokomotif, vagon ve ray modülünü barındıran açık kaynak model kütüphanesi ve atölye. Başarı: gerçek model, montaj ve dosyaların bulunabilirliği; tasarlanan hattın parça listesiyle ilişkilendirilmesi.

## Capabilities and Constraints

- 45 mm açıklıklı tamamen plastik ray, bataryalı 0-4-0 lokomotif; raylardan elektrik alınmaz.
- 200 mm düz ray, R750 / 15° viraj; parametrik SolidCraft CAD, STL/3MF/STEP.
- Lokomotif, tender, ortak 250 vagon şasisi (çeki kolu dahil) ve Şarj 250 (döner kol + istasyon tutucusu) CAD prototipleri mevcut; diğer 250 vagon gövdeleri sırada. Fiziksel baskı ve çalışma doğrulaması yok.
- Statik site: dosya indirme, yerel model inceleme, tarayıcıda hat tasarımı. Hesap, ödeme veya bulut kayıt servisi yok.
- Vagonlar arası aksesuar elektriği ve aydınlatma planlanıyor; mekanik kablo geçişi hazırlanıyor. Aksesuar gerilimi, konektör ve akım sınırı henüz seçilmedi.
- Şarj istasyonunun mekaniği (döner kollar, lama tutucusu) CAD'de; elektronik kontrol, şarj devresi ve emniyet davranışları plan aşamasında, çalışan donanım gibi sunulmaz.

## Brand Commitments

Kullanıcı önceki turuncu afiş/uzun tanıtım sayfasını reddetti. 4 Kasım 2026'da açık mavi-gri atölye, solda dar menü, büyük Anatomy figürü, sağda parça listesi ve model kataloğu yönünü açıkça onayladı. Paylaştığı Nexblok referansı yerleşim ve yoğunluk için; LEGO markası/ürünleri kopyalanmaz. Anatomy figürleri korunur ve görsel dilin merkezindedir.

## Evidence on Hand

`cad/parts.json`, gerçek CAD çıktıları ve ölçümler; `site/figures/` içinde üç etkileşimli Anatomy figürü. `cad/renders/` içinde gerçek model renderları. Test edilmemiş prototipleri üretime hazır veya güvenli çalışan sistem diye sunmamak gerekir.

## Product Principles

1. Önce model ve montaj, sonra tanıtım metni.
2. Sayılar CAD'den; doğrulanmayan özellikler açıkça prototip/plan.
3. Çoklu model kataloğu ve ortak parça standardı büyümeye hazır olmalı.
4. Çeki kolu yük taşır; elektrik ara kablosu ayrı servis payıyla yönlendirilir.

## Revizyon · 5 Kasım 2026

- Ad **Tren** (repo adı), logo Lucide `train-track`; site, README ve favicon'da aynı.
- Palet maviden sıcak kum/krem + işaret sarısına çevrildi (kullanıcı isteği).
- Standart vagon 250 × 90 mm; altı vagon tipi (yolcu, enerji, radar, şarj, ses, gözlem). Hepsi T45 otomatik kuplör ve TrenBus (BAT+, CAN-H, CAN-L, GND) kullanır: `docs/standart.md`. Önceki "2-pin aksesuar hattı" bunun yerine geçti.
- Yeni vagonların çizimleri hazır; CAD dosyaları üretilene kadar "CAD sırada" olarak işaretlenir ve indirme/3D sunulmaz.

## Revizyon · 6 Kasım 2026

- Şarj 250 yan cebinden kapı gibi açılan üst (+) / alt (−) iki kolla istasyondaki iki pirinç lamaya basar (kullanıcı fikri); kapalıyken kollar gövdeden taşmaz. Alt pabuçlar ve çatı kolu kaldırıldı.
- Hat tasarlayıcısında araçlar gerçek pivotlarına oturur ve çeki kolu ölçüsüyle dizilir; gövdesi gelmeyen 250 vagonlar gerçek ortak şasi üstünde ölçülü taslak gövdeyle gösterilir ve "Gövde sırada" işaretlenir.
- Vagonlar arası T45 otomatik kuplörü bırakıldı (kullanıcı: "fazla küçükçe"); araçlar tek parça çeki koluyla, TrenBus 4 pinli ara kabloyla bağlanır.
