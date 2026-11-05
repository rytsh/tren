// Static catalog drawings: the locomotive, tender and coach of the project (cad/params.json, phase 3), plus four
// small part icons. Explanatory pictures, not production geometry. Each SVG embeds its own CSS, scoped to the
// root class `.tcat`, with plain colours (no page variables) and id prefixes, so it can be inlined anywhere.
// Vehicle frame: x along the track (+x front), y across (+y toward the viewer), z up from the rail top.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import { OUT, scene } from "../common.mjs";
import { rtPrism, rtSpokes } from "../runtime.mjs";
import { makeCar } from "./cars.mjs";

const AXLE_H = 21; // axle centre above the rail top
const Z = (zAxle) => zAxle + AXLE_H; // a height from params (axle frame) on the rail-top frame

const CSS = `
.tcat{overflow:visible}
.tcat path,.tcat circle{vector-effect:non-scaling-stroke}
.tcat .iso-fill{fill:#faf5e4;stroke:none}
.tcat .iso-shade,.tcat .iso-top{stroke:none}
.tcat .iso-shade[data-shade="0"]{fill:#d6caa3}
.tcat .iso-shade[data-shade="1"]{fill:#e0d6b6}
.tcat .iso-shade[data-shade="2"]{fill:#ebe3c9}
.tcat .iso-shade[data-shade="3"]{fill:#f4eedb}
.tcat .iso-top{fill:#fdfaf0}
.tcat [data-seamless]>.iso-shade,.tcat [data-seamless]>.iso-top{stroke-width:.5;stroke-linejoin:round}
.tcat [data-seamless]>.iso-shade[data-shade="0"]{stroke:#d6caa3}
.tcat [data-seamless]>.iso-shade[data-shade="1"]{stroke:#e0d6b6}
.tcat [data-seamless]>.iso-shade[data-shade="2"]{stroke:#ebe3c9}
.tcat [data-seamless]>.iso-shade[data-shade="3"]{stroke:#f4eedb}
.tcat [data-seamless]>.iso-top{stroke:#fdfaf0}
.tcat .iso-line{fill:none;stroke:#6e6448;stroke-width:.75;stroke-linecap:round;stroke-linejoin:round}
.tcat .iso-line[data-tone="hi"]{stroke:#2b2616}
.tcat .iso-line[data-tone="mid"]{stroke:#6e6448}
.tcat .iso-line[data-tone="lo"]{stroke:#998d6a}
.tcat .iso-line[data-tone="faint"]{stroke:#c4b78f}
.tcat .iso-edge{stroke-width:1.05}
.tcat .iso-crease{stroke-width:.6}
.tcat .iso-dots circle{fill:#2b2616;stroke:none;opacity:.55}
.tcat .iso-dots[data-tone="hi"] circle{opacity:.9}
.tcat .iso-dots[data-tone="lo"] circle{opacity:.35}
.tcat .iso-halo{fill:#7a6f50;opacity:.28;filter:blur(7px)}
.tcat .rt-red>.iso-fill{fill:#b3262a}
.tcat .rt-red>.iso-shade[data-shade="0"]{fill:#8e1b1f}
.tcat .rt-red>.iso-shade[data-shade="1"]{fill:#a42226}
.tcat .rt-red>.iso-shade[data-shade="2"]{fill:#b8292d}
.tcat .rt-red>.iso-shade[data-shade="3"]{fill:#c83236}
.tcat .rt-red>.iso-top{fill:#d64246}
.tcat .rt-red[data-seamless]>.iso-shade[data-shade="0"]{stroke:#8e1b1f}
.tcat .rt-red[data-seamless]>.iso-shade[data-shade="1"]{stroke:#a42226}
.tcat .rt-red[data-seamless]>.iso-shade[data-shade="2"]{stroke:#b8292d}
.tcat .rt-red[data-seamless]>.iso-shade[data-shade="3"]{stroke:#c83236}
.tcat .rt-red[data-seamless]>.iso-top{stroke:#d64246}
.tcat .rt-red>.iso-edge{stroke:#3d0c0e}
.tcat .rt-red>.iso-line[data-tone="faint"],.tcat .rt-red>.iso-crease{stroke:#7a1518}
.tcat .tc-red-line{stroke:#5c1013!important}
.tcat .tc-hole{fill:#3d3622;stroke:#2b2616;stroke-width:.9}
.tcat .tc-glass{fill:#3c5465;stroke:#2b2616;stroke-width:.9}
.tcat .tc-lens{fill:#fff6d8;stroke:#2b2616;stroke-width:.9}
.tcat .tc-lamp{fill:#efe2b4;stroke:#2b2616;stroke-width:.9}
.tcat .tc-led{fill:#3a3320;stroke:#2b2616;stroke-width:.6}
.tcat .tc-grille{fill:#3d3622;stroke:#2b2616;stroke-width:.7}
.tcat .tc-glow{opacity:0;pointer-events:none}
.tcat .tc-signal>.iso-fill{fill:#e9b824}
.tcat .tc-signal>.iso-shade[data-shade="0"]{fill:#b58a12}
.tcat .tc-signal>.iso-shade[data-shade="1"]{fill:#c79a16}
.tcat .tc-signal>.iso-shade[data-shade="2"]{fill:#d8aa1c}
.tcat .tc-signal>.iso-shade[data-shade="3"]{fill:#e5b620}
.tcat .tc-signal>.iso-top{fill:#f2c94a}
.tcat .tc-signal>.iso-edge{stroke:#4a3a08}
.tcat.lit .tc-glass{fill:#ffd779}
.tcat.lit .tc-lamp,.tcat.lit .tc-lens{fill:#fff1b8}
.tcat.lit .tc-led{fill:#ffb23a}
.tcat.lit .tc-led[data-c="g"]{fill:#7be08f}
.tcat.lit .tc-led[data-c="b"]{fill:#6fb6ff}
.tcat.lit .tc-glow{opacity:1}
`;

const alongX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const alongY = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [1, 0, 0], [0, 0, 1]);
const alongZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

const RAIL = { gauge: 45, head: 5, headH: 2.5, web: 3, foot: 9, h: 8 };
const TIE = { len: 66, w: 8, t: 5, pitch: 20 };
const RAIL_Y = RAIL.gauge / 2 + RAIL.head / 2;
const TIE_TOP = -RAIL.h; // rail top at z = 0, ties below

function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, c = 0.6;
  const z0 = TIE_TOP, zf = z0 + 1.6, zh = -RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, zf], [yc + wb, zf + 1.2], [yc + wb, zh], [yc + h, zh], [yc + h, -c], [yc + h - c, 0], [yc - h + c, 0], [yc - h, -c], [yc - h, zh], [yc - wb, zh], [yc - wb, zf + 1.2], [yc - f, zf]];
}

function svgOf({ id, width, height, label, body, P, fade, defs: extraDefs = "" }) {
  const defs = [extraDefs];
  if (fade) {
    const a = k.iso([fade[0], 0, 0], P);
    const b = k.iso([fade[1], 0, 0], P);
    defs.push(
      `<linearGradient id="${id}-fade" gradientUnits="userSpaceOnUse" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
        `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${width + 200}" height="${height + 200}"><rect x="-100" y="-100" width="${width + 200}" height="${height + 200}" fill="url(#${id}-fade)"/></mask>`,
    );
  }
  const text = body.replace(/__MASK__/g, `url(#${id}-mask)`);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="tcat tcat-${id}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><style>${CSS}</style><defs>${defs.join("")}</defs>${text}</svg>\n`;
}

// A short piece of track drawn under a vehicle: ties and rails, faded out at both ends.
function track(P, x0, x1) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const out = [];
  const ties = [];
  for (let x = Math.ceil(x0 / TIE.pitch) * TIE.pitch; x <= x1; x += TIE.pitch) ties.push(x);
  ties.sort((a, b) => k.depthOf([a, 0, 0], P) - k.depthOf([b, 0, 0], P));
  for (const x of ties) out.push(S(k.slabOf({ x: x - TIE.w / 2, y: -TIE.len / 2, w: TIE.w, d: TIE.len, r: 0.8 }, TIE_TOP - TIE.t, TIE.t, P, 3, 0.4), { tone: "mid" }));
  const XF = alongX([0, 0, 0]);
  for (const sign of [-1, 1]) out.push(S(rtPrism(XF, railPoly(sign * RAIL_Y), x0, x1, P), { tone: "hi" }));
  return `<g mask="__MASK__">${out.join("")}</g>`;
}

const halo = (P, plan, z) => `<path class="iso-halo" d="${k.haloOf(plan, z, 1, P)}"/>`;

// ── shared vehicle parts ──
const WHEEL_R = 21;
const FLANGE_R = 23.5;
const BACK = 20;
const WIDTH = 7.5;
function wheelset(Sc, x, { spokes = 10, nearOnly = false, prefix = "wheel" } = {}) {
  const { P, turned, disc, Ln, Dots, at } = Sc;
  const flange = [[BACK, FLANGE_R - 0.7], [BACK + 0.5, FLANGE_R], [BACK + 1.2, FLANGE_R], [BACK + 1.8, WHEEL_R + 0.3]];
  const tread = [[BACK + 1.8, WHEEL_R], [BACK + WIDTH, WHEEL_R - 0.3]];
  const OUTER = BACK + WIDTH;
  for (const sign of nearOnly ? [1] : [-1, 1]) {
    const F = alongY([x, 0, AXLE_H], sign);
    turned(`${prefix}.flange`, F, flange, { tone: "hi", className: "rt-red" });
    const face = sign > 0
      ? `<g class="tc-red-face">${Ln(circleY(P, OUTER, x, AXLE_H, WHEEL_R - 3.6) + circleY(P, OUTER, x, AXLE_H, 6.2), { tone: "hi", className: "tc-red-line" })}${Ln(rtSpokes([x, 0, AXLE_H], OUTER, 6.2, WHEEL_R - 3.6, spokes, Math.PI / spokes, P), { tone: "hi", className: "tc-red-line" })}</g>`
      : "";
    turned(`${prefix}.tread`, F, tread, { tone: "hi", className: "rt-red" }, { extra: face });
    if (sign > 0) disc(`${prefix}.hub`, alongY([x, 0, AXLE_H]), OUTER, OUTER + 2, 4, { tone: "hi" }, { extra: Dots([at([x, OUTER + 2, AXLE_H])], { size: 0.8, tone: "hi" }) });
  }
}
function circleY(P, y, cx, cz, r, n = 56) {
  return k.pathOf(Array.from({ length: n }, (_, i) => k.iso([cx + r * Math.cos((i / n) * 2 * Math.PI), y, cz + r * Math.sin((i / n) * 2 * Math.PI)], P)), true);
}
function circleX(P, x, cy, cz, r, n = 48) {
  return k.pathOf(Array.from({ length: n }, (_, i) => k.iso([x, cy + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)], P)), true);
}
const rectY = (P, y, x0, x1, z0, z1, r) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 5).map(([x, z]) => k.iso([x, y, z], P)), true);
const rectX = (P, x, y0, y1, z0, z1, r) => k.pathOf(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 5).map(([y, z]) => k.iso([x, y, z], P)), true);

// Buffer beam with two buffers and a hook on one end (sign +1 front, -1 rear), beam outer face at x = face.
function beamEnd(Sc, face, sign, { half = 47.5, zb = Z(10), zt = Z(29), red = true } = {}) {
  const { box, disc, Dots, at, P, Ln } = Sc;
  const x0 = sign > 0 ? face - 4 : face;
  box("beam", [x0, -half, zb], [x0 + 4, half, zt], { tone: "hi", className: red ? "rt-red" : undefined }, {
    r: 0.6,
    bevel: 0.4,
    extra: Dots([-38, -20, 20, 38].map((y) => at([sign > 0 ? face : face, y, zt - 3])), { size: 0.55, tone: "hi" }),
  });
  for (const y of [-30, 30]) {
    const F = G.frameOf([face, y, Z(18)], [sign, 0, 0], [0, 1, 0], [0, 0, 1]);
    disc("buffer.stock", F, 0, 5.5, 5, { tone: "hi" }, { bevel: 0.3 });
    disc("buffer.rod", F, 5.5, 6, 3, { tone: "hi" });
    disc("buffer.head", F, 6, 8, 7, { tone: "hi" }, { bevel: 0.4 });
  }
  const H = G.frameOf([face, 0, Z(18)], [sign, 0, 0], [0, 1, 0], [0, 0, 1]);
  Sc.prism("hook", H, [[-3, -2.4], [3, -2.4], [3, 2.4], [-3, 2.4]], 0, 5, { tone: "hi" });
  void Ln;
  void P;
}

// ── locomotive ──
function locomotive() {
  const W = 800, H = 500;
  const L = { x0: -150, x1: 150 };
  const P = k.fitProjection([[-175, -36, -13], [175, 36, -13], [-150, 48, 0], [150, -48, 0], [-144, -45, Z(127) + 5], [111.5, 0, 155]], W, H, { pad: 14, azimuth: 58, elevation: 26 });
  const Sc = scene(P);
  const { box, prism, turned, disc, Ln, Dots, at, put, record } = Sc;
  const FP = { z0: Z(26), z1: Z(29), half: 47.5, x0: -142, x1: 142 };

  for (const x of [-35, 35]) wheelset(Sc, x, { spokes: 12 });
  // frame plates between the wheels, under the footplate
  for (const y of [-19, 13]) box("frame", [-65, y, Z(-10)], [65, y + 6, FP.z0], { tone: "hi" }, { r: 1, extra: y > 0 ? Ln([-35, 35].map((x) => circleY(P, y + 6, x, AXLE_H, 4.5)).join(""), { tone: "mid" }) : "" });
  // cylinders under the front of the footplate
  for (const y of [-34, 34]) {
    const F = alongX([0, y, Z(16.5)]);
    turned("cylinder", F, [[68, 9.6], [69.5, 11], [100.5, 11], [102, 9.6]], { tone: "hi" }, {
      inner: Ln(G.arcOf(F, 74, 11, P) + G.arcOf(F, 96, 11, P), { tone: "mid" }),
      extra: y > 0 ? Dots([0, 1, 2, 3, 4, 5].map((i) => at([102, y + 7 * Math.cos(i), Z(16.5) + 7 * Math.sin(i)])), { size: 0.5, tone: "hi" }) : "",
    });
  }
  // footplate with valance
  const fpPlan = { x: FP.x0, y: -FP.half, w: FP.x1 - FP.x0, d: FP.half * 2, r: 1.5 };
  box("valance", [FP.x0 + 4, FP.half - 2, FP.z0 - 6], [FP.x1 - 4, FP.half, FP.z0], { tone: "hi" }, { r: 0.4, steps: 2 });
  box("footplate", [FP.x0, -FP.half, FP.z0], [FP.x1, FP.half, FP.z1], { tone: "hi" }, { r: 1.5, bevel: 0.5, extra: Dots(Array.from({ length: 13 }, (_, i) => at([FP.x0 + 14 + i * 22, FP.half - 1.6, FP.z1])), { size: 0.45, tone: "hi" }) });
  void fpPlan;
  beamEnd(Sc, 146, 1);
  beamEnd(Sc, -146, -1);
  // steps under the cab
  box("step", [-118, FP.half - 6, Z(4)], [-104, FP.half + 1, Z(5.6)], { tone: "hi" }, { r: 0.4, steps: 2 });
  box("step.hanger", [-117, FP.half - 1, Z(5.6)], [-115, FP.half + 1, FP.z0], { tone: "hi" }, { r: 0.2, steps: 2 });
  box("step.hanger", [-107, FP.half - 1, Z(5.6)], [-105, FP.half + 1, FP.z0], { tone: "hi" }, { r: 0.2, steps: 2 });

  // boiler skirt and smokebox saddle
  box("skirt", [-71.7, -23, FP.z1], [95, 23, Z(66)], { tone: "hi" }, { r: 0.6 });
  box("saddle", [97, -26, FP.z1], [126, 26, Z(66)], { tone: "hi" }, { r: 1, bevel: 0.4 });
  // boiler with two bands
  const BF = alongX([0, 0, Z(66)]);
  const bands = [-35, 35];
  const segs = [[-71.7, -36.25], [-33.75, 33.75], [36.25, 95]];
  segs.forEach(([s0, s1], i) => turned("boiler", BF, [[s0, 28], [s1, 28]], { tone: "hi" }, { extra: i === 0 ? Dots(Array.from({ length: 7 }, (_, j) => { const a = -0.2 + j * 0.42; return at([-69.5, 28 * Math.cos(a) * 0 + 28 * Math.sin(a), Z(66) + 28 * Math.cos(a)]); }), { size: 0.45, tone: "hi" }) : "" }));
  bands.forEach((x) => disc("boiler.band", BF, x - 1.25, x + 1.25, 28.8, { tone: "hi" }));
  // smokebox, ring, door, lamp
  turned("smokebox", BF, [[95, 31], [125.5, 31]], { tone: "hi" }, { inner: Ln(G.arcOf(BF, 98, 31, P), { tone: "mid" }) });
  disc("smokebox.ring", BF, 125.5, 128, 32, { tone: "hi" }, { bevel: 0.3 });
  turned("smokebox.door", BF, [[128, 30], [138, 20]], { tone: "hi" }, {
    extra: Dots(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 2 * Math.PI; return at([138, 17 * Math.cos(a), Z(66) + 17 * Math.sin(a)]); }).filter((_, i) => i !== 2 && i !== 3), { size: 0.5, tone: "hi" }) +
      Ln(k.pathOf([at([138, -10, Z(58)]), at([138, 10, Z(58)])]), { tone: "hi" }) + Dots([at([138, -10, Z(58)]), at([138, 10, Z(58)])], { size: 0.9, tone: "hi" }),
  });
  const LF = alongX([0, 0, Z(78)]);
  disc("lamp", LF, 138, 145, 7, { tone: "hi" }, { bevel: 0.3, extra: `<path class="tc-lens" d="${circleX(P, 145, 0, Z(78), 4.6, 32)}"/>` });
  // chimney, domes, safety valve (profiles from params: seat Ø27, Ø28, Ø22, Ø18)
  const top = Z(66) + 28;
  const sbTop = Z(66) + 31;
  turned("chimney", alongZ([111.5, 0, 0]), [[sbTop - 3, 13.5], [sbTop + 1, 11.5, 1], [sbTop + 3, 8.4, 1], [148, 8], [148, 10.6], [151, 11], [155, 10.2]], { tone: "hi" }, {
    inner: Ln(G.arcOf(alongZ([111.5, 0, 0]), 148, 10.6, P), { tone: "mid" }),
    extra: `<path class="tc-hole" d="${k.ring(111.5, 0, 6.4, 155, P, 40)}"/>`,
  });
  const domeProfile = (z0, r0, r, h) => [[z0 - 3, r0], [z0 + 2, r - 0.4, 1], [z0 + 3.5, r, 1], [z0 + h - r * 0.55, r, 1], [z0 + h - r * 0.2, r * 0.75, 1], [z0 + h, r * 0.2, 1]];
  turned("dome", alongZ([10, 0, 0]), domeProfile(top, 14, 11, 17), { tone: "hi" });
  turned("sanddome", alongZ([60, 0, 0]), domeProfile(top, 11, 8.5, 14), { tone: "hi" });
  const VF = alongZ([-46, 0, 0]);
  turned("valve", VF, [[top - 3, 9], [top + 3, 8, 1], [top + 5, 4.6], [top + 15, 4.6], [top + 15, 6.2], [top + 19, 6.2], [top + 23, 2.4]], { tone: "hi" });
  // handrail along the boiler side: a rod on knobs
  const RAILY = 31.5, RAILZ = Z(66) + 10;
  for (const x of [-60, -20, 20, 60, 90]) box("rail.knob", [x - 0.8, 27.4 * Math.sin(Math.acos(10 / 28.2)) - 0.5, RAILZ - 0.8], [x + 0.8, RAILY, RAILZ + 0.8], { tone: "hi" }, { r: 0.3, steps: 1 });
  put("handrail", [15, RAILY, RAILZ], Ln(k.pathOf([at([-64, RAILY, RAILZ]), at([94, RAILY, RAILZ])]), { tone: "hi" }) + Dots([at([-64, RAILY, RAILZ]), at([94, RAILY, RAILZ])], { size: 0.9, tone: "hi" }), [record(Sc.A.box([-64, RAILY - 0.5, RAILZ - 0.5], [94, RAILY + 0.5, RAILZ + 0.5], { name: "handrail" }))], { bias: 0.5 });

  // cab: prism along x of the arched section (y, z)
  const CAB = { x0: -142, x1: -72, half: 43, z0: FP.z1, side: Z(117), crown: Z(127) };
  const R = (CAB.half ** 2 + (CAB.crown - CAB.side) ** 2) / (2 * (CAB.crown - CAB.side));
  const zc = CAB.crown - R;
  const arc = (half, rr, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const y = half - (2 * half * i) / n; return [y, zc + Math.sqrt(Math.max(0, rr * rr - y * y))]; });
  const cabPoly = [[-CAB.half, CAB.z0], [CAB.half, CAB.z0], ...arc(CAB.half, R)];
  const cabF = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const sideWin = `<path class="tc-glass" d="${rectY(P, CAB.half, -124, -92, Z(72), Z(104), 5)}"/>` + Ln(rectY(P, CAB.half, -126, -90, Z(70), Z(106), 6), { tone: "mid" });
  const frontWins = [-30, 30].map((y) => `<path class="tc-glass" d="${circleX(P, CAB.x1, y, Z(100), 8, 40)}"/>` + Ln(circleX(P, CAB.x1, y, Z(100), 10, 40), { tone: "mid" })).join("");
  const rivets = Dots([...Array.from({ length: 8 }, (_, i) => at([CAB.x0 + 6 + i * 8.3, CAB.half, CAB.z0 + 4])), ...Array.from({ length: 8 }, (_, i) => at([CAB.x0 + 6 + i * 8.3, CAB.half, CAB.side - 4]))], { size: 0.45, tone: "hi" });
  prism("cab", cabF, cabPoly, CAB.x0, CAB.x1, { tone: "hi" }, { extra: sideWin + frontWins + rivets + Ln(k.pathOf([at([CAB.x0, CAB.half, Z(64)]), at([CAB.x1, CAB.half, Z(64)])]), { tone: "mid" }) });
  const roofPoly = [...arc(CAB.half + 2, R + 0.2), ...arc(CAB.half + 2, R + 2.6).reverse()];
  prism("cab.roof", cabF, roofPoly, CAB.x0 - 2, CAB.x1 + 2, { tone: "hi" });
  // grab handle beside the cab door
  put("cab.grab", [-90, CAB.half + 1.5, Z(80)], Ln(k.pathOf([at([-88, CAB.half + 1.5, Z(60)]), at([-88, CAB.half + 1.5, Z(108)])]), { tone: "hi" }) + Dots([at([-88, CAB.half + 1.5, Z(60)]), at([-88, CAB.half + 1.5, Z(108)])], { size: 0.9, tone: "hi" }), [record(Sc.A.box([-88.5, CAB.half + 1, Z(60)], [-87.5, CAB.half + 2, Z(108)], { name: "grab" }))], { bias: 0.5 });

  const [lx, ly] = at([147, 0, Z(78)]);
  const beam = `<g class="tc-glows"><circle class="tc-glow" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="34" fill="url(#loco-glow)"/></g>`;
  const body = [halo(P, { x: -150, y: -45, w: 300, d: 90, r: 20 }, -13), track(P, -175, 175), Sc.finish(), beam].join("");
  return svgOf({ defs: `<radialGradient id="loco-glow"><stop offset="0" stop-color="#ffe08a" stop-opacity=".9"/><stop offset=".4" stop-color="#ffc84a" stop-opacity=".3"/><stop offset="1" stop-color="#ffc84a" stop-opacity="0"/></radialGradient>`, id: "loco", width: W, height: H, label: "Klasik Avrupa tipi 0-4-0 buharlı lokomotif: kazan, duman kutusu, baca, buhar ve kum domu, kemerli çatılı kabin, büyük kırmızı tekerlekler.", body, P, fade: [-175, 175] });
}

// ── tender ──
function tender() {
  const W = 800, H = 500;
  const P = k.fitProjection([[-112, -36, -13], [112, 36, -13], [-82, 46, 0], [82, -46, 0], [-72, -45, Z(92) + 10], [72, 45, Z(92) + 10]], W, H, { pad: 14, azimuth: 52, elevation: 26 });
  const Sc = scene(P);
  const { box, Ln, Dots, at } = Sc;
  for (const x of [-35, 35]) wheelset(Sc, x, { spokes: 10 });
  for (const y of [-19, 13]) box("frame", [-52, y, Z(-10)], [52, y + 6, Z(26)], { tone: "hi" }, { r: 1, extra: y > 0 ? Ln([-35, 35].map((x) => circleY(P, y + 6, x, AXLE_H, 4.5)).join(""), { tone: "mid" }) : "" });
  // axleboxes on the outside of the frame
  for (const x of [-35, 35]) box("axlebox", [x - 5, 19, AXLE_H - 5], [x + 5, 21, AXLE_H + 6], { tone: "hi" }, { r: 0.6, steps: 2 });
  const FP = { x0: -72, x1: 72, half: 45, z0: Z(26), z1: Z(29) };
  box("valance", [FP.x0 + 4, FP.half - 2, FP.z0 - 6], [FP.x1 - 4, FP.half, FP.z0], { tone: "hi" }, { r: 0.4, steps: 2 });
  box("footplate", [FP.x0, -FP.half, FP.z0], [FP.x1, FP.half, FP.z1], { tone: "hi" }, { r: 1.5, bevel: 0.5 });
  beamEnd(Sc, 76, 1, { half: 45 });
  beamEnd(Sc, -76, -1, { half: 45 });
  const T = { x0: -70, x1: 70, half: 43, z0: FP.z1, z1: Z(92) };
  const tPlan = { x: T.x0, y: -T.half, w: T.x1 - T.x0, d: T.half * 2, r: 2 };
  const panel = Ln([-35, 0, 35].map((x) => k.pathOf([at([x, T.half, T.z0]), at([x, T.half, T.z1 - 6])])).join(""), { tone: "mid" });
  const rivets = Dots([...Array.from({ length: 16 }, (_, i) => at([T.x0 + 5 + i * 8.6, T.half, T.z1 - 9])), ...Array.from({ length: 16 }, (_, i) => at([T.x0 + 5 + i * 8.6, T.half, T.z0 + 4]))], { size: 0.45, tone: "hi" });
  box("tank", [T.x0, -T.half, T.z0], [T.x1, T.half, T.z1 - 6], { tone: "hi" }, { r: 2, steps: 4, bevel: 0.5, inner: panel, extra: rivets });
  // coping: the flared top edge
  box("tank.coping", [T.x0 - 1, -T.half - 1, T.z1 - 6], [T.x1 + 1, T.half + 1, T.z1], { tone: "hi" }, { r: 2.5, steps: 4, bevel: 0.5, inner: Ln(k.sideSeam({ x: T.x0 - 1, y: -T.half - 1, w: T.x1 - T.x0 + 2, d: T.half * 2 + 2, r: 2.5 }, T.z1 - 3, P, 4), { tone: "mid" }), extra: Ln(k.planOutline(k.insetPlan(tPlan, 2), T.z1, P, 4), { tone: "mid" }) });
  // coal lid with its coal board and the heap
  box("lid", [-10, -38, T.z1], [58, 38, T.z1 + 2.5], { tone: "hi" }, { r: 1, bevel: 0.4 });
  box("lid.board", [-10, -38, T.z1 + 2.5], [-8.4, 38, T.z1 + 10.5], { tone: "hi" }, { r: 0.3, steps: 2 });
  const heap = [[-8.4, -34], [56, -34], [56, 34], [-8.4, 34]];
  const HF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  void heap;
  void HF;
  box("coal", [-6, -33, T.z1 + 2.5], [54, 33, T.z1 + 6.5], { tone: "mid" }, { r: 6, steps: 6, extra: Dots(Array.from({ length: 70 }, (_, i) => at([-2 + ((i * 37) % 52), -29 + ((i * 53) % 58), T.z1 + 6.5])), { size: 0.7, tone: "hi" }) });
  // filler on the rear deck, toolbox lid
  Sc.disc("filler", alongZ([-48, 0, 0]), T.z1, T.z1 + 3, 7, { tone: "hi" }, { bevel: 0.4, extra: Ln(k.ring(-48, 0, 4.4, T.z1 + 3, P, 32), { tone: "mid" }) });
  Sc.disc("filler.knob", alongZ([-48, 0, 0]), T.z1 + 3, T.z1 + 5, 1.4, { tone: "hi" });
  // ladder at the rear corner
  box("ladder.l", [-71, T.half - 6, FP.z1], [-70, T.half - 5, T.z1 - 6], { tone: "hi" }, { r: 0.2, steps: 1 });
  box("ladder.r", [-71, T.half - 15, FP.z1], [-70, T.half - 14, T.z1 - 6], { tone: "hi" }, { r: 0.2, steps: 1 });
  Sc.put("ladder.rungs", [-71, T.half - 10, Z(60)], Ln([0, 1, 2, 3, 4, 5].map((i) => k.pathOf([at([-71, T.half - 14, FP.z1 + 8 + i * 9]), at([-71, T.half - 6, FP.z1 + 8 + i * 9])])).join(""), { tone: "hi" }), [Sc.record(Sc.A.box([-71.5, T.half - 14, FP.z1], [-71, T.half - 6, T.z1 - 6], { name: "rungs" }))], { bias: 0.3 });
  const body = [halo(P, { x: -78, y: -44, w: 156, d: 88, r: 18 }, -13), track(P, -112, 112), Sc.finish()].join("");
  return svgOf({ id: "tender", width: W, height: H, label: "İki dingilli tender: kırmızı tekerlekler, kömür kapaklı su deposu ve iki uçta tamponlar. Pil ve şarj kontakları burada taşınır.", body, P, fade: [-112, 112] });
}

// ── coach ──
function coach() {
  const W = 800, H = 500;
  const C = { half: 45, x0: -98, x1: 98, z0: Z(30), side: Z(100), crown: Z(110) };
  const P = k.fitProjection([[-150, -36, -13], [150, 36, -13], [-110, 46, 0], [110, -46, 0], [-100, -47, C.crown + 3], [100, 47, C.crown + 3]], W, H, { pad: 14, azimuth: 56, elevation: 26 });
  const Sc = scene(P);
  const { box, prism, Ln, Dots, at, disc } = Sc;
  // bogies: side plates, bolster, four wheels each
  for (const bx of [-50, 50]) {
    for (const x of [bx - 24, bx + 24]) wheelset(Sc, x, { spokes: 8, prefix: "bogie.wheel" });
    for (const y of [-19, 13]) box("bogie.side", [bx - 32, y, Z(-9)], [bx + 32, y + 6, Z(11)], { tone: "hi" }, { r: 2, extra: y > 0 ? Ln([bx - 24, bx + 24].map((x) => circleY(P, y + 6, x, AXLE_H, 4.5)).join("") + rectY(P, y + 6, bx - 10, bx + 10, Z(-6), Z(8), 2), { tone: "mid" }) : "" });
    box("bogie.bolster", [bx - 5, -13, Z(5)], [bx + 5, 13, Z(11)], { tone: "hi" }, { r: 0.6 });
    disc("bogie.pivot", alongZ([bx, 0, 0]), Z(11), Z(26), 4, { tone: "hi" });
  }
  const FP = { x0: -106, x1: 106, z0: Z(26), z1: C.z0 };
  box("underframe", [FP.x0, -C.half, FP.z0], [FP.x1, C.half, FP.z1], { tone: "hi" }, { r: 1.2, bevel: 0.4 });
  box("truss", [-30, C.half - 3, Z(12)], [30, C.half - 1, FP.z0], { tone: "hi" }, { r: 0.4, steps: 2 });
  beamEnd(Sc, 110, 1, { half: 45, zb: Z(13) });
  beamEnd(Sc, -110, -1, { half: 45, zb: Z(13) });
  // body with arched roof
  const R = (C.half ** 2 + (C.crown - C.side) ** 2) / (2 * (C.crown - C.side));
  const zc = C.crown - R;
  const arc = (half, rr, n = 20) => Array.from({ length: n + 1 }, (_, i) => { const y = half - (2 * half * i) / n; return [y, zc + Math.sqrt(Math.max(0, rr * rr - y * y))]; });
  const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const pitch = 27, n = 6;
  const wins = Array.from({ length: n }, (_, i) => -((n - 1) * pitch) / 2 + i * pitch);
  const winSvg = wins.map((x) => `<path class="tc-glass" d="${rectY(P, C.half, x - 9, x + 9, Z(60), Z(86), 3)}"/>` + Ln(rectY(P, C.half, x - 10.5, x + 10.5, Z(58.5), Z(87.5), 3.6), { tone: "mid" })).join("");
  const belt = Ln(k.pathOf([at([C.x0, C.half, Z(55)]), at([C.x1, C.half, Z(55)])]) + k.pathOf([at([C.x0, C.half, Z(92)]), at([C.x1, C.half, Z(92)])]) + k.pathOf([at([C.x1, -C.half, Z(55)]), at([C.x1, C.half, Z(55)])]), { tone: "mid" });
  const door = `<path class="tc-hole" d="${rectX(P, C.x1, -10, 10, C.z0, Z(88), 3)}"/>`;
  const endWins = [-30, 30].map((y) => `<path class="tc-glass" d="${rectX(P, C.x1, y - 7, y + 7, Z(62), Z(84), 2.5)}"/>`).join("");
  const rivets = Dots(Array.from({ length: 22 }, (_, i) => at([C.x0 + 4 + i * 9.1, C.half, C.z0 + 4])), { size: 0.45, tone: "hi" });
  prism("body", F, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], C.x0, C.x1, { tone: "hi" }, { extra: winSvg + belt + door + endWins + rivets });
  prism("roof", F, [...arc(C.half + 2, R + 0.2), ...arc(C.half + 2, R + 2.6).reverse()], C.x0 - 2, C.x1 + 2, { tone: "hi" });
  // roof vents and end railings
  for (const x of [-60, -20, 20, 60]) {
    const zTop = zc + R + 2.6;
    disc("vent", alongZ([x, 0, 0]), zTop - 1, zTop + 2.5, 3.2, { tone: "hi" }, { bevel: 0.3 });
    disc("vent.cap", alongZ([x, 0, 0]), zTop + 2.5, zTop + 3.6, 4.4, { tone: "hi" });
  }
  for (const sign of [-1, 1]) {
    const x = sign > 0 ? 104 : -104;
    for (const y of [-40, 40]) box("end.post", [x - 0.6, y - 0.6, FP.z1], [x + 0.6, y + 0.6, FP.z1 + 20], { tone: "hi" }, { r: 0.3, steps: 1 });
    Sc.put("end.rail", [x, 0, FP.z1 + 20], Ln(k.pathOf([at([x, -40, FP.z1 + 20]), at([x, -12, FP.z1 + 20])]) + k.pathOf([at([x, 12, FP.z1 + 20]), at([x, 40, FP.z1 + 20])]), { tone: "hi" }) + Dots([[x, -12], [x, 12]].map(([px, py]) => at([px, py, FP.z1 + 20])), { size: 0.8, tone: "hi" }), [Sc.record(Sc.A.box([x - 0.5, -40, FP.z1 + 19.5], [x + 0.5, 40, FP.z1 + 20.5], { name: "endrail" }))], { bias: 0.3 });
  }
  const body = [halo(P, { x: -110, y: -44, w: 220, d: 88, r: 20 }, -13), track(P, -150, 150), Sc.finish()].join("");
  return svgOf({ id: "coach", width: W, height: H, label: "İki bojili yolcu vagonu: altı pencereli kasa, kemerli çatı, iki uçta kapı ve tamponlar, kırmızı tekerlekler.", body, P, fade: [-150, 150] });
}

// ── small part icons, 120 × 100 ──
function partWheel() {
  const W = 120, H = 100;
  const P = k.fitProjection([[-25, 16, AXLE_H - 25], [25, 30, AXLE_H + 25], [-25, -6, AXLE_H], [25, 30, AXLE_H - 25]], W, H, { pad: 10, azimuth: 62, elevation: 22 });
  const Sc = scene(P);
  Sc.disc("axle", alongY([0, 0, AXLE_H]), -4, BACK, 2, { tone: "hi" });
  Sc.disc("bearing", alongY([0, 0, AXLE_H]), 8, 12, 4.5, { tone: "hi" }, { extra: Sc.Ln(circleY(P, 12, 0, AXLE_H, 3), { tone: "mid" }) });
  wheelset(Sc, 0, { spokes: 10, nearOnly: true });
  return svgOf({ id: "part-wheel", width: W, height: H, label: "Kırmızı Ø42 tekerlek, 4 mm çelik aks ve 684ZZ rulman.", body: Sc.finish(), P });
}
function partTrack() {
  const W = 120, H = 100;
  const P = k.fitProjection([[-60, -34, -13], [60, 34, -13], [-60, 34, 0], [60, -34, 0]], W, H, { pad: 6, azimuth: 40, elevation: 34 });
  const Sc = scene(P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const out = [];
  const xs = [-50, -30, -10, 10, 30];
  for (const x of xs) out.push(S(k.slabOf({ x: x - 4, y: -33, w: 8, d: 66, r: 0.8 }, -13, 5, P, 3, 0.4), { tone: "hi" }));
  // end tie with the dovetail tongue
  out.push(S(rtPrism(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), [[44, -33], [56, -33], [56, 9], [63, 7.5], [63, 16.5], [56, 15], [56, 33], [44, 33]], -13, -8, P), { tone: "hi" }));
  for (const sign of [-1, 1]) out.push(S(rtPrism(alongX([0, 0, 0]), railPoly(sign * RAIL_Y), -60, 55.75, P), { tone: "hi" }));
  out.push(Sc.Dots([Sc.at([50, 0, -8])], { size: 1, tone: "hi" }) + Sc.Ln(k.ring(50, 0, 2, -8, P, 20), { tone: "hi" }));
  return svgOf({ id: "part-track", width: W, height: H, label: "Düz ray modülünün ucu: traversler, ray profili ve kırlangıç dili.", body: out.join(""), P });
}
function partBoiler() {
  const W = 120, H = 100;
  const P = k.fitProjection([[-72, -32, Z(34)], [-72, 32, Z(98)], [-72, 32, Z(34)], [-72, -32, Z(98)], [138, -32, Z(34)], [138, 32, Z(98)], [138, 32, Z(34)], [138, -32, Z(98)], [111, 0, 155]], W, H, { pad: 6, azimuth: 52, elevation: 24 });
  const Sc = scene(P);
  const BF = alongX([0, 0, Z(66)]);
  Sc.turned("boiler", BF, [[-71.7, 28], [95, 28]], { tone: "hi" });
  for (const x of [-35, 35]) Sc.disc("band", BF, x - 1.25, x + 1.25, 28.8, { tone: "hi" });
  Sc.turned("smokebox", BF, [[95, 31], [125.5, 31]], { tone: "hi" });
  Sc.disc("ring", BF, 125.5, 128, 32, { tone: "hi" });
  Sc.turned("door", BF, [[128, 30], [138, 20]], { tone: "hi" });
  const top = Z(66) + 28, sbTop = Z(66) + 31;
  Sc.turned("chimney", alongZ([111.5, 0, 0]), [[sbTop - 3, 13.5], [sbTop + 1, 11.5, 1], [sbTop + 3, 8.4, 1], [148, 8], [148, 10.6], [151, 11], [155, 10.2]], { tone: "hi" });
  Sc.turned("dome", alongZ([10, 0, 0]), [[top - 3, 14], [top + 2, 10.6, 1], [top + 3.5, 11, 1], [top + 11, 11, 1], [top + 14.8, 8.2, 1], [top + 17, 2.2, 1]], { tone: "hi" });
  return svgOf({ id: "part-boiler", width: W, height: H, label: "Kazan, duman kutusu, baca ve buhar domu.", body: Sc.finish(), P });
}
function partBogie() {
  const W = 120, H = 100;
  const P = k.fitProjection([[-48, -30, -3], [48, 30, -3], [-48, 30, 45], [48, -30, 45], [-48, -30, 45], [48, 30, -3]], W, H, { pad: 5, azimuth: 56, elevation: 26 });
  const Sc = scene(P);
  for (const x of [-24, 24]) wheelset(Sc, x, { spokes: 8 });
  for (const y of [-19, 13]) Sc.box("side", [-32, y, Z(-9)], [32, y + 6, Z(11)], { tone: "hi" }, { r: 2, extra: y > 0 ? Sc.Ln([-24, 24].map((x) => circleY(P, y + 6, x, AXLE_H, 4.5)).join(""), { tone: "mid" }) : "" });
  Sc.box("bolster", [-5, -13, Z(5)], [5, 13, Z(11)], { tone: "hi" }, { r: 0.6 });
  Sc.disc("pivot", alongZ([0, 0, 0]), Z(11), Z(18), 4, { tone: "hi" });
  return svgOf({ id: "part-bogie", width: W, height: H, label: "Vagon bojisi: iki dingil, 48 mm dingil mesafesi, yan levhalar.", body: Sc.finish(), P });
}

const api = { wheelset, circleY, circleX, rectY, rectX, track, halo, svgOf, AXLE_H, Z };
const cars = ["yolcu", "enerji", "radar", "sarj", "ses", "gozlem"].map((kind) => [`car-${kind}`, () => makeCar(api, kind)]);
mkdirSync(OUT, { recursive: true });
for (const [name, make] of [["locomotive", locomotive], ["tender", tender], ["coach", coach], ...cars, ["part-wheel", partWheel], ["part-track", partTrack], ["part-boiler", partBoiler], ["part-bogie", partBogie]]) {
  const svg = make();
  writeFileSync(join(OUT, `${name}.svg`), svg);
  if (!name.startsWith("part-")) writeFileSync(join(OUT, `${name}-lit.svg`), svg.replace('class="tcat ', 'class="tcat lit '));
  console.log("wrote", `${name}.svg`, `${(svg.length / 1024).toFixed(0)} KB`);
}
