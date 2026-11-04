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


def frame(name="Frame"):
    cmds = []
    for s, nm in ((1, "L"), (-1, "R")):
        ycorner = PLATE_YI if s > 0 else f"-{PLATE_YO}"
        cmds.append(c("solid.box", length="plate_len", width="plate_t",
                      height="plate_above + plate_below",
                      corner=["-plate_len/2", ycorner, "-plate_below"],
                      operation="new" if s > 0 else "join",
                      **({"body_name": name} if s > 0 else {"targets": [name]}),
                      name=f"Plate{nm}"))
    for s, nm in ((1, "F"), (-1, "B")):
        cmds.append(c("solid.box", length="xm_size", width=f"2 * {PLATE_YI} + 2 mm",
                      height="xm_size",
                      corner=[f"{s} * xm_x - xm_size/2", f"-{PLATE_YI} - 1 mm",
                              "plate_above - xm_size"],
                      operation="join", targets=[name], name=f"Cross{nm}"))
        cmds.append(c("solid.cylinder", diameter="m3_tap", height="xm_size",
                      base=[f"{s} * xm_x", "0 mm", "plate_above - xm_size"], axis="Z",
                      operation="cut", targets=[name], name=f"DeckHole{nm}"))
    for s, nm in ((1, "F"), (-1, "B")):
        x = f"{s} * wheelbase/2"
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
}


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
    subprocess.run([CLI, "snapshot", "--in", win(ROOT / "designs" / f"{part}.sc"),
                    "--out", win(ROOT / "renders" / f"{part}.png"), "--view", "iso",
                    "--width", "1200", "--height", "700"], capture_output=True, text=True)
    print(f"{part}: tamam")


if __name__ == "__main__":
    for p in (sys.argv[1:] or list(PARTS)):
        run(p)
