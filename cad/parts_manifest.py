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
    "ceki_kolu": ("Çeki kolu (44 mm pim aralığı)", 3, 1, 0, 1, 0, "Araçlar arası; loko-tender için 1, her vagon arkasına 1"),
    "tender_sasi": ("Tender şasisi (motorsuz 0-4-0)", 3, 0, 1, 0, 0, "Yan levha yatakta, 4× 684ZZ"),
    "tender_platform": ("Tender platformu", 3, 0, 1, 0, 0, "Ters basılır; iki uçta çeki çatalı"),
    "tender_depo": ("Tender su deposu (pil bölmesi)", 3, 0, 1, 0, 0, "Ters (üstü yatakta) basılır"),
    "tender_kapak": ("Tender kömür kapağı", 3, 0, 1, 0, 0, "Alt yüzü yatakta; pil erişimi"),
    "vagon_boji": ("Vagon bojisi", 3, 0, 0, 2, 0, "Yan levha yatakta, 4× 684ZZ"),
    "vagon_platform": ("Vagon platformu", 3, 0, 0, 1, 0, "Ters basılır; iki uçta çeki çatalı"),
    "vagon_govde": ("Vagon kasası", 3, 0, 0, 1, 0, "Alt yüzü yatakta, çatısız"),
    "vagon_cati": ("Vagon çatısı", 3, 0, 0, 1, 0, "Ucu yatakta (220 mm yükseklik < 260)"),
}

# id, ad, loko, tender, vagon, ray parçası, özellik
HARDWARE = [
    ("bearing_684zz", "684ZZ rulman", 4, 4, 8, 0, "4×9×4 mm"),
    ("axle_4mm", "Çelik aks Ø4 × 55 mm", 2, 2, 4, 0, "Gümüş çelik/paslanmaz, h6"),
    ("motor_370", "RF-370 / RS-370 DC motor", 1, 0, 0, 0, "Ø24.4 × 30.5, Ø2.3 mil, 6-7.4 V (ölçüleri doğrula)"),
    ("screw_m25x6", "M2.5×6 vida", 2, 0, 0, 0, "Motor ön yüzü"),
    ("grub_m3x4", "M3×4 set vidası", 1, 0, 0, 0, "Karşı dişli göbeği"),
    ("screw_m3x12", "M3×12 vida (plastiğe)", 2, 2, 2, 0, "Gövde-şasi (loko x=±60), tender platform-şasi, vagon boji pivotu"),
    ("screw_m3x8", "M3×8 vida (plastiğe)", 8, 4, 4, 0, "Kazan 4, kabin 4 / depo 4 / kasa 4 (platform altından)"),
    ("screw_m3x10_nut", "M3×10 cıvata + M3 somun", 2, 0, 0, 0, "Ön-arka platform flanşı"),
    ("screw_m3x25", "M3×25 vida (çeki pimi)", 1, 2, 2, 0, "Çatal başına 1; çeki kolu bunun üstünde döner"),
    ("nut_m3_lock", "M3 kontra (nylon) somun", 0, 0, 2, 0, "Boji pivotu (boji serbest dönmeli)"),
    ("screw_m3_track", "M3×16 vida + dübel", 0, 0, 0, 2, "Rayı bahçeye sabitleme (isteğe bağlı)"),
    ("led_5mm", "5 mm sıcak beyaz LED + 220 Ω direnç", 1, 0, 0, 0, "Ön fener"),
    ("lens_10mm", "Ø10 × 2 mm şeffaf lens/disk", 1, 0, 0, 0, "Fener camı (isteğe bağlı, şeffaf PETG baskı da olur)"),
    ("battery_2s", "2S Li-ion paket (2× 18650) VARSAYIM", 0, 1, 0, 0, "~70×37×20 mm, 7.4 V, 2500-3500 mAh; tender deposuna"),
    ("bms_2s", "2S BMS kartı", 0, 1, 0, 0, "Koruma; ~40×7 mm"),
    ("charger_2s", "2S şarj modülü / USB-C PD tetik", 0, 1, 0, 0, "Şarj istasyonu için (Faz 4'te kesinleşecek)"),
    ("esp32", "ESP32 dev kartı (ör. ESP32-C3 SuperMini)", 1, 0, 0, 0, "Kazan içine"),
    ("motor_driver", "DRV8833 veya TB6612FNG sürücü", 1, 0, 0, 0, "Tek motor"),
    ("buck_5v", "DC-DC buck 7.4→5 V", 1, 0, 0, 0, "ESP32 beslemesi"),
    ("hall_a3144", "A3144 hall sensörü", 1, 0, 0, 0, "Konum/istasyon algılama"),
    ("magnet_6x3", "Neodim mıknatıs 6×3 mm", 0, 0, 0, 1, "Ray üstü işaret (istasyon/sayaç başına, varsayım)"),
    ("switch", "Mini anahtar (açma/kapama)", 0, 1, 0, 0, "Tender"),
    ("wire_conn", "2-pinli JST-PH konnektör + 26 AWG kablo", 1, 1, 0, 0, "Loko-tender güç bağlantısı (8 mm delikten)"),
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
        })
    hw = [{"id": i, "name_tr": n, "qty_per_loco": ql, "qty_per_tender": qt, "qty_per_coach": qc,
           "qty_per_track_piece": qtr, "spec": s} for i, n, ql, qt, qc, qtr, s in HARDWARE]
    out = {
        "_note": "build.py + parts_manifest.py ile üretilir. bbox tasarım yönündedir (mm); "
                 "kütle PETG 1.27 g/cm3 ile %100 dolu hacimden hesaplanır (gerçek baskı daha hafif). "
                 "Montaj parçaları (montaj_*, *_montaj) yalnız kontrol amaçlıdır, listede yok.",
        "units": "mm",
        "printer": {"model": "Bambu Lab X2D", "build_volume_mm": [256, 256, 260]},
        "parts": parts,
        "hardware": hw,
    }
    (ROOT / "parts.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    missing = [p["id"] for p in parts if p["bbox_mm"] is None]
    print(f"parts.json: {len(parts)} parça, {len(hw)} donanım kalemi; eksik ölçü: {missing or 'yok'}")


if __name__ == "__main__":
    main()
