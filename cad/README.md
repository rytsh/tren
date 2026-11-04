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
| `sasi_test_040` | 110 × 38 × 22 | 0-4-0 iç çerçeve, 70 mm dingil mesafesi, 4× 684ZZ |
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
