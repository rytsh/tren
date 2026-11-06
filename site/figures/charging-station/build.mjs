// Fig 3 · Şarj istasyonu: a Şarj 250 car runs along the track past a low platform. A hall sensor under its frame
// sees an approach magnet between the ties, the car slows and stops over the stop magnet, and only then one micro
// servo turns a vertical shaft that swings two arms (upper +, lower −) out of a pocket in the car's side, like a
// door. Each arm's spring-loaded brass shoe presses on one of two brass rails held by the station's posts. To
// leave, the servo turns the arms back into the pocket, flush with the side, and the car departs.
// Units are millimetres; x along the track, y across (the station is on +y, toward the viewer), z up from the plate.
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
const RT = TIE.t + RAIL.h; // rail top above the plate
const RAIL_Y = RAIL.gauge / 2 + RAIL.head / 2;
const TRACK_X = 190;

// Şarj 250 (docs/standart.md): 250 × 90 underframe, bogies at ±75 with a 48 mm wheelbase, Ø42 wheels.
const WHEEL_R = 21;
const FLANGE_R = WHEEL_R + 2.5;
const BACK = 20;
const WIDTH = 7.5;
const AXLE_Z = RT + WHEEL_R;
const BOGIE_X = [-75, 75];
const AXLE_X = BOGIE_X.flatMap((b) => [b - 24, b + 24]);
const HALF = 45; // underframe half width (car_w/2)
const BW = 40; // body shell half width (car_body_w/2)
const FRAME = { x: 121, z0: RT + 47, z1: RT + 51 };
const BODY = { x: 116, z0: FRAME.z1, side: RT + 91, crown: RT + 97 }; // cad: car_body_l/2, sj_wall_top, sj_crown
const SENSOR = { x: 40, y: 8 };
const STOP_X = SENSOR.x; // stop magnet under the sensor when the car is at c = 0
const DECEL = 80; // approach magnet 80 mm before
const APPROACH_X = STOP_X - DECEL;

// Charge arms: one shaft at (PX, PY), two arms that lie in a side pocket when stowed (pointing −x) and swing a
// quarter turn out to point +y. A brass shoe rides 1.5 mm in a holder at the tip.
const ARM = { px: 12, py: 35, eye: 4, half: 4, hold0: 17, hold1: 22, holdHalf: 4, shoe: 4, shoeHalf: 2.5, travel: 1.5 }; // cad: sj_px/py, sj_hub_d, sj_arm_len, sj_shoe_out, sj_travel
const LEVELS = [
  { name: "lo", z0: RT + 57, z1: RT + 61, bar: RT + 59 },
  { name: "up", z0: RT + 75, z1: RT + 79, bar: RT + 77 },
];
const TIP = ARM.hold1 + ARM.shoe; // pivot to the free shoe tip, 26 mm
const RAIL_FACE = ARM.py + TIP - ARM.travel; // station rails' face: the shoe is pressed its full 1.5 mm at 90°
const POCKET = { x0: -18, x1: 17, y0: 30, z0: RT + 54, z1: RT + 81 }; // cad: sj_pk_*

// Station
const PLATFORM = { x: -160, y: 52, w: 320, d: 64, r: 2, h: 40 };
const BAR = { x0: -45, x1: 45, t: 3, h: 6 };
const POST = { x: 45, w: 6, y0: RAIL_FACE, y1: RAIL_FACE + 8, z1: RT + 87 };
const LAMP_C = [POST.x + POST.w / 2, (POST.y0 + POST.y1) / 2];

const PLAN = { x: -205, y: -62, w: 410, d: 184, r: 10 };
const P = k.fitProjection(
  [...k.boxCorners(PLAN, -15, 0), [-150, -HALF, BODY.crown + 6], [150, HALF, BODY.crown + 6], [LAMP_C[0], LAMP_C[1], POST.z1 + 12]],
  W,
  H,
  { pad: 16, azimuth: Number(process.env.AZ ?? 58), elevation: Number(process.env.EL ?? 46) },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const circleOnY = (y, cx, cz, r, n = 48) => path3(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), y, cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const circleOnX = (x, cy, cz, r, n = 40) => path3(Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const rectOnY = (y, x0, x1, z0, z1, r) => path3(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 4).map(([x, z]) => [x, y, z]), true);
const rectOnX = (x, y0, y1, z0, z1, r) => path3(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 4).map(([y, z]) => [x, y, z]), true);
const slotOnY = (y, x0, x1, z0, z1) => rectOnY(y, x0, x1, z0, z1, Math.min(x1 - x0, z1 - z0) / 2);
const alongY = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const alongMinusX = (o) => G.frameOf(o, [-1, 0, 0], [0, -1, 0], [0, 0, 1]);
const alongZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const XF = alongX([0, 0, 0]);
const F0 = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);

// ── back: plate, ties, magnets, rails ──
const back = [];
back.push(basePlate(P, PLAN, { ruler: { x: -185, y: -56, w: 96, d: 5, r: 1 }, label: { x: 150, y: 96, w: 34, d: 10, r: 1.2 } }));
const fadeA = at([-TRACK_X, 0, 0]);
const fadeB = at([TRACK_X, 0, 0]);
back.push(
  `<defs><linearGradient id="cs-fade" gradientUnits="userSpaceOnUse" x1="${fadeA[0].toFixed(1)}" y1="${fadeA[1].toFixed(1)}" x2="${fadeB[0].toFixed(1)}" y2="${fadeB[1].toFixed(1)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".06" stop-color="#fff" stop-opacity="1"/><stop offset=".94" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="cs-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"><rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="url(#cs-fade)"/></mask></defs>`,
);
const ties = [];
for (let x = TIE.at - 190; x <= 190; x += TIE.pitch) ties.push(S(k.slabOf({ x: x - TIE.w / 2, y: -TIE.len / 2, w: TIE.w, d: TIE.len, r: 0.8 }, 0, TIE.t, P, 3, 0.5), { tone: "lo" }));
back.push(`<g mask="url(#cs-mask)">${ties.join("")}</g>`);
for (const [x, name] of [[APPROACH_X, "approach"], [STOP_X, "stop"]]) {
  back.push(S(k.slabOf({ x: x - 5, y: SENSOR.y - 5, w: 10, d: 10, r: 1.5 }, 0, 2.2, P, 3, 0.4), { tone: "lo" }));
  back.push(`<g data-part="magnet-${name}">${S(k.cylinder(x, SENSOR.y, 3, 2.2, 1, P, 24), { tone: "hi", crease: "lo" })}${Dots([at([x, SENSOR.y, 3.2])], { size: 0.5, tone: "hi" })}</g>`);
}
function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, c = 0.6;
  const z0 = TIE.t, zf = z0 + 1.6, zh = RT - RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, zf], [yc + wb, zf + 1.2], [yc + wb, zh], [yc + h, zh], [yc + h, RT - c], [yc + h - c, RT], [yc - h + c, RT], [yc - h, RT - c], [yc - h, zh], [yc - wb, zh], [yc - wb, zf + 1.2], [yc - f, zf]];
}
const Sb = scene(P);
for (const sign of [-1, 1]) Sb.prism("rail", XF, railPoly(sign * RAIL_Y), -TRACK_X, TRACK_X, { tone: "mid" });
back.push(`<g mask="url(#cs-mask)">${Sb.finish()}</g>`);

// ── the Şarj 250 car, built docked (c = 0) ──
const V = scene(P);
for (const sign of [-1, 1]) V.record(A.prism(XF, railPoly(sign * RAIL_Y), -TRACK_X, TRACK_X, { name: "stand.rail", ground: true }));

// Bogies: inside side frames, bolster and a pivot under the frame; two axles each.
const flangeProfile = [[BACK, FLANGE_R - 0.7], [BACK + 0.5, FLANGE_R], [BACK + 1.2, FLANGE_R], [BACK + 1.8, WHEEL_R + 0.3]];
const treadProfile = [[BACK + 1.8, WHEEL_R], [BACK + WIDTH, WHEEL_R - (WIDTH - 1.8) * 0.05]];
const OUTER = BACK + WIDTH;
const wheelSlots = [];
for (const bx of BOGIE_X) {
  for (const sign of [-1, 1]) {
    const [y0, y1] = sign > 0 ? [13, 19] : [-19, -13];
    const xs = [bx - 24, bx + 24];
    V.box("bogie.side", [bx - 32, y0, RT + 12], [bx + 32, y1, RT + 32], { tone: "mid" }, {
      r: 2,
      bevel: 0.4,
      extra: sign > 0 ? Ln(xs.map((x) => circleOnY(y1, x, AXLE_Z, 4.5)).join("") + rectOnY(y1, bx - 10, bx + 10, RT + 15, RT + 29, 2), { tone: "lo" }) + Dots([bx - 28, bx - 14, bx + 14, bx + 28].map((x) => at([x, y1, RT + 29])), { size: 0.45, tone: "mid" }) : "",
    });
  }
  V.box("bogie.bolster", [bx - 5, -13, RT + 26], [bx + 5, 13, RT + 32], { tone: "mid" }, { r: 0.6, steps: 2 });
  V.disc("bogie.pivot", alongZ([bx, 0, 0]), RT + 32, FRAME.z0, 4, { tone: "mid" });
}
for (const x of AXLE_X) {
  for (const sign of [-1, 1]) {
    const F = alongY([x, 0, AXLE_Z], sign);
    V.turned("car.flange", F, flangeProfile, { tone: "mid", className: "rt-red" });
    const part = sign > 0 ? `spokes-${wheelSlots.length}` : null;
    const face = part ? Ln(circleOnY(OUTER, x, AXLE_Z, WHEEL_R - 4.3) + circleOnY(OUTER, x, AXLE_Z, 6), { tone: "lo" }) + `<g data-part="${part}"></g>` + Dots([at([x, OUTER, AXLE_Z])], { size: 0.5, tone: "hi" }) : "";
    V.turned("car.tread", F, treadProfile, { tone: "mid", className: "rt-red" }, { extra: face });
    if (part) wheelSlots.push({ part, x });
  }
  for (const [s0, s1] of [[-BACK, -19], [19, BACK]]) V.disc("car.axle", alongY([x, 0, AXLE_Z]), s0, s1, 2, { tone: "hi" });
}

// Underframe, node box, hall sensor
V.box("car.frame", [-FRAME.x, -HALF, FRAME.z0], [FRAME.x, HALF, FRAME.z1], { tone: "mid" }, {
  r: 1.2,
  bevel: 0.4,
  extra: Dots(Array.from({ length: 22 }, (_, i) => at([-FRAME.x + 9 + i * 11, HALF, FRAME.z0 + 2])), { size: 0.4, tone: "mid" }),
});
V.box("car.node", [-30, -14, RT + 38], [20, 22, FRAME.z0], { tone: "mid" }, {
  r: 1,
  bevel: 0.3,
  extra: Ln(rectOnY(22, -24, -6, RT + 40, RT + 45, 1), { tone: "lo" }) + Dots([at([-27, 22, RT + 45]), at([17, 22, RT + 45])], { size: 0.45, tone: "mid" }) + `<g data-part="node-led">${Dots([at([10, 22, RT + 42.5])], { size: 0.8, tone: "lo" })}</g>`,
});
V.box("car.bracket", [SENSOR.x - 4, SENSOR.y - 3, RT + 9], [SENSOR.x - 2, SENSOR.y + 3, FRAME.z0], { tone: "mid" }, { r: 0.4, steps: 2, extra: Dots([at([SENSOR.x - 2, SENSOR.y, RT + 40])], { size: 0.45, tone: "mid" }) });
V.box("car.hall", [SENSOR.x - 2, SENSOR.y - 2.1, RT + 5], [SENSOR.x + 2, SENSOR.y + 2.1, RT + 9], { tone: "hi" }, {
  r: 0.3,
  steps: 2,
  extra: `<g data-part="hall-dot">${Dots([at([SENSOR.x, SENSOR.y, RT + 9])], { size: 0.7, tone: "hi" })}</g>`,
});

// End beams, buffers, drawbar
for (const sign of [-1, 1]) {
  const face = sign * 125;
  const x0 = sign > 0 ? FRAME.x : -125;
  for (const [y0, y1] of [[-HALF, -14], [14, HALF]]) V.box("car.beam", [x0, y0, RT + 34], [x0 + 4, y1, FRAME.z1], { tone: "mid", className: "rt-red" }, { r: 0.6, bevel: 0.4 });
  V.box("car.beam", [x0, -14, RT + 43.5], [x0 + 4, 14, FRAME.z1], { tone: "mid", className: "rt-red" }, { r: 0.4, steps: 2 });
  for (const y of [-32, 32]) {
    const F = sign > 0 ? alongX([0, y, RT + 41]) : alongMinusX([0, -y, RT + 41]);
    V.disc("car.buffer", F, 125, 129.5, 4.6, { tone: "mid" }, { bevel: 0.3 });
    V.disc("car.bufferrod", F, 129.5, 130.2, 2.6, { tone: "mid" });
    V.disc("car.bufferhead", F, 130.2, 131.8, 6.4, { tone: "mid" }, { bevel: 0.4 });
  }
  // drawbar on the front pivot (out through the beam notch to its eye); a boss under each end's pivot
  const zbar = RT + 37;
  V.disc("drawbar.boss", alongZ([sign * 87, 0, 0]), zbar + 5.5, FRAME.z0, 4.5, { tone: "mid" });
  if (sign > 0) {
    V.box("drawbar", [87, -4, zbar], [125 + 34, 4, zbar + 5.5], { tone: "mid", className: "cs-brass" }, { r: 0.6, steps: 2 });
    V.disc("drawbar.eye", alongZ([125 + 34, 0, 0]), zbar, zbar + 5.5, 5, { tone: "mid", className: "cs-brass" }, { extra: `<path class="rt-hole" d="${k.ring(125 + 34, 0, 1.7, zbar + 5.5, P, 20)}"/>` });
  }
}

// Body: low arched box van with a pocket for the arms, a charge light bar and an end door; arched roof with vents.
const R = (BW ** 2 + (BODY.crown - BODY.side) ** 2) / (2 * (BODY.crown - BODY.side));
const zc = BODY.crown - R;
const arc = (half, rr, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const y = half - (2 * half * i) / n; return [y, zc + Math.sqrt(Math.max(0, rr * rr - y * y))]; });
const roofTop = zc + R + 2.6;
const BELT = [BODY.z0 + 4, BODY.side - 3];
const LIGHTBAR = { x0: 26, x1: 104, z0: RT + 65, z1: RT + 69 }; // cad: sj_lb_*
const LEDS = Array.from({ length: 10 }, (_, i) => LIGHTBAR.x0 + 3 + i * 7);
const panelLines = [-88, -58, 22].map((x) => k.pathOf([at([x, BW, BELT[0]]), at([x, BW, BELT[1]])])).join("");
const belts = BELT.map((z) => k.pathOf([at([-BODY.x, BW, z]), at([BODY.x, BW, z])]) + k.pathOf([at([BODY.x, -BW, z]), at([BODY.x, BW, z])])).join("");
const lightbar = `<path class="rt-hole" d="${rectOnY(BW, LIGHTBAR.x0, LIGHTBAR.x1, LIGHTBAR.z0, LIGHTBAR.z1, 1.2)}"/>` +
  LEDS.map((x, i) => `<path class="cs-led" data-led="${i}" d="${rectOnY(BW, x, x + 5, LIGHTBAR.z0 + 1.4, LIGHTBAR.z1 - 1.4, 0.5)}"/>`).join("");
const pocket = `<path class="rt-hole" d="${rectOnY(BW, POCKET.x0, POCKET.x1, POCKET.z0, POCKET.z1, 1.5)}"/>` + Ln(rectOnY(BW, POCKET.x0 - 1.5, POCKET.x1 + 1.5, POCKET.z0 - 1.5, POCKET.z1 + 1.5, 2.4), { tone: "mid" });
// front end wall: the 4-pin TrenBus socket (cad: bus_socket, bus_conn_z 42 → rail top 63)
const endDoor = `<path class="rt-hole" d="${rectOnX(BODY.x, -6.2, 6.2, RT + 60, RT + 66, 0.8)}"/>` + Ln(rectOnX(BODY.x, -8.4, 8.4, RT + 57.8, RT + 68.4, 1.2), { tone: "mid" }) + Dots([-4.5, -1.5, 1.5, 4.5].map((y) => at([BODY.x, y, RT + 63])), { size: 0.45, tone: "lo" });
const tail = [-30, 30].map((y) => `<path class="cs-tail" d="${circleOnX(BODY.x, y, RT + 62, 2.6, 20)}"/>`).join("");
const rivets = Dots(Array.from({ length: 30 }, (_, i) => at([-BODY.x + 4 + i * ((2 * BODY.x - 8) / 29), BW, BODY.z0 + 2])), { size: 0.4, tone: "mid" });
V.prism("car.body", F0, [[-BW, BODY.z0], [BW, BODY.z0], ...arc(BW, R)], -BODY.x, BODY.x, { tone: "mid" }, {
  extra: Ln(belts + panelLines, { tone: "faint" }) + lightbar + pocket + endDoor + tail + rivets,
});
V.prism("car.roof", F0, [...arc(BW + 2, R + 0.2), ...arc(BW + 2, R + 2.6).reverse()], -BODY.x - 2, BODY.x + 2, { tone: "mid" });
for (const x of [-80, 80]) {
  V.disc("car.vent", alongZ([x, 0, 0]), roofTop - 1, roofTop + 2.5, 3.2, { tone: "mid" }, { bevel: 0.3 });
  V.disc("car.ventcap", alongZ([x, 0, 0]), roofTop + 2.5, roofTop + 3.6, 4.4, { tone: "mid" });
}
const vehicle = V.finish();

// Arms: drawn after the car (they sit in its pocket or stand out of its side), rebuilt by the page as they turn.
const shaft = (z0, z1) => S(k.cylinder(ARM.px, ARM.py, 1.5, z0, z1 - z0, P, 20), { tone: "hi", crease: "lo" });
const [LO, UP] = LEVELS;
const armsSvg =
  S(k.slabOf({ x: POCKET.x0, y: POCKET.y0, w: POCKET.x1 - POCKET.x0, d: BW - POCKET.y0, r: 0.6 }, POCKET.z0 - 0.6, 0.6, P, 3), { tone: "lo", crease: "none" }) +
  S(k.cylinder(ARM.px, ARM.py, 3, POCKET.z0, 1.2, P, 24), { tone: "mid" }) +
  shaft(POCKET.z0 + 1.2, LO.z0) +
  `<g data-part="arm-lo"></g>` +
  shaft(LO.z1, UP.z0) +
  `<g data-part="arm-up"></g>` +
  shaft(UP.z1, POCKET.z1 - 1.2);

// ── front: platform, posts, the two brass rails, lamp, charger box and its leads ──
const Fr = scene(P);
Fr.record(A.slab(PLAN, -10, 10, { name: "stand.plate", ground: true }, 8));
const platPlan = { x: PLATFORM.x, y: PLATFORM.y, w: PLATFORM.w, d: PLATFORM.d, r: PLATFORM.r };
const joints = [];
for (let x = PLATFORM.x + 32; x < PLATFORM.x + PLATFORM.w - 1; x += 32) joints.push(k.lineOnTop([x, PLATFORM.y + 6], [x, PLATFORM.y + PLATFORM.d], PLATFORM.h, P));
Fr.box("platform", [PLATFORM.x, PLATFORM.y, 0], [PLATFORM.x + PLATFORM.w, PLATFORM.y + PLATFORM.d, PLATFORM.h], { tone: "mid" }, {
  r: PLATFORM.r,
  bevel: 0.8,
  inner: Ln(k.sideSeam(platPlan, 8, P, 3) + k.sideSeam(platPlan, 24, P, 3), { tone: "faint" }),
  extra: Ln(joints.join("") + k.lineOnTop([PLATFORM.x, PLATFORM.y + 6], [PLATFORM.x + PLATFORM.w, PLATFORM.y + 6], PLATFORM.h, P), { tone: "faint" }),
  bias: -30,
});
const tactile = { x: PLATFORM.x + 2, y: PLATFORM.y + 1.2, w: PLATFORM.w - 4, d: 3.6, r: 0.8 };
const tactileDots = [];
for (let x = tactile.x + 2; x < tactile.x + tactile.w - 1; x += 3) for (const y of [tactile.y + 1, tactile.y + 2.6]) tactileDots.push(at([x, y, PLATFORM.h + 0.6]));
Fr.box("platform.edge", [tactile.x, tactile.y, PLATFORM.h], [tactile.x + tactile.w, tactile.y + tactile.d, PLATFORM.h + 0.6], { tone: "lo", crease: "none" }, { r: 0.8, extra: Dots(tactileDots, { size: 0.3, tone: "lo" }) });

// Insulating posts with a foot plate, screwed to the platform.
for (const sign of [-1, 1]) {
  const x0 = sign > 0 ? POST.x : -POST.x - POST.w;
  const foot = { x: x0 - 3, y: POST.y0 - 1, w: POST.w + 6, d: POST.y1 - POST.y0 + 6, r: 1 };
  Fr.box("post.foot", [foot.x, foot.y, PLATFORM.h], [foot.x + foot.w, foot.y + foot.d, PLATFORM.h + 1.6], { tone: "mid" }, {
    r: 1,
    bevel: 0.3,
    extra: Dots(k.corners(foot, 1.6).map(([x, y]) => at([x, y, PLATFORM.h + 1.6])), { size: 0.4, tone: "mid" }),
  });
  Fr.box("post", [x0, POST.y0, PLATFORM.h + 1.6], [x0 + POST.w, POST.y1, POST.z1], { tone: "mid" }, {
    r: 0.8,
    bevel: 0.4,
    extra: Dots(LEVELS.map((L) => at([sign > 0 ? x0 + POST.w : x0, (POST.y0 + POST.y1) / 2 + 1.5, L.bar])), { size: 0.45, tone: "mid" }),
  });
}
// Two brass rails between the posts: upper +, lower −; contact faces toward the track.
for (const L of LEVELS) {
  Fr.box(`bar.${L.name}`, [BAR.x0, RAIL_FACE, L.bar - BAR.h / 2], [BAR.x1, RAIL_FACE + BAR.t, L.bar + BAR.h / 2], { tone: "hi", className: "cs-brass" }, {
    r: 0.4,
    steps: 2,
    bevel: 0.2,
    extra: Dots([-36, -12, 12, 36].map((x) => at([x, RAIL_FACE + BAR.t, L.bar + BAR.h / 2])), { size: 0.35, tone: "hi" }),
  });
}

// Lamp on the right post.
const lampF0 = G.frameOf([LAMP_C[0], LAMP_C[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
Fr.disc("lamp.foot", lampF0, POST.z1, POST.z1 + 1.4, 2.8, { tone: "mid" }, { bevel: 0.2 });
Fr.disc("lamp.body", lampF0, POST.z1 + 1.4, POST.z1 + 5, 3.4, { tone: "mid" }, { bevel: 0.3 });
const LAMP = [LAMP_C[0], LAMP_C[1], POST.z1 + 5];
const lampF = G.frameOf(LAMP, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const lampProfile = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * (Math.PI / 2); return [3 * Math.sin(a), 3 * Math.cos(a), i > 0 && i < 8 ? 1 : 0]; });
const lampPaths = G.solidOf(lampProfile, lampF, P);
Fr.put("lamp", LAMP, S(lampPaths, { tone: "hi", crease: "lo" }) + `<path class="cs-lamp" data-part="lamp" d="${lampPaths.fill}" style="opacity:0"/><path class="iso-line" data-tone="hi" d="${lampPaths.outline}"/>`, [Fr.record(A.solid(lampF, lampProfile, { name: "lamp" }))]);
Fr.disc("lamp.cap", lampF, 3, 3.8, 1.1, { tone: "mid" });

// Charger box and the two leads from the back of the rails.
const BOX = { x0: -128, x1: -104, y0: 76, y1: 102, z1: PLATFORM.h + 16 };
const boxPlan = { x: BOX.x0, y: BOX.y0, w: BOX.x1 - BOX.x0, d: BOX.y1 - BOX.y0, r: 1.5 };
Fr.box("charger", [BOX.x0, BOX.y0, PLATFORM.h], [BOX.x1, BOX.y1, BOX.z1], { tone: "mid" }, {
  r: 1.5,
  bevel: 0.6,
  inner: Ln(k.sideSeam(boxPlan, BOX.z1 - 3, P, 3), { tone: "faint" }) + Ln([BOX.x0 + 5, BOX.x0 + 8, BOX.x0 + 11, BOX.x0 + 14].map((x) => slotOnY(BOX.y1, x, x + 1.4, PLATFORM.h + 3, PLATFORM.h + 9)).join(""), { tone: "lo" }),
  extra: Dots(k.corners(boxPlan, 2.5).map(([x, y]) => at([x, y, BOX.z1])), { size: 0.45, tone: "mid" }) + `<g data-part="charger-led">${Dots([at([BOX.x1 - 4, BOX.y1, BOX.z1 - 5])], { size: 0.8, tone: "lo" })}</g>`,
});
const LEAD_R = 1;
const back0 = RAIL_FACE + BAR.t;
const floor = PLATFORM.h + LEAD_R;
Fr.cable("lead.up", [[-36, back0, UP.bar], [-36, 82, UP.bar], [-36, 82, floor], [BOX.x1, 82, floor]], LEAD_R, { tone: "mid", bend: 4 });
Fr.cable("lead.lo", [[-28, back0, LO.bar], [-28, 92, LO.bar], [-28, 92, floor], [BOX.x1, 92, floor]], LEAD_R, { tone: "mid", bend: 4 });
const front = Fr.finish();

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "Ray kenarında alçak bir peron ve üzerinde iki direk arasında üst üste iki pirinç ray. Ray boyunca gelen şarj vagonunun altında bir hall sensörü, traversler arasında iki mıknatıs var. Vagon durunca yan cebindeki üst ve alt kol kapı gibi dışarı döner ve yaylı pabuçları üstteki artı, alttaki eksi raya basar; direğin lambası yanar. Şarj bitince kollar cebe geri döner.",
  body: [...back, `<g data-part="vehicle-fade"><g data-part="vehicle">${vehicle}<g data-part="arms">${armsSvg}</g></g></g>`, `<g data-part="station">${front}</g>`],
});

const DATA = {
  P, ARM, LEVELS, TIP, RAIL_FACE, LEDS: LEDS.length,
  wheels: wheelSlots, AXLE_Z, OUTER, WHEEL_R, DECEL, SLOW: 3,
};
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const VIEW = rtView(P);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const veh = part("vehicle"), vehFade = part("vehicle-fade"), lamp = part("lamp"), led = part("charger-led"), nodeLed = part("node-led");
const armEls = D.LEVELS.map((L) => part("arm-" + L.name));
const leds = [...svg.querySelectorAll("[data-led]")];
const spokes = D.wheels.map((w) => ({ el: part(w.part), x: w.x }));
const fmt = (v, d) => v.toFixed(d).replace(".", ",");
const A = D.ARM;
const V0 = 300 / D.SLOW; // 0,30 m/s drawn at a third of real speed, in mm per second
const SWING = 0.9; // a quarter turn of the servo, drawn slowed
const START = -340, END = 340;
// States follow the car's state machine. Holds wait for Space, Enter or a click (the tour presses for you).
let state = "IDLE", c = START, v = 0, travelled = 0, open = 0, held = 0, lampOn = 0, soc = 0.42, amps = 0, since = 0, verified = false;
let frame = 0, last = 0, touring = !still.matches, visible = false, idle = 0, heard = "";
const HOLD = { IDLE: 1.6, DOCKING: 1.4, CHARGING: 4, READY: 1.4 };
const NAMES = { IDLE: "BEKLİYOR", RUNNING: "SEYİR", APPROACHING: "YAKLAŞIYOR", DOCKING: "KOLLAR AÇILIYOR", CHARGING: "ŞARJ", STOWING: "KOLLAR KAPANIYOR", READY: "KALKIŞA HAZIR", DEPARTING: "KALKIYOR" };
const go = (next) => { state = next; since = 0; };
const ease = (t) => t * t * (3 - 2 * t);
const angleOf = () => (Math.PI / 2) * ease(open);
const tipY = () => A.py + D.TIP * Math.sin(angleOf());
const compression = () => (c === 0 ? Math.max(0, Math.min(A.travel, tipY() - D.RAIL_FACE)) : 0);
const volts = () => 6.4 + 2 * soc;
function advance() {
  if (state === "IDLE") go("RUNNING");
  else if (state === "DOCKING" && verified) go("CHARGING");
  else if (state === "CHARGING") go("STOWING");
  else if (state === "READY") go("DEPARTING");
}
const holding = () => state === "IDLE" || (state === "DOCKING" && verified) || state === "CHARGING" || state === "READY";
function step(dt) {
  since += dt;
  if (state === "RUNNING" || state === "APPROACHING") {
    if (state === "RUNNING") { v = Math.min(V0, v + V0 * dt / 0.6); if (c >= -D.DECEL) go("APPROACHING"); }
    if (state === "APPROACHING") v = Math.max(V0 * Math.sqrt(Math.max(0, -c) / D.DECEL), 4);
    c = Math.min(0, c + v * dt);
    if (state === "APPROACHING" && c >= 0) { c = 0; v = 0; verified = false; held = 0; go("DOCKING"); }
  } else if (state === "DEPARTING") {
    v = Math.min(V0, v + V0 * dt / 1.4);
    c += v * dt;
    if (c >= END) { c = START; v = 0; soc = 0.42; go("IDLE"); }
  }
  const want = state === "DOCKING" || state === "CHARGING" ? 1 : 0;
  open = want > open ? Math.min(1, open + dt / SWING) : Math.max(0, open - dt / SWING);
  if (Math.abs(open - want) < 1e-3) open = want;
  if (state === "DOCKING") { held = compression() >= A.travel - 0.01 ? held + dt : 0; if (held > 0.6) verified = true; }
  if (state === "STOWING" && open === 0) go("READY");
  const lit = state === "CHARGING" ? 1 : 0;
  lampOn += (lit - lampOn) * (1 - Math.exp(-dt / 0.25));
  if (state === "CHARGING") {
    const target = soc < 0.85 ? 1.2 : 1.2 * (1 - soc) / 0.15;
    amps += (target - amps) * (1 - Math.exp(-dt / 0.3));
    soc = Math.min(1, soc + dt * 0.07 * (amps / 1.2));
  } else amps += (0 - amps) * (1 - Math.exp(-dt / 0.2));
  travelled += v * dt;
}
function armSvg(L, a, comp) {
  const dx = -Math.cos(a), dy = Math.sin(a);
  const F = { o: [A.px, A.py, 0], a: [0, 0, 1], u: [dx, dy, 0], v: [-dy, dx, 0] };
  const eye = Array.from({ length: 13 }, (_, i) => { const t = Math.PI / 2 + (i / 12) * Math.PI; return [A.eye * Math.cos(t), A.eye * Math.sin(t)]; });
  const poly = [...eye, [A.hold0, -A.half], [A.hold0, -A.holdHalf], [A.hold1, -A.holdHalf], [A.hold1, A.holdHalf], [A.hold0, A.holdHalf], [A.hold0, A.half], [0, A.half]];
  const u0 = A.hold1 - comp, u1 = A.hold1 + A.shoe - comp;
  const shoePoly = [[u0, -A.shoeHalf], [u1 - 0.6, -A.shoeHalf], [u1, -A.shoeHalf + 0.6], [u1, A.shoeHalf - 0.6], [u1 - 0.6, A.shoeHalf], [u0, A.shoeHalf]];
  const arm = solidSvg(rtPrism(F, poly, L.z0, L.z1, P), { tone: "hi" }) +
    lineSvg(pathOf([0.62, 0.38].map((s) => iso(rtAt(F, L.z1, A.hold0 + 4 * s, 0), P))), { tone: "mid", free: true }) +
    dotsSvg([iso([A.px, A.py, L.z1], P), iso(rtAt(F, L.z1, A.hold0 + 2, A.holdHalf - 1), P), iso(rtAt(F, L.z1, A.hold0 + 2, -A.holdHalf + 1), P)], { size: 0.5, tone: "hi" });
  const shoe = '<g class="cs-brass">' + solidSvg(rtPrism(F, shoePoly, L.z0 + 0.5, L.z1 - 0.5, P), { tone: "hi" }) + "</g>";
  return dx * VIEW[0] + dy * VIEW[1] > 0 ? arm + shoe : shoe + arm;
}
function draw() {
  veh.setAttribute("transform", translateAlong(P, [c, 0, 0]));
  const fade = Math.max(0, Math.min(1, (250 - Math.abs(c)) / 90));
  vehFade.setAttribute("opacity", (fade * fade * (3 - 2 * fade)).toFixed(3));
  const angle = -travelled / D.WHEEL_R;
  for (const s of spokes) s.el.innerHTML = lineSvg(rtSpokes([s.x, 0, D.AXLE_Z], D.OUTER, 6, D.WHEEL_R - 4.3, 6, angle, P), { tone: "lo" });
  const a = angleOf(), comp = compression();
  D.LEVELS.forEach((L, i) => { armEls[i].innerHTML = armSvg(L, a, comp); });
  lamp.style.opacity = lampOn.toFixed(3);
  led.toggleAttribute("data-on", state === "CHARGING");
  nodeLed.toggleAttribute("data-on", state !== "IDLE");
  const on = Math.round(soc * D.LEDS);
  const blink = state === "CHARGING" && Math.floor(since * 2) % 2 === 0;
  leds.forEach((el, i) => el.toggleAttribute("data-on", i < on || (blink && i === on)));
  let text;
  const speed = fmt(v * D.SLOW / 1000, 2) + " m/s";
  const deg = Math.round((a * 180) / Math.PI) + "°";
  if (state === "IDLE") text = "BEKLİYOR · kollar içeride, raylar enerjisiz";
  else if (state === "RUNNING") text = "SEYİR · " + speed;
  else if (state === "APPROACHING") text = "YAKLAŞIYOR · " + speed;
  else if (state === "DOCKING") text = verified ? "TEMAS DOĞRULANDI · üst +, alt −" : comp > 0 ? "KOLLAR AÇILIYOR · yay " + fmt(comp, 1) + " mm" : "KOLLAR AÇILIYOR · " + deg;
  else if (state === "CHARGING") text = "ŞARJ · " + fmt(volts(), 1) + " V · " + fmt(amps, 1) + " A · %" + Math.round(soc * 100);
  else if (state === "STOWING") text = "KOLLAR KAPANIYOR · " + deg;
  else if (state === "READY") text = "KALKIŞA HAZIR · kollar cepte · %" + Math.round(soc * 100);
  else text = "KALKIYOR · " + speed;
  if (readout.textContent !== text) readout.textContent = text;
  const phase = NAMES[state];
  if (phase !== heard) { heard = phase; stage.setAttribute("aria-valuetext", phase); if (sr && document.activeElement === stage) sr.textContent = phase; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring && holding() && since > (HOLD[state] ?? 1.6)) advance();
  step(dt);
  draw();
  const settled = !touring && holding() && (open === 0 || open === 1) && Math.abs(lampOn - (state === "CHARGING" ? 1 : 0)) < 0.002 && (state !== "CHARGING" || soc >= 1);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
function stillStep() {
  advance();
  if (state === "RUNNING") { c = 0; v = 0; open = 1; verified = true; state = "DOCKING"; }
  else if (state === "CHARGING") { open = 1; lampOn = 1; amps = 1.2; soc = 0.62; }
  else if (state === "STOWING") { open = 0; lampOn = 0; amps = 0; soc = 0.7; state = "READY"; }
  else if (state === "DEPARTING") { c = START; v = 0; open = 0; state = "IDLE"; soc = 0.42; }
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
if (still.matches) { touring = false; state = "CHARGING"; c = 0; open = 1; lampOn = 1; amps = 1.2; soc = 0.62; verified = true; since = 99; }
draw();
`;

const body =
  `<style>.cs-lamp{fill:var(--rt-lamp);stroke:none;mix-blend-mode:normal}[data-part="charger-led"][data-on] circle,[data-part="node-led"][data-on] circle{fill:var(--rt-lamp);opacity:1}` +
  `.cs-led{fill:var(--rt-lamp-off);stroke:none}.cs-led[data-on]{fill:var(--cs-led)}.cs-tail{fill:var(--rt-lamp-off);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}` +
  `.iso{--cs-led:#7fd36b;--cs-b0:#3a2e10;--cs-b1:#4a3a14;--cs-b2:#5c4819;--cs-b3:#6e571f;--cs-bt:#806626}.iso[data-theme="light"]{--cs-led:#3f9a2e;--cs-b0:#a87a22;--cs-b1:#bb8c2c;--cs-b2:#cc9f3c;--cs-b3:#dcb352;--cs-bt:#e9c76c;--rt-lamp-off:#cfc6aa}` +
  `.cs-brass .iso-fill{fill:var(--cs-b2)}.cs-brass .iso-shade[data-shade="0"]{fill:var(--cs-b0)}.cs-brass .iso-shade[data-shade="1"]{fill:var(--cs-b1)}.cs-brass .iso-shade[data-shade="2"]{fill:var(--cs-b2)}.cs-brass .iso-shade[data-shade="3"]{fill:var(--cs-b3)}.cs-brass .iso-top{fill:var(--cs-bt)}</style>` +
  k.plateHtml({
    fig: "Şekil 3",
    title: "Şarj istasyonu · temsili",
    hint: "Tıkla veya boşluk · sonraki adım",
    readout: "BEKLİYOR · kollar içeride, raylar enerjisiz",
    keys: [
      { mark: "lit", label: "Döner şarj kolları: tek mikro servo ve ortak dikey mil, uçlarında 1,5 mm yaylı pirinç pabuç; kapalıyken yan cepte, gövdeyle aynı hizada" },
      { mark: "raised", label: "İstasyonda üst üste iki pirinç ray, 90 mm boy: üst artı (+), alt eksi (−)" },
      { mark: "dim", label: "Traversler arasında 6×3 mm mıknatıslar ve vagon altındaki A3144 hall sensörü: yaklaşma ve durma noktası" },
      { mark: "dashed", label: "Volt, akım ve doluluk: temsili değerler, devre henüz yok" },
    ],
    caption:
      "Temsili şema, uygulanmış devre değil. Planlanan akış: vagon ilk mıknatısın üstünden geçince ESP32 yavaşlar (YAKLAŞIYOR) ve ikinci mıknatısın üstünde durur. Bundan sonra tek bir mikro servo ortak mili çeyrek tur döndürür. Üst ve alt kol, cepten kapı gibi dışarı açılır ve pabuçları istasyondaki üst (+) ve alt (−) pirinç raylara 1,5 mm yay baskısıyla dayanır. Raylar 90 mm uzun olduğu için vagonun ±40 mm kadar kayık durması temasa engel olmaz. Raylar temas doğrulanana kadar enerjisizdir; doğrulamadan sonra 2S Li-ion paket şarj edilir, direğin lambası yanar ve yandaki ışık çubuğu doluluğu gösterir. Şarj bitince servo kolları geri çevirir, kollar cebe girer ve dışarı taşmaz; vagon ancak kollar kapanınca kalkar. Volt, akım ve yüzde değerleri yalnız açıklama içindir, ölçüm değildir. Hareket gerçek hızın üçte biriyle, şarj süresi çok kısaltılarak çizilir.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Şarj istasyonu. Boşluk, Enter veya tıklama durum makinesini bir sonraki adıma geçirir: bekliyor, seyir, yaklaşıyor, kollar açılıyor, şarj, kollar kapanıyor, kalkışa hazır, kalkıyor." style="cursor:pointer">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

writePages("charging-station", { title: "Şarj istasyonu", body, live });
console.log(`car ${V.R.items.length} items · station ${Fr.R.items.length} items · ${Fr.R.solids.length + V.R.solids.length} solids · rail face y ${RAIL_FACE}`);
console.log("— car —");
A.auditOrExit(V.R, P, {});
console.log("— station —");
A.auditOrExit(Fr.R, P, {});
