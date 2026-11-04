#!/usr/bin/env python3
"""Araçlar arası bağlantı geometrisi (R750 viraj): çeki pimi, tampon ve kablo konnektörü
noktaları arası mesafeler. Yalnız düzlemsel (XY) hesap; dikey sarsıntı, ray kusurları,
S-viraj geçişi ve fiziksel test YOK. Sonuç bir ön boyutlandırmadır, doğrulama değildir.

Model: her araç kendi dönme merkezinde (0-4-0 için dingil ortası, bojili vagonda iki
pivotun ortası) ray eksenine teğet kabul edilir; dönme merkezleri R yarıçaplı ray ekseni
üzerindedir. Kiriş ucu noktaları buna göre konumlanır.

Kullanım:  python3 cad/coupling_calc.py   → coupling_calc.json yazar.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
import sys
sys.path.insert(0, str(ROOT))
import build  # noqa: E402

V = build.V


def vehicles():
    """(ad, ön kiriş x, arka kiriş x) - araç yerel X'i, dönme merkezi x=0."""
    loco_rear = V["cab_x0"]
    loco_front = V["loco_len"] / 2 - V["buf_len"]
    t2 = V["t_len"] / 2
    c2 = V["c_len"] / 2 - V["buf_len"]
    return {"loco": (loco_front, loco_rear), "tender": (t2, -t2), "coach": (c2, -c2)}


def conn_faces():
    """Konnektör yuvası dış yüzleri (ön x, arka x). Lokomotifte konnektör modellenmedi."""
    return {"loco": (None, V["loco_conn_x"]), "tender": (V["t_tank_x1"], V["t_tank_x0"]),
            "coach": (V["c_body_l"] / 2, -V["c_body_l"] / 2)}


def place(R, s_arc, x_local, y_local):
    """Dönme merkezi yay uzunluğu s_arc'ta olan aracın yerel (x, y) noktasının dünya konumu.
    Ray ekseni: merkez (0, R), başlangıç (0, 0), +x yönünde sola döner."""
    th = s_arc / R
    cx, cy = R * math.sin(th), R - R * math.cos(th)
    tx, ty = math.cos(th), math.sin(th)          # teğet
    nx, ny = -math.sin(th), math.cos(th)         # sol normal
    return cx + tx * x_local + nx * y_local, cy + ty * x_local + ny * y_local


def solve_spacing(R, front_pin_x, rear_pin_x, pitch):
    """Rijit çeki kolu: iki pim arası her zaman pitch. Öndeki aracın dönme merkezi s=d'de,
    arkadaki s=0'da; pim mesafesi pitch olacak d'yi ikiye bölme ile bul."""
    def pins(d):
        a = place(R, d, front_pin_x, 0.0)
        b = place(R, 0.0, rear_pin_x, 0.0)
        return math.dist(a, b)
    lo, hi = rear_pin_x - front_pin_x, rear_pin_x - front_pin_x + 2 * pitch   # pinler üst üste .. 2 kol boyu
    for _ in range(200):
        mid = (lo + hi) / 2
        if pins(mid) < pitch:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def straight_place(s_arc, x_local, y_local):
    return s_arc + x_local, y_local


def main():
    veh = vehicles()
    gap = V["couple_gap"]
    pin_in = V["fork_pin_in"]
    out = {"_note": "Düzlemsel ön hesap (R750, düz yol). Test değildir; S-viraj, dikey hareket, "
                    "ray toleransı ve kablo sertliği dahil değil.",
           "radius_mm": V["curve_radius"], "couple_gap_mm": gap,
           "drawbar_pitch_mm": V["db_pitch"], "pairs": {}}
    pairs = [("loco-tender", "loco", "tender"), ("tender-coach", "tender", "coach"),
             ("coach-coach", "coach", "coach")]
    pitch = V["db_pitch"]
    for nm, front, rear in pairs:
        f_rear = veh[front][1]          # öndeki aracın arka kirişi (negatif x)
        r_front = veh[rear][0]          # arkadaki aracın ön kirişi
        fp, rp = f_rear + pin_in, r_front - pin_in
        cf, cr = conn_faces()[front][1], conn_faces()[rear][0]
        res = {}
        for key, R in (("straight", None), ("R750", V["curve_radius"])):
            if R is None:
                d = rp + pitch - fp
                pl = lambda s_, x, y: straight_place(s_, x, y)
            else:
                d = solve_spacing(R, fp, rp, pitch)
                pl = lambda s_, x, y, R=R: place(R, s_, x, y)
            dist = lambda xa, xb, y: math.dist(pl(d, xa, y), pl(0.0, xb, y))
            bh = V["buf_len"]
            res[key] = {
                "pin_to_pin": round(dist(fp, rp, 0.0), 2),
                "beam_gap_center": round(dist(f_rear, r_front, 0.0), 2),
                "buffer_head_gap_inner": round(dist(f_rear - bh, r_front + bh, V["buf_y"]), 2),
                "buffer_head_gap_outer": round(dist(f_rear - bh, r_front + bh, -V["buf_y"]), 2),
                "connector_face_dist": round(dist(cf, cr, V["conn_y"]), 2),
            }
        st, cu = res["straight"], res["R750"]
        res["buffer_gap_reduction_inner_mm"] = round(st["buffer_head_gap_inner"] - cu["buffer_head_gap_inner"], 2)
        L = V["jumper_len"]
        po = V["plug_out"]
        res["connector_face_change_mm"] = round(cu["connector_face_dist"] - st["connector_face_dist"], 2)
        dmax = max(st["connector_face_dist"], cu["connector_face_dist"])
        dmin = min(st["connector_face_dist"], cu["connector_face_dist"])
        res["jumper_len_mm"] = L
        res["jumper_slack_min_mm"] = round(L - dmax, 2)
        res["plug_tip_gap_min_mm"] = round(dmin - 2 * po, 2)
        # Gevşek kablo: iki uç arası açıklık s, kablo boyu L (uçlarda fiş çıkıntısı hariç)
        # V biçimli en kötü sarkma ≈ sqrt((L'/2)^2 - (s'/2)^2), L' = L - 2·po, s' = s - 2·po
        Lf, sf = L - 2 * po, dmin - 2 * po
        sag = math.sqrt(max(0.0, (Lf / 2) ** 2 - (max(sf, 0.0) / 2) ** 2))
        res["loop_sag_max_mm"] = round(sag, 1)
        res["loop_low_point_above_axle_mm"] = round(V["conn_z"] - sag, 1)
        res["loop_low_point_above_rail_mm"] = round(V["conn_z"] - sag + V["axle_h"], 1)
        res["clear_above_buffer_top_mm"] = round(V["conn_z"] - sag - (V["buf_z"] + V["buf_head_d"] / 2), 1)
        res["clear_above_fork_top_mm"] = round(V["conn_z"] - sag - V["fp_z"] - V["fp_t"], 1)
        res["clear_above_flange_top_mm"] = round(V["conn_z"] - sag - (V["wheel_d"] / 2 + V["flange_h"]), 1)
        out["pairs"][nm] = res
    (ROOT / "coupling_calc.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    for nm, r in out["pairs"].items():
        st, cu = r["straight"], r["R750"]
        print(f"{nm}: pim {st['pin_to_pin']}/{cu['pin_to_pin']} | tampon başı iç {st['buffer_head_gap_inner']}"
              f"->{cu['buffer_head_gap_inner']} dış {cu['buffer_head_gap_outer']} | konnektör yüzleri "
              f"{st['connector_face_dist']}->{cu['connector_face_dist']} | kablo payı {r['jumper_slack_min_mm']} | "
              f"fiş uçları {r['plug_tip_gap_min_mm']} | sarkma {r['loop_sag_max_mm']} → tampon üstü "
              f"{r['clear_above_buffer_top_mm']}, platform üstü {r['clear_above_fork_top_mm']}")


if __name__ == "__main__":
    main()
