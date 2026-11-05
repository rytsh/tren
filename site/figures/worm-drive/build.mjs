// Fig 1 · Sonsuz vida tahriki: the 0-4-0 test chassis with its near side plate cut away, on a short piece of track.
// World units are millimetres from cad/params.json; x along the track (forward +x), y across, z up, plate top z = 0.
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { scene, basePlate, writePages } from "../common.mjs";
import { rtPrism, rtGear, rtHelix, rtSpokes } from "../runtime.mjs";

const W = 640;
const H = 420;

// Track (cad: track)
const TIE = { len: 66, w: 8, t: 5, pitch: 20 };
const RAIL = { h: 8, head: 5, headH: 2.5, web: 3, foot: 9, gauge: 45 };
const RAIL_TOP = TIE.t + RAIL.h; // 13
const RAIL_Y = RAIL.gauge / 2 + RAIL.head / 2; // 25, rail centreline
const TRACK_X = 88;

// Wheels and axles (cad: wheel, axle)
const WHEEL_R = 21; // tread Ø42 at the flange root
const FLANGE_R = WHEEL_R + 2.5;
const BACK = 20; // back-to-back 40
const FLANGE_T = 1.8;
const WIDTH = 7.5;
const TAPER = 0.05; // 1:20
const AXLE_Z = RAIL_TOP + WHEEL_R; // 34
const AXLE_X = [-35, 35]; // wheelbase 70
const AXLE_R = 2;
const BEARING = { r: 4.5, rIn: 2 };

// Frame (cad: frame)
const PLATE = { len: 130, t: 6, above: 12, below: 10 };
const PLATE_IN = 13; // inner face, plates outer faces at ±19, 1 mm from the wheel backs
const PLATE_OUT = PLATE_IN + PLATE.t;
const PZ0 = AXLE_Z - PLATE.below; // 24
const PZ1 = AXLE_Z + PLATE.above; // 46
const XM = 60;

// Drive (cad: drive)
const Z_WHEEL = 30;
const GEAR = { tip: 16, pitch: 15, root: 13.75, w: 6 };
const WORM = { pd: 10, tip: 6, root: 3.75, len: 16.5, lead: Math.PI * 1, hub: 4, hubLen: 5 };
const CENTRE = (WORM.pd + Z_WHEEL * 1) / 2 + 0.15; // 20.15
const WORM_Z = AXLE_Z + CENTRE;
const WORM_X0 = AXLE_X[1] - WORM.len / 2; // 26.75
const WORM_X1 = AXLE_X[1] + WORM.len / 2; // 43.25
const HUB_X0 = WORM_X0 - WORM.hubLen; // 21.75
const BULK = { x0: HUB_X0 - 3, x1: HUB_X0, z1: AXLE_Z + 34 };
const MOTOR = { r: 12.2, len: 30.5, face: BULK.x0 - 0.5 };
MOTOR.back = MOTOR.face - MOTOR.len; // -12.25
const CAP_X = MOTOR.back + 6.25;
const CAP_R = 11.4;

const PLAN = { x: -100, y: -48, w: 200, d: 96, r: 9 };
const P = k.fitProjection(
  [...k.boxCorners(PLAN, -15, 0), [-65, -19, BULK.z1], [65, 27.5, AXLE_Z + FLANGE_R], [-65, 27.5, AXLE_Z + FLANGE_R], [MOTOR.back, 0, WORM_Z + MOTOR.r]],
  W,
  H,
  { pad: 22, azimuth: Number(process.env.AZ ?? 55), elevation: Number(process.env.EL ?? 58) },
);
const Sc = scene(P);
const { R, at, S, Ln, Dots, box, prism, turned, disc, cable, put, record } = Sc;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const circleOnX = (x, cy, cz, r, n = 40) => path3(Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const circleOnY = (y, cx, cz, r, n = 48) => path3(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), y, cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const alongX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const alongY = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [1, 0, 0], [0, 0, 1]);

// ── base and track (static, below everything) ──
const back = [];
const RULER = { x: -84, y: 35, w: 100, d: 6, r: 1 };
const LABEL = { x: 44, y: 29, w: 38, d: 12, r: 1.2 };
back.push(basePlate(P, PLAN, { ruler: RULER, label: LABEL }));
record(A.slab(PLAN, -10, 10, { name: "stand.plate", ground: true }, 8));

const tieSvg = [];
for (let x = -TRACK_X - 20; x <= TRACK_X + 20; x += TIE.pitch) {
  const plan = { x: x - TIE.w / 2, y: -TIE.len / 2, w: TIE.w, d: TIE.len, r: 0.8 };
  tieSvg.push(S(k.slabOf(plan, 0, TIE.t, P, 3, 0.5), { tone: "lo" }));
  if (Math.abs(x) <= TRACK_X) record(A.slab(plan, 0, TIE.t, { name: "stand.tie" }, 3));
}
const fadeA = at([-TRACK_X + 2, 0, 0]);
const fadeB = at([TRACK_X - 2, 0, 0]);
back.push(
  `<defs><linearGradient id="wd-fade" gradientUnits="userSpaceOnUse" x1="${fadeA[0].toFixed(1)}" y1="${fadeA[1].toFixed(1)}" x2="${fadeB[0].toFixed(1)}" y2="${fadeB[1].toFixed(1)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff" stop-opacity="1"/><stop offset=".9" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="wd-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#wd-fade)"/></mask></defs>`,
  `<g mask="url(#wd-mask)"><g data-part="ties">${tieSvg.join("")}</g></g>`,
);

function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, c = 0.6;
  const z0 = TIE.t, zf = z0 + 1.6, zh = RAIL_TOP - RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, zf], [yc + wb, zf + 1.2], [yc + wb, zh], [yc + h, zh], [yc + h, RAIL_TOP - c], [yc + h - c, RAIL_TOP], [yc - h + c, RAIL_TOP], [yc - h, RAIL_TOP - c], [yc - h, zh], [yc - wb, zh], [yc - wb, zf + 1.2], [yc - f, zf]];
}
const XF = alongX([0, 0, 0]);
for (const sign of [-1, 1]) prism(`rail${sign > 0 ? ".near" : ".far"}`, XF, railPoly(sign * RAIL_Y), -TRACK_X, TRACK_X, { tone: "mid" }, { meta: { ground: true } });

// ── frame ──
const YF = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const roundRect = (x0, x1, z0, z1, r, n = 4) => {
  const pts = [];
  const corner = (cx, cz, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } };
  corner(x1 - r, z0 + r, -Math.PI / 2); corner(x1 - r, z1 - r, 0); corner(x0 + r, z1 - r, Math.PI / 2); corner(x0 + r, z0 + r, Math.PI);
  return pts;
};
const farPlate = prism("frame.far", YF, roundRect(-PLATE.len / 2, PLATE.len / 2, PZ0, PZ1, 2), -PLATE_OUT, -PLATE_IN, { tone: "mid" }, {
  inner: Ln(AXLE_X.map((x) => circleOnY(-PLATE_IN, x, AXLE_Z, BEARING.r) + circleOnY(-PLATE_IN, x, AXLE_Z, 3.3)).join(""), { tone: "lo" }),
});

// The near plate is cut away above the axle bosses, so the drive shows; a post under the bulkhead stays.
function nearOutline() {
  const pts = [[-65, PZ0], [65, PZ0], [65, 31]];
  const boss = (cx, from, to) => { for (let i = 0; i <= 10; i++) { const a = from + ((to - from) * i) / 10; pts.push([cx + 10 * Math.cos(a), AXLE_Z + 10 * Math.sin(a)]); } };
  pts.push([45, 31]);
  boss(AXLE_X[1], 0, Math.PI / 2);
  pts.push([BULK.x1, AXLE_Z + 10], [BULK.x1, PZ1], [BULK.x0 - 3, PZ1], [BULK.x0 - 3, 31], [-25, 31]);
  boss(AXLE_X[0], 0, Math.PI);
  pts.push([-45, 31], [-65, 31]);
  return pts;
}
const nearPlate = prism("frame.near", YF, nearOutline(), PLATE_IN, PLATE_OUT, { tone: "mid" });

const xms = [-XM, XM].map((x, i) => box(`frame.xm${i}`, [x - 5, -PLATE_IN, PZ0], [x + 5, PLATE_IN, PZ0 + 10], { tone: "mid" }, {
  bevel: 0.4,
  extra: i ? Ln([-6, 6].map((y) => k.ring(x, y, 1.9, PZ0 + 10, P, 16)).join(""), { tone: "lo" }) + Dots([-6, 6].map((y) => at([x, y, PZ0 + 10])), { size: 0.5, tone: "mid" }) : "",
}));
for (const x of [-XM, XM]) {
  disc("frame.m3", alongY([x, 0, PZ0 + 4.5]), PLATE_OUT, PLATE_OUT + 1.4, 2.7, { tone: "mid" }, { extra: Ln(circleOnY(PLATE_OUT + 1.4, x, PZ0 + 4.5, 1.2, 16), { tone: "lo" }) });
}
box("frame.saddle", [-14, -PLATE_IN, AXLE_Z], [-6, PLATE_IN, WORM_Z - CAP_R], { tone: "lo" }, { bevel: 0.3 });

// ── wheelsets ──
const flangeProfile = [[BACK, FLANGE_R - 0.7], [BACK + 0.5, FLANGE_R], [BACK + 1.2, FLANGE_R], [BACK + FLANGE_T, WHEEL_R + 0.3]];
const treadProfile = [[BACK + FLANGE_T, WHEEL_R], [BACK + WIDTH, WHEEL_R - (WIDTH - FLANGE_T) * TAPER]];
const OUTER = BACK + WIDTH;
const wheelSlots = [];
for (const x of AXLE_X) {
  for (const sign of [-1, 1]) {
    const F = alongY([x, 0, AXLE_Z], sign);
    const name = `wheel.${x > 0 ? "front" : "rear"}.${sign > 0 ? "near" : "far"}`;
    turned(`${name}.flange`, F, flangeProfile, { tone: "mid", className: "rt-red" });
    const part = sign > 0 ? `spokes-${x > 0 ? "f" : "r"}` : null;
    const face = sign > 0
      ? Ln(circleOnY(OUTER, x, AXLE_Z, WHEEL_R - 4.3) + circleOnY(OUTER, x, AXLE_Z, 6), { tone: "lo" }) + Ln(circleOnY(OUTER, x, AXLE_Z, AXLE_R, 16), { tone: "mid" }) + `<g data-part="${part}"></g>` + Dots([at([x, OUTER, AXLE_Z])], { size: 0.5, tone: "hi" })
      : "";
    turned(`${name}.tread`, F, treadProfile, { tone: "mid", className: "rt-red" }, { extra: face });
    if (part) wheelSlots.push({ part, x });
  }
}
// The axle shows between the wheel backs and the plates and between the plates; inside the bearings and the gear it is hidden.
for (const x of AXLE_X) {
  const F = alongY([x, 0, AXLE_Z]);
  const spans = x > 0 ? [[-BACK, -PLATE_OUT], [-PLATE_IN, -GEAR.w / 2], [GEAR.w / 2 + 4, PLATE_IN], [PLATE_OUT, BACK]] : [[-BACK, -PLATE_OUT], [-PLATE_IN, PLATE_IN], [PLATE_OUT, BACK]];
  for (const [s0, s1] of spans) disc("axle", F, s0, s1, AXLE_R, { tone: "hi" });
}

// ── worm wheel on the front axle (rebuilt live) ──
const GF = G.frameOf([AXLE_X[1], 0, AXLE_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const gearPaths = (phase) => rtPrism(GF, rtGear(Z_WHEEL, GEAR.tip, GEAR.root, phase), -GEAR.w / 2, GEAR.w / 2, P);
const gearFace = (phase) => Ln(circleOnY(GEAR.w / 2, AXLE_X[1], AXLE_Z, GEAR.root - 1.2) + circleOnY(GEAR.w / 2, AXLE_X[1], AXLE_Z, 6.4), { tone: "faint" });
{
  const shape = record(A.prism(GF, rtGear(Z_WHEEL, GEAR.tip, GEAR.root, 0), -GEAR.w / 2, GEAR.w / 2, { name: "gear" }));
  put("gear", [AXLE_X[1], 0, AXLE_Z], `<g data-part="gear">${S(gearPaths(0), { tone: "mid", crease: "faint", inner: gearFace(0) })}</g>`, [shape]);
}
disc("gear.hub", alongY([AXLE_X[1], 0, AXLE_Z]), GEAR.w / 2, GEAR.w / 2 + 4, 5, { tone: "mid" }, {
  extra: Ln(circleOnY(GEAR.w / 2 + 4, AXLE_X[1], AXLE_Z, AXLE_R, 16), { tone: "lo" }),
});
disc("gear.grub", G.frameOf([AXLE_X[1], GEAR.w / 2 + 2, AXLE_Z + 5], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 0.5, 1.5, { tone: "mid" });

// ── motor, bulkhead and worm ──
box("bulkhead", [BULK.x0, -PLATE_OUT, PZ1], [BULK.x1, PLATE_OUT, BULK.z1], { tone: "mid" }, {
  r: 0.6,
  bevel: 0.5,
  extra: Ln(circleOnX(BULK.x1, 0, WORM_Z, 5.5), { tone: "lo" }) + Ln(k.segment([BULK.x1, -PLATE_OUT + 3, PZ1], [BULK.x1, -PLATE_OUT + 3, BULK.z1], P) + k.segment([BULK.x1, PLATE_OUT - 3, PZ1], [BULK.x1, PLATE_OUT - 3, BULK.z1], P), { tone: "faint" }),
});
for (const y of [-8.5, 8.5]) disc("bulkhead.m25", alongX([BULK.x1, y, WORM_Z]), 0, 1.3, 2.2, { tone: "mid" }, { extra: Ln(circleOnX(BULK.x1 + 1.3, y, WORM_Z, 1, 12), { tone: "lo" }) });

const MF = alongX([0, 0, WORM_Z]);
disc("motor.boss", MF, MOTOR.face, BULK.x0, 5, { tone: "mid" });
const ventSlot = (x0, x1, a) => {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const t = a - 0.09 + (0.18 * i) / 6; pts.push([x1, MOTOR.r * Math.cos(t), MOTOR.r * Math.sin(t)]); }
  for (let i = 0; i <= 6; i++) { const t = a + 0.09 - (0.18 * i) / 6; pts.push([x0, MOTOR.r * Math.cos(t), MOTOR.r * Math.sin(t)]); }
  return path3(pts.map(([x, y, z]) => [x, y, WORM_Z + z]), true);
};
turned("motor.can", MF, [[CAP_X, MOTOR.r], [MOTOR.face - 0.8, MOTOR.r], [MOTOR.face, MOTOR.r - 0.8]], { tone: "mid" }, {
  inner: Ln(G.arcOf(MF, CAP_X + 2.2, MOTOR.r, P) + G.arcOf(MF, MOTOR.face - 4, MOTOR.r, P), { tone: "faint" }) + Ln([1.25, 1.55, 1.85].map((a) => ventSlot(CAP_X + 6, CAP_X + 12, a)).join(""), { tone: "lo" }),
});
turned("motor.cap", MF, [[MOTOR.back, CAP_R - 0.6], [MOTOR.back + 0.6, CAP_R], [CAP_X, CAP_R]], { tone: "lo" });
disc("motor.bush", MF, MOTOR.back - 2, MOTOR.back, 3.2, { tone: "mid" }, { extra: Ln(circleOnX(MOTOR.back - 2, 0, WORM_Z, 1.15, 12), { tone: "lo" }) });
for (const a of [0.55, Math.PI - 0.55]) {
  const n = [0, Math.cos(a), Math.sin(a)];
  const F = G.frameOf([MOTOR.back + 3.2, CAP_R * n[1], WORM_Z + CAP_R * n[2]], n, [1, 0, 0], G.cross3(n, [1, 0, 0]));
  prism("motor.brush", F, [[-2.2, -2.6], [2.2, -2.6], [2.2, 2.6], [-2.2, 2.6]], -0.3, 1.6, { tone: "mid" });
}
const TAB_Z = WORM_Z + 6;
const tabs = [-6, 6].map((y) => {
  box("motor.tab", [MOTOR.back - 3.4, y - 0.7, TAB_Z - 1.6], [MOTOR.back, y + 0.7, TAB_Z + 1.6], { tone: "hi" }, { r: 0.2, steps: 2 });
  return [MOTOR.back - 3.4, y, TAB_Z];
});

const WF = alongX([0, 0, WORM_Z]);
const wormShape = record(A.solid(WF, [[HUB_X0, WORM.hub], [WORM_X0, WORM.hub], [WORM_X0, WORM.root], [WORM_X1, WORM.root]], { name: "worm" }));
const WORM_FRAME = G.frameOf([WORM_X0, 0, WORM_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const threadOf = (phase) =>
  Ln(rtHelix(WORM_FRAME, 0, WORM.len, WORM.tip, WORM.lead, phase, P), { tone: "lit" });
put(
  "worm",
  [AXLE_X[1], 0, WORM_Z],
  S(G.solidOf([[HUB_X0, WORM.hub], [WORM_X0, WORM.hub], [WORM_X0, WORM.tip], [WORM_X1, WORM.tip]], WF, P, { bevel: 0.3 }), { tone: "hi", crease: "lo", lit: true, inner: Ln(G.arcOf(WF, WORM_X0, WORM.tip, P, { least: -1 }), { tone: "lo" }) }) +
    `<g data-part="thread">${threadOf(0)}</g>`,
  [wormShape],
);
disc("worm.shaft", WF, WORM_X1, WORM_X1 + 1, 1.15, { tone: "mid" });

// ── wiring: solder tabs to a terminal block on the rear crossmember ──
const TB = { x0: -XM - 4, x1: -XM + 4, z0: PZ0 + 10, z1: PZ0 + 16 };
box("terminal", [TB.x0, -9, TB.z0], [TB.x1, 9, TB.z1], { tone: "mid" }, {
  bevel: 0.4,
  extra: Ln([-4, 4].map((y) => k.ring(-XM, y, 1.6, TB.z1, P, 16)).join(""), { tone: "lo" }) + Dots([-4, 4].map((y) => at([-XM, y, TB.z1])), { size: 0.5, tone: "mid" }),
});
tabs.forEach(([x, y, z], i) => {
  const s = Math.sign(y);
  cable(`wire${i}`, [[x, y, z], [x - 8, y, z], [-38, s * 4.5, z - 9], [TB.x1 + 4, s * 4, TB.z0 + 3], [TB.x1, s * 4, TB.z0 + 3]], 0.55, { tone: i ? "mid" : "lo", ends: [false, true] });
});

const items = Sc.finish();

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "Yakın yan levhası kesilmiş 0-4-0 test şasisi, kısa bir ray parçası üzerinde: boyuna yatan 370 motor, milindeki tek ağızlı sonsuz vida ve ön akstaki 30 dişli karşı dişli; dört kırmızı tekerlek, iki aks ve rulmanlar.",
  body: [...back, items],
});

// ── live ──
const DATA = { P, Z: Z_WHEEL, GEAR, WORM, WHEEL_R, OUTER, AXLE_Z, AXLE_X, WORM_X0, WORM_Z, wheels: wheelSlots, pitch: TIE.pitch, spokeIn: 6, spokeOut: WHEEL_R - 4.3, frame: WORM_FRAME, GF, slow: 50 };
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const gearG = part("gear"), threadG = part("thread"), tiesG = part("ties");
const spokes = D.wheels.map((w) => ({ el: part(w.part), x: w.x }));
const tread = Math.PI * 2 * D.WHEEL_R;
const fmt = (v, d) => v.toFixed(d).replace(".", ",");
const gearFace = () => lineSvg(circleOn(D.GEAR.w / 2, D.GEAR.root - 1.2) + circleOn(D.GEAR.w / 2, 6.4), { tone: "faint" });
const circleOn = (y, r) => pathOf(Array.from({ length: 48 }, (_, i) => iso([D.AXLE_X[1] + r * Math.cos(i / 48 * Math.PI * 2), y, D.AXLE_Z + r * Math.sin(i / 48 * Math.PI * 2)], P)), true);
let rpm = 0, target = 0, worm = 0, travelled = 0;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, said = "";
const TOUR = [[0, 1.2], [3000, 3.2], [7000, 3.6], [5200, 3.6], [0, 2.6]];
const tourAt = (t) => { const total = TOUR.reduce((s, [, d]) => s + d, 0); let at = t % total; for (const [v, d] of TOUR) { if (at < d) return v; at -= d; } return 0; };
function draw() {
  const axleTurns = worm / D.Z;
  const angle = -axleTurns * Math.PI * 2;
  gearG.innerHTML = solidSvg(rtPrism(D.GF, rtGear(D.Z, D.GEAR.tip, D.GEAR.root, angle), -D.GEAR.w / 2, D.GEAR.w / 2, P), { tone: "mid", crease: "faint", inner: gearFace() });
  const ph = -worm * Math.PI * 2;
  threadG.innerHTML = lineSvg(rtHelix(D.frame, 0, D.WORM.len, D.WORM.tip, D.WORM.lead, ph, P), { tone: "lit" });
  for (const s of spokes) s.el.innerHTML = lineSvg(rtSpokes([s.x, 0, D.AXLE_Z], D.OUTER, D.spokeIn, D.spokeOut, 6, angle, P), { tone: "lo" });
  tiesG.setAttribute("transform", translateAlong(P, [-(travelled % D.pitch), 0, 0]));
  const axle = rpm / D.Z;
  const speed = axle / 60 * tread / 1000;
  const text = "motor " + Math.round(rpm / 10) * 10 + " rpm · aks " + Math.round(axle) + " rpm · " + fmt(speed, 2) + " m/s";
  if (readout.textContent !== text) readout.textContent = text;
}
function describe() {
  const axle = Math.round(target / D.Z);
  stage.setAttribute("aria-valuenow", String(Math.round(target)));
  stage.setAttribute("aria-valuetext", "Motor " + Math.round(target) + " devir/dakika, aks " + axle + " devir/dakika");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  rpm = calm ? target : rpm + (target - rpm) * (1 - Math.exp(-dt / 0.6));
  if (Math.abs(target - rpm) < 2) rpm = target;
  if (!calm) {
    const turns = rpm / 60 * dt / D.slow;
    worm += turns;
    travelled += turns / D.Z * tread;
  }
  draw();
  const settled = !touring && rpm === target && (calm || rpm === 0);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (value) => {
  touring = false;
  target = Math.max(0, Math.min(7000, value));
  describe();
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.12) / 0.76));
  steer(Math.round(share * 70) * 100);
});
stage.addEventListener("pointerdown", (event) => { const box = svg.getBoundingClientRect(); steer(Math.round(Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.12) / 0.76)) * 70) * 100); });
stage.addEventListener("keydown", (event) => {
  const from = touring ? Math.round(rpm / 100) * 100 : target;
  const step = event.shiftKey ? 1000 : 250;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = from + step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = from - step;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 7000;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
stage.addEventListener("focus", () => { if (sr) sr.textContent = stage.getAttribute("aria-valuetext"); });
if (still.matches) { touring = false; target = 5200; rpm = 5200; }
describe();
draw();
`;

const body = k.plateHtml({
  fig: "Şekil 1",
  title: "Sonsuz vida tahriki · motor varsayımı",
  hint: "Sağa sola gezdir · ← →",
  readout: "motor 0 rpm · aks 0 rpm · 0,00 m/s",
  keys: [
    { mark: "lit", label: "Sonsuz vida: motor milinde, tek ağızlı, m1, Ø10" },
    { mark: "dim", label: "Devir ve hız: motor varsayımı, ölçüm değil" },
    { mark: "raised", label: "30 dişli karşı dişli, ön aksta (Ø32)" },
    { mark: "red", label: "Tekerlekler: Ø42 yuvarlanma dairesi, 1:20 koniklik" },
  ],
  caption:
    "Motor milindeki tek ağızlı vida her turda karşı dişliyi bir diş, 3,14 mm, ilerletir; 30 dişli tekerlek için oran 30:1. Motor varsayımı: RF-370, 7,4 V'ta 5000–7000 rpm (ölçülmedi); bu varsayımla aks 167–233 rpm döner ve Ø42 tekerlek (tur başına 132 mm) 0,37–0,51 m/s eder. Küçük helis açısı (tan λ = 0,1) dişlinin vidayı geri çevirmesini zorlaştırabilir, ama bu baskı kalitesine ve sürtünmeye bağlıdır, test edilmedi ve park freni yerine geçmez. Hareket gerçek hızın 50'de biriyle çizilir; okuma motor varsayımından hesaplanır.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Sonsuz vida tahriki. Sağ ve sol ok tuşları motor devrini 250 rpm adımlarla değiştirir, Shift ile 1000; Home durdurur, End tam devir." aria-valuemin="0" aria-valuemax="7000" aria-valuenow="0">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
});

writePages("worm-drive", { title: "Sonsuz vida tahriki", body, live });
console.log(`${R.items.length} items · ${R.solids.length} solids · ${R.tubes.length} tubes`);
A.auditOrExit(R, P, {});
