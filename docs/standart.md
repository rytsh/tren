# Tren ortak standardı (T45)

Bütün lokomotif ve vagonların uyması gereken ölçü, kuplör ve hat (bus) standardı. **Durum: tasarım önerisi.** Hiçbir parça basılmadı; kuplör tutuşu, temas direnci, akım ve veri hattı fiziksel olarak denenmedi. Varsayımlar `cad/params.json` içinde parametredir ve test sonrası değişebilir.

## 1. Ölçü

| | Değer | Not |
|---|---|---|
| Ray açıklığı | 45 mm | değişmez |
| Standart vagon şasisi | **250 × 90 mm** | eski 220 mm yolcu vagonunun yerine; 256 mm tablaya düz sığar |
| Gövde | ≤ 236 × 86 mm | çatı ayrı baskı |
| Boji merkezleri | ±75 mm (150 mm aralık) | boji aks aralığı 48 mm; uç tekerlek x = 122,5 mm, kiriş yüzü 125 mm |
| Kuplör yüzleri arası | şasi + 2 × kuplör çıkıntısı (CAD'de ölçülür, hedef ≈ 290 mm) | |
| Gövde yüksekliği | ≤ 135 mm ray üstü (çatı dahil), donanım (radar vb.) ≤ 160 mm | lokomotif bacası 155 mm |

R750'de 150 mm boji aralığı: gövde ortası yaklaşık 3,8 mm içe, uçlar yaklaşık 6,7 mm dışa kayar (s²/8R). Kuplör bunu salınımla karşılar; yan tamponlar yalnız görseldir ve virajda birbirine değmeyecek kadar geride durur.

## 2. Kuplör: T45 otomatik kuplör

Scharfenberg tipi otomatik kuplörlerden esinlenir: mekanik bağlantı, hizalama ve elektrik/veri temasları tek kafada.

- **Cinsiyetsiz kafa.** Her kafanın yüzünde bir **koni** (sağda) ve bir **huni** (solda) vardır. İki araç karşılaştığında birinin konisi diğerinin hunisine girer; hangi araç hangi yöne bakarsa baksın eşleşir.
- **Tutma.** Koni ve huninin arkasındaki iki Ø10 × 3 mm neodim mıknatıs (konide N, hunide S yüzü dışa) birleşmeyi otomatik yapar ve temaslara baskı verir. Ağır tren veya eğim için iki kafanın üst üste gelen deliklerinden **Ø3 mm kilit pimi** düşürülür; çekme kuvvetini o zaman pim taşır.
- **Salınım.** Kafa, kiriş yüzünün ~35 mm içindeki bir pivotta dönen bir kola bağlıdır: yatayda ±12°, düşeyde küçük boşluk. Yaylı veya esnek geri merkezleme önerilir.
- **Temaslar.** Kafanın alt yarısında yan yana iki adet **4 pinli mıknatıslı pogo konektör** (2,54 mm aralık, ticari modül; ölçüler varsayım): sağda erkek (yaylı pinler), solda dişi (düz pedler). Karşı araçta tersi gelir, böylece her sinyal **iki paralel temasla** geçer (yedekli).
- **Kablo kuvvet taşımaz.** Konektör modülü kafaya, kablo kafanın arkasında gerilim alıcıya bağlanır.

Pin sırası (yüzden bakınca yukarıdan aşağı, iki modülde aynı):

| Pin | Hat | Açıklama |
|---|---|---|
| 1 | **BAT+** | tren besleme hattı, 2S pil gerilimi 6,0–8,4 V, sigortalı |
| 2 | **CAN-H** | veri hattı |
| 3 | **CAN-L** | veri hattı |
| 4 | **GND** | ortak toprak |

## 3. TrenBus: güç + veri

- **Güç.** BAT+ hattı lokomotif ve **enerji vagonlarındaki** paketlerden beslenir. Her besleyici hatta ideal diyot ve akım sınırı (öneri 2 A) ile bağlanır; her tüketici araç girişinde PTC/eFuse (öneri 1 A) ve kendi düşürücü regülatörü (5 V / 3,3 V) vardır. Hiçbir modül BAT+ hattını doğrudan 5 V sanmaz.
- **Veri.** CAN 2.0, öneri 125 kbit/s. Her araçta küçük bir **araç düğümü**: mikrodenetleyici (ör. ESP32-C3) + 3,3 V CAN alıcı-verici (ör. SN65HVD230). Sonlandırma: lokomotifte sabit 120 Ω, son araçta arka kuplör boşsa düğümün açtığı 120 Ω (öneri, doğrulanmadı).
- **Mesajlar (öneri).** Lokomotif periyodik `durum` (hız, yön, pil) yayınlar; araçlar `kalp atışı` ve kendi telemetrisini gönderir; lokomotif `komut` ile ışık, ses, radar gibi işlevleri açar. Araç sırası kalp atışlarından çıkarılır.
- **Şarj ayrı.** İstasyon şarj kontakları bu kuplör temaslarından ayrı bir devredir; şarj akımı kuplör pinlerinden geçirilmez, şarj vagonu yalnız kendi paketini ve kendi döner kollarını kullanır (§5).

## 4. Araç ailesi (ilk set)

| id | Ad | Görev | Hat |
|---|---|---|---|
| `bd-040` | BD 0-4-0 lokomotif | çekiş, ana pil, CAN yöneticisi | BAT+ besler, CAN |
| `tender-160` | Tender 160 | kömürlük görünümünde ana pil | BAT+ besler |
| `yolcu-250` | Yolcu 250 | iç aydınlatma, pencere ışıkları | tüketir, CAN |
| `enerji-250` | Enerji vagonu | ek 2S paket + BMS, gerilim göstergesi | BAT+ besler, CAN |
| `radar-250` | Radar vagonu | dönen anten tablası, mesafe sensörü | tüketir, CAN |
| `sarj-250` | Şarj vagonu | döner şarj kolları, şarj durumu ışık çubuğu | kendi devresi, CAN |
| `ses-250` | Ses vagonu | hoparlör, düdük ve anons | tüketir, CAN |
| `gozlem-250` | Gözlem vagonu | kamera kubbesi, gözlem pencereleri | tüketir, CAN |

Hepsi ortak 250 mm şasi, iki boji ve iki T45 kuplörü kullanır; yalnız gövde ve üst donanım değişir.

## 5. İstasyon şarjı: döner kollar

**Durum: tasarım önerisi.** Kol, pabuç, servo ve istasyon rayı ölçüleri varsayımdır; temas direnci ve akım denenmedi.

- **Vagon tarafı.** Şarj 250'nin yan gövdesinde 34 × 29 mm bir cep vardır. Cebin içinde dikey bir mil ve mile bağlı üst ve alt iki kol bulunur. Tek bir mikro servo (ör. MG90S) mili çeyrek tur döndürür, iki kol birlikte kapı gibi açılır. Kapalıyken kollar cebin içinde durur ve gövde yüzeyinden dışarı taşmaz.
- **Kol ucu.** Milden uca ≈ 26 mm. Uçta 1,5 mm yay stroku olan bir pirinç pabuç bulunur (yaprak yay veya pogo pimi). Pabuç, istasyon rayına servo kuvvetiyle değil yayla bastırır.
- **Kutup.** Üst kol **+**, alt kol **−**; araya düşey yalıtım payı ≥ 10 mm. Kol ucu, iki ray arasındaki boşluktan dar olmalıdır.
- **İstasyon tarafı.** Ray kenarındaki iki yalıtkan direk arasında üst üste iki pirinç (veya fosfor bronz) ray uzanır, boyları 90 mm'dir. Ray yüzleri vagon merkez çizgisinden ≈ 65,5 mm uzaktadır. Raylar uzun olduğu için vagonun ±40 mm kayık durması temasa engel olmaz.
- **Akış.** Mıknatıslar ve hall sensörüyle durulur, kollar açılır ve temas doğrulanana kadar raylar enerjisiz kalır. Şarj biter, kollar cebe döner. Vagon ancak kollar kapandıktan sonra kalkar (servo geri bildirimi veya cepte bir uç anahtarı, öneri).
- **Koruma.** Vagon girişinde ters kutup koruması ve sigorta bulunur, BMS 2S paketi korur.

## 6. Görsel dil

Site ve Anatomy figürleri aynı sıcak, sarıya çalan paleti kullanır: kum sarısı zemin, krem çizim kâğıdı, sıcak koyu mürekkep, kırmızı tekerlek, işaret sarısı vurgu. Logo: [Lucide `train-track`](https://lucide.dev/icons/train-track).

| Token | Renk |
|---|---|
| ground | `#efe6c8` |
| plate (kâğıt) | `#faf5e4` |
| ink | `#2b2616` |
| mid | `#6e6448` |
| hair | `#d6caa3` |
| signal (vurgu sarısı) | `#e9b824` |
| red (tekerlek) | `#b3262a` |
