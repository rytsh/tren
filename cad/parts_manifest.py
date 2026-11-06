#!/usr/bin/env python3
"""parts.json üreteci: build.py'nin ürettiği tüm basılabilir parçaları ve satın alınacak
malzemeleri listeler. Ölçü ve hacimler out/<parça>.measure.json dosyalarından okunur
(baskı yönündeki değil, tasarım yönündeki kutu ölçüsü).

Kullanım:  python3 cad/parts_manifest.py      (önce build.py ile parçaları derleyin)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PETG_DENSITY = 1.27   # g/cm3

# id: (Türkçe ad, faz, loko, tender, vagon, düz ray, not)
PRINTED = {
    "ray_duz_200": ("Düz ray modülü 200 mm", 1, 0, 0, 0, 1, "Kırlangıç bağlantılı, 2× M3 bahçe montaj deliği"),
    "ray_viraj_r750_15": ("Viraj ray modülü R750 15°", 1, 0, 0, 0, 0, "24 adet tam daire"),
    "tekerlek_test_d42": ("Tekerlek Ø42 (flanş Ø47)", 1, 4, 4, 8, 0, "Arka yüz yatakta basılır; aksa sıkı geçme"),
    "pul_aks_4mm": ("Aks pulu 4 mm", 1, 4, 4, 8, 0, "Tekerlek-rulman arası; hazır M4 pul da olur"),
    "sasi_test_040": ("Test şasisi 0-4-0 (motorsuz)", 1, 0, 0, 0, 0, "Yalnız test; lokomotifte sasi_motorlu_040 kullanılır"),
    "tolerans_kuponu": ("Tolerans kuponu", 1, 0, 0, 0, 0, "Bir kez basılır (aks/rulman toleransı)"),
    "sasi_motorlu_040": ("Motorlu şasi 0-4-0", 2, 1, 0, 0, 0, "370 motor yatağı, 4× 684ZZ"),
    "sonsuz_vida_m1": ("Sonsuz vida m1", 2, 1, 0, 0, 0, "İki gövde (göbek+helis), dilimleyicide birleşir"),
    "karsi_disli_m1_z30": ("Karşı dişli m1 z30", 2, 1, 0, 0, 0, "Ön aksa sıkı geçme + M3 set vidası"),
    "lok_platform_on": ("Lokomotif ön platform (tampon kirişi, silindirler)", 3, 1, 0, 0, 0, "Ters (üstü yatakta) basılır; şasiye 2× M3"),
    "lok_platform_arka": ("Lokomotif arka platform (kabin tabanı, çeki çatalı)", 3, 1, 0, 0, 0, "Ters basılır; ön platforma 2× M3 cıvata+somun"),
    "lok_kazan": ("Kazan + duman kutusu + fener", 3, 1, 0, 0, 0, "Alt yüzü yatakta, içi boş (2.4 mm et)"),
    "lok_kabin": ("Kabin", 3, 1, 0, 0, 0, "Alt yüzü yatakta, çatısız"),
    "lok_kabin_cati": ("Kabin çatısı", 3, 1, 0, 0, 0, "Ön/arka ucu yatakta (yay kesit dik)"),
    "lok_baca": ("Baca", 3, 1, 0, 0, 0, "Tepesi yatakta"),
    "lok_buhar_domu": ("Buhar domu", 3, 1, 0, 0, 0, "Tepesi yatakta; pirinç renk"),
    "lok_kum_domu": ("Kum domu", 3, 1, 0, 0, 0, "Tepesi yatakta; ön şasi vidasının üstünde"),
    "lok_emniyet_ventili": ("Emniyet ventili", 3, 1, 0, 0, 0, "Tepesi yatakta; pirinç renk"),
    "ceki_kolu": ("Çeki kolu 44 mm (lokomotif–tender)", 3, 1, 0, 0, 0, "Lokomotif arka çatalından tender ön çatalına; trende 1. Tender arkasına ceki_kolu_tender_250 gelir"),
    "tender_sasi": ("Tender şasisi (motorsuz 0-4-0)", 3, 0, 1, 0, 0, "Yan levha yatakta, 4× 684ZZ"),
    "tender_platform": ("Tender platformu", 3, 0, 1, 0, 0, "Ters basılır; iki uçta çeki çatalı"),
    "tender_depo": ("Tender su deposu (pil bölmesi)", 3, 0, 1, 0, 0, "Ters (üstü yatakta) basılır; ön/arka 4 pinli TrenBus yuvası (250 vagonlarla aynı, VARSAYIM), 3 iç kablo kelepçesi, Ø8 ana güç deliği"),
    "tender_kapak": ("Tender kömür kapağı", 3, 0, 1, 0, 0, "Alt yüzü yatakta; pil erişimi"),
    "vagon_boji": ("Vagon bojisi", 3, 0, 0, 2, 0, "Yan levha yatakta, 4× 684ZZ"),
    "vagon_platform": ("Yolcu 220 platformu (Faz 3 prototipi)", 3, 0, 0, 1, 0, "Ters basılır; iki uçta çeki çatalı. 250 vagon ailesinden önceki prototip"),
    "vagon_govde": ("Yolcu 220 kasası (Faz 3 prototipi)", 3, 0, 0, 1, 0, "Alt yüzü yatakta, çatısız; ön/arka 2-pin aksesuar konnektörü yuvası (VARSAYIM), 3 iç kablo kelepçesi, alın kapısı 68'e alçaltıldı"),
    "vagon_cati": ("Yolcu 220 çatısı (Faz 3 prototipi)", 3, 0, 0, 1, 0, "Ucu yatakta (200 mm yükseklik < 260); iç tepede 12 mm düz LED şerit yüzeyi, +y dilinde kablo çentiği"),
}

# Faz 4: 250 vagon ailesi ve Şarj 250. Adetler site catalog.ts model id'lerine göre (qty_by_model).
# Bütün 250 vagonlar ortak 250 şasiyi kullanır; gövdesi henüz modellenmemiş vagonlar yalnız şasi
# parçalarını alır. Faz 3'ün 220 mm yolcu vagonu (vagon_platform/govde/cati, çeki kolu) hiçbir
# katalog modeline sayılmaz: eski prototip olarak listede kalır.
CARS_250 = ("yolcu-250", "enerji-250", "radar-250", "sarj-250", "ses-250", "gozlem-250")
LEGACY_220 = {m: 0 for m in CARS_250}
PLAIN_250 = tuple(m for m in CARS_250 if m != "sarj-250")
BY_MODEL = {
    "tekerlek_test_d42": {m: 8 for m in CARS_250},
    "pul_aks_4mm": {m: 8 for m in CARS_250},
    "vagon_boji": {m: 2 for m in CARS_250},
    "vagon_platform_250": {m: 1 for m in PLAIN_250},
    "tampon_250": {m: 4 for m in CARS_250},
    # Her 250 vagon ön ucunda bir çeki kolu taşır (öndeki araca). Trendeki ilk 250 vagonun önü
    # tendere bağlanır: o vagona ceki_kolu_250 yerine ceki_kolu_tender_250 takılır (BOM'da
    # site tarafı düzeltir; burada vagon başına 1 kol sayılır).
    "ceki_kolu_250": {m: 1 for m in CARS_250},
    "sarj_platform": {"sarj-250": 1},
    "sarj_govde": {"sarj-250": 1},
    "sarj_cati": {"sarj-250": 1},
    "sarj_kol": {"sarj-250": 1},
    "vagon_platform": LEGACY_220,
    "vagon_govde": LEGACY_220,
    "vagon_cati": LEGACY_220,
    "ceki_kolu": {m: 0 for m in CARS_250},
}
PRINTED.update({
    "vagon_platform_250": ("250 vagon platformu (ortak şasi)", 4, 0, 0, 0, 0,
                           "Ters basılır; boji pivotları ±75, iki uçta çeki kolu pivot göbeği (M3) ve kiriş altı kol çentiği, TrenBus kablo geçişleri"),
    "tampon_250": ("250 vagon tamponu", 4, 0, 0, 0, 0, "Ucu yatakta; pimi kirişteki Ø5.3 deliğe yapıştırılır"),
    "ceki_kolu_250": ("250 vagon çeki kolu (116 mm pim aralığı)", 4, 0, 0, 0, 0,
                      "Düz yatakta; iki uç M3 pimle platform altındaki pivot göbeklerine. Vagon başına 1 (öndeki araca)"),
    "ceki_kolu_tender_250": ("Tender–250 çeki kolu (86 mm pim aralığı)", 4, 0, 0, 0, 0,
                             "Tenderin arka çeki çatalından ilk 250 vagonun ön pivotuna; trende 1"),
    "sarj_platform": ("Şarj 250 platformu", 4, 0, 0, 0, 0,
                      "Ters basılır; ortak 250 platformu + platform altında servo pedleri (2× M2) ve servo açıklığı"),
    "sarj_govde": ("Şarj 250 kasası", 4, 0, 0, 0, 0,
                   "Alt yüzü yatakta; +y yanında kol cebi (kol göbeği tavandaki yuvaya yandan girer), ışık çubuğu yarığı, iki alın duvarında 4 pinli TrenBus yuvası"),
    "sarj_cati": ("Şarj 250 çatısı", 4, 0, 0, 0, 0, "Ucu yatakta"),
    "sarj_kol": ("Şarj 250 döner kolu (üst + / alt −)", 4, 0, 0, 0, 0,
                 "Yan yatırılır; göbek içinden iki tel iner, uçlarda yaprak yay şerit yuvası, altta servo kolu yuvası"),
    "sarj_istasyon": ("Şarj istasyonu kontak tutucusu", 4, 0, 0, 0, 0,
                      "Arka yüzü yatakta; iki pirinç lama ön yüzdeki ceplere, uçları direk yarığına bükülür. İstasyon rayı başına 1"),
})

# id, ad, loko, tender, vagon, ray parçası, özellik
HARDWARE = [
    ("bearing_684zz", "684ZZ rulman", 4, 4, 8, 0, "4×9×4 mm"),
    ("axle_4mm", "Çelik aks Ø4 × 55 mm", 2, 2, 4, 0, "Gümüş çelik/paslanmaz, h6"),
    ("motor_370", "RF-370 / RS-370 DC motor", 1, 0, 0, 0, "Ø24.4 × 30.5, Ø2.3 mil; 2S besleme 7.4 V nominal / 8.4 V tam dolu (motor ölçüleri ve gerilim sınırı doğrulanmadı)"),
    ("screw_m25x6", "M2.5×6 vida", 2, 0, 0, 0, "Motor ön yüzü"),
    ("grub_m3x4", "M3×4 set vidası", 1, 0, 0, 0, "Karşı dişli göbeği"),
    ("screw_m3x25_body", "M3×25 vida (plastiğe)", 2, 0, 0, 0, "Lokomotif gövdesi → şasi traversleri (x=±60), üstten"),
    ("screw_m3x20", "M3×20 vida (plastiğe)", 0, 2, 2, 0, "Tender platform → şasi (alttan), vagon boji pivotu (alttan, gevşek)"),
    ("screw_m3x8", "M3×8 vida (plastiğe)", 8, 4, 4, 0, "Kazan 4, kabin 4 / depo 4 / kasa 4 (platform altından)"),
    ("screw_m3x10_nut", "M3×10 cıvata + M3 somun", 2, 0, 0, 0, "Ön-arka platform flanşı"),
    ("screw_m3x25", "M3×25 vida (çeki pimi)", 1, 2, 2, 0, "Çatal başına 1; çeki kolu bunun üstünde döner"),
    ("nut_m3_lock", "M3 kontra (nylon) somun", 0, 0, 2, 0, "Boji pivotu kilidi (isteğe bağlı; boji serbest dönmeli)"),
    ("screw_m3_track", "M3×16 vida + dübel", 0, 0, 0, 2, "Rayı bahçeye sabitleme (isteğe bağlı)"),
    ("led_5mm", "5 mm sıcak beyaz LED + 220 Ω direnç", 1, 0, 0, 0, "Ön fener"),
    ("lens_10mm", "Ø10 × 2 mm şeffaf lens/disk", 1, 0, 0, 0, "Fener camı (isteğe bağlı, şeffaf PETG baskı da olur)"),
    ("battery_2s", "2S Li-ion paket (2× 18650) VARSAYIM", 0, 1, 0, 0, "~70×37×20 mm, 7.4 V nominal / 8.4 V tam dolu, 2500-3500 mAh; tender deposuna"),
    ("bms_2s", "2S BMS kartı", 0, 1, 0, 0, "Koruma; ~40×7 mm"),
    ("charger_2s", "2S şarj modülü / USB-C PD tetik", 0, 1, 0, 0, "Şarj istasyonu için (Faz 4'te kesinleşecek)"),
    ("esp32", "ESP32 dev kartı (ör. ESP32-C3 SuperMini)", 1, 0, 0, 0, "Kazan içine"),
    ("motor_driver", "DRV8833 veya TB6612FNG sürücü", 1, 0, 0, 0, "Tek motor"),
    ("buck_logic", "DC-DC buck (lojik beslemesi)", 1, 0, 0, 0, "ESP32 için; çıkış gerilimi kartın girişine göre seçilecek (AÇIK KARAR). Giriş 8.4 V'a dayanmalı"),
    ("hall_a3144", "A3144 hall sensörü", 1, 0, 0, 0, "Konum/istasyon algılama"),
    ("magnet_6x3", "Neodim mıknatıs 6×3 mm", 0, 0, 0, 1, "Ray üstü işaret (istasyon/sayaç başına, varsayım)"),
    ("switch", "Mini anahtar (açma/kapama)", 0, 1, 0, 0, "Tender"),
    ("wire_main", "Ana güç kablosu + konnektörü (pil → lokomotif)", 1, 1, 0, 0, "Tender Ø8 deliğinden; kesit/konnektör/sigorta AÇIK KARAR (motor akımına göre)"),
    ("acc_conn", "Aksesuar hattı 2-pin kutuplu konnektör çifti (VARSAYIM: JST-XH 2P sınıfı)", 0, 0, 2, 0, "Yalnız Faz 3 220 mm vagon prototipi; yuva 10.4×6.2×8 mm VARSAYIM"),
    ("acc_jumper", "Aksesuar ara kablosu 70 mm (2×0.35 mm² silikon, VARSAYIM)", 0, 0, 1, 0, "Yalnız Faz 3 220 mm vagon prototipi"),
    ("acc_fuse", "Aksesuar hattı sigortası / akım sınırlayıcı", 0, 1, 0, 0, "Değer ve tür AÇIK KARAR"),
    ("cable_tie_25", "Kablo bağı 2.5 mm", 0, 3, 3, 0, "İç kelepçe tünellerinden; çekme yükünü konnektörden alır"),
    ("led_strip", "LED şerit (vagon iç aydınlatması)", 0, 0, 1, 0, "Genişlik ≤ 12 mm VARSAYIM; gerilimi aksesuar hattı kararına bağlı (AÇIK KARAR)"),
]

# Faz 4 donanımı: model id'sine göre adet (qty_by_model) ve istasyon rayı başına adet.
# id, ad, {model: adet}, istasyon rayı başına, özellik
HARDWARE_BY_MODEL = [
    ("bearing_684zz", "684ZZ rulman", {m: 8 for m in CARS_250}, 0, "4×9×4 mm"),
    ("axle_4mm", "Çelik aks Ø4 × 55 mm", {m: 4 for m in CARS_250}, 0, "Gümüş çelik/paslanmaz, h6"),
    ("screw_m3x20", "M3×20 vida (plastiğe)", {m: 2 for m in CARS_250}, 0, "Boji pivotu (alttan, gevşek)"),
    ("screw_m3x8", "M3×8 vida (plastiğe)", {m: 4 for m in CARS_250}, 0, "Kasa → platform (platform altından)"),
    ("nut_m3_lock", "M3 kontra (nylon) somun", {m: 2 for m in CARS_250}, 0, "Boji pivotu kilidi (isteğe bağlı)"),
    ("dbc_pin", "M3×20 vida + 2 pul (çeki kolu pimi)", {m: 1 for m in CARS_250}, 0,
     "Vagon başına 1 (ön pivot; arka pivota arkadaki vagonun kolu gelir). Sıkılmaz, kol serbest dönmeli"),
    ("bus_conn", "TrenBus 4 pinli kutuplu konnektör (JST-XH 4P sınıfı, VARSAYIM)", {**{m: 2 for m in CARS_250}, "tender-160": 2}, 0,
     "Gövde/depo alın duvarlarındaki yuvalara (her uçta 1); pin sırası BAT+, CAN-H, CAN-L, GND"),
    ("bus_jumper", "TrenBus ara kablosu 80 mm, 4 damar 26 AWG, iki ucu fişli", {**{m: 1 for m in CARS_250}, "tender-160": 1}, 0,
     "Araç başına 1 (öndeki araca); tenderinki lokomotife (lokomotif kabininde yuva yok: kablo kabin arka açıklığından girer)"),
    ("trenbus_cable", "TrenBus iç kablosu 4 damar silikon 26 AWG", {m: 1 for m in CARS_250}, 0,
     "Gövde içinde yuvadan yuvaya ~300 mm; araç düğümüne dallanır"),
    ("node_esp32c3", "Araç düğümü: ESP32-C3 + SN65HVD230 CAN alıcı-verici", {m: 1 for m in CARS_250}, 0,
     "docs/standart.md §3 (öneri, doğrulanmadı)"),
    ("servo_mg90s", "Mikro servo MG90S (metal dişli) VARSAYIM", {"sarj-250": 1}, 0,
     "Kol göbeği servo kısa koluna yapıştırılır; 2× M2 ile platform altındaki pedlere"),
    ("screw_m2x8", "M2×8 vida (plastiğe)", {"sarj-250": 2}, 0, "Servo kulakları"),
    ("sj_leaf", "Fosfor bronz / pirinç şerit 5×0,3 mm, 20 mm", {"sarj-250": 2}, 0,
     "Kol uçlarındaki yuvaya yapıştırılır, dışarı yay gibi kıvrılır; telleri lehimlenir"),
    ("sj_wire", "Silikon tel 2×0,5 mm² (kırmızı/siyah), 150 mm", {"sarj-250": 1}, 0,
     "Kol üstü kanaldan göbek deliğine, servo yanından şarj kartına; dönüşe yetecek gevşeklik"),
    ("sj_battery", "2S Li-ion paket + BMS (şarj vagonu kendi paketi)", {"sarj-250": 1}, 0, "docs/standart.md §5 (öneri)"),
    ("sj_charger", "2S şarj kartı + ters kutup koruması + sigorta", {"sarj-250": 1}, 0, "Kol temasından pakete; ölçüler AÇIK KARAR"),
    ("sj_lightpipe", "Işık borusu Ø4 / LED çubuğu (10 kademe)", {"sarj-250": 1}, 0, "Kasa yanındaki yarığa"),
    ("hall_a3144_car", "A3144 hall sensörü (vagon altı)", {"sarj-250": 1}, 0, "Yaklaşma ve durma mıknatıslarını görür"),
    ("st_strip", "İstasyon pirinç lama 6×1 mm, 100 mm", {}, 2, "Üst (+) ve alt (−); uçları direk yarığına 90° bükülür"),
    ("st_magnet", "Neodim mıknatıs 6×3 mm (istasyon işareti)", {}, 2, "Yaklaşma ve durma; traversler arasına"),
    ("st_screw", "M3×16 vida + dübel (istasyon tabanı)", {}, 2, "Tutucuyu zemine sabitler"),
    ("screw_m3x25", "M3×25 vida (çeki pimi)", LEGACY_220, 0, "Lokomotif/tender çatalı başına 1; 250 vagonlarda pivot pimi M3×20 (dbc_pin)"),
    ("acc_conn", "Aksesuar hattı 2-pin kutuplu konnektör çifti (VARSAYIM: JST-XH 2P sınıfı)", LEGACY_220, 0,
     "Faz 3 aksesuar hattı; 250 vagonlarda TrenBus kuplörde"),
    ("acc_jumper", "Aksesuar ara kablosu 70 mm (2×0.35 mm² silikon, VARSAYIM)", LEGACY_220, 0, "Faz 3 aksesuar hattı"),
    ("cable_tie_25", "Kablo bağı 2.5 mm", {m: 2 for m in CARS_250}, 0, "Yuva arkasında TrenBus kablosu gerilim alıcısı"),
    ("led_strip", "LED şerit (vagon iç aydınlatması)", {"yolcu-250": 1, "gozlem-250": 1}, 0,
     "Genişlik ≤ 12 mm VARSAYIM; 5 V, araç düğümünden"),
    ("st_supply", "İstasyon şarj beslemesi (USB-C PD → 8,4 V CC/CV) + röle/MOSFET", {}, 1,
     "Raylar temas doğrulanana kadar enerjisiz; AÇIK KARAR"),
]


def bbox(part):
    f = ROOT / "out" / f"{part}.measure.json"
    if not f.exists():
        return None, None, 0
    d = json.loads(f.read_text())
    lo = [min(b["bbox"]["min"][i] for b in d["bodies"]) for i in range(3)]
    hi = [max(b["bbox"]["max"][i] for b in d["bodies"]) for i in range(3)]
    vol = sum(b["volume_mm3"] for b in d["bodies"])
    return [round(hi[i] - lo[i], 1) for i in range(3)], round(vol, 1), len(d["bodies"])


def main():
    parts = []
    for pid, (name, phase, ql, qt, qc, qtr, note) in PRINTED.items():
        bb, vol, nb = bbox(pid)
        parts.append({
            "id": pid, "name_tr": name, "phase": phase,
            "file": {"stl": f"out/stl/{pid}.stl", "3mf": f"out/3mf/{pid}.3mf",
                     "step": f"out/step/{pid}.step", "design": f"designs/{pid}.sc"},
            "bbox_mm": bb, "volume_mm3": vol,
            "mass_g_petg": round(vol * PETG_DENSITY / 1000, 1) if vol else None,
            "bodies": nb,
            "fits_x2d": bool(bb and sorted(bb)[2] <= 260 and sorted(bb)[1] <= 256),
            "qty_per_loco": ql, "qty_per_tender": qt, "qty_per_coach": qc,
            "qty_per_straight_track": qtr, "notes_tr": note,
            **({"qty_by_model": BY_MODEL[pid]} if pid in BY_MODEL else {}),
            **({"qty_per_station": 1} if pid == "sarj_istasyon" else {}),
        })
    hw = [{"id": i, "name_tr": n, "qty_per_loco": ql, "qty_per_tender": qt, "qty_per_coach": qc,
           "qty_per_track_piece": qtr, "spec": s} for i, n, ql, qt, qc, qtr, s in HARDWARE]
    by_id = {h["id"]: h for h in hw}
    for i, n, by_model, per_station, s in HARDWARE_BY_MODEL:
        h = by_id.get(i)
        if h is None:
            h = by_id[i] = {"id": i, "name_tr": n, "spec": s}
            hw.append(h)
        if by_model:
            h["qty_by_model"] = by_model
        if per_station:
            h["qty_per_station"] = per_station
    out = {
        "_note": "build.py + parts_manifest.py ile üretilir. bbox tasarım yönündedir (mm); "
                 "kütle PETG 1.27 g/cm3 ile %100 dolu hacimden hesaplanır (gerçek baskı daha hafif). "
                 "Montaj parçaları (montaj_*, *_montaj) yalnız kontrol amaçlıdır, listede yok; "
                 "lokomotif/tender/vagon_montaj için out/3mf'de inceleme amaçlı renkli 3MF vardır (review_assemblies).",
        "units": "mm",
        "printer": {"model": "Bambu Lab X2D", "build_volume_mm": [256, 256, 260]},
        "parts": parts,
        "review_assemblies": [
            {"id": a, "file_3mf": f"out/3mf/{a}.3mf", "print": False,
             "notes_tr": "İnceleme amaçlı (BASILMAZ): dünya koordinatında renkli montaj, ray hariç"}
            for a in ("lokomotif_montaj", "tender_montaj", "vagon_montaj", "sarj250_montaj", "sasi250_montaj")
            if (ROOT / "out" / "3mf" / f"{a}.3mf").exists()],
        "hardware": hw,
    }
    (ROOT / "parts.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    missing = [p["id"] for p in parts if p["bbox_mm"] is None]
    print(f"parts.json: {len(parts)} parça, {len(hw)} donanım kalemi; eksik ölçü: {missing or 'yok'}")


if __name__ == "__main__":
    main()
