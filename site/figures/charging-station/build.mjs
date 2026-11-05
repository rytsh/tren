// Fig 3 · Şarj istasyonu: a battery tender runs along the track past a low platform. A hall sensor on its front
// beam sees an approach magnet between the ties, the tender slows and stops over the stop magnet, and only then
// the pin carriage on the station pedestal runs out until two spring-loaded pogo pins press on the tender's pads.
// Units are millimetres; x along the track, y across (the station is on +y, toward the viewer), z up.
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { scene, basePlate, writePages } from "../common.mjs";
import { rtSpokes } from "../runtime.mjs";

const W = 640;
const H = 420;

// Track (cad: track); ties sit on the plate.
const TIE = { len: 66, w: 8, t: 5, pitch: 20, at: 10 };
const RAIL = { h: 8, head: 5, headH: 2.5, web: 3, foot: 9, gauge: 45 };
const RAIL_TOP = TIE.t + RAIL.h;
const RAIL_Y = RAIL.gauge / 2 + RAIL.head / 2;
const TRACK_X = 132;

// Tender (wheels and frame as the test chassis: Ø42 wheels, back-to-back 40, 70 mm wheelbase).
const WHEEL_R = 21;
const FLANGE_R = WHEEL_R + 2.5;
const BACK = 20;
const WIDTH = 7.5;
const AXLE_Z = RAIL_TOP + WHEEL_R;
const AXLE_X = [-35, 35];
const DECK = { x0: -56, x1: 56, z0: 58, z1: 61.5, half: 34 };
const BODY = { x0: -48, x1: 48, z0: DECK.z1, z1: 92, half: 34 };
const PAD = { xs: [-6, 6], z: 68, r: 2.6, face: BODY.half + 2, t: 0.6 };
const PAD_FACE = PAD.face + PAD.t; // 36.6
const SENSOR = { x: 62, y: 8 };
const STOP_X = SENSOR.x; // stop magnet under the sensor when the tender is at c = 0
const DECEL = 80; // approach magnet 80 mm before
const APPROACH_X = STOP_X - DECEL;

// Station
const PLATFORM = { x: -82, y: 40, w: 164, d: 52, r: 2, h: 30 };
const PED = { x0: -14, x1: 24, y0: 46, y1: 74, z1: 60 };
const GUIDE_Z = PED.z1 + 1.5;
const CAR = { x0: -11, x1: 11, depth: 8, z0: GUIDE_Z, z1: 66 };
const PIN = { z: PAD.z, r: 2, barrel: 10, spring: 6, coil: 1.6, rod: 0.8, collar: 1.7, collarT: 0.8, tip: 2.4, comp: 2.5 };
const PIN_FREE = 1 + PIN.spring + PIN.collarT + PIN.tip; // from the carriage's far edge to the free tip
const F_EXT = PAD_FACE - PIN.comp + PIN_FREE; // carriage far edge when the pins are pressed 2.5 mm
const STROKE = 10;
const F_RET = F_EXT + STROKE;
const MAST = { x: 19, y: 69, r: 1.6, z1: 98 };

const PLAN = { x: -140, y: -56, w: 280, d: 150, r: 10 };
const P = k.fitProjection(
  [...k.boxCorners(PLAN, -15, 0), [-60, -36, 95], [60, -36, 95], [MAST.x, MAST.y, MAST.z1 + 10]],
  W,
  H,
  { pad: 20, azimuth: Number(process.env.AZ ?? 22), elevation: Number(process.env.EL ?? 42) },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const circleOnY = (y, cx, cz, r, n = 48) => path3(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), y, cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const alongY = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const XF = alongX([0, 0, 0]);
const slotOnY = (y, x0, x1, z0, z1) => path3(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r: Math.min(x1 - x0, z1 - z0) / 2 }, 4).map(([x, z]) => [x, y, z]), true);

// ── back: plate, ties, magnets, rails ──
const back = [];
back.push(basePlate(P, PLAN, { ruler: { x: -120, y: -50, w: 96, d: 5, r: 1 }, label: { x: 96, y: 78, w: 34, d: 10, r: 1.2 } }));
const fadeA = at([-TRACK_X, 0, 0]);
const fadeB = at([TRACK_X, 0, 0]);
back.push(
  `<defs><linearGradient id="cs-fade" gradientUnits="userSpaceOnUse" x1="${fadeA[0].toFixed(1)}" y1="${fadeA[1].toFixed(1)}" x2="${fadeB[0].toFixed(1)}" y2="${fadeB[1].toFixed(1)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".07" stop-color="#fff" stop-opacity="1"/><stop offset=".93" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="cs-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"><rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="url(#cs-fade)"/></mask></defs>`,
);
const ties = [];
for (let x = TIE.at - 140; x <= 140; x += TIE.pitch) ties.push(S(k.slabOf({ x: x - TIE.w / 2, y: -TIE.len / 2, w: TIE.w, d: TIE.len, r: 0.8 }, 0, TIE.t, P, 3, 0.5), { tone: "lo" }));
back.push(`<g mask="url(#cs-mask)">${ties.join("")}</g>`);
for (const [x, name] of [[APPROACH_X, "approach"], [STOP_X, "stop"]]) {
  back.push(S(k.slabOf({ x: x - 5, y: SENSOR.y - 5, w: 10, d: 10, r: 1.5 }, 0, 2.2, P, 3, 0.4), { tone: "lo" }));
  back.push(`<g data-part="magnet-${name}">${S(k.cylinder(x, SENSOR.y, 3, 2.2, 1, P, 24), { tone: "hi", crease: "lo" })}${Dots([at([x, SENSOR.y, 3.2])], { size: 0.5, tone: "hi" })}</g>`);
}
function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, c = 0.6;
  const z0 = TIE.t, zf = z0 + 1.6, zh = RAIL_TOP - RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, zf], [yc + wb, zf + 1.2], [yc + wb, zh], [yc + h, zh], [yc + h, RAIL_TOP - c], [yc + h - c, RAIL_TOP], [yc - h + c, RAIL_TOP], [yc - h, RAIL_TOP - c], [yc - h, zh], [yc - wb, zh], [yc - wb, zf + 1.2], [yc - f, zf]];
}
const Sb = scene(P);
for (const sign of [-1, 1]) Sb.prism("rail", XF, railPoly(sign * RAIL_Y), -TRACK_X, TRACK_X, { tone: "mid" });
back.push(`<g mask="url(#cs-mask)">${Sb.finish()}</g>`);

// ── the tender, built docked (c = 0) ──
const V = scene(P);
for (const sign of [-1, 1]) V.record(A.prism(XF, railPoly(sign * RAIL_Y), -TRACK_X, TRACK_X, { name: "stand.rail", ground: true }));
const roundRect = (x0, x1, z0, z1, r, n = 4) => {
  const pts = [];
  const corner = (cx, cz, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } };
  corner(x1 - r, z0 + r, -Math.PI / 2); corner(x1 - r, z1 - r, 0); corner(x0 + r, z1 - r, Math.PI / 2); corner(x0 + r, z0 + r, Math.PI);
  return pts;
};
const YF = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
for (const sign of [-1, 1]) {
  const [y0, y1] = sign > 0 ? [13, 19] : [-19, -13];
  V.prism("tender.frame", YF, roundRect(-50, 50, 24, DECK.z0, 2), y0, y1, { tone: "mid" }, {
    inner: sign > 0 ? Ln(AXLE_X.map((x) => circleOnY(19, x, AXLE_Z, 4.5) + circleOnY(19, x, AXLE_Z, 3)).join(""), { tone: "lo" }) : "",
  });
}
const flangeProfile = [[BACK, FLANGE_R - 0.7], [BACK + 0.5, FLANGE_R], [BACK + 1.2, FLANGE_R], [BACK + 1.8, WHEEL_R + 0.3]];
const treadProfile = [[BACK + 1.8, WHEEL_R], [BACK + WIDTH, WHEEL_R - (WIDTH - 1.8) * 0.05]];
const OUTER = BACK + WIDTH;
const wheelSlots = [];
for (const x of AXLE_X) {
  for (const sign of [-1, 1]) {
    const F = alongY([x, 0, AXLE_Z], sign);
    V.turned("tender.flange", F, flangeProfile, { tone: "mid", className: "rt-red" });
    const part = sign > 0 ? `spokes-${x > 0 ? "f" : "r"}` : null;
    const face = part ? Ln(circleOnY(OUTER, x, AXLE_Z, WHEEL_R - 4.3) + circleOnY(OUTER, x, AXLE_Z, 6), { tone: "lo" }) + `<g data-part="${part}"></g>` + Dots([at([x, OUTER, AXLE_Z])], { size: 0.5, tone: "hi" }) : "";
    V.turned("tender.tread", F, treadProfile, { tone: "mid", className: "rt-red" }, { extra: face });
    if (part) wheelSlots.push({ part, x });
  }
  for (const [s0, s1] of [[-BACK, -19], [19, BACK]]) V.disc("tender.axle", alongY([x, 0, AXLE_Z]), s0, s1, 2, { tone: "hi" });
}
const deckPlan = { x: DECK.x0, y: -DECK.half, w: DECK.x1 - DECK.x0, d: DECK.half * 2, r: 1.5 };
V.box("tender.deck", [DECK.x0, -DECK.half, DECK.z0], [DECK.x1, DECK.half, DECK.z1], { tone: "mid" }, { r: 1.5, bevel: 0.6, inner: Ln(k.sideSeam(deckPlan, DECK.z0 + 1.6, P, 3), { tone: "faint" }) });
for (const sign of [-1, 1]) {
  const x0 = sign > 0 ? DECK.x1 : DECK.x0 - 3;
  V.box("tender.beam", [x0, -30, 52], [x0 + 3, 30, DECK.z1], { tone: "mid" }, { r: 0.6, bevel: 0.4 });
  for (const y of [-21, 21]) {
    const F = alongX([0, y, 56.5]);
    const face = sign > 0 ? x0 + 3 : x0;
    const [s0, s1, h0, h1] = sign > 0 ? [face, face + 5, face + 5, face + 6.2] : [face - 5, face, face - 6.2, face - 5];
    V.disc("tender.buffer", F, s0, s1, 2.4, { tone: "mid" });
    V.disc("tender.bufferhead", F, h0, h1, 4.2, { tone: "mid" }, { bevel: 0.3 });
  }
}
// Hall sensor (A3144) on a bracket ahead of the front beam, over the magnets' line.
V.box("tender.bracket", [DECK.x1 + 3, SENSOR.y - 3, 17], [DECK.x1 + 5, SENSOR.y + 3, 54], { tone: "mid" }, { r: 0.4, steps: 2, extra: Dots([at([DECK.x1 + 5, SENSOR.y, 50])], { size: 0.45, tone: "mid" }) });
V.box("tender.hall", [DECK.x1 + 5, SENSOR.y - 2.1, 17], [DECK.x1 + 7, SENSOR.y + 2.1, 21], { tone: "hi" }, {
  r: 0.3,
  steps: 2,
  extra: `<g data-part="hall-dot">${Dots([at([SENSOR.x, SENSOR.y, 21])], { size: 0.7, tone: "hi" })}</g>`,
});
// Body, roof and hatch
const bodyPlan = { x: BODY.x0, y: -BODY.half, w: BODY.x1 - BODY.x0, d: BODY.half * 2, r: 3 };
const vents = Ln([20, 24, 28, 32, 36].map((x) => slotOnY(BODY.half, x, x + 1.6, 70, 84)).join(""), { tone: "lo" });
const rivets = Dots([...Array.from({ length: 11 }, (_, i) => at([BODY.x0 + 6 + i * 8.4, BODY.half, 89])), ...Array.from({ length: 7 }, (_, i) => at([BODY.x1, -BODY.half + 6 + i * 9.7, 89]))], { size: 0.4, tone: "mid" });
V.box("tender.body", [BODY.x0, -BODY.half, BODY.z0], [BODY.x1, BODY.half, BODY.z1], { tone: "mid" }, {
  r: 3,
  steps: 6,
  bevel: 0.5,
  inner: Ln(k.sideSeam(bodyPlan, 86, P, 6), { tone: "faint" }) + vents,
  extra: rivets + Ln(k.segment([0, BODY.half, BODY.z0], [0, BODY.half, 86], P) + k.segment([BODY.x1, 0, BODY.z0], [BODY.x1, 0, 86], P), { tone: "faint" }),
});
const roofPlan = { x: BODY.x0 - 2, y: -BODY.half - 2, w: BODY.x1 - BODY.x0 + 4, d: BODY.half * 2 + 4, r: 4 };
V.box("tender.roof", [roofPlan.x, roofPlan.y, BODY.z1], [roofPlan.x + roofPlan.w, roofPlan.y + roofPlan.d, BODY.z1 + 2.5], { tone: "mid" }, {
  r: 4,
  steps: 6,
  bevel: 0.6,
  extra: Ln(k.planOutline(k.insetPlan(roofPlan, 4), BODY.z1 + 2.5, P, 6), { tone: "faint" }),
});
const hatch = { x: -26, y: -12, w: 22, d: 24, r: 2 };
V.box("tender.hatch", [hatch.x, hatch.y, BODY.z1 + 2.5], [hatch.x + hatch.w, hatch.y + hatch.d, BODY.z1 + 4], { tone: "mid" }, {
  r: 2,
  steps: 4,
  bevel: 0.4,
  extra: Dots(k.corners(hatch, 2.5).map(([x, y]) => at([x, y, BODY.z1 + 4])), { size: 0.45, tone: "mid" }) + S(k.slabOf({ x: hatch.x + hatch.w - 6, y: -4, w: 3, d: 8, r: 1 }, BODY.z1 + 4, 1.4, P, 2), { tone: "mid" }),
});
// Contact block with two pads on the station side.
V.box("tender.contacts", [-12, BODY.half, 63], [12, PAD.face, 74], { tone: "mid" }, {
  r: 0.8,
  bevel: 0.4,
  extra: Dots([at([-10, PAD.face, 72]), at([10, PAD.face, 72])], { size: 0.45, tone: "mid" }),
});
for (const x of PAD.xs) V.disc("tender.pad", alongY([x, 0, PAD.z]), PAD.face, PAD_FACE, PAD.r, { tone: "hi", crease: "lo" });
const vehicle = V.finish();

// ── front: platform, pedestal, pin carriage, lamp mast, charger box ──
const Fr = scene(P);
Fr.record(A.slab(PLAN, -10, 10, { name: "stand.plate", ground: true }, 8));
const platPlan = { x: PLATFORM.x, y: PLATFORM.y, w: PLATFORM.w, d: PLATFORM.d, r: PLATFORM.r };
const joints = [];
for (let x = PLATFORM.x + 20; x < PLATFORM.x + PLATFORM.w - 1; x += 20) joints.push(k.lineOnTop([x, PLATFORM.y + 6], [x, PLATFORM.y + PLATFORM.d], PLATFORM.h, P));
Fr.box("platform", [PLATFORM.x, PLATFORM.y, 0], [PLATFORM.x + PLATFORM.w, PLATFORM.y + PLATFORM.d, PLATFORM.h], { tone: "mid" }, {
  r: PLATFORM.r,
  bevel: 0.8,
  inner: Ln(k.sideSeam(platPlan, 6, P, 3) + k.sideSeam(platPlan, 18, P, 3), { tone: "faint" }),
  extra: Ln(joints.join("") + k.lineOnTop([PLATFORM.x, PLATFORM.y + 6], [PLATFORM.x + PLATFORM.w, PLATFORM.y + 6], PLATFORM.h, P), { tone: "faint" }),
  bias: -30,
});
const tactile = { x: PLATFORM.x + 2, y: PLATFORM.y + 1.2, w: PLATFORM.w - 4, d: 3.6, r: 0.8 };
const tactileDots = [];
for (let x = tactile.x + 2; x < tactile.x + tactile.w - 1; x += 3) for (const y of [tactile.y + 1, tactile.y + 2.6]) tactileDots.push(at([x, y, PLATFORM.h + 0.6]));
Fr.box("platform.edge", [tactile.x, tactile.y, PLATFORM.h], [tactile.x + tactile.w, tactile.y + tactile.d, PLATFORM.h + 0.6], { tone: "lo", crease: "none" }, { r: 0.8, extra: Dots(tactileDots, { size: 0.3, tone: "lo" }) });

const pedPlan = { x: PED.x0, y: PED.y0, w: PED.x1 - PED.x0, d: PED.y1 - PED.y0, r: 1.5 };
Fr.box("pedestal", [PED.x0, PED.y0, PLATFORM.h], [PED.x1, PED.y1, PED.z1], { tone: "mid" }, {
  r: 1.5,
  bevel: 0.6,
  inner: Ln(k.sideSeam(pedPlan, PLATFORM.h + 3, P, 3), { tone: "faint" }),
  extra: Dots(k.corners(pedPlan, 2.5).map(([x, y]) => at([x, y, PED.z1])), { size: 0.45, tone: "mid" }) + Ln(slotOnY(PED.y1, -6, 6, PLATFORM.h + 6, PLATFORM.h + 10), { tone: "lo" }),
});
for (const x of [CAR.x0 + 2, CAR.x1 - 4]) Fr.box("pedestal.guide", [x, PED.y0, PED.z1], [x + 2, PED.y1 - 6, GUIDE_Z], { tone: "mid" }, { r: 0.3, steps: 2 });
Fr.box("pedestal.drive", [-9, PED.y1 - 5.5, PED.z1], [9, PED.y1 - 0.5, PED.z1 + 9], { tone: "mid" }, {
  r: 1,
  bevel: 0.4,
  extra: Dots([at([-6, PED.y1 - 0.5, PED.z1 + 6.5]), at([6, PED.y1 - 0.5, PED.z1 + 6.5])], { size: 0.45, tone: "mid" }),
});

// The carriage and its pins, built retracted; live code moves the carriage and rebuilds the springs.
const carPlan = { x: CAR.x0, y: F_RET, w: CAR.x1 - CAR.x0, d: CAR.depth, r: 1 };
const carParts = [];
carParts.push(S(k.slabOf(carPlan, CAR.z0, CAR.z1 - CAR.z0, P, 3, 0.4), { tone: "mid" }));
carParts.push(Dots([at([CAR.x0 + 2, F_RET + CAR.depth - 2, CAR.z1]), at([CAR.x1 - 2, F_RET + CAR.depth - 2, CAR.z1])], { size: 0.45, tone: "mid" }));
const pinParts = PAD.xs.map((x) => {
  const F = alongY([x, 0, PIN.z], -1); // s grows toward the tender: y = -s
  const sCollar = -(F_RET - 1 - PIN.spring);
  return S(G.disc(-(F_RET - 1) + 0.2, sCollar, PIN.rod, F, P), { tone: "hi", lit: true }) +
    S(G.disc(sCollar, sCollar + PIN.collarT, PIN.collar, F, P), { tone: "hi", lit: true }) +
    S(G.solidOf([[sCollar + PIN.collarT, PIN.rod + 0.2], [sCollar + PIN.collarT + PIN.tip - 0.6, PIN.rod + 0.2, 1], [sCollar + PIN.collarT + PIN.tip - 0.2, PIN.rod * 0.8, 1], [sCollar + PIN.collarT + PIN.tip, 0.2, 1]], F, P), { tone: "hi", lit: true });
});
// Barrels lie in the carriage's straps; the barrel's own axis runs along -y from the carriage's far edge.
const barrelSvg = PAD.xs.map((x) => {
  const F = alongY([x, 0, PIN.z], 1);
  return S(G.disc(F_RET - 1, F_RET - 1 + PIN.barrel, PIN.r, F, P, { bevel: 0.2 }), { tone: "hi", crease: "lo" }) + S(G.disc(F_RET + 0.6, F_RET + 2, PIN.r + 0.45, F, P), { tone: "mid" });
});
const pinsSvg = pinParts
  .map((p, i) => `<g data-part="coil-back-${i}"></g><g data-part="plunger-${i}">${p}</g><g data-part="coil-front-${i}"></g>${barrelSvg[i]}`)
  .join("");
const carShapes = [
  Fr.record(A.slab(carPlan, CAR.z0, CAR.z1 - CAR.z0, { name: "carriage" }, 3)),
  ...PAD.xs.map((x) => Fr.record(A.disc(alongY([x, 0, PIN.z], 1), F_RET - 1, F_RET - 1 + PIN.barrel, PIN.r, { name: "pin.barrel" }))),
  ...PAD.xs.map((x) => Fr.record(A.disc(alongY([x, 0, PIN.z], 1), F_RET - 1 - PIN_FREE + 1, F_RET - 1, PIN.rod, { name: "pin.plunger" }))),
];
// Straps over the barrels, screwed to the carriage plate.
const strapSvg = PAD.xs.map((x) => S(k.slabOf({ x: x - 3.2, y: F_RET + 4, w: 6.4, d: 2.4, r: 0.4 }, CAR.z1, PIN.z + PIN.r + 0.5 - CAR.z1, P, 2, 0.2), { tone: "mid" }) + Dots([at([x - 3.2 - 0.9, F_RET + 5.2, CAR.z1]), at([x + 3.2 + 0.9, F_RET + 5.2, CAR.z1])], { size: 0.4, tone: "mid" })).join("");
Fr.put("carriage", [0, F_RET + CAR.depth / 2, CAR.z1], `<g data-part="carriage">${carParts.join("")}${pinsSvg}${strapSvg}</g>`, carShapes, { bias: 0.2 });

// Lamp mast at the pedestal's corner.
const mastF = G.frameOf([MAST.x, MAST.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
Fr.disc("mast.foot", mastF, PED.z1, PED.z1 + 1.6, 3.4, { tone: "mid" }, { bevel: 0.3 });
Fr.disc("mast", mastF, PED.z1 + 1.6, MAST.z1, MAST.r, { tone: "mid" }, { inner: Ln(G.arcOf(mastF, 64, MAST.r, P), { tone: "faint" }) });
Fr.disc("lamp.body", mastF, MAST.z1, MAST.z1 + 4.5, 4, { tone: "mid" }, { bevel: 0.3 });
const LAMP_C = [MAST.x, MAST.y, MAST.z1 + 4.5];
const lampF = G.frameOf(LAMP_C, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const lampProfile = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * (Math.PI / 2); return [3.4 * Math.sin(a), 3.4 * Math.cos(a), i > 0 && i < 8 ? 1 : 0]; });
const lampPaths = G.solidOf(lampProfile, lampF, P);
Fr.put("lamp", LAMP_C, S(lampPaths, { tone: "hi", crease: "lo" }) + `<path class="cs-lamp" data-part="lamp" d="${lampPaths.fill}" style="opacity:0"/><path class="iso-line" data-tone="hi" d="${lampPaths.outline}"/>`, [Fr.record(A.solid(lampF, lampProfile, { name: "lamp" }))]);
Fr.disc("lamp.cap", lampF, 3.4, 4.2, 1.2, { tone: "mid" });

// Charger box on the platform and its cable to the pedestal.
const BOX = { x0: -54, x1: -30, y0: 56, y1: 80, z1: PLATFORM.h + 16 };
const boxPlan = { x: BOX.x0, y: BOX.y0, w: BOX.x1 - BOX.x0, d: BOX.y1 - BOX.y0, r: 1.5 };
Fr.box("charger", [BOX.x0, BOX.y0, PLATFORM.h], [BOX.x1, BOX.y1, BOX.z1], { tone: "mid" }, {
  r: 1.5,
  bevel: 0.6,
  inner: Ln(k.sideSeam(boxPlan, BOX.z1 - 3, P, 3), { tone: "faint" }) + Ln([BOX.x0 + 5, BOX.x0 + 8, BOX.x0 + 11, BOX.x0 + 14].map((x) => slotOnY(BOX.y1, x, x + 1.4, PLATFORM.h + 3, PLATFORM.h + 9)).join(""), { tone: "lo" }),
  extra: Dots(k.corners(boxPlan, 2.5).map(([x, y]) => at([x, y, BOX.z1])), { size: 0.45, tone: "mid" }) + `<g data-part="charger-led">${Dots([at([BOX.x1 - 4, BOX.y1, BOX.z1 - 5])], { size: 0.8, tone: "lo" })}</g>`,
});
Fr.cable("cable", [[BOX.x1, 66, PLATFORM.h + 6], [BOX.x1 + 5, 66, PLATFORM.h + 6], [BOX.x1 + 7, 66, PLATFORM.h + 1.4], [PED.x0 - 3, 66, PLATFORM.h + 1.4], [PED.x0 - 3, 66, PLATFORM.h + 3], [PED.x0, 66, PLATFORM.h + 3]], 0.9, { tone: "mid", bend: 2.4 });
const front = Fr.finish();

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "Ray kenarında alçak bir peron ve üzerinde şarj direği. Ray boyunca gelen tenderin ön kirişinde bir hall sensörü, traversler arasında iki mıknatıs var. Tender durunca direğin pim arabası öne çıkar ve iki yaylı pogo pimi tenderin yan kontak plakalarına bastırır; direğin lambası yanar.",
  body: [...back, `<g data-part="vehicle-fade"><g data-part="vehicle">${vehicle}</g></g>`, `<g data-part="station">${front}</g>`],
});

const DATA = { P, F_RET, F_EXT, STROKE, PAD_FACE, PIN, PIN_FREE, xs: PAD.xs, wheels: wheelSlots, AXLE_Z, OUTER, WHEEL_R, DECEL, SLOW: 3 };
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const veh = part("vehicle"), vehFade = part("vehicle-fade"), station = part("station"), car = part("carriage"), lamp = part("lamp"), led = part("charger-led");
const plungers = D.xs.map((_, i) => part("plunger-" + i));
const coilsB = D.xs.map((_, i) => part("coil-back-" + i));
const coilsF = D.xs.map((_, i) => part("coil-front-" + i));
const spokes = D.wheels.map((w) => ({ el: part(w.part), x: w.x }));
const fmt = (v, d) => v.toFixed(d).replace(".", ",");
const V0 = 300 / D.SLOW; // 0,30 m/s drawn at a third of real speed, in mm per second
const START = -260, END = 260;
// States follow the train's state machine. Holds wait for Space, Enter or a click (the tour presses for you).
let state = "IDLE", c = START, v = 0, travelled = 0, stroke = 0, lampOn = 0, volts = 7.6, amps = 0, since = 0, verified = false;
let frame = 0, last = 0, touring = !still.matches, visible = false, idle = 0, heard = "";
const HOLD = { IDLE: 1.6, DOCKING: 1.8, CHARGING: 3.6, READY: 1.6 };
const NAMES = { IDLE: "BEKLİYOR", RUNNING: "SEYİR", APPROACHING: "YAKLAŞIYOR", DOCKING: "YANAŞIYOR", CHARGING: "ŞARJ", READY: "KALKIŞA HAZIR", DEPARTING: "KALKIYOR" };
const go = (next) => { state = next; since = 0; };
function advance() {
  if (state === "IDLE") go("RUNNING");
  else if (state === "DOCKING" && verified) go("CHARGING");
  else if (state === "CHARGING") go("READY");
  else if (state === "READY" && stroke < 0.01) go("DEPARTING");
}
const holding = () => (state === "IDLE") || (state === "DOCKING" && verified) || state === "CHARGING" || (state === "READY" && stroke < 0.01);
function step(dt) {
  since += dt;
  if (state === "RUNNING" || state === "APPROACHING") {
    if (state === "RUNNING") { v = Math.min(V0, v + V0 * dt / 0.6); if (c >= -D.DECEL) go("APPROACHING"); }
    if (state === "APPROACHING") v = Math.max(V0 * Math.sqrt(Math.max(0, -c) / D.DECEL), 4);
    c = Math.min(0, c + v * dt);
    if (state === "APPROACHING" && c >= 0) { c = 0; v = 0; verified = false; go("DOCKING"); }
  } else if (state === "DEPARTING") {
    v = Math.min(V0, v + V0 * dt / 1.4);
    c += v * dt;
    if (c >= END) { c = START; v = 0; volts = 7.6; go("IDLE"); }
  }
  const want = state === "DOCKING" || state === "CHARGING" ? 1 : 0;
  stroke += (want - stroke) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(want - stroke) < 0.002) stroke = want;
  if (state === "DOCKING" && stroke === 1 && since > 1) verified = true;
  const lit = state === "CHARGING" ? 1 : 0;
  lampOn += (lit - lampOn) * (1 - Math.exp(-dt / 0.25));
  if (state === "CHARGING") { amps += (1.2 - amps) * (1 - Math.exp(-dt / 0.3)); volts = 7.6 + 0.6 * (1 - Math.exp(-since / 2.5)); }
  else amps += (0 - amps) * (1 - Math.exp(-dt / 0.2));
  if (state === "READY") volts += (8.4 - volts) * (1 - Math.exp(-dt / 0.4));
  travelled += v * dt;
}
function carriageAt(s) {
  const f = D.F_RET - D.STROKE * s;
  const free = f - D.PIN_FREE;
  const comp = c === 0 ? Math.max(0, D.PAD_FACE - free) : 0;
  return { dy: f - D.F_RET, comp };
}
function draw() {
  veh.setAttribute("transform", translateAlong(P, [c, 0, 0]));
  const fade = Math.max(0, Math.min(1, (115 - Math.abs(c)) / 50));
  const ahead = c > 70;
  if (ahead !== (vehFade.nextElementSibling === null)) (ahead ? svg.appendChild(vehFade) : svg.insertBefore(vehFade, station));
  vehFade.setAttribute("opacity", (fade * fade * (3 - 2 * fade)).toFixed(3));
  const angle = -travelled / D.WHEEL_R;
  for (const s of spokes) s.el.innerHTML = lineSvg(rtSpokes([s.x, 0, D.AXLE_Z], D.OUTER, 6, D.WHEEL_R - 4.3, 6, angle, P), { tone: "lo" });
  const { dy, comp } = carriageAt(stroke);
  car.setAttribute("transform", translateAlong(P, [0, dy, 0]));
  D.xs.forEach((x, i) => {
    plungers[i].setAttribute("transform", comp ? translateAlong(P, [0, comp, 0]) : "");
    const from = D.F_RET - 1, to = D.F_RET - 1 - D.PIN.spring + comp;
    const springs = coilOf(to, from, x);
    coilsB[i].innerHTML = lineSvg(springs.back, { tone: "lo" });
    coilsF[i].innerHTML = lineSvg(springs.front, { tone: "lit" });
  });
  lamp.style.opacity = lampOn.toFixed(3);
  led.setAttribute("data-on", state === "CHARGING" ? "" : null);
  let text;
  const speed = fmt(v * D.SLOW / 1000, 2) + " m/s";
  if (state === "IDLE") text = "BEKLİYOR · pimler enerjisiz";
  else if (state === "RUNNING") text = "SEYİR · " + speed;
  else if (state === "APPROACHING") text = "YAKLAŞIYOR · " + speed;
  else if (state === "DOCKING") text = verified ? "YANAŞIYOR · temas doğrulandı" : comp > 0 ? "YANAŞIYOR · pimler basıyor" : "YANAŞIYOR · durdu";
  else if (state === "CHARGING") text = "ŞARJ · " + fmt(volts, 1) + " V · " + fmt(amps, 1) + " A";
  else if (state === "READY") text = "KALKIŞA HAZIR · " + fmt(volts, 1) + " V";
  else text = "KALKIYOR · " + speed;
  if (readout.textContent !== text) readout.textContent = text;
  const phase = NAMES[state];
  if (phase !== heard) { heard = phase; stage.setAttribute("aria-valuetext", phase); if (sr && document.activeElement === stage) sr.textContent = phase; }
}
const coilOf = (from, to, x) => coil(from, to, [x, D.PIN.z], D.PIN.coil, 7, "y", P);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring && holding() && since > (HOLD[state] ?? 1.6)) advance();
  step(dt);
  draw();
  const settled = !touring && holding() && stroke % 1 === 0 && Math.abs(lampOn - (state === "CHARGING" ? 1 : 0)) < 0.002 && (state !== "CHARGING" || since > 12);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
function stillStep() {
  advance();
  if (state === "RUNNING") { c = 0; v = 0; stroke = 1; verified = true; state = "DOCKING"; }
  else if (state === "CHARGING") { stroke = 1; lampOn = 1; amps = 1.2; volts = 8.1; }
  else if (state === "READY") { stroke = 0; lampOn = 0; amps = 0; volts = 8.4; }
  else if (state === "DEPARTING") { c = START; v = 0; state = "IDLE"; volts = 7.6; }
  since = 99;
  draw();
}
const press = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; run(); }, 3600);
  if (still.matches) stillStep(); else { advance(); run(); }
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerdown", press);
stage.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  press();
});
stage.addEventListener("focus", () => { if (sr) sr.textContent = NAMES[state]; });
if (still.matches) { touring = false; state = "CHARGING"; c = 0; stroke = 1; lampOn = 1; amps = 1.2; volts = 8.1; verified = true; since = 99; }
draw();
`;

const body =
  `<style>.cs-lamp{fill:var(--rt-lamp);stroke:none;mix-blend-mode:normal}[data-part="charger-led"][data-on] circle{fill:var(--rt-lamp);opacity:1}</style>` +
  k.plateHtml({
    fig: "Şekil 3",
    title: "Şarj istasyonu · temsili",
    hint: "Tıkla veya boşluk · sonraki adım",
    readout: "BEKLİYOR · pimler enerjisiz",
    keys: [
      { mark: "lit", label: "Yaylı pogo pimleri: pim arabası tender durunca 10 mm öne çıkar" },
      { mark: "raised", label: "Tenderin yan kontak plakaları ve ön kirişteki A3144 hall sensörü" },
      { mark: "dim", label: "Traversler arasında 6×3 mm mıknatıslar: yaklaşma ve durma noktası" },
      { mark: "dashed", label: "Volt ve akım: temsili değerler, devre henüz yok" },
    ],
    caption:
      "Temsili şema, uygulanmış devre değil. Planlanan akış: tender ilk mıknatısın üstünden geçince ESP32 yavaşlar (YAKLAŞIYOR), ikinci mıknatısın üstünde durur. Pim arabası ancak o zaman öne çıkar ve yaylı pimler plakalara basar. Pimler yanaşma doğrulanana kadar enerjisizdir; doğrulamadan sonra 2S Li-ion paket şarj edilir ve lamba yanar. Okumadaki volt ve akım değerleri (8,4 V'a kadar, 1,2 A) yalnız açıklama içindir, ölçüm değildir. Hareket gerçek hızın üçte biriyle, şarj süresi çok kısaltılarak çizilir.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Şarj istasyonu. Boşluk, Enter veya tıklama durum makinesini bir sonraki adıma geçirir: bekliyor, seyir, yaklaşıyor, yanaşıyor, şarj, kalkışa hazır, kalkıyor." style="cursor:pointer">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

writePages("charging-station", { title: "Şarj istasyonu", body, live });
console.log(`tender ${V.R.items.length} items · station ${Fr.R.items.length} items · ${Fr.R.solids.length + V.R.solids.length} solids`);
console.log("— tender —");
A.auditOrExit(V.R, P, {});
console.log("— station —");
A.auditOrExit(Fr.R, P, {});
