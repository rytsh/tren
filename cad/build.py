#!/usr/bin/env python3
"""Smart Garden Railway - Faz 1 CAD üreteci.

params.json -> SolidCraft komut scriptleri (scripts/*.json) -> solidcraft-cli run
-> designs/*.sc (parametrik, düzenlenebilir), out/step, out/stl, out/3mf, renders/*.png

Kullanım:  python3 cad/build.py [parça ...]      (parça yoksa hepsi)
SolidCraft CLI yolu SOLIDCRAFT_CLI ortam değişkeniyle değiştirilebilir.
"""
import json
import math
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CLI = os.environ.get(
    "SOLIDCRAFT_CLI",
    "/mnt/d/Tools/solidcraft/solidcraft-cli.exe",
)

RAW = json.loads((ROOT / "params.json").read_text())
UNITS = {"tread_taper": "", "curve_angle": "deg", "z_wheel": "", "pressure_ang": "deg"}
P = {}          # name -> (value, comment)
for group, items in RAW.items():
    if group.startswith("_"):
        continue
    for name, (value, comment) in items.items():
        P[name] = (value, comment)
def _eval_derived():
    """Türetilmiş (ifade) parametrelerin sayısal değerini Python tarafında da hesapla."""
    vals = {k: v for k, (v, _) in P.items() if not isinstance(v, str)}
    env = dict(vals, pi=math.pi, mm=1.0)
    for k, (v, _) in P.items():
        if isinstance(v, str):
            vals[k] = env[k] = eval(v.replace(" mm", ""), {"__builtins__": {}}, env)
    return vals


V = _eval_derived()   # sayısal değerler (kenar seçimi, dişli profili, kontrol için)


def params_cmds():
    cmds = []
    # Türetilmiş parametreler, başvurdukları parametrelerden sonra eklenir
    order = sorted(P.items(), key=lambda kv: isinstance(kv[1][0], str))
    for name, (value, comment) in order:
        unit = UNITS.get(name, "mm")
        expr = value if isinstance(value, str) else f"{value} {unit}".strip()
        cmds.append({"command": "parameters.add",
                     "params": {"name": name, "expression": expr, "unit": unit,
                                "comment": comment}})
    return cmds


def c(command, **params):
    return {"command": command, "params": params}


def poly(points):
    return c("sketch.line", points=[[str(x), str(y)] for x, y in points], closed=True)


# ---------------------------------------------------------------------------
# Ray profili (YZ düzleminde: u = dünya Y, v = dünya Z). side=+1 sol ray, -1 sağ ray.
# Ray başı iç yüzü (gauge face) |y| = yc - rail_head_w/2 olacak şekilde.
# ---------------------------------------------------------------------------
def rail_profile(yc):
    """yc: ray ekseni Y ifadesi (str). Kapalı çokgen noktaları (u, v)."""
    top = "(tie_t + rail_h)"
    hb = "(tie_t + rail_h - rail_head_h)"                  # ray başı alt seviyesi
    wt = "(tie_t + rail_h - rail_head_h - (rail_head_w - rail_web_w)/2)"  # 45° geçişin altı
    ft = "(tie_t + 1.5 mm)"                                # taban üstü
    pts = [
        (f"{yc} - rail_foot_w/2", "0 mm"),
        (f"{yc} + rail_foot_w/2", "0 mm"),
        (f"{yc} + rail_foot_w/2", ft),
        (f"{yc} + rail_web_w/2", ft),
        (f"{yc} + rail_web_w/2", wt),
        (f"{yc} + rail_head_w/2", hb),
        (f"{yc} + rail_head_w/2", f"{top} - rail_top_ch"),
        (f"{yc} + rail_head_w/2 - rail_top_ch", top),
        (f"{yc} - rail_head_w/2 + rail_top_ch", top),
        (f"{yc} - rail_head_w/2", f"{top} - rail_top_ch"),
        (f"{yc} - rail_head_w/2", hb),
        (f"{yc} - rail_web_w/2", wt),
        (f"{yc} - rail_web_w/2", ft),
        (f"{yc} - rail_foot_w/2", ft),
    ]
    return pts


RAIL_C = "(track_gauge/2 + rail_head_w/2)"   # ray ekseninin hat ekseninden uzaklığı


def lerp_w(a, b, t):
    return f"({a} + ({b} - {a}) * {t})"


def tongue_pts(x0, sx, yc):
    """Kırlangıç dili. x0: bağlantı düzlemi, sx: +1 dil +x yönünde çıkar, yc: dil ekseni Y.
    Dil gövdeye 1 mm gömülü başlar (birleşme için)."""
    back = f"({x0} - {sx} * 1 mm)"
    tip = f"({x0} + {sx} * dt_len)"
    wb = "(dt_neck - (dt_tip - dt_neck) / dt_len * 1 mm)"     # 1 mm geride genişlik
    return [
        (back, f"{yc} - {wb}/2"),
        (tip, f"{yc} - dt_tip/2"),
        (tip, f"{yc} + dt_tip/2"),
        (back, f"{yc} + {wb}/2"),
    ]


def socket_pts(x0, sx, yc):
    """Kırlangıç yuvası (diğer modülün dilini alır), dt_clear kadar büyütülmüş.
    sx: yuvanın gövdeye doğru derinleştiği yön."""
    out = f"({x0} - {sx} * 1 mm)"
    bot = f"({x0} + {sx} * (dt_len + dt_clear))"
    wo = "(dt_neck + 2*dt_clear - (dt_tip - dt_neck) / dt_len * 1 mm)"
    wi = "(dt_tip + 2*dt_clear + (dt_tip - dt_neck) / dt_len * dt_clear)"
    return [
        (out, f"{yc} - {wo}/2"),
        (bot, f"{yc} - {wi}/2"),
        (bot, f"{yc} + {wi}/2"),
        (out, f"{yc} + {wo}/2"),
    ]


def rail_end_chamfer_points(x, sign_x_inward):
    """Ray ucu kenarları: üst kenar ve iç (gauge) yüz dikey kenarı, her iki ray."""
    top = V["tie_t"] + V["rail_h"]
    yc = V["track_gauge"] / 2 + V["rail_head_w"] / 2
    gi = V["track_gauge"] / 2
    zmid = top - V["rail_head_h"] / 2 - V["rail_top_ch"] / 2
    pts = []
    for s in (1, -1):
        pts.append([x, s * yc, top])
        pts.append([x, s * gi, zmid])
    return pts


# ---------------------------------------------------------------------------
# Düz ray modülü
# ---------------------------------------------------------------------------
def straight_track(name="Track"):
    L, g2 = "track_len", "(rail_gap/2)"
    cmds = []
    # Uç traversleri (bağlantı) ve ara traversler
    cmds.append(c("solid.box", length="end_tie_w - rail_gap/2", width="tie_len", height="tie_t",
                  corner=["rail_gap/2", "-tie_len/2", "0 mm"], operation="new",
                  body_name=name, name="EndTie_A"))
    cmds.append(c("solid.box", length="end_tie_w - rail_gap/2", width="tie_len", height="tie_t",
                  corner=["track_len - end_tie_w", "-tie_len/2", "0 mm"], operation="join",
                  targets=[name], name="EndTie_B"))
    n_inner = int(round(V["track_len"] / V["tie_pitch"])) - 2
    for i in range(1, n_inner + 1):
        cmds.append(c("solid.box", length="tie_w", width="tie_len", height="tie_t",
                      corner=[f"tie_pitch * {i} + tie_pitch/2 - tie_w/2", "-tie_len/2", "0 mm"],
                      operation="join", targets=[name], name=f"Tie{i}"))
    # Raylar (sürekli taban kirişli; yatakta desteksiz basılır)
    cmds += [
        c("sketch.create", plane="YZ", name="RailProfiles"),
        poly(rail_profile(RAIL_C)),
        poly(rail_profile(f"-{RAIL_C}")),
        c("sketch.finish"),
        c("solid.extrude", distance=f"{L} - rail_gap", start_offset=g2, profiles="all",
          operation="join", targets=[name], name="Rails"),
    ]
    # Kırlangıç: B ucunda dil +joint_y, yuva -joint_y; A ucunda 180° simetrik.
    cmds += [
        c("sketch.create", plane="XY", name="Tongues"),
        poly(tongue_pts(L, 1, "joint_y")),
        poly(tongue_pts("0 mm", -1, "-joint_y")),
        c("sketch.finish"),
        c("solid.extrude", distance="tie_t", profiles="all", operation="join",
          targets=[name], name="TongueExt"),
        c("sketch.create", plane="XY", name="Sockets"),
        poly(socket_pts("0 mm", 1, "joint_y")),
        poly(socket_pts(L, -1, "-joint_y")),
        c("sketch.finish"),
        c("solid.extrude", distance="tie_t", profiles="all", operation="cut",
          targets=[name], name="SocketCut"),
    ]
    # Bahçe montajı için iki M3 vida deliği (orta traversler)
    mid = n_inner // 2
    for k, i in enumerate((mid, mid + 1)):
        cmds.append(c("solid.cylinder", diameter="m3_clear", height="tie_t",
                      base=[f"tie_pitch * {i} + tie_pitch/2", "0 mm", "0 mm"], axis="Z",
                      operation="cut", targets=[name], name=f"MountHole{k+1}"))
    # Ray uçlarına pah (flanş/tekerlek ek yerinde takılmasın)
    pts = rail_end_chamfer_points(V["rail_gap"] / 2, 1) + \
        rail_end_chamfer_points(V["track_len"] - V["rail_gap"] / 2, -1)
    cmds.append(c("solid.chamfer", edges=pts, distance="rail_end_ch", body=name))
    return cmds


# ---------------------------------------------------------------------------
# Viraj modülü (merkez orijinde kurulur, sonra başlangıç orijine taşınır)
# ---------------------------------------------------------------------------
def curve_track(name="Curve"):
    R = V["curve_radius"]
    th = math.radians(V["curve_angle"])
    cmds = []

    def end_block(body, op, targets=None):
        """Yerel çerçevede (bağlantı düzlemi x=0, modül x>0 tarafında) uç traversi +
        dil (-joint_y, -x yönüne) + yuva (+joint_y). Dünya: (u, v - R)."""
        out = [c("solid.box", length="end_tie_w - rail_gap/2", width="tie_len", height="tie_t",
                 corner=["rail_gap/2", "-tie_len/2 - curve_radius", "0 mm"], operation=op,
                 body_name=body, name=f"{body}_Tie", **({"targets": targets} if targets else {})),
               c("sketch.create", plane="XY", name=f"{body}_TongueSk"),
               poly([(x, f"{y} - curve_radius") for x, y in tongue_pts("0 mm", -1, "-joint_y")]),
               c("sketch.finish"),
               c("solid.extrude", distance="tie_t", profiles="all", operation="join",
                 targets=[body], name=f"{body}_Tongue"),
               c("sketch.create", plane="XY", name=f"{body}_SocketSk"),
               poly([(x, f"{y} - curve_radius") for x, y in socket_pts("0 mm", 1, "joint_y")]),
               c("sketch.finish"),
               c("solid.extrude", distance="tie_t", profiles="all", operation="cut",
                 targets=[body], name=f"{body}_Socket")]
        return out

    # A ucu (başlangıç)
    cmds += end_block(name, "new")
    # B ucu: A ucunun 180° (dikey eksen) döndürülmüş hâli bu modülde yerel olarak
    # "dil +joint_y, +x yönüne" demektir; aynı bloğu yerel olarak kurmak yerine
    # A bloğunu x=0 / y=-R etrafında 180° çevirip viraj açısı kadar döndürüyoruz.
    cmds += end_block("EndB", "new")
    cmds.append(c("solid.move", bodies=["EndB"], axis=[0, 0, 1], angle="180 deg"))
    cmds.append(c("solid.move", bodies=["EndB"], translate=["0 mm", "-2 * curve_radius", "0 mm"]))
    cmds.append(c("solid.move", bodies=["EndB"], axis=[0, 0, 1], angle="curve_angle"))

    # Ara traversler (radyal), dairesel desen
    arc = R * th
    n = int(round(arc / V["tie_pitch"])) - 1
    step = th / (n + 1)
    cmds.append(c("solid.box", length="tie_w", width="tie_len", height="tie_t",
                  corner=["-tie_w/2", "-tie_len/2 - curve_radius", "0 mm"], operation="new",
                  body_name="CTie", name="CTie"))
    cmds.append(c("solid.move", bodies=["CTie"], axis=[0, 0, 1], angle=f"{math.degrees(step)} deg"))
    if n > 1:
        cmds.append(c("solid.pattern.circular", bodies=["CTie"], axis="Z", count=n,
                      angle=f"{math.degrees(step * (n - 1))} deg"))
    tie_bodies = ["CTie"] + [f"CTie ({k})" for k in range(2, n + 1)]

    # Raylar: aynı profil, Z ekseni etrafında revolve
    cmds += [
        c("sketch.create", plane="YZ", name="CurveRailProfiles"),
        poly(rail_profile(f"(-curve_radius + {RAIL_C})")),
        poly(rail_profile(f"(-curve_radius - {RAIL_C})")),
        c("sketch.finish"),
        c("solid.revolve", axis="Z", angle="curve_angle - (rail_gap / curve_radius) * 1 rad",
          profiles="all", operation="new", body_name="CRails", name="CurveRails"),
        c("solid.move", bodies=["CRails", "CRails (2)"], axis=[0, 0, 1],
          angle="(rail_gap / 2 / curve_radius) * 1 rad"),
    ]
    cmds.append(c("solid.combine", target=name, tools=["EndB", "CRails", "CRails (2)"] + tie_bodies,
                  operation="join"))

    # Ray ucu pahları
    top = V["tie_t"] + V["rail_h"]
    zmid = top - V["rail_head_h"] / 2 - V["rail_top_ch"] / 2
    yc = V["track_gauge"] / 2 + V["rail_head_w"] / 2
    gi = V["track_gauge"] / 2
    a0 = V["rail_gap"] / 2 / R
    pts = []
    for ang in (a0, th - a0):
        for r, z in ((R + yc, top), (R - yc, top), (R + gi, zmid), (R - gi, zmid)):
            pts.append([r * math.sin(ang), -r * math.cos(ang), z])
    cmds.append(c("solid.chamfer", edges=pts, distance="rail_end_ch", body=name))
    # Başlangıç bağlantı noktası orijine
    cmds.append(c("solid.move", bodies=[name], translate=["0 mm", "curve_radius", "0 mm"]))
    return cmds


# ---------------------------------------------------------------------------
# Test tekerleği: YZ düzleminde (u = yarıçap, v = eksenel) profil, Z etrafında revolve.
# Arka yüz (flanş tarafı) z=0'da: baskı yüzeyi.
# ---------------------------------------------------------------------------
def wheel(name="Wheel"):
    R = "(wheel_d/2)"
    Rf = f"({R} + flange_h)"
    pts = [
        ("wheel_bore/2", "0 mm"),
        (f"{Rf} - 0.4 mm", "0 mm"),
        (Rf, "0.4 mm"),
        (Rf, "0.4 mm + flange_tip_w"),
        (f"{R} + root_ch", "flange_t"),
        (R, "flange_t + root_ch"),
        (f"{R} - (wheel_w - flange_t - root_ch) * tread_taper", "wheel_w"),
        (f"{R} - rim_t", "wheel_w"),
        (f"{R} - rim_t", "web_t"),
        ("boss_d/2", "web_t"),
        ("boss_d/2", "wheel_w"),
        ("wheel_bore/2", "wheel_w"),
    ]
    return [
        c("sketch.create", plane="YZ", name=f"{name}Profile"),
        poly(pts),
        c("sketch.finish"),
        c("solid.revolve", axis="Z", operation="new", body_name=name, name=f"{name}Revolve"),
    ]


def spacer(name="Spacer"):
    return [
        c("solid.cylinder", diameter="spacer_od", height="spacer_t", operation="new",
          body_name=name, name="SpacerOD"),
        c("solid.cylinder", diameter="spacer_id", height="spacer_t", operation="cut",
          targets=[name], name="SpacerID"),
    ]


# ---------------------------------------------------------------------------
# Test şasisi (iç çerçeve, 0-4-0, motorsuz). Kullanım yönü: x hat yönü, aks ekseni Y,
# z=0 aks merkez yüksekliği.
# ---------------------------------------------------------------------------
PLATE_YO = "(back_to_back/2 - spacer_t)"           # levha dış yüzü
PLATE_YI = f"({PLATE_YO} - plate_t)"


def frame(name="Frame", plen="plate_len", wb="wheelbase",
          xms=(("F", "1 * xm_x"), ("B", "-1 * xm_x")), hole="m3_tap"):
    """İç çerçeve. plen: levha boyu, wb: dingil mesafesi, xms: traversler (ad, X ifadesi),
    hole: travers deliği (m3_tap: gövde vidası; m3_clear: boji pivotu)."""
    cmds = []
    for s, nm in ((1, "L"), (-1, "R")):
        ycorner = PLATE_YI if s > 0 else f"-{PLATE_YO}"
        cmds.append(c("solid.box", length=plen, width="plate_t",
                      height="plate_above + plate_below",
                      corner=[f"-{plen}/2", ycorner, "-plate_below"],
                      operation="new" if s > 0 else "join",
                      **({"body_name": name} if s > 0 else {"targets": [name]}),
                      name=f"Plate{nm}"))
    for nm, xx in xms:
        cmds.append(c("solid.box", length="xm_size", width=f"2 * {PLATE_YI} + 2 mm",
                      height="xm_size",
                      corner=[f"{xx} - xm_size/2", f"-{PLATE_YI} - 1 mm",
                              "plate_above - xm_size"],
                      operation="join", targets=[name], name=f"Cross{nm}"))
        cmds.append(c("solid.cylinder", diameter=hole, height="xm_size",
                      base=[xx, "0 mm", "plate_above - xm_size"], axis="Z",
                      operation="cut", targets=[name], name=f"DeckHole{nm}"))
    for s, nm in ((1, "F"), (-1, "B")):
        x = f"{s} * {wb}/2"
        cmds.append(c("solid.cylinder", diameter="6.5 mm", height=f"2 * {PLATE_YO} + 2 mm",
                      base=[x, f"-{PLATE_YO} - 1 mm", "0 mm"], axis="Y", operation="cut",
                      targets=[name], name=f"AxleBore{nm}"))
        for side, sn in ((1, "L"), (-1, "R")):
            ybase = f"{PLATE_YO} - bearing_w" if side > 0 else f"-{PLATE_YO} - 0.01 mm"
            cmds.append(c("solid.cylinder", diameter="bearing_od + bearing_clear",
                          height="bearing_w + 0.01 mm", base=[x, ybase, "0 mm"], axis="Y",
                          operation="cut", targets=[name], name=f"Bearing{nm}{sn}"))
    return cmds


# ---------------------------------------------------------------------------
# Tolerans kuponu: aks delikleri 3.8..4.2, rulman yuvaları 9.0..9.3 (+ etiket)
# ---------------------------------------------------------------------------
BORES = [3.8, 3.9, 4.0, 4.1, 4.2]
POCKETS = [9.0, 9.1, 9.2, 9.3]


def coupon(name="Coupon"):
    W, H, T = 82.0, 34.0, 6.0
    cmds = [c("solid.box", length=f"{W} mm", width=f"{H} mm", height=f"{T} mm",
              operation="new", body_name=name, name="CouponPlate")]
    for i, d in enumerate(BORES):
        x = 9 + i * 16
        cmds.append(c("solid.cylinder", diameter=f"{d} mm", height=f"{T} mm",
                      base=[f"{x} mm", "9 mm", "0 mm"], operation="cut", targets=[name],
                      name=f"Bore{i}"))
    for i, d in enumerate(POCKETS):
        x = 12 + i * 19
        cmds.append(c("solid.cylinder", diameter=f"{d} mm", height="4 mm",
                      base=[f"{x} mm", "24 mm", f"{T - 4} mm"], operation="cut", targets=[name],
                      name=f"Pocket{i}"))
        cmds.append(c("solid.cylinder", diameter="6.5 mm", height=f"{T} mm",
                      base=[f"{x} mm", "24 mm", "0 mm"], operation="cut", targets=[name],
                      name=f"PocketThru{i}"))
    cmds.append(c("sketch.create", plane="XY", offset=f"{T} mm", name="Labels"))
    for i, d in enumerate(BORES):
        cmds.append(c("sketch.text", text=f"{d:.1f}", at=[f"{5.5 + i * 16} mm", "1.8 mm"],
                      height=2.6))
    for i, d in enumerate(POCKETS):
        cmds.append(c("sketch.text", text=f"{d:.1f}", at=[f"{8.5 + i * 19} mm", "30 mm"],
                      height=2.6))
    cmds += [c("sketch.finish"),
             c("solid.extrude", distance="0.5 mm", direction="negative", profiles="all",
               operation="cut", targets=[name], name="LabelCut")]
    return cmds


# ---------------------------------------------------------------------------
# Montaj kontrolü: düz ray + şasi + 4 tekerlek + 2 aks
# ---------------------------------------------------------------------------
# Tekerlek temas noktasında yuvarlanma yarıçapı (ray ekseni tekerlek ekseninde)
# Konik tekerlekte en büyük yarıçap ray başı düz üst yüzünün iç (gauge) kenarına denk gelir
CONTACT_AXIAL = "(track_gauge/2 + rail_top_ch - back_to_back/2)"
CONTACT_R = f"(wheel_d/2 - ({CONTACT_AXIAL} - flange_t - root_ch) * tread_taper)"
AXLE_Z = f"(tie_t + rail_h + {CONTACT_R} + 0.05 mm)"   # 0.05 mm görünür boşluk


def assembly():
    cmds = straight_track("Track") + frame("Frame") + wheel("Wheel")
    xc = "track_len/2"
    cmds.append(c("solid.move", bodies=["Frame"], translate=[xc, "0 mm", AXLE_Z]))
    # Wheel: arka yüz z=0, +z dışa. Sol (y>0) için X etrafında -90°: +z -> +y
    names = []
    for k, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        nm = "Wheel" if k == 0 else f"Wheel ({k + 1})"
        if k > 0:
            cmds.append(c("solid.move", bodies=["Wheel"], copy=True))
        names.append((nm, sx, sy))
    for nm, sx, sy in names:
        cmds.append(c("solid.move", bodies=[nm], axis=[1, 0, 0],
                      angle="-90 deg" if sy > 0 else "90 deg"))
        cmds.append(c("solid.move", bodies=[nm],
                      translate=[f"{xc} + {sx} * wheelbase/2", f"{sy} * back_to_back/2", AXLE_Z]))
    for sx, nm in ((1, "AxleF"), (-1, "AxleB")):
        cmds.append(c("solid.cylinder", diameter="axle_d", height="back_to_back + 2*wheel_w",
                      base=[f"{xc} + {sx} * wheelbase/2", "-back_to_back/2 - wheel_w", AXLE_Z],
                      axis="Y", operation="new", body_name=nm, name=nm))
    return cmds


def print_orient(body, rot_axis=None, angle=None):
    """Baskı yönüne çevir ve yatağa (z=0) oturt."""
    out = []
    if rot_axis:
        out.append(c("solid.move", bodies=[body], axis=rot_axis, angle=angle))
    return out


# ---------------------------------------------------------------------------
# Faz 2: sonsuz vida aktarması
# ---------------------------------------------------------------------------
def gear_outline(z, m, alpha_deg, backlash=0.1, n_inv=5):
    """Düz involüt dişlinin kapalı çokgeni (merkez orijinde). backlash: bölüm dairesinde
    diş kalınlığından düşülen toplam boşluk [mm]."""
    a = math.radians(alpha_deg)
    rp = z * m / 2
    rb, ra, rf = rp * math.cos(a), rp + m, rp - 1.25 * m
    inv = lambda t: math.tan(t) - t
    half = math.pi / (2 * z) - backlash / (2 * rp) + inv(a)
    r0 = max(rb, rf)
    flank = []                                     # +y yanağı, tabandan tepeye (r, açı)
    if rf < r0:
        flank.append((rf, half))
    for i in range(n_inv + 1):
        r = r0 + (ra - r0) * i / n_inv
        flank.append((r, half - inv(math.acos(min(1.0, rb / r)))))
    tooth = [(r, -t) for r, t in flank] + [(r, t) for r, t in reversed(flank)]
    pts = []
    step = 2 * math.pi / z
    for k in range(z):
        phi = k * step
        pts += [(r * math.cos(t + phi), r * math.sin(t + phi)) for r, t in tooth]
        t0, t1 = flank[0][1] + phi, -flank[0][1] + phi + step
        pts += [(rf * math.cos(t0 + (t1 - t0) * j / 3), rf * math.sin(t0 + (t1 - t0) * j / 3))
                for j in (1, 2)]
    return [[round(x, 4), round(y, 4)] for x, y in pts]


def worm_wheel(name="WormWheel"):
    """Sonsuz vida karşı dişlisi: düz involüt dişli (vida kurşun açısı 5.7°; dişli
    genişliği boyunca helis sapması ~0.24 mm, geri boşlukla karşılanır).
    Arka yüz z=0, göbek +z. Delik dişli çizimine dahil (tek extrude)."""
    z, m = int(V["z_wheel"]), V["gear_m"]
    return [
        c("sketch.create", plane="XY", name=f"{name}Teeth"),
        c("sketch.line", points=gear_outline(z, m, V["pressure_ang"]), closed=True),
        c("sketch.circle.center", center=[0, 0], diameter="gear_bore"),
        c("sketch.finish"),
        c("solid.extrude", distance="gear_w", operation="new", body_name=name,
          name=f"{name}Body"),
        c("sketch.create", plane="XY", offset="gear_w", name=f"{name}HubSk"),
        c("sketch.circle.center", center=[0, 0], diameter="gear_hub_d"),
        c("sketch.circle.center", center=[0, 0], diameter="gear_bore"),
        c("sketch.finish"),
        c("solid.extrude", distance="gear_hub_len", operation="join", targets=[name],
          name=f"{name}Hub"),
        c("sketch.create", plane="XZ", name=f"{name}GrubSk"),
        c("sketch.circle.center", center=["0 mm", "-(gear_w + gear_hub_len/2)"],
          diameter="grub_tap"),
        c("sketch.finish"),
        c("solid.extrude", distance="gear_hub_d", direction="symmetric", operation="cut",
          targets=[name], name=f"{name}Grub"),
    ]


def worm(name="Worm"):
    """Tek ağızlı sonsuz vida (eksenel modül gear_m), eksen Z, göbek altta (z=0)."""
    p = "(pi * gear_m)"
    hw_root = f"({p}/4 + 1.25 * gear_m * tan(pressure_ang) - 0.05 mm)"
    hw_tip = f"({p}/4 - gear_m * tan(pressure_ang) - 0.05 mm)"
    r_root, r_tip = "(worm_pd/2 - 1.25 * gear_m)", "(worm_pd/2 + gear_m)"
    z0 = f"(worm_hub_len - {p})"                    # helis bir hatve önce başlar
    # XZ düzleminde sketch y = -z
    sec = [(r_root, f"-({z0} - {hw_root})"), (r_tip, f"-({z0} - {hw_tip})"),
           (r_tip, f"-({z0} + {hw_tip})"), (r_root, f"-({z0} + {hw_root})")]
    return [
        c("solid.cylinder", diameter="worm_hub_d", height="worm_hub_len", operation="new",
          body_name=name, name="WormHub"),
        c("solid.cylinder", diameter=f"2 * {r_root} + 0.02 mm", height="worm_len",
          base=["0 mm", "0 mm", "worm_hub_len"], operation="join", targets=[name],
          name="WormCore"),
        c("sketch.create", plane="XZ", name="WormThreadSec"),
        poly(sec),
        c("sketch.finish"),
        c("solid.coil", sketch="WormThreadSec", pitch=p, height=f"worm_len + 2 * {p}",
          operation="new", body_name="WormThread", name="WormCoil"),
        c("solid.cylinder", diameter=f"2 * {r_tip} + 1 mm", height="worm_len",
          base=["0 mm", "0 mm", "worm_hub_len"], operation="new", body_name="WormTrim",
          name="WormTrim"),
        c("solid.combine", target="WormThread", tools=["WormTrim"], operation="intersect"),
        # Helis ile göbeği birleştirmek SolidCraft 0.18.3'te >8 dk sürüyor: iki gövde
        # kesişik bırakılır, dilimleyici (Bambu Studio) baskıda birleştirir.
        c("solid.cylinder", diameter="worm_bore", height="worm_hub_len + worm_len",
          operation="cut", targets=[name], name="WormBore"),
        c("solid.chamfer", edges=[[V['worm_hub_d'] / 2, 0, 0]], distance="0.4 mm", body=name),
    ]


def motor_frame(name="Frame"):
    """Faz 2 şasisi: test şasisi + motor bölmesi (ön perde, yan duvarlar, arka yatak)."""
    cmds = frame(name)
    face = "motor_face_x"
    cmds += [
        c("solid.box", length="bulk_t", width=f"2 * {PLATE_YO}", height="bulk_top - bulk_bottom",
          corner=[face, f"-{PLATE_YO}", "bulk_bottom"], operation="join", targets=[name],
          name="Bulkhead"),
    ]
    for s, nm in ((1, "L"), (-1, "R")):
        cmds.append(c("solid.box", length=f"{face} + bulk_t - saddle_x0", width="plate_t / 2",
                      height="cradle_top - plate_above",
                      corner=["saddle_x0", f"{PLATE_YI}" if s > 0 else f"-{PLATE_YI} - plate_t/2",
                              "plate_above"],
                      operation="join", targets=[name], name=f"MotorWall{nm}"))
    cmds += [
        c("solid.box", length="saddle_len", width=f"2 * {PLATE_YI} + 1 mm", height="plate_above",
          corner=["saddle_x0", f"-{PLATE_YI} - 0.5 mm", "0 mm"], operation="join",
          targets=[name], name="MotorSaddle"),
        c("solid.cylinder", diameter="motor_d + 0.3 mm", height=f"{face} - saddle_x0 + 1 mm",
          base=["saddle_x0 - 1 mm", "0 mm", "motor_z"], axis="X", operation="cut",
          targets=[name], name="MotorPocket"),
        c("solid.cylinder", diameter="motor_boss_d + 0.4 mm", height="bulk_t + 2 mm",
          base=[f"{face} - 1 mm", "0 mm", "motor_z"], axis="X", operation="cut",
          targets=[name], name="MotorBossHole"),
    ]
    for s, nm in ((1, "L"), (-1, "R")):
        cmds.append(c("solid.cylinder", diameter="m25_clear", height="bulk_t + 2 mm",
                      base=[f"{face} - 1 mm", f"{s} * motor_hole_s/2", "motor_z"], axis="X",
                      operation="cut", targets=[name], name=f"MotorScrew{nm}"))
    return cmds


def motor_dummy(name="Motor"):
    """370 motor yer tutucu (yalnız montaj kontrolü): eksen X, ön yüz motor_face_x."""
    return [
        c("solid.cylinder", diameter="motor_d", height="motor_len",
          base=["motor_face_x - motor_len", "0 mm", "motor_z"], axis="X", operation="new",
          body_name=name, name="MotorCan"),
        c("solid.cylinder", diameter="motor_boss_d", height="bulk_t",
          base=["motor_face_x", "0 mm", "motor_z"], axis="X", operation="join",
          targets=[name], name="MotorBoss"),
        c("solid.cylinder", diameter="motor_shaft_d", height="motor_shaft_l",
          base=["motor_face_x", "0 mm", "motor_z"], axis="X", operation="new",
          body_name="MotorShaft", name="MotorShaft"),
    ]


def drive_assembly():
    """Motorlu şasi montajı, yerel şasi koordinatında (aks ekseni z=0)."""
    cmds = motor_frame("Frame") + worm_wheel("WormWheel") + worm("Worm") + motor_dummy("Motor")
    # Karşı dişli: eksen Y, ön aksta, y=0 ortalı (dişli + göbek)
    cmds += [
        c("solid.move", bodies=["WormWheel"], translate=["0 mm", "0 mm", "-gear_w/2"]),
        c("solid.move", bodies=["WormWheel"], axis=[1, 0, 0], angle="-90 deg"),
        c("solid.move", bodies=["WormWheel"], translate=["wheelbase/2", "0 mm", "0 mm"]),
        # Sonsuz vida: eksen Z -> +X, göbek motora bakar, aksın üstünde ortalanır
        c("solid.move", bodies=["Worm", "WormThread"], axis=[0, 1, 0], angle="90 deg"),
        c("solid.move", bodies=["Worm", "WormThread"],
          translate=["wheelbase/2 - worm_len/2 - worm_hub_len", "0 mm", "motor_z"]),
    ]
    return cmds


def drive_on_track():
    cmds = straight_track("Track") + drive_assembly() + wheel("Wheel")
    xc = "track_len/2"
    movers = ["Frame", "WormWheel", "Worm", "WormThread", "Motor", "MotorShaft"]
    cmds.append(c("solid.move", bodies=movers, translate=[xc, "0 mm", AXLE_Z]))
    names = []
    for k, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        nm = "Wheel" if k == 0 else f"Wheel ({k + 1})"
        if k > 0:
            cmds.append(c("solid.move", bodies=["Wheel"], copy=True))
        names.append((nm, sx, sy))
    for nm, sx, sy in names:
        cmds.append(c("solid.move", bodies=[nm], axis=[1, 0, 0],
                      angle="-90 deg" if sy > 0 else "90 deg"))
        cmds.append(c("solid.move", bodies=[nm],
                      translate=[f"{xc} + {sx} * wheelbase/2", f"{sy} * back_to_back/2", AXLE_Z]))
    for sx, nm in ((1, "AxleF"), (-1, "AxleB")):
        cmds.append(c("solid.cylinder", diameter="axle_d", height="back_to_back + 2*wheel_w",
                      base=[f"{xc} + {sx} * wheelbase/2", "-back_to_back/2 - wheel_w", AXLE_Z],
                      axis="Y", operation="new", body_name=nm, name=nm))
    colors = [("Frame", "#202020"), ("WormWheel", "#d8b000"), ("Worm", "#909090"), ("WormThread", "#909090"),
              ("Motor", "#b0b8c0")] + [(n, "#c0201a") for n, _, _ in names]
    for b, col in colors:
        cmds.append(c("appearance.assign", bodies=[b], color=col))
    return cmds


# ---------------------------------------------------------------------------
# Faz 3: lokomotif gövdesi, tender, yolcu vagonu
# Tümü araç yerel çerçevesinde: x hat yönü (+x ön), y aks ekseni, z=0 aks merkezi.
# Lokomotifte bu çerçeve motorlu şasinin çerçevesiyle aynıdır.
# ---------------------------------------------------------------------------
FP_TOP = "(fp_z + fp_t)"
L2 = "(loco_len/2 - buf_len)"            # lokomotif tampon kirişi dış yüzü


def box(x0, x1, y0, y1, z0, z1, op, body, nm):
    kw = {"body_name": body} if op == "new" else {"targets": [body]}
    return c("solid.box", length=f"({x1}) - ({x0})", width=f"({y1}) - ({y0})",
             height=f"({z1}) - ({z0})", corner=[x0, y0, z0], operation=op, name=nm, **kw)


def vcyl(d, x, y, z0, z1, op, body, nm):
    kw = {"body_name": body} if op == "new" else {"targets": [body]}
    return c("solid.cylinder", diameter=d, height=f"({z1}) - ({z0})", base=[x, y, z0], axis="Z",
             operation=op, name=nm, **kw)


def xcyl(d, x0, x1, y, z, op, body, nm):
    kw = {"body_name": body} if op == "new" else {"targets": [body]}
    return c("solid.cylinder", diameter=d, height=f"({x1}) - ({x0})", base=[x0, y, z], axis="X",
             operation=op, name=nm, **kw)


def buffers(body, xface, sx, pre):
    """İki tampon: kiriş dış yüzü xface, sx: +1 öne, -1 arkaya bakar."""
    cmds = []
    for s, sn in ((1, "L"), (-1, "R")):
        y = f"{s} * buf_y"
        if sx > 0:
            a, b = f"{xface} - 1 mm", f"{xface} + buf_len - buf_head_t"
            h0, h1 = b, f"{xface} + buf_len"
        else:
            a, b = f"{xface} - buf_len + buf_head_t", f"{xface} + 1 mm"
            h0, h1 = f"{xface} - buf_len", a
        cmds.append(xcyl("buf_stock_d", a, b, y, "buf_z", "join", body, f"{pre}BufStock{sn}"))
        cmds.append(xcyl("buf_head_d", h0, h1, y, "buf_z", "join", body, f"{pre}BufHead{sn}"))
    return cmds


def fork(body, xface, sx, pre):
    """Çeki çatalı (kiriş dış yüzü xface, sx: dış yön). Pim: alttan M3 vida, alt çenede
    geçiş, üst çene + platformda kılavuz deliği."""
    xin = f"({xface} - {sx} * fork_len)"
    xpin = f"({xface} - {sx} * fork_pin_in)"
    xs0, xs1 = (f"{xface} - fork_len + 2 mm", f"{xface} + 1 mm") if sx > 0 else \
        (f"{xface} - 1 mm", f"{xface} + fork_len - 2 mm")
    x0, x1 = (xin, xface) if sx > 0 else (xface, xin)
    return [
        box(x0, x1, "-fork_w/2", "fork_w/2", "fork_zb", "fp_z + 0.5 mm", "join", body, f"{pre}Fork"),
        box(xs0, xs1, "-fork_slot_w/2", "fork_slot_w/2", "fork_z0", "fork_z1", "cut", body,
            f"{pre}ForkSlot"),
        vcyl("m3_clear", xpin, "0 mm", "fork_zb - 1 mm", "fork_z0 + 0.5 mm", "cut", body,
             f"{pre}PinLow"),
        vcyl("m3_tap", xpin, "0 mm", "fork_z1 - 0.5 mm", f"{FP_TOP} + 1 mm", "cut", body,
             f"{pre}PinTap"),
    ]


def deck(body, x0, x1, half_w, beam_bot, beams, pre):
    """Platform levhası + etekler + tampon kirişleri. beams: [(x_dış, sx)]."""
    cmds = [box(x0, x1, f"-{half_w}", half_w, "fp_z", FP_TOP, "new", body, f"{pre}Plate")]
    for xf, sx in beams:
        bx0, bx1 = (f"{xf} - beam_t", xf) if sx > 0 else (xf, f"{xf} + beam_t")
        cmds.append(box(bx0, bx1, f"-{half_w}", half_w, beam_bot, FP_TOP, "join", body,
                        f"{pre}Beam{'F' if sx > 0 else 'B'}"))
    for s, sn in ((1, "L"), (-1, "R")):
        y0, y1 = (f"{half_w} - valance_t", half_w) if s > 0 else (f"-{half_w}", f"-{half_w} + valance_t")
        cmds.append(box(x0, x1, y0, y1, "fp_z - valance_h", FP_TOP, "join", body, f"{pre}Valance{sn}"))
    return cmds


def clear_holes(body, pts, pre):
    return [vcyl("m3_clear", x, y, "fp_z - 1 mm", f"{FP_TOP} + 1 mm", "cut", body, f"{pre}Hole{i}")
            for i, (x, y) in enumerate(pts)]


def splice_flange(body, front, pre):
    x0, x1 = ("fp_split_x", "fp_split_x + jflange_t") if front else \
        ("fp_split_x - jflange_t", "fp_split_x")
    cmds = [box(x0, x1, "-jflange_w/2", "jflange_w/2", "jflange_bot", "fp_z + 0.5 mm", "join",
                body, f"{pre}Flange")]
    for s, sn in ((1, "L"), (-1, "R")):
        cmds.append(xcyl("m3_clear", f"{x0} - 1 mm", f"{x1} + 1 mm", f"{s} * jbolt_y", "jbolt_z",
                         "cut", body, f"{pre}FlangeBolt{sn}"))
    return cmds


def loco_footplate_front(name="FootplateF"):
    """Ön platform modülü: platform, ön tampon kirişi + tamponlar + kanca, silindirler,
    şasiye bağlanan 2 dikme (M3, x=±xm_x), kazan ve kabin ön vida delikleri."""
    cmds = deck(name, "fp_split_x", L2, "loco_w/2", "beam_bot", [(L2, 1)], "FF")
    cmds += buffers(name, L2, 1, "FF")
    cmds.append(box(f"{L2} - 1 mm", f"{L2} + 4 mm", "-4 mm", "4 mm", "buf_z - 3 mm", "buf_z + 3 mm",
                    "join", name, "FFHook"))
    for s, sn in ((1, "L"), (-1, "R")):
        cmds.append(xcyl("cyl_d", "cyl_x0", "cyl_x0 + cyl_len", f"{s} * cyl_y", "cyl_z", "join",
                         name, f"FFCyl{sn}"))
    for s, sn in ((1, "F"), (-1, "B")):
        cmds.append(vcyl("mount_boss_d", f"{s} * xm_x", "0 mm", "plate_above", "fp_z + 0.5 mm",
                         "join", name, f"FFBoss{sn}"))
    cmds += splice_flange(name, True, "FF")
    cmds.append(box("fp_open_x0", "fp_open_x1", "-fp_open_w/2", "fp_open_w/2", "fp_z - 1 mm",
                    f"{FP_TOP} + 1 mm", "cut", name, "FFOpening"))
    for s, sn in ((1, "F"), (-1, "B")):
        cmds.append(vcyl("m3_clear", f"{s} * xm_x", "0 mm", "plate_above - 1 mm",
                         f"{FP_TOP} + 1 mm", "cut", name, f"FFMount{sn}"))
    pts = [(x, f"{s} * {y}") for x, y in (("boil_hole_xf", "boil_hole_y"),
                                           ("boil_hole_xr", "boil_hole_y"),
                                           ("cab_hole_xf", "cab_hole_y")) for s in (1, -1)]
    cmds += clear_holes(name, pts, "FF")
    return cmds


def loco_footplate_rear(name="FootplateR"):
    """Arka platform modülü: kabin tabanı, arka tampon kirişi + tamponlar, çeki çatalı."""
    cmds = deck(name, "cab_x0", "fp_split_x", "loco_w/2", "beam_bot", [("cab_x0", -1)], "FR")
    cmds += buffers(name, "cab_x0", -1, "FR")
    cmds += splice_flange(name, False, "FR")
    cmds += fork(name, "cab_x0", -1, "FR")
    cmds += clear_holes(name, [("cab_hole_xr", f"{s} * cab_hole_y") for s in (1, -1)], "FR")
    return cmds


def boiler(name="Boiler"):
    """Kazan + duman kutusu + etek (altı ve arkası açık kabuk), kuşaklar, duman kutusu
    kapağı, ön fener (5 mm LED), iç vida kaburgaları, dom/baca yuvaları."""
    v = V
    fpt = v["fp_z"] + v["fp_t"]
    cmds = [
        xcyl("boil_d", "boil_x0", "sb_x0", "0 mm", "boil_z", "new", name, "Barrel"),
        xcyl("sb_d", "sb_x0", "sb_x1", "0 mm", "boil_z", "join", name, "Smokebox"),
        box("boil_x0", "sb_x0", "-skirt_w/2", "skirt_w/2", FP_TOP, "boil_z", "join", name, "Skirt"),
        box("sb_x0", "sb_x1", "-saddle_w/2", "saddle_w/2", FP_TOP, "boil_z", "join", name, "Saddle"),
        c("solid.shell", faces=[[0, 0, fpt], [(v["sb_x0"] + v["sb_x1"]) / 2, 0, fpt],
                                [v["boil_x0"], 0, v["boil_z"]], [v["boil_x0"], 0, fpt + 3]],
          thickness="wall_t", body=name),
    ]
    for k, bx in enumerate(("band_x1", "band_x2")):
        cmds += [
            c("sketch.create", plane="YZ", offset=f"{bx} - band_w/2", name=f"Band{k}Sk"),
            c("sketch.circle.center", center=["0 mm", "boil_z"], diameter="band_d"),
            c("sketch.circle.center", center=["0 mm", "boil_z"], diameter="boil_d - 1 mm"),
            c("sketch.finish"),
            c("solid.extrude", distance="band_w", operation="join", targets=[name], name=f"Band{k}"),
            box(f"{bx} - band_w", f"{bx} + band_w", "-(skirt_w/2 - wall_t)", "skirt_w/2 - wall_t",
                f"{FP_TOP} - 1 mm", "boil_z - 17 mm", "cut", name, f"Band{k}Trim"),
        ]
    # Duman kutusu ön bileziği + 45° konik kapak (XZ çizimi: y = -z)
    xr = "(sb_x1 + sb_ring_w)"
    xd = f"({xr} + door_t)"
    cmds += [
        c("sketch.create", plane="XZ", name="DoorSk"),
        poly([("sb_x1 - 1 mm", "-boil_z"), ("sb_x1 - 1 mm", "-(boil_z + sb_ring_d/2)"),
              (xr, "-(boil_z + sb_ring_d/2)"), (xr, "-(boil_z + sb_d/2 - 1 mm)"),
              (xd, "-(boil_z + door_d/2)"), (xd, "-boil_z")]),
        c("sketch.finish"),
        c("solid.revolve", axis={"origin": [0, 0, v["boil_z"]], "dir": [1, 0, 0]},
          operation="join", targets=[name], name="Door"),
        xcyl("lamp_d", f"{xd} - 1 mm", f"{xd} + lamp_len", "0 mm", "lamp_z", "join", name, "Lamp"),
        xcyl("led_d", "sb_x1 - wall_t - 1 mm", f"{xd} + lamp_len + 1 mm", "0 mm", "lamp_z", "cut",
             name, "LedBore"),
        xcyl("lens_d", f"{xd} + lamp_len - lens_depth", f"{xd} + lamp_len + 1 mm", "0 mm", "lamp_z",
             "cut", name, "LensSeat"),
    ]
    for hx in ("boil_hole_xf", "boil_hole_xr"):
        for s, sn in ((1, "L"), (-1, "R")):
            y0, y1 = (f"boil_hole_y - rib_w/2", "skirt_w/2 - wall_t + 0.5 mm")
            if s < 0:
                y0, y1 = f"-({y1})", f"-({y0})"
            cmds.append(box(f"{hx} - 3.5 mm", f"{hx} + 4 mm", y0, y1, FP_TOP, f"{FP_TOP} + rib_h",
                            "join", name, f"Rib{hx}{sn}"))
            cmds.append(vcyl("m3_tap", hx, f"{s} * boil_hole_y", FP_TOP, f"{FP_TOP} + rib_h", "cut",
                             name, f"RibTap{hx}{sn}"))
    seats = [("Dome", "dome_x", "boil_d"), ("Sand", "sand_x", "boil_d"),
             ("Valve", "valve_x", "boil_d"), ("Chim", "chim_x", "sb_d")]
    for k, (nm, x, top) in enumerate(seats):
        cmds.append(vcyl("spig_od + 2*fit_clear", x, "0 mm", f"boil_z + {top}/2 - 6 mm",
                         f"boil_z + {top}/2 + 1 mm", "new", f"Seat{nm}", f"{nm}Seat"))
    cmds.append(c("solid.combine", target=name, tools=[f"Seat{s[0]}" for s in seats],
                  operation="cut"))
    return cmds


def fitting(name, x, prof, surf_d):
    """Kazan/duman kutusu üstü döner parça (dom, baca, ventil): YZ'de (r, z) profili,
    Z etrafında döner; taban kazan silindiriyle kesilir (semer), altına yerleştirme pimi."""
    return [
        c("sketch.create", plane="YZ", name=f"{name}Sk"),
        poly(prof),
        c("sketch.finish"),
        c("solid.revolve", axis="Z", operation="new", body_name=name, name=f"{name}Rev"),
        c("solid.move", bodies=[name], translate=[x, "0 mm", "0 mm"]),
        xcyl(surf_d, f"{x} - 30 mm", f"{x} + 30 mm", "0 mm", "boil_z", "cut", name, f"{name}Saddle"),
        vcyl("spig_od", x, "0 mm", f"boil_z + {surf_d}/2 - spig_h - 1 mm",
             f"boil_z + {surf_d}/2", "join", name, f"{name}Spigot"),
    ]


def chimney(name="Chimney"):
    top = "(loco_h - axle_h)"
    prof = [("0 mm", "seat_base"), ("chim_seat_d/2", "seat_base"), ("chim_seat_d/2", "chim_seat_top"),
            ("8 mm", "chim_seat_top + chim_seat_d/2 - 8 mm"), ("8 mm", f"{top} - 9 mm"),
            ("10.5 mm", f"{top} - 3 mm"), ("10.5 mm", top), ("chim_bore/2", top),
            ("chim_bore/2", f"{top} - 15 mm"), ("0 mm", f"{top} - 15 mm")]
    return fitting(name, "chim_x", prof, "sb_d")


def steam_dome(name="SteamDome"):
    r, t = "dome_seat_d/2", "boil_z + boil_d/2"
    prof = [("0 mm", "seat_base"), (r, "seat_base"), (r, f"{t} + 8 mm"),
            (f"{r} - 5 mm", f"{t} + 13 mm"), ("0 mm", f"{t} + 13 mm")]
    return fitting(name, "dome_x", prof, "boil_d")


def sand_dome(name="SandDome"):
    r, t = "sand_seat_d/2", "boil_z + boil_d/2"
    prof = [("0 mm", "seat_base"), (r, "seat_base"), (r, f"{t} + 6 mm"),
            (f"{r} - 4 mm", f"{t} + 10 mm"), ("0 mm", f"{t} + 10 mm")]
    return fitting(name, "sand_x", prof, "boil_d")


def safety_valve(name="SafetyValve"):
    r, t = "valve_seat_d/2", "boil_z + boil_d/2"
    prof = [("0 mm", "seat_base"), (r, "seat_base"), (r, f"{t} + 4 mm"),
            ("4 mm", f"{t} + 4 mm + {r} - 4 mm"), ("4 mm", f"{t} + 16 mm"),
            ("5.5 mm", f"{t} + 17 mm"), ("5.5 mm", f"{t} + 19 mm"), ("0 mm", f"{t} + 19 mm")]
    return fitting(name, "valve_x", prof, "boil_d")


def arch_body(name, x0, x1, half_w, z0, z_side, z_crown, pre):
    """Düz yan duvarlı, üstü yay kesitli gövde (YZ'de çizilir, X boyunca uzatılır)."""
    return [
        c("sketch.create", plane="YZ", name=f"{pre}ProfileSk"),
        c("sketch.line", points=[[f"-{half_w}", z_side], [f"-{half_w}", z0], [half_w, z0],
                                 [half_w, z_side]]),
        c("sketch.arc.three_point", start=[half_w, z_side], end=[f"-{half_w}", z_side],
          through=["0 mm", z_crown]),
        c("sketch.finish"),
        c("solid.extrude", distance=f"({x1}) - ({x0})", start_offset=x0, operation="new",
          body_name=name, name=f"{pre}Extrude"),
    ]


def side_ribs(name, xs, y_expr, half_in, z0, h, pre):
    """Duvara yapışık vida kaburgaları + M3 kılavuz delikleri (alttan vidalanır)."""
    cmds = []
    for i, x in enumerate(xs):
        for s, sn in ((1, "L"), (-1, "R")):
            y0, y1 = f"{y_expr} - cab_rib_w/2", f"{half_in} + 0.5 mm"
            if s < 0:
                y0, y1 = f"-({y1})", f"-({y0})"
            cmds.append(box(f"{x} - 4 mm", f"{x} + 4 mm", y0, y1, z0, f"{z0} + {h}", "join", name,
                            f"{pre}Rib{i}{sn}"))
            cmds.append(vcyl("m3_tap", x, f"{s} * {y_expr}", z0, f"{z0} + {h}", "cut", name,
                             f"{pre}RibTap{i}{sn}"))
    return cmds


def cab(name="Cab"):
    v = V
    xm = (v["cab_x0"] + v["cab_x1"]) / 2
    cmds = arch_body(name, "cab_x0", "cab_x1", "cab_w/2", FP_TOP, "cab_side_top", "cab_crown", "Cab")
    cmds += [
        c("solid.shell", faces=[[xm, 0, v["fp_z"] + v["fp_t"]], [xm, 0, v["cab_crown"]]],
          thickness="wall_t", body=name),
        box("side_win_x0", "side_win_x1", "-(cab_w/2 + 1 mm)", "cab_w/2 + 1 mm", "side_win_z0",
            "side_win_z1", "cut", name, "CabSideWin"),
        box("cab_x0 - 1 mm", "cab_x0 + wall_t + 1 mm", "-cab_rear_w/2", "cab_rear_w/2",
            "cab_rear_z0", "cab_rear_z1", "cut", name, "CabRearOpen"),
        box("cab_x1 - wall_t - 1 mm", "cab_x1 + 1 mm", "-cable_w/2", "cable_w/2", f"{FP_TOP} - 1 mm",
            f"{FP_TOP} + cable_h", "cut", name, "CabCableOpen"),
    ]
    for s, sn in ((1, "L"), (-1, "R")):
        cmds.append(xcyl("cab_win_d", "cab_x1 - wall_t - 1 mm", "cab_x1 + 1 mm", f"{s} * cab_win_y",
                         "cab_win_z", "cut", name, f"CabFrontWin{sn}"))
    cmds += side_ribs(name, ["cab_hole_xf", "cab_hole_xr"], "cab_hole_y", "(cab_w/2 - wall_t)",
                      FP_TOP, "cab_rib_h", "Cab")
    return cmds


def arch_roof(name, x0, x1, half_w, z_crown, R, tab_x0, tab_x1, wall_in, pre):
    """Yay çatı plakası (alt yüzü gövde yayına oturur) + iki yerleştirme dili."""
    zr = lambda r: f"({z_crown} - {R} + sqrt(({r})*({r}) - ({half_w})*({half_w})))"
    Ro = f"({R} + roof_t)"
    cmds = [
        c("sketch.create", plane="YZ", name=f"{pre}RoofSk"),
        c("sketch.line", points=[[f"-{half_w}", zr(R)], [f"-{half_w}", zr(Ro)]]),
        c("sketch.arc.three_point", start=[f"-{half_w}", zr(Ro)], end=[half_w, zr(Ro)],
          through=["0 mm", f"{z_crown} + roof_t"]),
        c("sketch.line", points=[[half_w, zr(Ro)], [half_w, zr(R)]]),
        c("sketch.arc.three_point", start=[half_w, zr(R)], end=[f"-{half_w}", zr(R)],
          through=["0 mm", z_crown]),
        c("sketch.finish"),
        c("solid.extrude", distance=f"({x1}) - ({x0})", start_offset=x0, operation="new",
          body_name=name, name=f"{pre}Roof"),
    ]
    for s, sn in ((1, "L"), (-1, "R")):
        y1 = f"{wall_in} - roof_clear"
        y0 = f"{y1} - roof_tab_t"
        if s < 0:
            y0, y1 = f"-({y1})", f"-({y0})"
        cmds.append(box(tab_x0, tab_x1, y0, y1, f"{z_crown} - {R} + sqrt({R}*{R} - {wall_in}*{wall_in}) - roof_tab_h",
                        f"{z_crown} - {R} + sqrt({R}*{R} - {wall_in}*{wall_in}) + 1 mm", "join", name,
                        f"{pre}RoofTab{sn}"))
    return cmds


def cab_roof(name="CabRoof"):
    return arch_roof(name, "cab_x0 - roof_over", "cab_x1 + roof_over", "(cab_w/2 + roof_over)",
                     "cab_crown", "cab_R", "cab_x0 + wall_t + roof_clear",
                     "cab_x1 - wall_t - roof_clear", "(cab_w/2 - wall_t)", "Cab")


def drawbar(name="Drawbar"):
    return [
        box("-(db_pitch + db_w)/2", "(db_pitch + db_w)/2", "-db_w/2", "db_w/2", "0 mm", "db_t",
            "new", name, "DrawbarBar"),
        vcyl("m3_clear + 0.2 mm", "-db_pitch/2", "0 mm", "-1 mm", "db_t + 1 mm", "cut", name, "DbHoleA"),
        vcyl("m3_clear + 0.2 mm", "db_pitch/2", "0 mm", "-1 mm", "db_t + 1 mm", "cut", name, "DbHoleB"),
    ]


# --- Araçlar arası aksesuar hattı: yalnız mekanik hazırlık -------------------------
def conn_holder(body, xf, sx, pre):
    """Uç duvara (dış yüzü xf, sx: dış yön) 2-pin kutuplu konnektör yuvası. Yuva dıştan
    conn_d derin; arkasında omuz ve tel çıkışı (konnektör içeri itilemez). Üst kenardaki
    kanal kutuplama içindir. Konnektör seçilmedi: ölçüler VARSAYIM (params → wiring)."""
    inner = f"({xf} - {sx} * (wall_t + hold_d))"
    over = f"({xf} - {sx} * (wall_t - 0.5 mm))"
    out_ = f"({xf} + {sx} * 1 mm)"
    deep = f"({xf} - {sx} * conn_d)"
    back = f"({xf} - {sx} * (wall_t + hold_d + 1 mm))"
    rng = lambda a, b: (a, b) if sx > 0 else (b, a)
    zc = "conn_z"
    return [
        box(*rng(inner, over), "conn_y - conn_w/2 - hold_wall", "conn_y + conn_w/2 + hold_wall",
            f"{zc} - conn_h/2 - hold_wall", f"{zc} + conn_h/2 + conn_key_h + hold_wall", "join", body,
            f"{pre}ConnHolder"),
        box(*rng(deep, out_), "conn_y - conn_w/2", "conn_y + conn_w/2", f"{zc} - conn_h/2",
            f"{zc} + conn_h/2", "cut", body, f"{pre}ConnPocket"),
        box(*rng(deep, out_), "conn_y - conn_key_w/2", "conn_y + conn_key_w/2", f"{zc} + conn_h/2 - 0.5 mm",
            f"{zc} + conn_h/2 + conn_key_h", "cut", body, f"{pre}ConnKey"),
        box(*rng(back, f"({deep} + {sx} * 0.5 mm)"), "conn_y - conn_wire_w/2", "conn_y + conn_wire_w/2",
            f"{zc} - conn_wire_h/2", f"{zc} + conn_wire_h/2", "cut", body, f"{pre}ConnWire"),
    ] + gusset_x(body, over, inner, f"{zc} - conn_h/2 - hold_wall", "conn_y",
                  "conn_w + 2*hold_wall", pre + "Conn")


def gusset_x(body, x_wall, x_tip, z_top, yc, width, pre):
    """Duvardan X yönünde çıkan çıkıntının altına 45° destek (desteksiz baskı için).
    XZ çizimi: sketch (x, y) → dünya (X, −Z)."""
    depth = f"abs(({x_tip}) - ({x_wall}))"
    return [
        c("sketch.create", plane="XZ", offset=yc, name=f"{pre}GussetSk"),
        poly([(x_wall, f"-({z_top} + 0.5 mm)"), (x_tip, f"-({z_top} + 0.5 mm)"),
              (x_wall, f"-({z_top} - {depth})")]),
        c("sketch.finish"),
        c("solid.extrude", distance=width, direction="symmetric", operation="join", targets=[body],
          name=f"{pre}Gusset"),
    ]


def gusset_y(body, y_wall, y_tip, z_top, xc, length, pre):
    """+y duvarından −y yönünde çıkan çıkıntının altına 45° destek. YZ çizimi: (Y, Z)."""
    depth = f"abs(({y_tip}) - ({y_wall}))"
    return [
        c("sketch.create", plane="YZ", name=f"{pre}GussetSk"),
        poly([(y_wall, f"{z_top} + 0.5 mm"), (y_tip, f"{z_top} + 0.5 mm"),
              (y_wall, f"{z_top} - {depth}")]),
        c("sketch.finish"),
        c("solid.extrude", distance=length, start_offset=f"{xc} - ({length})/2", operation="join",
          targets=[body], name=f"{pre}Gusset"),
    ]


def wall_clips(body, xs, y_in, pre):
    """+y yan duvarının iç yüzüne kablo kelepçeleri: duvarla birlikte kapalı tünel
    (clip_gap × clip_h). Kablo bağı veya tel buradan geçer; çekme yükünü konnektör
    yerine bu noktalar ve çeki kolu taşır."""
    cmds = []
    for i, x in enumerate(xs):
        cmds += [
            box(f"{x} - clip_len/2", f"{x} + clip_len/2", f"{y_in} - clip_gap - clip_bar", f"{y_in} + 0.5 mm",
                "clip_z - clip_h/2 - clip_bar", "clip_z + clip_h/2 + clip_bar", "join", body,
                f"{pre}Clip{i}"),
        ]
        cmds += gusset_y(body, f"{y_in} + 0.5 mm", f"{y_in} - clip_gap - clip_bar",
                         "clip_z - clip_h/2 - clip_bar", x, "clip_len", f"{pre}Clip{i}")
        cmds.append(box(f"{x} - clip_len/2 - 1 mm", f"{x} + clip_len/2 + 1 mm", f"{y_in} - clip_gap", y_in,
                        "clip_z - clip_h/2", "clip_z + clip_h/2", "cut", body, f"{pre}ClipTunnel{i}"))
    return cmds


# --- Tender ---------------------------------------------------------------
T2 = "(t_len/2)"


def tender_frame(name="TFrame"):
    return frame(name, plen="t_plate_len", wb="wheelbase",
                 xms=(("F", "1 * t_xm_x"), ("B", "-1 * t_xm_x")), hole="m3_clear")


def tender_deck(name="TDeck"):
    cmds = deck(name, f"-{T2}", T2, "t_w/2", "beam_bot", [(T2, 1), (f"-{T2}", -1)], "TD")
    cmds += buffers(name, T2, 1, "TDF") + buffers(name, f"-{T2}", -1, "TDB")
    cmds += fork(name, T2, 1, "TDF") + fork(name, f"-{T2}", -1, "TDB")
    for s, sn in ((1, "F"), (-1, "B")):
        cmds.append(vcyl("mount_boss_d", f"{s} * t_xm_x", "0 mm", "plate_above", "fp_z + 0.5 mm",
                         "join", name, f"TDBoss{sn}"))
        cmds.append(vcyl("m3_tap", f"{s} * t_xm_x", "0 mm", "plate_above", "fp_z + fp_t - 1 mm",
                         "cut", name, f"TDBossTap{sn}"))
    cmds += clear_holes(name, [(f"{sx} * t_hole_x", f"{sy} * t_hole_y") for sx in (1, -1)
                               for sy in (1, -1)], "TD")
    return cmds


def tender_tank(name="TTank"):
    v = V
    cmds = [
        box("t_tank_x0", "t_tank_x1", "-t_tank_w/2", "t_tank_w/2", FP_TOP, "t_tank_top", "new", name,
            "TankBox"),
        c("solid.shell", faces=[[0, 0, v["fp_z"] + v["fp_t"]]], thickness="wall_t", body=name),
        box("coal_open_x0", "coal_open_x1", "-coal_open_w/2", "coal_open_w/2", "t_tank_top - wall_t - 1 mm",
            "t_tank_top + 1 mm", "cut", name, "CoalOpening"),
    ]
    cmds += side_ribs(name, ["t_hole_x", "-t_hole_x"], "t_hole_y", "(t_tank_w/2 - wall_t)", FP_TOP,
                      "t_tank_top - wall_t + 0.5 mm - fp_z - fp_t", "TT")
    # Ana güç (pil → lokomotif) kablosu: Faz 3'teki Ø8 delik korunur; aksesuar hattından ayrıdır.
    cmds.append(xcyl("cable_d", "t_tank_x1 - wall_t - 1 mm", "t_tank_x1 + 1 mm", "0 mm",
                     f"{FP_TOP} + 12 mm", "cut", name, "CableHole"))
    cmds += conn_holder(name, "t_tank_x1", 1, "TTF") + conn_holder(name, "t_tank_x0", -1, "TTB")
    cmds += wall_clips(name, ["-clip_xs_tender", "0 mm", "clip_xs_tender"], "(t_tank_w/2 - wall_t)", "TT")
    return cmds


def tender_lid(name="TLid"):
    return [
        box("lid_x0", "lid_x1", "-lid_w/2", "lid_w/2", "t_tank_top", "t_tank_top + lid_t", "new", name,
            "LidPlate"),
        box("coal_open_x0 + lid_clear", "coal_open_x1 - lid_clear", "-(coal_open_w/2 - lid_clear)",
            "coal_open_w/2 - lid_clear", "t_tank_top - lid_plug_h", "t_tank_top + 0.5 mm", "join",
            name, "LidPlug"),
        c("sketch.create", plane="XY", offset="t_tank_top + lid_t", name="CoalSk"),
        poly([("lid_x0 + 3 mm", "-(lid_w/2 - 3 mm)"), ("lid_x1 - 3 mm", "-(lid_w/2 - 3 mm)"),
              ("lid_x1 - 3 mm", "lid_w/2 - 3 mm"), ("lid_x0 + 3 mm", "lid_w/2 - 3 mm")]),
        c("sketch.finish"),
        c("solid.extrude", distance="lid_board_h", taper="-40 deg", operation="join", targets=[name],
          name="CoalHeap"),
    ]


# --- Yolcu vagonu ------------------------------------------------------------
C2 = "(c_len/2 - buf_len)"          # vagon tampon kirişi dış yüzü


def bogie(name="Bogie"):
    return frame(name, plen="bogie_len", wb="bogie_wb", xms=(("C", "0 mm"),), hole="m3_clear")


def coach_deck(name="CDeck"):
    cmds = deck(name, f"-{C2}", C2, "c_w/2", "c_beam_bot", [(C2, 1), (f"-{C2}", -1)], "CD")
    cmds += buffers(name, C2, 1, "CDF") + buffers(name, f"-{C2}", -1, "CDB")
    cmds += fork(name, C2, 1, "CDF") + fork(name, f"-{C2}", -1, "CDB")
    for s, sn in ((1, "F"), (-1, "B")):
        cmds.append(vcyl("mount_boss_d", f"{s} * bogie_x", "0 mm", "plate_above", "fp_z + 0.5 mm",
                         "join", name, f"CDPivot{sn}"))
        cmds.append(vcyl("m3_tap", f"{s} * bogie_x", "0 mm", "plate_above", "fp_z + fp_t - 1 mm",
                         "cut", name, f"CDPivotTap{sn}"))
    cmds += clear_holes(name, [(f"{sx} * c_hole_x", f"{sy} * c_hole_y") for sx in (1, -1)
                               for sy in (1, -1)], "CD")
    return cmds


def coach_body(name="CBody"):
    v = V
    cmds = arch_body(name, "-c_body_l/2", "c_body_l/2", "c_w/2", FP_TOP, "c_wall_top", "c_crown", "CB")
    cmds.append(c("solid.shell", faces=[[0, 0, v["fp_z"] + v["fp_t"]], [0, 0, v["c_crown"]]],
                  thickness="wall_t", body=name))
    n = int(V["c_win_n"])
    for i in range(n):
        xc = f"({i} - ({n} - 1)/2) * c_win_pitch"
        cmds.append(box(f"{xc} - c_win_w/2", f"{xc} + c_win_w/2", "-(c_w/2 + 1 mm)", "c_w/2 + 1 mm",
                        "c_win_z0", "c_win_z1", "cut", name, f"CBWin{i}"))
    cmds.append(box("-(c_body_l/2 + 1 mm)", "c_body_l/2 + 1 mm", "-c_door_w/2", "c_door_w/2",
                    f"{FP_TOP} - 1 mm", "c_door_z1", "cut", name, "CBDoors"))
    cmds += side_ribs(name, ["c_hole_x", "-c_hole_x"], "c_hole_y", "(c_w/2 - wall_t)", FP_TOP,
                      "cab_rib_h", "CB")
    cmds += conn_holder(name, "c_body_l/2", 1, "CBF") + conn_holder(name, "-c_body_l/2", -1, "CBB")
    cmds += wall_clips(name, ["-clip_xs_coach", "0 mm", "clip_xs_coach"], "(c_w/2 - wall_t)", "CB")
    return cmds


def coach_roof(name="CRoof"):
    """Vagon çatısı + iç tepe boyunca LED şerit oturma yüzeyi (düz, led_pad_w) ve +y dilinde
    LED kablosunun duvar içine inmesi için çentik. Şerit/LED gerilimi seçilmedi."""
    return arch_roof(name, "-(c_body_l/2 + roof_over)", "c_body_l/2 + roof_over",
                     "(c_w/2 + roof_over)", "c_crown", "c_R", "-(c_body_l/2 - wall_t - roof_clear)",
                     "c_body_l/2 - wall_t - roof_clear", "(c_w/2 - wall_t)", "CR") + led_pad(
        name, "-(c_body_l/2 - wall_t - roof_clear)", "c_body_l/2 - wall_t - roof_clear", "c_crown",
        "(c_w/2 - wall_t)", "c_R", "CR")


def led_pad(body, x0, x1, z_crown, wall_in, R, pre):
    """Çatı iç yayının tepesine düz şerit yüzeyi (yay tepesinden led_pad_t aşağıda biter;
    şerit yapışkanı düz yüze yapışır) + +y çatı dilinde kablo çentiği (dil ortasında)."""
    hw = "led_pad_w/2"
    zb = f"({z_crown} - led_pad_t)"
    za = f"({z_crown} - {R} + sqrt({R}*{R} - ({hw})*({hw})) + 0.3 mm)"
    ytab = f"({wall_in} - roof_clear)"
    ztab = f"({z_crown} - {R} + sqrt({R}*{R} - {wall_in}*{wall_in}))"
    return [
        box(x0, x1, f"-{hw}", hw, zb, za, "join", body, f"{pre}LedPad"),
        box("-roof_notch_w/2", "roof_notch_w/2", f"{ytab} - roof_tab_t - 1 mm", f"{ytab} + 1 mm",
            f"{ztab} - roof_tab_h - 1 mm", f"{ztab} - 1 mm", "cut", body, f"{pre}LedNotch"),
    ]


# --- Montajlar -----------------------------------------------------------------
LOCO_BODY = [("FootplateF", loco_footplate_front), ("FootplateR", loco_footplate_rear),
             ("Boiler", boiler), ("Cab", cab), ("CabRoof", cab_roof), ("Chimney", chimney),
             ("SteamDome", steam_dome), ("SandDome", sand_dome), ("SafetyValve", safety_valve)]
BLACK, RED, BRASS = "#1b1b1b", "#c0201a", "#b8892c"


def wheels_on(xc, axle_xs, start=0, first=True):
    """4·n tekerlek + aks, araç merkezi xc (dünya X ifadesi), aks konumları axle_xs (yerel)."""
    cmds = wheel("Wheel") if first else []
    names = []
    k = start
    for ax in axle_xs:
        for sy in (1, -1):
            nm = "Wheel" if k == 0 else f"Wheel ({k + 1})"
            if k > 0:
                cmds.append(c("solid.move", bodies=["Wheel"], copy=True))
            names.append((nm, ax, sy))
            k += 1
    for nm, ax, sy in names:
        cmds.append(c("solid.move", bodies=[nm], axis=[1, 0, 0],
                      angle="-90 deg" if sy > 0 else "90 deg"))
        cmds.append(c("solid.move", bodies=[nm],
                      translate=[f"{xc} + {ax}", f"{sy} * back_to_back/2", AXLE_Z]))
    for i, ax in enumerate(axle_xs):
        nm = f"Axle{start // 2 + i}"
        cmds.append(c("solid.cylinder", diameter="axle_d", height="back_to_back + 2*wheel_w",
                      base=[f"{xc} + {ax}", "-back_to_back/2 - wheel_w", AXLE_Z],
                      axis="Y", operation="new", body_name=nm, name=nm))
    cols = [c("appearance.assign", bodies=[n for n, _, _ in names], color=RED)]
    return cmds + cols, [n for n, _, _ in names]


def tracks(copies):
    cmds = straight_track("Track")
    for k, dx in enumerate(copies):
        cmds.append(c("solid.move", bodies=["Track"], copy=True))
        cmds.append(c("solid.move", bodies=[f"Track ({k + 2})"], translate=[f"{dx} * track_len", "0 mm", "0 mm"]))
    return cmds


def loco_assembly():
    cmds = drive_on_track()
    xc = "track_len/2"
    for k, dx in enumerate((1, -1)):
        cmds.append(c("solid.move", bodies=["Track"], copy=True))
        cmds.append(c("solid.move", bodies=[f"Track ({k + 2})"],
                      translate=[f"{dx} * track_len", "0 mm", "0 mm"]))
    names = []
    for nm, fn in LOCO_BODY:
        cmds += fn(nm)
        names.append(nm)
    cmds.append(c("solid.move", bodies=names, translate=[xc, "0 mm", AXLE_Z]))
    for nm in names:
        col = BRASS if nm in ("SteamDome", "SafetyValve") else BLACK
        cmds.append(c("appearance.assign", bodies=[nm], color=col))
    return cmds + beam_colours(V["track_len"] / 2, [("FootplateF", V["loco_len"] / 2 - V["buf_len"]),
                                                     ("FootplateR", V["cab_x0"])])


def beam_colours(xc, beams):
    az = V["tie_t"] + V["rail_h"] + V["axle_h"]
    zb = V["beam_bot"] + 2 + az
    cmds = []
    for body, xf in beams:
        cmds.append(c("appearance.assign", faces=[[xc + xf, 0, zb]], body=body, color=RED))
    return cmds


def tender_assembly():
    xc = "track_len/2"
    cmds = straight_track("Track") + tender_frame("TFrame")
    w, _ = wheels_on(xc, ["wheelbase/2", "-wheelbase/2"])
    cmds += w
    parts = [("TDeck", tender_deck), ("TTank", tender_tank), ("TLid", tender_lid)]
    for nm, fn in parts:
        cmds += fn(nm)
    movers = ["TFrame"] + [p for p, _ in parts]
    cmds.append(c("solid.move", bodies=movers, translate=[xc, "0 mm", AXLE_Z]))
    cmds += [c("appearance.assign", bodies=["TFrame"], color="#202020"),
             c("appearance.assign", bodies=["TDeck", "TTank", "TLid"], color=BLACK)]
    cmds += beam_colours(V["track_len"] / 2, [("TDeck", V["t_len"] / 2), ("TDeck", -V["t_len"] / 2)])
    return cmds


def coach_assembly():
    xc = "track_len"
    cmds = tracks([1])
    cmds += bogie("Bogie")
    cmds.append(c("solid.move", bodies=["Bogie"], copy=True))
    w, _ = wheels_on(xc, ["bogie_x + bogie_wb/2", "bogie_x - bogie_wb/2",
                          "-bogie_x + bogie_wb/2", "-bogie_x - bogie_wb/2"])
    cmds += w
    cmds += [c("solid.move", bodies=["Bogie"], translate=["bogie_x", "0 mm", "0 mm"]),
             c("solid.move", bodies=["Bogie (2)"], translate=["-bogie_x", "0 mm", "0 mm"])]
    parts = [("CDeck", coach_deck), ("CBody", coach_body), ("CRoof", coach_roof)]
    for nm, fn in parts:
        cmds += fn(nm)
    movers = ["Bogie", "Bogie (2)"] + [p for p, _ in parts]
    cmds.append(c("solid.move", bodies=movers, translate=[xc, "0 mm", AXLE_Z]))
    cmds += [c("appearance.assign", bodies=["Bogie", "Bogie (2)"], color="#202020"),
             c("appearance.assign", bodies=["CDeck"], color=BLACK),
             c("appearance.assign", bodies=["CBody"], color="#2f5a2a"),
             c("appearance.assign", bodies=["CRoof"], color="#8a8a8a")]
    return cmds


UPSIDE_DOWN = lambda b: [c("solid.move", bodies=[b], axis=[1, 0, 0], angle="180 deg")]
ON_END = lambda b: [c("solid.move", bodies=[b], axis=[0, 1, 0], angle="90 deg")]
REAR_DOWN = lambda b: [c("solid.move", bodies=[b], axis=[0, 1, 0], angle="-90 deg")]
ON_SIDE = lambda b: [c("solid.move", bodies=[b], axis=[1, 0, 0], angle="-90 deg")]


PARTS = {
    # ad: (komutlar, gövdeler, baskı yönü komutları)
    "ray_duz_200": (straight_track, "Track", []),
    "ray_viraj_r750_15": (curve_track, "Curve", []),
    "tekerlek_test_d42": (wheel, "Wheel", []),
    "pul_aks_4mm": (spacer, "Spacer", []),
    "sasi_test_040": (frame, "Frame",
                      [c("solid.move", bodies=["Frame"], axis=[1, 0, 0], angle="-90 deg")]),
    "tolerans_kuponu": (coupon, "Coupon", []),
    "montaj_kontrol": (assembly, None, None),
    "sasi_motorlu_040": (motor_frame, "Frame",
                         [c("solid.move", bodies=["Frame"], axis=[1, 0, 0], angle="-90 deg")]),
    "sonsuz_vida_m1": (worm, "Worm", []),
    "karsi_disli_m1_z30": (worm_wheel, "WormWheel", []),
    "montaj_motorlu": (drive_on_track, None, None),
    # Faz 3
    "lok_platform_on": (loco_footplate_front, "FootplateF", UPSIDE_DOWN("FootplateF")),
    "lok_platform_arka": (loco_footplate_rear, "FootplateR", UPSIDE_DOWN("FootplateR")),
    "lok_kazan": (boiler, "Boiler", REAR_DOWN("Boiler")),
    "lok_kabin": (cab, "Cab", []),
    "lok_kabin_cati": (cab_roof, "CabRoof", ON_END("CabRoof")),
    "lok_baca": (chimney, "Chimney", UPSIDE_DOWN("Chimney")),
    "lok_buhar_domu": (steam_dome, "SteamDome", UPSIDE_DOWN("SteamDome")),
    "lok_kum_domu": (sand_dome, "SandDome", UPSIDE_DOWN("SandDome")),
    "lok_emniyet_ventili": (safety_valve, "SafetyValve", UPSIDE_DOWN("SafetyValve")),
    "ceki_kolu": (drawbar, "Drawbar", []),
    "tender_sasi": (tender_frame, "TFrame", ON_SIDE("TFrame")),
    "tender_platform": (tender_deck, "TDeck", UPSIDE_DOWN("TDeck")),
    "tender_depo": (tender_tank, "TTank", UPSIDE_DOWN("TTank")),
    "tender_kapak": (tender_lid, "TLid", []),
    "vagon_boji": (bogie, "Bogie", ON_SIDE("Bogie")),
    "vagon_platform": (coach_deck, "CDeck", UPSIDE_DOWN("CDeck")),
    "vagon_govde": (coach_body, "CBody", []),
    "vagon_cati": (coach_roof, "CRoof", ON_END("CRoof")),
    "lokomotif_montaj": (loco_assembly, None, None),
    "tender_montaj": (tender_assembly, None, None),
    "vagon_montaj": (coach_assembly, None, None),
}


def _rot(v, axis, deg):
    """Eksen-açı dönüşü (Rodrigues), axis birim vektör."""
    a = math.radians(deg)
    k = axis
    cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]
    d = sum(k[i] * v[i] for i in range(3))
    return [v[i] * math.cos(a) + cr[i] * math.sin(a) + k[i] * d * (1 - math.cos(a)) for i in range(3)]


def bed_drop(part, body, orient):
    """Baskı yönündeki parçayı yatağa (z=0) oturt ve XY'de ortala (ölçüm kutusundan)."""
    d = json.loads((ROOT / "out" / f"{part}.measure.json").read_text())
    lo = [min(b["bbox"]["min"][i] for b in d["bodies"]) for i in range(3)]
    hi = [max(b["bbox"]["max"][i] for b in d["bodies"]) for i in range(3)]
    pts = [[(lo, hi)[(n >> i) & 1][i] for i in range(3)] for n in range(8)]
    for cmd in orient:
        prm = cmd["params"]
        if "axis" in prm and "angle" in prm:
            deg = float(str(prm["angle"]).replace("deg", "").strip())
            pts = [_rot(p, prm["axis"], deg) for p in pts]
    mn = [min(p[i] for p in pts) for i in range(3)]
    mx = [max(p[i] for p in pts) for i in range(3)]
    t = [-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]]
    bodies = [b["name"] for b in d["bodies"]]
    return [c("solid.move", bodies=bodies, translate=[f"{v:.4f} mm" for v in t])]


# İnceleme amaçlı (BASILMAZ) renkli montaj 3MF'leri: dünya koordinatında, ray hariç.
# Site 3B görüntüleyicisi için; parts_manifest.py bunları basılacak parça listesine almaz.
REVIEW_3MF = {"lokomotif_montaj": ("Track",), "tender_montaj": ("Track",),
              "vagon_montaj": ("Track",)}


def export_review_3mf(part):
    d = json.loads((ROOT / "out" / f"{part}.measure.json").read_text())
    skip = REVIEW_3MF[part]
    bodies = [b["name"] for b in d["bodies"] if not b["name"].startswith(skip)]
    ps = ROOT / "scripts" / f"{part}.review3mf.json"
    ps.write_text(json.dumps({"commands": [c("file.export", path=win(ROOT / "out" / "3mf" / f"{part}.3mf"),
                                             format="3mf", bodies=bodies)]}, indent=1))
    r = subprocess.run([CLI, "run", win(ps), "--in", win(ROOT / "designs" / f"{part}.sc"), "--quiet"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f"{part}: inceleme 3MF dışa aktarımı başarısız")


def win(p: Path) -> str:
    return subprocess.check_output(["wslpath", "-w", str(p)], text=True).strip()


def run(part):
    fn, body, orient = PARTS[part]
    cmds = params_cmds() + fn()
    for d in ("scripts", "designs", "out/step", "out/stl", "out/3mf", "renders"):
        (ROOT / d).mkdir(parents=True, exist_ok=True)
    script = ROOT / "scripts" / f"{part}.json"
    script.write_text(json.dumps({"commands": cmds}, indent=1, ensure_ascii=False))
    args = [CLI, "run", win(script), "--save", win(ROOT / "designs" / f"{part}.sc"),
            "--out", win(ROOT / "out" / "step" / f"{part}.step"),
            "--json-out", win(ROOT / "out" / f"{part}.measure.json")]
    if orient is not None and not orient:
        args += ["--out", win(ROOT / "out" / "stl" / f"{part}.stl"),
                 "--out", win(ROOT / "out" / "3mf" / f"{part}.3mf")]
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        raise SystemExit(f"{part}: başarısız")
    if orient is not None:
        orient = orient + bed_drop(part, body, orient)
    if orient:
        ps = ROOT / "scripts" / f"{part}.print.json"
        ps.write_text(json.dumps({"commands": orient}, indent=1))
        r = subprocess.run([CLI, "run", win(ps), "--in", win(ROOT / "designs" / f"{part}.sc"),
                            "--out", win(ROOT / "out" / "stl" / f"{part}.stl"),
                            "--out", win(ROOT / "out" / "3mf" / f"{part}.3mf"), "--quiet"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stdout[-3000:], r.stderr[-3000:])
            raise SystemExit(f"{part}: baskı yönü başarısız")
    if part in REVIEW_3MF:
        export_review_3mf(part)
    subprocess.run([CLI, "snapshot", "--in", win(ROOT / "designs" / f"{part}.sc"),
                    "--out", win(ROOT / "renders" / f"{part}.png"), "--view", "iso",
                    "--width", "1200", "--height", "700"], capture_output=True, text=True)
    print(f"{part}: tamam")


if __name__ == "__main__":
    for p in (sys.argv[1:] or list(PARTS)):
        run(p)
