# Faz 1 CAD — Ray, tekerlek ve test şasisi

Tüm ölçüler `params.json` içinde. `build.py` bunları SolidCraft kullanıcı parametrelerine çevirir,
her parça için komut scripti (`scripts/*.json`) yazar ve `solidcraft-cli run` ile derler.

```bash
python3 cad/build.py                 # hepsi
python3 cad/build.py ray_duz_200     # tek parça
```

| Klasör | İçerik |
|---|---|
| `designs/*.sc` | Parametrik SolidCraft tasarımları (Parametreler tablosundan değiştirilebilir) |
| `out/step`, `out/stl`, `out/3mf` | Dışa aktarımlar (STL/3MF baskı yönünde) |
| `out/*.measure.json` | Hacim, kutu ölçüsü, kütle (SolidCraft ölçümü) |
| `renders/` | Görseller |

## Parçalar

| Dosya | Ölçü (mm) | Not |
|---|---|---|
| `ray_duz_200` | 214 × 66 × 13 | 200 mm modül + 7 mm kırlangıç dili, 2× M3 montaj deliği |
| `ray_viraj_r750_15` | 209 × 90 × 13 | R750, 15° (24 adet = tam daire) |
| `tekerlek_test_d42` | Ø47 × 7.5 | Arka yüz yatağa |
| `pul_aks_4mm` | Ø5.5 × 1 | Tekerlek–rulman arası (veya hazır M4 pul) |
| `sasi_test_040` | 130 × 38 × 22 | 0-4-0 iç çerçeve, 70 mm dingil mesafesi, 4× 684ZZ (`plate_len` = 130; eski çıktı 110 idi, Faz 3'te yeniden derlendi) |
| `tolerans_kuponu` | 82 × 34 × 6 | Aks delikleri Ø3.8–4.2, rulman yuvaları Ø9.0–9.3 |
| `montaj_kontrol` | — | Yalnız kontrol amaçlı (baskı yok) |

Hepsi X2D'nin 256 × 256 × 260 mm hacmine sığıyor.

## Önerilen ray/tekerlek standardı (varsayım, test edilecek)

| | Değer |
|---|---|
| Ray açıklığı G | 45.0 |
| Ray başı | 5.0 geniş, 8.0 yüksek (travers üstünden), 0.6 pah |
| Tekerlek arka yüzleri arası B | 40.0 |
| Flanş | 2.5 yükseklik, 1.8 kalınlık |
| Yuvarlanma yüzeyi | Ø42, 1:20 konik |
| Yanal boşluk | G − B − 2·flanş = 1.4 |
| Rijit dingil (70 mm) R750'de sehim | 70²/(8·750) ≈ 0.8 (< 1.4: sığıyor) |
| Ek yeri boşluğu | 0.5 (her uçta 0.25), ray uçlarında 0.4 pah |
| Kırlangıç | 6 → 9 genişlik, 7 boy, 0.2 boşluk; her uçta bir dil + bir yuva (modül iki yönlü takılır) |

İleride makas yapılacağı için çekme payı (flange-way) en az 2.5 mm olmalı: G − B = 5 mm bunu karşılıyor.

## PETG baskı ayarları (başlangıç)

| Parça | Ayar |
|---|---|
| Genel | 0.4 nozul, 0.2 katman, 250 °C nozul / 70–80 °C tabla, Textured PEI, fan %30–50 |
| Raylar | Traversler yatakta, destek yok, 3 duvar, %20 gyroid; ray başının düzgünlüğü için üst yüzde ironing kapalı |
| Tekerlek | Arka yüz yatakta, 4 duvar, %40 dolgu, delik için "precise wall" açık; flanş üst kenarı 45°'den dik değil, destek gerekmez |
| Şasi | Yan levha yatakta (STL bu yönde), 4 duvar, %30 dolgu; rulman yuvaları dikey eksenli olur (daha yuvarlak) |
| Kupon | Önce bunu bas; deliklerin hangisi uyuyorsa `wheel_bore` ve `bearing_clear` değerlerini güncelle, sonra yeniden derle |

## Test prosedürü

1. **Kupon:** 4 mm çelik aks hangi delikte sıkı (tekerlek) ve hangi delikte serbest dönüyor; 684ZZ hangi yuvaya elle bastırılıyor. Değerleri `params.json`'a yaz.
2. **Ray ölçümü:** Kumpasla ray açıklığını 3 noktada ölç (hedef 45.0 ± 0.2). Çarpılma için düz zeminde kontrol et.
3. **Bağlantı:** 3 düz modülü birleştir; ek yerinde basamak (< 0.2 mm) ve boşluk kontrolü. 10 kez sök-tak.
4. **Tekerlek:** Ø, B ölçüsü (40.0 ± 0.2) ve flanş kalınlığı. Aksın tekerlekte kaymadığını kontrol et (gerekirse CA yapıştırıcı veya set vida).
5. **Yuvarlanma:** Şasiyi düz rayda elle it; takılma, zıplama, flanşın ray başına binmesi olmamalı. 2–3° eğimde kendiliğinden yuvarlanıyor mu bak.
6. **Viraj:** 2+ viraj modülüyle S ve düz–viraj geçişlerinde aynı test. Flanşın ray iç kenarına sürtme sesi ve sıkışma kontrolü.
7. **Dış mekân (PETG):** Bir modülü güneşte 1 hafta bırak, çarpılma ve açıklık değişimini ölç.

## Bilinen eksikler / doğrulanmamışlar

- Fiziksel baskı yapılmadı; tüm toleranslar tahmini.
- Viraj modülünde geçiş eğrisi (easement) ve dever yok.
- Rulmanlar şasi levhasında; tekerlek aksa sabit, aks rulmanda dönüyor. Motor yuvası ve dişli henüz yok (Faz 2).
- Montaj kontrolü yalnız düz rayda yapıldı; virajda tekerlek–ray çakışma kontrolü yapılmadı (hesapla doğrulandı).
- Uç traversler kırlangıç bölgesinde 5 mm kalınlıkta; bahçede ağır yük altında dil kırılabilir, testten sonra kalınlaştırılabilir.

---

# Faz 2 — Motorlu şasi (sonsuz vida)

Seçilen düzen: **boyuna 370 motor + tek ağızlı sonsuz vida, 30:1**, ön aksta.
Sonsuz vida kendinden kilitli (tan λ = 0.1 < PETG sürtünmesi ~0.2): motor dururken tren eğimde ve şarj istasyonunda kaymaz.

| Dosya | Açıklama |
|---|---|
| `sasi_motorlu_040` | Test şasisi + motor perdesi (2× M2.5), yan duvarlar, arka yatak. 130 × 38 × 44 |
| `sonsuz_vida_m1` | m1, Ø10 bölüm, 16.5 boy, Ø2.2 mil deliği. **İki gövde** (göbek + helis): SolidCraft 0.18.3'te birleştirme >10 dk sürdüğü için ayrı bırakıldı; Bambu Studio baskıda birleştirir |
| `karsi_disli_m1_z30` | m1 z30 düz involüt dişli (Ø32), Ø3.9 aks deliği + M3 set vidası |
| `montaj_motorlu` | Ray + şasi + tekerlekler + motor yer tutucu, kontrol amaçlı |

Hesaplar (varsayım):
- Eksen mesafesi (10+30)/2 + 0.15 = 20.15 mm; diş tepesi–karşı kök boşluğu 0.4 mm.
- 370 motor ~5000–7000 rpm (7.4 V) → aks 167–233 rpm → 0.37–0.51 m/s (2.6 kg tren için ~0.3 W, motor için çok rahat). Hız PWM ile düşürülecek.
- Kurşun açısı 5.7°: karşı dişli düz basıldı, dişli genişliği boyunca ~0.24 mm sapma geri boşlukla karşılanıyor. Aşınma görülürse helisel dişliye geçilmeli.

Doğrulanan (SolidCraft `inspect.clearance`): tekerlek–ray 0.05, tekerlek–şasi 1.0, sonsuz vida göbeği–şasi 1.5, karşı dişli–şasi 2.5, karşı dişli–motor 2.5 mm, çakışma yok.
Beklenen temaslar: motor mili vida deliğinde (sıkı geçme), karşı dişli aksta (sıkı geçme), motor şasi yatağında.

**Doğrulanmamış:** helis dişi ile karşı dişlinin kavraması (helisli boşluk kontrolü 15 dk'da bitmedi). Hesapla 0.4 mm radyal boşluk var; baskıdan sonra elle çevirerek kontrol et.

Ek parçalar (satın alınacak): RF-370 / RS-370 motor (Ø24.4 × 30.5, Ø2.3 mil — **ölçüleri kumpasla doğrula**, `params.json` → `drive`), 2× M2.5×6 vida, 1× M3×4 set vidası.

---

# Faz 3 — Lokomotif gövdesi, tender ve yolcu vagonu

Yeni parametre grupları `params.json` → `body`, `tender`, `coach`. Tüm gövde parçaları aracın kendi
çerçevesinde çizilir (x hat yönü, +x ön; y aks ekseni; z = 0 aks merkezi, ray üstü z = −21.0).
Lokomotifte bu çerçeve motorlu şasinin çerçevesiyle aynıdır.

![Lokomotif](renders/lokomotif_iso.png)

## Yerleşim (varsayımlar)

| | Değer (aks ekseninden; ray üstü için +21.0) |
|---|---|
| Lokomotif | 300 uzun (tampon başları), 95 geniş (platform), ray üstünden baca tepesi **155.0** |
| Platform (footplate) | alt yüzü z = 26, 3 mm kalın; tekerlek flanş tepesi 23.5 → **2.5 mm boşluk**, sıçrama siperine gerek yok |
| Kazan | Ø56, eksen z = 66, x = −71.7…95; duman kutusu Ø62, x = 95…128; 45° konik kapak + Ø14 fener |
| Kazan içi | 2.4 mm et, altı ve arkası açık; 46 mm genişlikte etek platforma oturur. Motor, ESP32, sürücü kazan içinde |
| Kabin | x = −142…−72, 86 geniş, yan duvar 117, çatı yayı tepesi 127 (R 97.45); 2 ön yuvarlak pencere, yan pencereler, arka açıklık 60×55 |
| Şasiye bağlantı | ön platformdaki iki Ø10 dikme şasi traverslerine (x = ±60, y = 0) oturur; üstten **M3×25** (dikme 14 + platform 3 + traversa ~8) `DeckHoleF/B`'ye vidalanır |
| Tamponlar / kanca | 2× tampon y = ±30, z = 18 (raydan 39); ön kirişte kanca bloğu, arkada çeki çatalı |
| Çeki kolu | 44 mm pim aralığı, araç kirişleri arası 28 mm. Pim = alttan M3×25 vida (çatal alt çenesinde geçiş, üstte kılavuz) |
| Tender | 144 kiriş arası + 2×8 tampon = **160**, 90 geniş, depo üstü raydan 113; motorsuz 0-4-0 şasi (70 mm dingil) |
| Vagon | 220 (tampon başları) × 90, kasa 196 uzun, çatı tepesi raydan 131 (+çatı 2.4); 2 boji, pivot ±50, boji dingili 48 |

**Pil varsayımı:** 2S Li-ion (2× 18650 yan yana) ≈ 70 × 37 × 20 mm + BMS. Tender deposunun iç hacmi
≈ 135 × 81 × 58 mm; kömür kapağı açıklığı 64 × 72 mm, pil bu açıklıktan dikine sığar. Kablo depo ön
yüzündeki Ø8 delikten lokomotif kabin ön duvarındaki 40 × 50 geçişe gider (kazanın arkasında görünmez).

## Parçalar (Faz 3)

| Dosya | Ölçü (mm, tasarım yönü) | Baskı yönü (STL/3MF) | Not |
|---|---|---|---|
| `lok_platform_on` | 234 × 95 × 23.5 | Ters (üst yüz yatakta) | Ön tampon kirişi + 2 tampon + kanca, silindirler, 2 şasi dikmesi, motor açıklığı 96 × 40 |
| `lok_platform_arka` | 66 × 95 × 19 | Ters | Kabin tabanı, arka kiriş + tamponlar, çeki çatalı |
| `lok_kazan` | 219 × 64 × 69 | **Dik, arka ucu yatakta** (219 yükseklik < 260) | Kazan + duman kutusu + kapak + fener (Ø5 LED kanalı Ø6, Ø10×2 lens yuvası); destek gerekmez (kapak 45°) |
| `lok_kabin` | 70 × 86 × 98 | Alt yüzü yatakta | Çatısız; pencereler köprü/yuvarlak, destek önerilir yalnız yan pencere üst kenarına (32 mm köprü) |
| `lok_kabin_cati` | 74 × 90 × 17 | Ucu yatakta | 2 yerleştirme dili duvarların içine iner |
| `lok_baca` | Ø27 × 41 | Tepesi yatakta | Altında Ø11 pim; kazandaki deliğe yapıştırılır |
| `lok_buhar_domu` / `lok_kum_domu` / `lok_emniyet_ventili` | Ø28×17 / Ø22×14 / Ø18×23 | Tepesi yatakta | Pirinç renk (dom, ventil) önerilir |
| `ceki_kolu` | 54 × 10 × 5.5 | Düz | Her bağlantıya 1 |
| `tender_sasi` | 104 × 38 × 22 | Yan levha yatakta | Motorsuz; travers delikleri M3 geçiş |
| `tender_platform` | 160 × 90 × 19 | Ters | İki uçta tampon + çeki çatalı |
| `tender_depo` | 140 × 86 × 63 | Ters | İçi boş, kömür/pil açıklığı |
| `tender_kapak` | 68 × 76 × 13.5 | Alt yüzü yatakta | Kömür yığını + yerleştirme tapası |
| `vagon_boji` | 64 × 38 × 22 | Yan levha yatakta | Vagon başına 2 |
| `vagon_platform` | 220 × 90 × 18 | Ters | Boji pivot dikmeleri (M3 kılavuz) |
| `vagon_govde` | 196 × 90 × 81 | Alt yüzü yatakta | 6×2 pencere, iki alında kapı açıklığı |
| `vagon_cati` | 200 × 94 × 17 | Ucu yatakta (200 yükseklik) | |
| `lokomotif_montaj`, `tender_montaj`, `vagon_montaj` | — | Baskı yok | Kontrol montajları (renkli) |

Tüm STL'ler baskı yönünde, yatağa (z = 0) oturtulmuş ve XY'de ortalanmış olarak dışa aktarılır
(`build.py` → `bed_drop`). En büyük parça `lok_platform_on` 234 × 95 × 23.5 — X2D'ye sığıyor.

Malzeme listesi ve tüm parçaların makinece okunur dökümü: **`parts.json`** (`python3 cad/parts_manifest.py`
ile `out/*.measure.json`'dan yeniden üretilir).

## Baskı ayarları (PETG, başlangıç)

| Parça | Ayar |
|---|---|
| Kabuklar (kazan, kabin, depo, kasa) | 0.2 katman, 3 duvar (2.4 mm et = 5–6 çizgi, dolgu yok gibi), %15 dolgu; kazan dik basılırken brim 5 mm |
| Platformlar | Ters basılır (üst yüz yatakta, düz ve pürüzsüz); 4 duvar, %25 gyroid. Tamponlar ve kanca alt yüzde köprü yapar, destek yok |
| Dom, baca, ventil | Tepesi yatakta; 0.12 katman daha güzel görünür. Taban semeri havada kalır → "support on build plate only" yeterli |
| Çatılar | Ucu yatakta, brim 5 mm (ince ve uzun) |
| Renk | Siyah PETG gövde; kırmızı tekerlek; tampon kirişi kırmızıya boyanabilir (montajda kırmızı gösterildi); dom/ventil pirinç renkli PETG |

## Montaj sırası

1. Motorlu şasiyi (Faz 2) tekerlek, aks ve motorla birleştir.
2. `lok_platform_on` ile `lok_platform_arka`'yı alt flanşlarından **2× M3×10 cıvata + somun** ile birleştir (x = −84).
3. Platformu şasinin üstüne oturt; dikmeler traverslere gelir. Üstten **2× M3×25** ile `DeckHoleF/B`'ye vidala
   (kazan takılmadan önce). Gövdeyi sökmek için önce kazan (alttan 4 vida; x = 70 / −68 şasi levhalarının dışında, alttan erişilir) çıkarılır.
4. Fener: 5 mm LED'i kazanın içinden kanala it, önüne Ø10 lens. ESP32, sürücü, buck dönüştürücü kazan içine (çift taraflı bant).
5. Kazanı platforma oturt, alttan **4× M3×8** ile (x = 70 ve −68, y = ±18.1) iç kaburgalara vidala.
6. Kabini oturt, alttan **4× M3×8** (x = −77.4 ve −134, y = ±37.6). Çatıyı tak (sıkı geçme; gerekirse bir damla yapıştırıcı).
7. Baca, domlar ve ventili pimlerinden kazandaki deliklere yapıştır (kum domu yapıştırılmazsa ön şasi vidasına erişim kalır).
8. Tender: şasi → platform (alttan 2× M3×20, x = ±45), depo (4× M3×8), kapak (tapa ile oturur). Pil kapağın altına.
9. Çeki kolu: lokomotif arka çatalı ile tender ön çatalı arasına koy, alttan M3×25 pimleri tak.
10. Vagon: bojiler platform pivotlarına alttan **M3×20** (boji serbest dönecek kadar gevşek; kontra somun veya bir damla vida sabitleyici), kasa 4× M3×8, çatı.

## Doğrulananlar (SolidCraft 0.18.3, gerçekten ölçülen)

- Her parça tek gövde, `shells = 1`, kapalı (sonsuz vida hariç, Faz 2'deki gibi 2 gövde). Kutu ölçüleri yukarıdaki tabloda; hepsi 256 × 256 × 260'a sığıyor (`parts.json` → `fits_x2d`).
- Lokomotif gövdesi montajda: **300.0 × 95.0**, ray üstünden en yüksek nokta **155.0** (baca), gövdenin en alt noktası raydan 26.5 (tampon kirişi).
- `inspect.clearance` (`lokomotif_montaj`): gövde parçaları (9) ↔ şasi, motor, motor mili, karşı dişli, sonsuz vida, 4 tekerlek, 2 aks, 3 ray: **çakışma 0**, kontrol edilemeyen çift 0. Gövde parçalarının birbirleriyle çakışması: 0.
  En yakın mesafeler: platform–şasi 0 (vida dikmeleri traverslere oturuyor, amaçlı temas), kazan–şasi 1.6, platform–tekerlek 2.5, kazan–tekerlek 5.5, platform–sonsuz vida 3.45, platform–karşı dişli 7.4, platform–motor 8.6, kazan–motor 10.2, kabin–tekerlek 23.5.
- `inspect.clearance` (`tender_montaj`, tüm gövdeler): çakışma 0; şasi–tekerlek 1.0, tekerlek–ray 0.05, depo/kapak/platform yalnız temas (0).
- `inspect.clearance` (`vagon_montaj`, tüm gövdeler): çakışma 0; boji–tekerlek 1.0, tekerlek–ray 0.05. (İlk denemede boji dingil mesafesi 44 < flanş Ø47 olduğundan tekerlekler çakışıyordu → 48'e çıkarıldı.)
- Görseller kontrol edildi: `renders/lokomotif_iso.png`, `lokomotif_yan.png`, `lokomotif_on.png`, `tender_iso.png`, `vagon_iso.png`, `vagon_yan.png`.

## Doğrulanmayanlar / bilinen eksikler

- Fiziksel baskı yok; vida dikmesi, yerleştirme pimi (Ø11 / delik Ø11.3) ve çatı dili boşlukları tahmini.
- **Virajda kontrol yapılmadı:** tampon/çeki kolu payı ve bojili vagonun R750'de dönüşü yalnız hesapla (28 mm kiriş arası, 44 mm çeki kolu). Boji dönüşünde boji tekerleğinin vagon platformu eteğine yaklaşması kontrol edilmedi.
- Çeki kolunun çatal yarığındaki yanal dönüşü (yarık 22 geniş, kol 10) ölçülmedi.
- Sallanan biyel/kol (connecting rod) yok — sonraki faz. Silindirler yalnız görsel.
- Emniyet ventili x = −46'da: −50…−60 aralığında SolidCraft kazan kabuğuna delik açamadı ("boolean Cut: no result"), bu yüzden kaydırıldı.
- Kömür kapağı (`tender_kapak`) STL'i yalnız 44 üçgen (yalnız düz yüzler, normal); kömür yığını sade bir kesik piramit.
- Gövde içi ESP32/sürücü/buck yerleşimi modellenmedi; kazan iç kesiti ≈ 51 mm çap, motor açıklığının önünde ~60 mm, arkasında ~20 mm boş uzunluk var (ölçülmedi, tahmin).
- Tamponlar sabit (yaysız).

## Satın alma listesine eklenenler (lokomotif başına; tam liste `parts.json` → `hardware`)

| Kalem | Adet |
|---|---|
| M3×25 vida (gövde → şasi) | 2 |
| M3×8 vida (kazan 4, kabin 4) | 8 |
| M3×10 cıvata + somun (platform birleşimi) | 2 |
| M3×25 vida (çeki pimi) | 1 loko + 2 tender + 2 vagon |
| M3×20 vida (tender platform→şasi, vagon boji pivotu) | 2 tender + 2 vagon |
| 5 mm sıcak beyaz LED + 220 Ω | 1 |
| Ø10 × 2 lens (isteğe bağlı) | 1 |
| 2S Li-ion 2×18650 paket (~70×37×20) + 2S BMS | 1 (tenderde) |
| ESP32 kartı, DRV8833/TB6612, 7.4→5 V buck, A3144 hall, açma/kapama anahtarı, JST-PH konnektör | 1'er |
