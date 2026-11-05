// Fig 4 · T45 kuplör: the facing ends of two cars, each with an end beam, side buffers and a T45 head on a pivoted
// arm. The left car stands still; the right car rolls in, its cone finds the left funnel, the pogo pins touch and
// compress, the lock pins drop and the four-core line comes alive. The near half of each coupler pocket and the
// lower near corner of the left head are cut away so the arm, the pivot, the cable and the spring pins show.
// Units are millimetres (docs/standart.md §2, cad/params.json); x along the track, y across (+y toward the viewer),
// z up from the rail top. The coupling plane is x = 0 when coupled.
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "../../anatomy/kit/tube.mjs";
import { scene, writePages } from "../common.mjs";
import { rtPrism, rtSpokes } from "../runtime.mjs";
import * as M from "./model.mjs";

const W = 640;
const H = 420;
const { DMAX, BEAM, DECK, CARRIER, HANGER, PIVOT, ARM, HEAD, UP_Z, CONE, FUNNEL, MAGNET, MOD, PINS, POGO, LUG, LOCK, GLAND, CORE, CLAMP, NODE, TERMINAL, WHEEL, BUFFER } = M;

const SOLE = { x0: -104, y0: 41, y1: 45, z0: 38, z1: DECK.z0 };
const CLIP = { x0: -65, x1: -63, half: 3.6, z1: 53.6 };
const LABEL = { y0: 14.6, y1: 22.4, z0: 39.5, z1: 47.5, t: 0.6 };
const FADE = [-88, -106];
const CORE_Y = [2.025, 0.675, -0.675, -2.025];
const LINE_ID = ["bat", "canh", "canl", "gnd"];
const SHIFT = { right: [DMAX, 0, 0] };

const fitPoints = [];
for (const x of [-96, 96 + DMAX]) for (const y of [-45, 45]) for (const z of [22, 52]) fitPoints.push([x, y, z]);
fitPoints.push([0, 9, 60.5], [-80, 0, 58]);
const P = k.fitProjection(fitPoints, W, H, { pad: 6, azimuth: Number(process.env.AZ ?? 68), elevation: Number(process.env.EL ?? 34) });
const Sc = scene(P);
const { R, at, S, Ln, Dots, KS } = Sc;
const V = G.viewOf(P);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const circleOnX = (x, cy, cz, r, n = 40) => path3(Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const slotOnY = (y, x0, x1, z0, z1) => path3(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r: Math.min(x1 - x0, z1 - z0) / 2 }, 4).map(([x, z]) => [x, y, z]), true);
const XF = (o = [0, 0, 0], sign = 1) => G.frameOf(o, [sign, 0, 0], [0, 1, 0], [0, 0, 1]);
const YF = (o, sign = 1) => G.frameOf(o, [0, sign, 0], [1, 0, 0], [0, 0, 1]);
const ZF = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const FLOOR = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const ngon = (r, n = 14, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);

// Every item goes through here: `side` picks the car, `swing` marks the right head group that slides into line.
let side = "left";
let swing = 0;
function put(name, ref, svg, shapes, opts = {}) {
  const moving = side === "right";
  return R.put({ name: R.nameFor(name), at: ref, bias: opts.bias ?? 0, svg, shapes, piece: side, move: moving ? SHIFT.right : [0, 0, 0], swing: moving ? swing : 0, ...opts.rest });
}
// How far a point on the right coupler follows the head's sideways offset: the arm turns about its pivot, the cable
// bends from the clamp down to the deck.
const ARM_LEN = HEAD.x0 - PIVOT.x;
const followAt = (xl) => (xl >= -31 ? Math.min(1, (xl - PIVOT.x) / ARM_LEN) : Math.max(0, ((xl + 41) / 10) * ((-31 - PIVOT.x) / ARM_LEN)));
const rec = (shape) => R.solid(shape);
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, meta = {}, wrap = (s) => s } = {}) {
  const plan = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r };
  const shape = rec(A.slab(plan, z0, z1 - z0, { name, ...meta }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrap(S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra), [shape], { bias });
  return shape;
}
function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, ref, meta = {}, wrap = (s) => s } = {}) {
  const shape = rec(A.prism(F, poly, s0, s1, { name, ...meta }));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
  put(name, ref ?? centre, wrap(S(rtPrism(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra), [shape], { bias });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, steps, bevel = 0, meta = {}, wrap = (s) => s } = {}) {
  const paths = G.solidOf(profile, F, P, { bevel, ...(steps ? { steps } : {}) });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = rec(A.solid(F, profile, { name, ...meta }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), wrap(S(paths, { tone: "mid", ...style, inner }) + extra), [shape], { bias });
  return shape;
}
const disc = (name, F, s0, s1, r, style = {}, options = {}) => turned(name, F, [[s0, r], [s1, r]], style, options);
const vcyl = (name, cx, cy, r, z0, z1, style = {}, { steps = 24, extra = "", meta = {}, bias = 0 } = {}) => {
  const shape = rec(A.cylinder(cx, cy, r, z0, z1 - z0, { name, ...meta }));
  put(name, [cx, cy, (z0 + z1) / 2], S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps), { tone: "mid", ...style }) + extra, [shape], { bias });
  return shape;
};

// ── fades: the decks run out to the left and right, the wheels run out downward ──
const defs = [];
function fadeAlongX(id, x0, x1) {
  const a = at([x0, 0, 50]);
  const b = at([x1, 0, 50]);
  defs.push(
    `<linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${id}-g)"/></mask>`,
  );
}
fadeAlongX("cp-fade-l", FADE[0], FADE[1]);
fadeAlongX("cp-fade-r", -FADE[0], -FADE[1]);
const lowMask = (id, xs) => {
  const a = at([xs, 30, 46]);
  const b = at([xs, 30, 4]);
  defs.push(
    `<linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="${a[1].toFixed(1)}" x2="0" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".45" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${id}-g)"/></mask>`,
  );
};
lowMask("cp-low-l", WHEEL.x);
lowMask("cp-low-r", -WHEEL.x);
const masked = (id) => (svg) => `<g mask="url(#${id})">${svg}</g>`;

// ── one car end; σ = +1 for the left car (body on −x), −1 for the right car (built coupled, moved by the gap) ──
const CORES = [];
const ARM_DATA = {};
function carEnd(σ) {
  side = σ > 0 ? "left" : "right";
  const X = (x) => σ * x;
  const xs = (a, b) => [X(a), X(b)].sort((p, q) => p - q);
  const fade = masked(σ > 0 ? "cp-fade-l" : "cp-fade-r");
  const low = masked(σ > 0 ? "cp-low-l" : "cp-low-r");
  const ground = { ground: true };
  const tag = σ > 0 ? "L" : "R";

  // deck, sole bars and end beam
  const [dx0, dx1] = xs(DECK.x0, DECK.cutX);
  const deckPlan = { x: dx0, y: -45, w: dx1 - dx0, d: 90, r: 1.2 };
  const plateJoint = Ln(k.lineOnTop([X(-84), -45], [X(-84), 45], DECK.z1, P), { tone: "faint" });
  const deckRivets = Dots([...Array.from({ length: 10 }, (_, i) => at([X(-66 - i * 4), 43, DECK.z1])), ...Array.from({ length: 10 }, (_, i) => at([X(-66 - i * 4), -43, DECK.z1]))], { size: 0.4, tone: "mid" });
  box(`deck${tag}`, [dx0, -45, DECK.z0], [dx1, 45, DECK.z1], { tone: "mid" }, { r: 1.2, bevel: 0.5, extra: plateJoint + deckRivets, meta: ground, wrap: fade });
  {
    // the far half of the deck over the coupler pocket; the near half is cut away
    const [px0, px1] = xs(DECK.cutX, BEAM.face - BEAM.t);
    box(`deck${tag}.far`, [px0, -45, DECK.z0], [px1, DECK.cutY, DECK.z1], { tone: "mid" }, {
      r: 0.6,
      bevel: 0.4,
      extra: Dots([0, 1, 2, 3, 4, 5, 6, 7].map((i) => at([X(-27 - i * 4.4), DECK.cutY - 1.8, DECK.z1])), { size: 0.4, tone: "mid" }),
      meta: ground,
    });
  }
  for (const sy of [1, -1]) {
    const [y0, y1] = sy > 0 ? [SOLE.y0, SOLE.y1] : [-SOLE.y1, -SOLE.y0];
    const [sx0, sx1] = xs(SOLE.x0, BEAM.face - BEAM.t);
    const rivets = sy > 0 ? Dots(Array.from({ length: 19 }, (_, i) => at([X(-28 - i * 4), SOLE.y1, 44.5])), { size: 0.38, tone: "mid" }) : "";
    const plan = { x: sx0, y: y0, w: sx1 - sx0, d: y1 - y0, r: 0.4 };
    box(`sole${tag}`, [sx0, y0, SOLE.z0], [sx1, y1, SOLE.z1], { tone: "mid" }, { r: 0.4, steps: 2, bevel: 0.3, inner: sy > 0 ? Ln(k.sideSeam(plan, 41.5, P, 2), { tone: "faint" }) : "", extra: rivets, meta: ground, wrap: fade });
  }
  // the right car's beam is cut at the pocket's near wall, so its near half doesn't hide the heads
  // cut into blocks round the coupler notch, so the cable in the notch orders against each block
  const beamPolys = [
    [[-45, BEAM.z0], [-BEAM.notchY, BEAM.z0], [-BEAM.notchY, BEAM.z1], [-45, BEAM.z1]],
    [[-BEAM.notchY, BEAM.notchZ], [BEAM.notchY, BEAM.notchZ], [BEAM.notchY, BEAM.z1], [-BEAM.notchY, BEAM.z1]],
    ...(σ > 0 ? [[[BEAM.notchY, BEAM.z0], [45, BEAM.z0], [45, BEAM.z1], [BEAM.notchY, BEAM.z1]]] : []),
  ];
  const faceX = X(BEAM.face);
  const rivetsIn = (y0, y1) => {
    const row = [];
    for (let y = -43; y <= 43.1; y += 4) if (Math.abs(y) > 15 && y > y0 && y < y1) row.push(at([faceX, y, 48.4]));
    for (const y of [-43, -39, 39, 43]) if (y > y0 && y < y1) row.push(at([faceX, y, 35.6]));
    for (const y of [-9, -3, 3, 9]) if (y > y0 && y < y1) row.push(at([faceX, y, 48.4]));
    return σ > 0 ? Dots(row, { size: 0.42, tone: "mid" }) : "";
  };
  const seamOf = (y0, y1) => (σ > 0 ? Ln(k.segment([faceX, y0, 37.2], [faceX, y1, 37.2], P), { tone: "faint" }) : "");
  const blockStyle = [
    { inner: seamOf(-45, -BEAM.notchY), extra: rivetsIn(-46, -BEAM.notchY) },
    { extra: rivetsIn(-BEAM.notchY, BEAM.notchY) },
    { inner: seamOf(BEAM.notchY, 45), extra: rivetsIn(BEAM.notchY, 46) },
  ];
  const bs = [Math.min(X(BEAM.face), X(BEAM.face - BEAM.t)), Math.max(X(BEAM.face), X(BEAM.face - BEAM.t))];
  beamPolys.forEach((poly, i) => prism(`beam${tag}`, XF([0, 0, 0], 1), poly, bs[0], bs[1], { tone: "mid" }, { ...blockStyle[i], meta: ground }));
  if (σ > 0) {
    // label plate with the one engraved label
    const lx = BEAM.face + LABEL.t;
    const plate = { x: BEAM.face, y: LABEL.y0, w: LABEL.t, d: LABEL.y1 - LABEL.y0, r: 0.3 };
    const textMove = k.faceTextSvg(k.sideMatrix([lx, LABEL.y1 - 1.3], 43.9, P, "right"), "T45", { size: 3.4, tone: "hi" });
    const rule = Ln(k.segment([lx, LABEL.y1 - 1.3, 41.6], [lx, LABEL.y0 + 1.6, 41.6], P), { tone: "lo", free: true });
    box("beamL.label", [plate.x, plate.y, LABEL.z0], [plate.x + plate.w, plate.y + plate.d, LABEL.z1], { tone: "lo" }, {
      r: 0.3,
      steps: 2,
      extra: textMove + rule + Dots([at([lx, LABEL.y1 - 0.9, LABEL.z1 - 0.9]), at([lx, LABEL.y0 + 0.9, LABEL.z1 - 0.9]), at([lx, LABEL.y1 - 0.9, LABEL.z0 + 0.9]), at([lx, LABEL.y0 + 0.9, LABEL.z0 + 0.9])], { size: 0.32, tone: "mid" }),
    });
  }

  // side buffers (visual only, they stay 24 mm apart when coupled)
  for (const y of σ > 0 ? [-BUFFER.y, BUFFER.y] : [-BUFFER.y]) {
    disc(`buffer${tag}.stock`, G.frameOf([X(BEAM.face), y, BUFFER.z], [σ, 0, 0], [0, 1, 0], [0, 0, 1]), 0, BUFFER.len - BUFFER.headT, BUFFER.stock, { tone: "mid" }, {
      inner: Ln(G.arcOf(G.frameOf([X(BEAM.face), y, BUFFER.z], [σ, 0, 0], [0, 1, 0], [0, 0, 1]), 2.2, BUFFER.stock, P), { tone: "faint" }),
    });
    const HF = G.frameOf([X(BEAM.face + BUFFER.len - BUFFER.headT), y, BUFFER.z], [σ, 0, 0], [0, 1, 0], [0, 0, 1]);
    disc(`buffer${tag}.head`, HF, 0, BUFFER.headT, BUFFER.head, { tone: "mid" }, { bevel: 0.3 });
  }

  // carrier under the pocket, hangers from the deck, pivot
  const [cx0, cx1] = xs(-64, CARRIER.x1);
  box(`carrier${tag}`, [cx0, -16, CARRIER.z0], [cx1, 16, CARRIER.z1], { tone: "mid" }, {
    r: 0.8,
    bevel: 0.4,
    inner: Ln(k.sideSeam({ x: cx0, y: -16, w: cx1 - cx0, d: 32, r: 0.8 }, 32.2, P, 3), { tone: "faint" }),
    extra: Dots([at([X(-26), 13.6, CARRIER.z1]), at([X(-26), -13.6, CARRIER.z1])], { size: 0.42, tone: "mid" }),
  });
  for (const sy of [-1, 1]) {
    const [hy0, hy1] = sy > 0 ? [13, 16] : [-16, -13];
    const [hx0, hx1] = xs(-64, -58);
    box(`hanger${tag}`, [hx0, hy0, CARRIER.z1], [hx1, hy1, DECK.z0], { tone: "mid" }, {
      r: 0.3,
      steps: 2,
      extra: sy > 0 ? Dots([at([X(-61), 16, 36.5]), at([X(-61), 16, 44.5])], { size: 0.4, tone: "mid" }) : "",
    });
  }

  // wheelset at the outer axle of the bogie, red, fading toward the rails
  for (const sy of [1, -1]) {
    const F = YF([X(WHEEL.x), 0, WHEEL.axle], sy);
    const flange = [[WHEEL.back, WHEEL.flange - 0.7], [WHEEL.back + 0.5, WHEEL.flange], [WHEEL.back + 1.2, WHEEL.flange], [WHEEL.back + 1.8, WHEEL.r + 0.3]];
    const tread = [[WHEEL.back + 1.8, WHEEL.r], [WHEEL.back + WHEEL.width, WHEEL.r - (WHEEL.width - 1.8) * 0.05]];
    const outer = WHEEL.back + WHEEL.width;
    const circ = (r, n = 48) => path3(Array.from({ length: n }, (_, i) => [X(WHEEL.x) + r * Math.cos((i / n) * 2 * Math.PI), outer, WHEEL.axle + r * Math.sin((i / n) * 2 * Math.PI)]), true);
    turned(`wheel${tag}.flange`, F, flange, { tone: "mid", className: "rt-red" }, { meta: ground, wrap: low });
    const face = sy > 0 ? Ln(circ(WHEEL.r - 4.3) + circ(6), { tone: "lo" }) + Ln(rtSpokes([X(WHEEL.x), 0, WHEEL.axle], outer, 6, WHEEL.r - 4.3, 6, σ > 0 ? 0.3 : 0.8, P), { tone: "lo" }) + Ln(circ(2, 16), { tone: "mid" }) + Dots([at([X(WHEEL.x), outer, WHEEL.axle])], { size: 0.5, tone: "hi" }) : "";
    turned(`wheel${tag}.tread`, F, tread, { tone: "mid", className: "rt-red" }, { extra: face, meta: ground, wrap: low });
  }
  disc(`axle${tag}`, YF([X(WHEEL.x), 0, WHEEL.axle]), -WHEEL.back, WHEEL.back, 2, { tone: "hi" }, { meta: ground, wrap: low });

  // the swinging group: arm, pivot head, coupler head and everything on it
  const armPoly = [[X(HEAD.x0), -ARM.half]];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 - (i / 16) * Math.PI;
    armPoly.push([X(PIVOT.x + ARM.eye * Math.cos(a)), ARM.eye * Math.sin(a)]);
  }
  armPoly.push([X(HEAD.x0), ARM.half]);
  const [ax0, ax1] = xs(-48, -26);
  const armSlot = Ln(k.planOutline({ x: ax0, y: -1.4, w: ax1 - ax0, d: 2.8, r: 1.4 }, ARM.z1, P, 4), { tone: "lo" });
  const armScrews = Dots([at([X(-14.4), 3, ARM.z1]), at([X(-14.4), -3, ARM.z1])], { size: 0.42, tone: "mid" });
  prism(`arm${tag}`, FLOOR, armPoly, ARM.z0, ARM.z1, { tone: "mid" }, { extra: armSlot + armScrews, ref: [X(-36), 0, (ARM.z0 + ARM.z1) / 2], wrap: (s) => `<g data-part="arm-${tag}">${s}</g>` });
  if (σ < 0) ARM_DATA.R = { poly: armPoly, slot: k.roundedPlan({ x: ax0, y: -1.4, w: ax1 - ax0, d: 2.8, r: 1.4 }, 4), screws: [[X(-14.4), 3], [X(-14.4), -3]], pivot: [X(PIVOT.x), 0] };
  vcyl(`pivot${tag}.washer`, X(PIVOT.x), 0, PIVOT.washer - 0.6, ARM.z1, ARM.z1 + 0.6, { tone: "mid" }, { steps: 28 });
  {
    const z0 = ARM.z1 + 0.6;
    const shape = rec(A.cylinder(X(PIVOT.x), 0, PIVOT.head, z0, 1.6, { name: `pivot${tag}.head` }));
    put(`pivot${tag}.head`, [X(PIVOT.x), 0, z0 + 0.8], S(k.cylinder(X(PIVOT.x), 0, PIVOT.head, z0, 1.6, P, 6), { tone: "hi", crease: "lo" }) + Dots([at([X(PIVOT.x), 0, z0 + 1.6])], { size: 0.5, tone: "hi" }), [shape]);
  }

  swing = 1;
  // head body, cut by its funnel. Feature y follows the 180° turn of the car: y_world = σ · y_left.
  const Fy = (y) => σ * y;
  const funnelF = G.frameOf([0, Fy(FUNNEL.y), UP_Z], [σ, 0, 0], [0, 1, 0], [0, 0, 1]);
  const funnelShape = A.solid(funnelF, [[-FUNNEL.depth, FUNNEL.bottom], [0, FUNNEL.mouth], [0.6, FUNNEL.mouth]], { name: `funnel${tag}` });
  const hx = xs(HEAD.x0, HEAD.x1);
  const topHole = Ln(k.ring(X(-LOCK.x), Fy(-LOCK.y), LOCK.r + 0.2, HEAD.z1, P, 20), { tone: "lo" });
  const topSeam = (plan) => Ln(k.sideSeam(plan, HEAD.z1 - 1.4, P, 3), { tone: "faint" });
  if (σ > 0) {
    // The left head in three solids; its lower near corner is cut away to show the spring pins.
    const fx = 0;
    const funnelMouth = circleOnX(fx, Fy(FUNNEL.y), UP_Z, FUNNEL.mouth, 56);
    const funnelBevel = circleOnX(fx, Fy(FUNNEL.y), UP_Z, FUNNEL.mouth + 0.9, 56);
    const bottom = circleOnX(-FUNNEL.depth, Fy(FUNNEL.y), UP_Z, FUNNEL.bottom, 32);
    const funnelArt =
      `<clipPath id="cp-funnel-clip"><path d="${funnelMouth}"/></clipPath>` +
      `<path class="cp-cavity" d="${funnelMouth}"/>` +
      `<g clip-path="url(#cp-funnel-clip)"><path class="cp-cavity-deep" d="${bottom}"/>${Ln(bottom, { tone: "lo" })}</g>` +
      Ln(funnelMouth, { tone: "mid" }) +
      Ln(funnelBevel, { tone: "faint" });
    const upperPoly = [[-HEAD.half, 39.5], [HEAD.half, 39.5], [HEAD.half, HEAD.z1], [-HEAD.half, HEAD.z1]];
    const faceScrews = Dots([at([0, -15.6, 48.6]), at([0, 16.2, 48.6])], { size: 0.42, tone: "mid" });
    prism("headL.upper", XF([0, 0, 0], 1), upperPoly, HEAD.x0, HEAD.x1, { tone: "hi", crease: "lo" }, {
      extra: funnelArt + faceScrews + topHole,
      meta: { cut: funnelShape, owner: "headL" },
      ref: [-6, 0, 45],
    });
    const midPoly = [[HEAD.x0, -HEAD.half], [HEAD.x1, -HEAD.half], [HEAD.x1, 3], [-10, 3], [-10, HEAD.half], [HEAD.x0, HEAD.half]];
    const fm = { y0: -MOD.y - MOD.half, y1: -MOD.y + MOD.half };
    const female = path3([[0, fm.y0, MOD.z0], [0, fm.y1, MOD.z0], [0, fm.y1, MOD.z1], [0, fm.y0, MOD.z1]], true);
    const pads = PINS.map((z) => circleOnX(0, -MOD.y, z, 0.95, 20)).join("");
    const padFill = PINS.map((z) => `<path class="cp-pad" d="${circleOnX(0, -MOD.y, z, 0.95, 20)}"/>`).join("");
    const modScrews = Dots([at([0, fm.y0 - 1.6, MOD.z1 - 0.6]), at([0, fm.y1 + 1.6, MOD.z0 + 0.6])], { size: 0.38, tone: "mid" });
    prism("headL.middle", FLOOR, midPoly, 26.6, 39.5, { tone: "hi", crease: "lo" }, {
      extra: Ln(female, { tone: "mid" }) + Ln(path3([[0, fm.y0 + 0.8, MOD.z0 + 0.8], [0, fm.y1 - 0.8, MOD.z0 + 0.8], [0, fm.y1 - 0.8, MOD.z1 - 0.8], [0, fm.y0 + 0.8, MOD.z1 - 0.8]], true), { tone: "faint" }) + padFill + Ln(pads, { tone: "hi" }) + modScrews,
      meta: { owner: "headL" },
      ref: [-6, -6, 33],
    });
    box("headL.base", [HEAD.x0, -HEAD.half, HEAD.z0], [HEAD.x1, HEAD.half, 26.6], { tone: "hi", crease: "lo" }, { r: 0.4, steps: 2, meta: { owner: "headL" } });
  } else {
    const plan = { x: hx[0], y: -HEAD.half, w: HEAD.x1 - HEAD.x0, d: HEAD.half * 2, r: 0.6 };
    const backX = X(HEAD.x0);
    const backScrews = Dots([at([backX, -15.6, 27.4]), at([backX, 15.6, 27.4]), at([backX, 15.6, 48.6]), at([backX, -15.6, 48.6])], { size: 0.42, tone: "mid" });
    const backSeam = Ln(k.sideSeam(plan, 39.5, P, 3), { tone: "faint" });
    box("headR", [hx[0], -HEAD.half, HEAD.z0], [hx[1], HEAD.half, HEAD.z1], { tone: "hi", crease: "lo" }, {
      r: 0.6,
      steps: 3,
      bevel: 0.3,
      inner: topSeam(plan) + backSeam,
      extra: topHole + backScrews,
      meta: { cut: funnelShape, owner: "headR" },
    });
    // magnets behind the cone and the funnel, seen in their pockets on the back face
    for (const y of [-9, 9]) {
      const F = G.frameOf([backX, y, UP_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      disc("headR.magnet", F, 0, MAGNET.proud, MAGNET.r, { tone: "hi", crease: "lo" }, {
        extra: Ln(circleOnX(backX + MAGNET.proud, y, UP_Z, 2.2, 24), { tone: "faint" }),
        meta: { owner: "headR" },
      });
    }
  }
  // cone on the face, at the head's right
  swing = 1;
  {
    const F = G.frameOf([X(HEAD.x1), Fy(CONE.y), UP_Z], [σ, 0, 0], [0, 1, 0], [0, 0, 1]);
    const profile = [[0, CONE.base], [0.6, CONE.base], [CONE.len - 0.8, CONE.tip + 0.5], [CONE.len, CONE.tip]];
    turned(`cone${tag}`, F, profile, { tone: "hi", crease: "lo" }, { meta: { owner: `head${tag}` }, inner: Ln(G.arcOf(F, 0.6, CONE.base, P), { tone: "faint" }) });
  }
  // lug over the other head, with the lock pin's bore
  {
    const [lx0, lx1] = [LUG.x0, LUG.x1];
    const ly = [Fy(LUG.y0), Fy(LUG.y1)].sort((a, b) => a - b);
    const hole = Ln(k.ring(X(LOCK.x), Fy(LOCK.y), LOCK.r + 0.25, LUG.z1, P, 20), { tone: "lo" });
    box(`lug${tag}`, [lx0, ly[0], LUG.z0], [lx1, ly[1], LUG.z1], { tone: "mid" }, {
      r: 1.2,
      bevel: 0.3,
      extra: hole + Dots([at([X(-4.2), Fy(4), LUG.z1]), at([X(-4.2), Fy(14), LUG.z1])], { size: 0.4, tone: "mid" }),
      meta: { owner: `head${tag}` },
    });
  }
  // lock pin, raised; the page drops it 5 mm once the faces are shut
  {
    const cx = X(LOCK.x);
    const cy = Fy(LOCK.y);
    const z0 = LUG.z1;
    const shapes = [rec(A.cylinder(cx, cy, LOCK.r, z0, LOCK.drop, { name: `lock${tag}.shank`, owner: `head${tag}` })), rec(A.cylinder(cx, cy, LOCK.head, z0 + LOCK.drop, LOCK.headT, { name: `lock${tag}.head`, owner: `head${tag}` }))];
    put(`lock${tag}`, [cx, cy, z0 + 3], `<g data-part="lock-${tag}">${lockSvg(cx, cy, 0)}</g>`, shapes);
  }
  // cable gland on the back face and the strain-relief clamp on the arm
  {
    const F = G.frameOf([X(HEAD.x0), 0, GLAND.z], [-σ, 0, 0], [0, 1, 0], [0, 0, 1]);
    turned(`gland${tag}.body`, F, [[0, GLAND.r], [1.4, GLAND.r]], { tone: "mid" }, { steps: 6, meta: { owner: `head${tag}` } });
    turned(`gland${tag}.cap`, F, [[1.4, 3], [2.3, 3], [2.6, 2.7]], { tone: "mid" }, { meta: { owner: `head${tag}` }, extra: Ln(G.circleOf(F, 2.6, 2.7, P), { tone: "faint" }) });
    swing = followAt((CLAMP.x0 + CLAMP.x1) / 2);
    const [c0, c1] = xs(CLAMP.x1, CLAMP.x0);
    const plan = { x: c0, y: -CLAMP.half, w: c1 - c0, d: CLAMP.half * 2, r: 0.5 };
    box(`clamp${tag}`, [c0, -CLAMP.half, ARM.z1], [c1, CLAMP.half, 48.4], { tone: "mid" }, {
      r: 0.5,
      steps: 2,
      inner: Ln(k.sideSeam(plan, CORE.z, P, 2), { tone: "lo" }),
      extra: Dots([at([X(-17.5), 3.1, 48.4]), at([X(-17.5), -3.1, 48.4])], { size: 0.45, tone: "mid" }),
    });
  }
  swing = 0;

  // node box on the deck, its terminal block and the deck clip
  {
    const [nx0, nx1] = xs(NODE.x0, NODE.x1);
    const plan = { x: nx0, y: -NODE.half, w: nx1 - nx0, d: NODE.half * 2, r: 1.2 };
    const vents = Ln([0, 1, 2, 3].map((i) => slotOnY(NODE.half, X(-83 + i * 3) - 0.7, X(-83 + i * 3) + 0.7, DECK.z1 + 1.6, DECK.z1 + 5)).join(""), { tone: "lo" });
    const ledAt = at([X(-71.5), NODE.half, NODE.z1 - 3.4]);
    const sticker = { x: Math.min(X(-84), X(-74)), y: -7, w: 10, d: 9, r: 0.8 };
    const rules = Ln([0.8, 0.55, 0.65].map((w, i) => k.lineOnTop([sticker.x + 1.6, sticker.y + 2.3 + i * 2.3], [sticker.x + 1.6 + (sticker.w - 3.2) * w, sticker.y + 2.3 + i * 2.3], NODE.z1 + 0.4, P)).join(""), { tone: "lo", free: true });
    box(`node${tag}`, [nx0, -NODE.half, DECK.z1], [nx1, NODE.half, NODE.z1], { tone: "mid" }, {
      r: 1.2,
      bevel: 0.5,
      inner: Ln(k.sideSeam(plan, NODE.z1 - 1.6, P, 3), { tone: "faint" }) + vents,
      extra:
        Dots(k.corners(plan, 1.8).map(([x, y]) => at([x, y, NODE.z1])), { size: 0.42, tone: "mid" }) +
        S(k.slabOf(sticker, NODE.z1, 0.4, P, 3), { tone: "lo", crease: "none" }) +
        rules +
        `<g data-part="led-${tag}"><circle class="cp-led" cx="${ledAt[0].toFixed(2)}" cy="${ledAt[1].toFixed(2)}" r="1"/></g>`,
    });
    const [tx0, tx1] = xs(TERMINAL.x0, TERMINAL.x1);
    box(`terminal${tag}`, [tx0, -TERMINAL.half, DECK.z1], [tx1, TERMINAL.half, TERMINAL.z1], { tone: "mid" }, {
      r: 0.3,
      steps: 2,
      extra: Dots(CORE_Y.map((y) => at([X(-67.25), y, TERMINAL.z1])), { size: 0.42, tone: "hi" }),
    });
    const [kx0, kx1] = xs(CLIP.x0, CLIP.x1);
    box(`clip${tag}`, [kx0, -CLIP.half, DECK.z1], [kx1, CLIP.half, CLIP.z1], { tone: "mid" }, { r: 0.4, steps: 2, extra: Dots([at([X(-64), 0, CLIP.z1])], { size: 0.4, tone: "mid" }) });
  }

  // four cores: gland → clamp → beam notch → up over the deck → terminal. The cores run parallel, so their depth
  // order never changes: each chunk of the bundle is one item, painted far core first.
  const chunks = [];
  CORE_Y.forEach((y, index) => {
    const pts = [[X(HEAD.x0 - 2.6), y, CORE.z], [X(-31), y, CORE.z], [X(-41), y, CORE.deck + 1.1], [X(TERMINAL.x1), y, CORE.deck + 1.1]];
    const route = G.fillet(pts, 3.2, 10, { P, tube: CORE.r });
    const gaps = [];
    for (const [a, b] of [[CLAMP.x1, CLAMP.x0], [CLIP.x1, CLIP.x0]]) {
      const s0 = crossingsOf(route, [X(a), 0, 0], [1, 0, 0], 99)[0];
      const s1 = crossingsOf(route, [X(b), 0, 0], [1, 0, 0], 99)[0];
      gaps.push([Math.min(s0, s1), Math.max(s0, s1)]);
    }
    const name = `core${tag}.${LINE_ID[index]}`;
    const touch = [`clamp${tag}`, `clip${tag}`, `gland${tag}.cap`, `terminal${tag}`];
    const breaks = [BEAM.face, BEAM.face - BEAM.t, -31, -36, -41].map((x) => crossingsOf(route, [X(x), 0, 0], [1, 0, 0], 99)[0]).filter((v) => v !== undefined);
    R.route(name, route, CORE.r, { limp: true, gaps, touch, bundle: `cable${tag}`, piece: side, move: side === "right" ? SHIFT.right : [0, 0, 0] });
    const total = G.pathLength(route);
    // screen length along the route, so a pulse dash runs on through every chunk joint
    const dense = G.resample(route, 0.25);
    const cum = [0];
    for (let i = 1; i < dense.length; i++) {
      const a = at(dense[i - 1]);
      const b = at(dense[i]);
      cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const screenAt = (p) => {
      let best = 0;
      let bestD = Infinity;
      dense.forEach((q, i) => {
        const d = G.len3(G.sub3(p, q));
        if (d < bestD) (bestD = d), (best = i);
      });
      return cum[best];
    };
    const pieces = tubePieces(route, CORE.r, P, { maxLength: σ > 0 ? 9 : 3.5, spacing: 0.6, gaps, breaks });
    pieces.forEach((piece, ci) => {
      const o = screenAt(piece.points[0]);
      const pulse = `<path class="cp-pulse" data-line="${LINE_ID[index]}" style="--o:${o.toFixed(2)}px" d="${k.pathOf(piece.points.map(at))}"/>`;
      (chunks[ci] ??= []).push({ piece, depth: G.dot3(piece.mid, V), svg: `<g class="cp-core" data-line="${LINE_ID[index]}">${tubeSvg(piece, { tone: "mid" })}${pulse}</g>`, shape: A.tube(piece.points, piece.radii, { name, owner: name, touch, bundle: `cable${tag}`, limp: true }) });
    });
    CORES.push({ name, total, side });
  });
  chunks.forEach((list, ci) => {
    list.sort((a, b) => a.depth - b.depth);
    const mid = G.mul3(list.reduce((acc, c) => G.add3(acc, c.piece.mid), [0, 0, 0]), 1 / list.length);
    swing = followAt(σ * mid[0]);
    put(`cable${tag}:${ci}`, mid, list.map((c) => c.svg).join(""), list.map((c) => c.shape), { bias: 0.05, rest: { route: `cable${tag}`, chunk: ci } });
    swing = 0;
  });
}

function lockSvg(cx, cy, drop) {
  const z0 = LUG.z1;
  const h = LOCK.drop - drop;
  const shank = h > 0.05 ? k.solidSvg(k.cylinder(cx, cy, LOCK.r, z0, h, P, 20), { tone: "hi", crease: "lo" }) : "";
  const head = k.solidSvg(k.cylinder(cx, cy, LOCK.head, z0 + h, LOCK.headT, P, 24, 0.25), { tone: "hi", crease: "lo" });
  const ring = k.lineSvg(k.ring(cx, cy, 1, z0 + h + LOCK.headT, P, 16), { tone: "lo" });
  return shank + head + ring;
}

carEnd(1);

// ── the left head's cut-away corner: the male pogo module with its four spring pins ──
side = "left";
const MY0 = MOD.y - MOD.half;
const MY1 = MOD.y + MOD.half;
const FRONT = { x0: -1.6, x1: 0 };
const REAR = { x0: -8.6, x1: -7 };
const owner = { owner: "pogoL" };
box("pogoL.wall", [REAR.x0, MY0, 26.6], [FRONT.x1, MY0 + 0.8, 39.5], { tone: "mid" }, { r: 0.2, steps: 2, meta: owner });
box("pogoL.rear", [REAR.x0, MY0 + 0.8, 26.6], [REAR.x1, MY1, 39.5], { tone: "mid" }, { r: 0.2, steps: 2, meta: owner, extra: Dots([at([REAR.x0 + 0.8, MY1, 38.4]), at([REAR.x0 + 0.8, MY1, 27.6])], { size: 0.35, tone: "mid" }) });
for (const z of PINS) disc("pogoL.tail", G.frameOf([-10, MOD.y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 10 + REAR.x0, 0.4, { tone: "lo" }, { meta: owner });
const PF = (z) => G.frameOf([0, MOD.y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const cylX = (z, x0, x1, r) => rtPrism(PF(z), ngon(r, 14), x0, x1, P);
function pinBack(z, comp) {
  const coil = k.coil(REAR.x1 + 0.4, -2.2 - comp, [MOD.y, z], POGO.coil, POGO.turns, "x", P);
  return (
    k.lineSvg(coil.back, { tone: "lo" }) +
    k.solidSvg(cylX(z, REAR.x1, REAR.x1 + 0.4, 0.85), { tone: "mid" }) +
    k.solidSvg(cylX(z, -6 - comp, FRONT.x0, POGO.rod), { tone: "hi", lit: true }) +
    k.solidSvg(cylX(z, -2.2 - comp, -1.6 - comp, POGO.collar), { tone: "hi", lit: true }) +
    k.lineSvg(coil.front, { tone: "lit" })
  );
}
const tipSvg = (z, comp) => (POGO.free - comp > 0.02 ? k.solidSvg(cylX(z, 0, POGO.free - comp, POGO.rod), { tone: "hi", lit: true }) : "");
PINS.forEach((z, i) => {
  const shapes = [
    rec(A.disc(PF(z), REAR.x1, -1.6, POGO.coil + 0.05, { name: "pogoL.pin", owner: "pogoL" })),
    rec(A.disc(PF(z), -2.2 - POGO.travel, -1.6, POGO.collar, { name: "pogoL.collar", owner: "pogoL" })),
  ];
  put("pogoL.pin", [-4, MOD.y, z], `<g data-part="pin-${i}">${pinBack(z, 0)}</g>`, shapes);
});
box("pogoL.front", [FRONT.x0, MY0 + 0.8, 26.6], [FRONT.x1, MY1, 39.5], { tone: "mid" }, {
  r: 0.2,
  steps: 2,
  meta: owner,
  extra: Ln(PINS.map((z) => circleOnX(0, MOD.y, z, 0.8, 18)).join(""), { tone: "lo" }) + Dots([at([0, MY1 - 0.7, 38.8]), at([0, MY1 - 0.7, 27.3])], { size: 0.32, tone: "mid" }) + `<g data-part="tips">${PINS.map((z) => tipSvg(z, 0)).join("")}</g>`,
});

carEnd(-1);
side = "left";

// The cone interlocks with the funnel face while it is inside it (gap under 7 mm, hidden there by the right head),
// so that pair is left out of the key solve and allowed below; every other pair is solved in every state.
const STATES = A.uniformStates(10);
const coneFace = (a, b) => A.sameRun(a, b) || [a.name, b.name].sort().join("|") === "coneR|headL.upper";
A.settle(R, P, { states: STATES, skip: coneFace });

R.items.sort((a, b) => a.key - b.key);
const itemSvg = R.items
  .map((item) => {
    const lift = G.dot3(item.move, V);
    return `<g class="it" data-name="${item.name}" data-k="${item.key.toFixed(4)}"${lift ? ` data-l="${lift.toFixed(4)}"` : ""}${item.swing ? ` data-swing="${item.swing.toFixed(3)}"` : ""}>${item.svg}</g>`;
  })
  .join("");

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "İki vagonun karşı karşıya duran uçları: uç kirişleri, yan tamponlar, kırmızı boji tekerlekleri ve kiriş içinde pivotlu kol üzerinde T45 kuplör kafaları. Sağdaki vagon yaklaşır, konisi soldaki kafanın hunisine girer, alt yarıdaki yaylı pogo pinleri karşı pedlere değip sıkışır, kilit pimleri düşer ve kafaların arkasından vagon içindeki düğüme giden dört damarda (BAT+, CAN-H, CAN-L, GND) hat aktif olur.",
  body: [`<defs>${defs.join("")}</defs>`, `<g data-part="items">${itemSvg}</g>`],
});

const DATA = {
  P,
  DMAX,
  POGO,
  PINS,
  MODY: MOD.y,
  REAR_X1: REAR.x1,
  FRONT_X0: FRONT.x0,
  LOCK,
  LUG_Z1: LUG.z1,
  locks: { L: [LOCK.x, LOCK.y], R: [-LOCK.x, -LOCK.y] },
  ALIGN: M.ALIGN,
  MAGNET_REACH: M.MAGNET_REACH,
  V: [V[0], V[1], V[2]],
  lineLength: Math.max(...CORES.map((c) => c.total)) * KS * 1.25,
  arm: ARM_DATA.R,
  armZ: [ARM.z0, ARM.z1],
  armLen: HEAD.x0 - PIVOT.x,
};

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-part="items"]');
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const nodes = [...layer.children].map((el, index) => ({ el, index, k: Number(el.dataset.k), l: Number(el.dataset.l || 0), moving: el.hasAttribute("data-l"), swing: el.hasAttribute("data-swing") }));
const pins = D.PINS.map((_, i) => part("pin-" + i));
const tips = part("tips");
const locks = { L: part("lock-L"), R: part("lock-R") };
const leds = [part("led-L"), part("led-R")];
const armEl = part("arm-R");
const FLOOR = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
let armDy = 0;
function drawArm(dy) {
  const [px, py] = D.arm.pivot;
  const turn = ([x, y]) => [x, y + dy * (px - x) / D.armLen];
  const slot = lineSvg(onTop(D.arm.slot.map(turn), D.armZ[1], P, true), { tone: "lo" });
  const body = solidSvg(rtPrism(FLOOR, D.arm.poly.map(turn), D.armZ[0], D.armZ[1], P), { tone: "mid" });
  const screws = dotsSvg(D.arm.screws.map(turn).map(([x, y]) => iso([x, y, D.armZ[1]], P)), { size: 0.42, tone: "mid" });
  armEl.innerHTML = body + slot + screws;
  void py;
}
const fmt = (v, d = 1) => v.toFixed(d).replace(".", ",");
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const NF = (z) => ({ o: [0, D.MODY, z], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] });
const ngon = (r, n = 14) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * 2 * Math.PI), r * Math.sin((i / n) * 2 * Math.PI)]);
const cylX = (z, x0, x1, r) => rtPrism(NF(z), ngon(r), x0, x1, P);
function pinBack(z, comp) {
  const c = coil(D.REAR_X1 + 0.4, -2.2 - comp, [D.MODY, z], D.POGO.coil, D.POGO.turns, "x", P);
  return lineSvg(c.back, { tone: "lo" }) + solidSvg(cylX(z, D.REAR_X1, D.REAR_X1 + 0.4, 0.85), { tone: "mid" }) + solidSvg(cylX(z, -6 - comp, D.FRONT_X0, D.POGO.rod), { tone: "hi", lit: true }) + solidSvg(cylX(z, -2.2 - comp, -1.6 - comp, D.POGO.collar), { tone: "hi", lit: true }) + lineSvg(c.front, { tone: "lit" });
}
const tipSvg = (z, comp) => (D.POGO.free - comp > 0.02 ? solidSvg(cylX(z, 0, D.POGO.free - comp, D.POGO.rod), { tone: "hi", lit: true }) : "");
function lockSvg(cx, cy, drop) {
  const z0 = D.LUG_Z1, h = D.LOCK.drop - drop;
  const shank = h > 0.05 ? solidSvg(cylinder(cx, cy, D.LOCK.r, z0, h, P, 20), { tone: "hi", crease: "lo" }) : "";
  return shank + solidSvg(cylinder(cx, cy, D.LOCK.head, z0 + h, D.LOCK.headT, P, 24, 0.25), { tone: "hi", crease: "lo" }) + lineSvg(ring(cx, cy, 1, z0 + h + D.LOCK.headT, P, 16), { tone: "lo" });
}
const offsetAt = (gap) => D.ALIGN.offset * clamp01(gap / D.ALIGN.start);
const compAt = (gap) => Math.max(0, Math.min(D.POGO.travel, D.POGO.free - gap));
const phaseOf = (gap, drop) => drop > 0.98 ? "kilitli" : gap <= D.POGO.free + 1e-6 ? "temas" : gap <= D.ALIGN.start ? "hizalanıyor" : "ayrık";

let goal = D.DMAX, gap = D.DMAX, target = D.DMAX, drop = 0, shut = 0, on = 0, since = 0, ph = 0, active = false;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, said = "", lastComp = -1, lastDrop = -1, lastOrder = "";
const TOUR = [[D.DMAX, 1.6], [0, 6.4], [D.DMAX, 3.4]];
const TOUR_TOTAL = TOUR.reduce((s, [, d]) => s + d, 0);
const tourAt = (t) => { let a = t % TOUR_TOTAL; for (const [v, d] of TOUR) { if (a < d) return v; a -= d; } return D.DMAX; };

function place() {
  const share = gap / D.DMAX;
  const dy = offsetAt(gap);
  const shift = translateAlong(P, [gap, 0, 0]);
  for (const n of nodes) if (n.moving) n.el.setAttribute("transform", n.swing ? translateAlong(P, [gap, dy * n.swing, 0]) : shift);
  if (Math.abs(dy - armDy) > 1e-4) { armDy = dy; drawArm(dy); }
  const order = nodes.slice().sort((a, b) => (a.k + a.l * share) - (b.k + b.l * share) || a.index - b.index);
  const sig = order.map((n) => n.index).join(",");
  if (sig !== lastOrder) {
    lastOrder = sig;
    const frag = document.createDocumentFragment();
    for (const n of order) frag.appendChild(n.el);
    layer.appendChild(frag);
  }
}
function draw() {
  place();
  const comp = compAt(gap);
  if (Math.abs(comp - lastComp) > 1e-4) {
    lastComp = comp;
    pins.forEach((el, i) => (el.innerHTML = pinBack(D.PINS[i], comp)));
    tips.innerHTML = D.PINS.map((z) => tipSvg(z, comp)).join("");
  }
  if (Math.abs(drop - lastDrop) > 1e-4) {
    lastDrop = drop;
    for (const key of ["L", "R"]) locks[key].innerHTML = lockSvg(D.locks[key][0], D.locks[key][1], drop * D.LOCK.drop);
  }
  // the line: a front runs from the coupler to each node, then BAT+ glows, CAN carries packets, GND stays dark
  const front = active ? Math.min(D.lineLength, since * 260) : D.lineLength;
  const filled = front >= D.lineLength - 1e-3;
  svg.style.setProperty("--cp-on", on.toFixed(3));
  svg.style.setProperty("--cp-solid", (filled ? 100000 : front).toFixed(1) + "px");
  svg.style.setProperty("--cp-ph", (filled && !still.matches ? ph : 0).toFixed(2) + "px");
  svg.style.setProperty("--cp-bat", (0.78 + 0.22 * Math.cos(since * 2.4)).toFixed(3));
  svg.dataset.packets = filled ? "" : "front";
  for (const led of leds) led.toggleAttribute("data-on", active && filled);
  const phase = phaseOf(gap, drop);
  const pinsOn = gap <= D.POGO.free + 1e-6 ? 8 : 0;
  const line = active ? "BAT+ 7,4 V · CAN 125 kbit/s (temsili)" : "hat kapalı";
  const text = fmt(gap) + " mm · " + phase + " · " + pinsOn + "/8 pin · " + line;
  if (readout.textContent !== text) readout.textContent = text;
  if (phase !== said) {
    said = phase;
    stage.setAttribute("aria-valuenow", String(Math.round(D.DMAX - gap)));
    stage.setAttribute("aria-valuetext", "Kuplörler arası " + fmt(gap) + " mm, " + phase + (active ? ", hat aktif" : ""));
    if (sr && document.activeElement === stage) sr.textContent = phase;
  }
}
function step(dt, calm) {
  if (touring) { clock += dt; target = tourAt(clock); }
  // the lock pins must lift before the heads can part
  const wantShut = target <= D.MAGNET_REACH && gap <= D.MAGNET_REACH * 1.6;
  goal = drop > 0.02 || wantShut ? 0 : target;
  if (calm) gap = goal;
  else {
    const tau = wantShut && gap < D.MAGNET_REACH ? 0.09 : 0.5;
    const move = (goal - gap) * (1 - Math.exp(-dt / tau));
    const vmax = 16 * dt;
    gap += Math.max(-vmax, Math.min(vmax, move));
    if (Math.abs(goal - gap) < 0.003) gap = goal;
  }
  shut = gap === 0 && wantShut ? shut + dt : 0;
  const dropTo = shut > 0.35 || (calm && gap === 0 && wantShut) ? 1 : 0;
  drop = calm ? dropTo : drop + (dropTo - drop) * (1 - Math.exp(-dt / 0.16));
  if (Math.abs(dropTo - drop) < 0.002) drop = dropTo;
  const live = drop > 0.98;
  if (live && !active) { active = true; since = 0; }
  if (!live && active && drop < 0.9) active = false;
  since += dt;
  on = calm ? (active ? 1 : 0) : on + ((active ? 1 : 0) - on) * (1 - Math.exp(-dt / 0.12));
  if (Math.abs(on - (active ? 1 : 0)) < 0.002) on = active ? 1 : 0;
  if (!calm) ph += dt * 34;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  step(dt, calm);
  draw();
  const settled = !touring && gap === goal && (drop === 0 || drop === 1) && (calm || !active) && on % 1 === 0;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (value) => {
  touring = false;
  target = Math.max(0, Math.min(D.DMAX, value));
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = target === 0 ? TOUR[0][1] + 0.01 : 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const fromPointer = (event) => { const box = svg.getBoundingClientRect(); return D.DMAX * clamp01(((event.clientX - box.left) / box.width - 0.25) / 0.5); };
stage.addEventListener("pointermove", (event) => steer(fromPointer(event)));
stage.addEventListener("pointerdown", (event) => { steer(fromPointer(event)); if (event.pointerType !== "mouse") stage.setPointerCapture?.(event.pointerId); });
stage.addEventListener("keydown", (event) => {
  const from = touring ? Math.round(gap) : target;
  const stepMm = event.shiftKey ? 10 : 2;
  let to = null;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = from - stepMm;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = from + stepMm;
  if (event.key === "End" || event.key === "Enter") to = 0;
  if (event.key === "Home" || event.key === "Escape") to = D.DMAX;
  if (event.key === " ") to = target > 0 || touring ? 0 : D.DMAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
stage.addEventListener("focus", () => { if (sr) sr.textContent = said; });
if (still.matches) { touring = false; target = 0; gap = 0; drop = 1; active = true; on = 1; since = 99; }
draw();
`;

const style = `<style>
.iso{--cp-bat-c:#ffb347;--cp-canh-c:#6b9bff;--cp-canl-c:#6be0a0;--cp-gnd-c:#050505;--cp-led:#ffd27a;--cp-led-off:#2a2a2a;--cp-pad:#3a3a3a;--cp-cavity:#0e0e0e;--cp-deep:#080808}
.iso[data-theme="light"]{--cp-bat-c:#e8590c;--cp-canh-c:#1c7ed6;--cp-canl-c:#2f9e44;--cp-gnd-c:#2b2616;--cp-led:#f0a020;--cp-led-off:#e0d6b6;--cp-pad:#c4b78f;--cp-cavity:#e0d6b6;--cp-deep:#c9bc94}
.cp-cavity{fill:var(--cp-cavity);stroke:none}
.cp-cavity-deep{fill:var(--cp-deep);stroke:none}
.cp-pad{fill:var(--cp-pad);stroke:none}
.cp-led{fill:var(--cp-led-off);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
[data-on] .cp-led,[data-on]>.cp-led{fill:var(--cp-led)}
.iso-svg path.cp-pulse{fill:none;vector-effect:none;stroke-width:1.15;stroke-linecap:butt;opacity:var(--cp-on,0);stroke-dasharray:var(--cp-solid,0px) 100000px;stroke-dashoffset:var(--o)}
.cp-pulse[data-line="bat"]{stroke:var(--cp-bat-c);opacity:calc(var(--cp-on,0) * var(--cp-bat,1))}
.cp-pulse[data-line="gnd"]{stroke:var(--cp-gnd-c);stroke-width:1.3}
.cp-pulse[data-line="canh"]{stroke:var(--cp-canh-c)}
.cp-pulse[data-line="canl"]{stroke:var(--cp-canl-c)}
svg:not([data-packets="front"]) .cp-pulse[data-line="canh"],svg:not([data-packets="front"]) .cp-pulse[data-line="canl"]{stroke-dasharray:3px 4px;stroke-dashoffset:calc(var(--o) - var(--cp-ph,0px))}
svg:not([data-packets="front"]) .cp-pulse[data-line="canl"]{stroke-dashoffset:calc(var(--o) - var(--cp-ph,0px) + 3.5px)}
@media (max-width:560px){.iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;text-align:right;line-height:1.35}.iso-plate-corner[data-corner="hint"]{bottom:34px}}
</style>`;

const body =
  style +
  k.plateHtml({
    fig: "Şekil 4",
    title: "T45 kuplör · güç + veri",
    hint: "Sürükle ya da ← → : kuplörleri birleştir",
    readout: `${DMAX},0 mm · ayrık · 0/8 pin · hat kapalı`,
    keys: [
      { mark: "lit", label: "Yaylı pogo pinleri: 4 pin, 2,54 mm aralık, 1 mm strok; karşıda düz pedler" },
      { mark: "raised", label: "Cinsiyetsiz kafa: sağda koni, solda huni, arkalarında Ø10×3 mıknatıs; üstte Ø3 kilit pimi" },
      { mark: "edge", label: "Kol kiriş yüzünün 35 mm içinde pivotlu; kablo kafanın arkasında kelepçeye bağlı" },
      { mark: "dashed", label: "Hat: BAT+ turuncu, CAN-H mavi, CAN-L yeşil, GND koyu (temsili)" },
      { mark: "red", label: "Boji tekerleği, Ø42" },
    ],
    caption:
      "Tasarım önerisi, basılmış ya da denenmiş bir parça değil. Sağdaki vagon yaklaşırken konisi karşı kafanın hunisine girer ve kafayı kolu üzerinde hizaya çeker; son 2,5 mm'yi mıknatıslar kapatır. Yüzler arası 1 mm kalınca alt yarıdaki iki modülün sekiz pogo pini karşı pedlere değer ve sıkışır: her hat iki paralel temasla geçer. Yüzler kapanınca iki Ø3 kilit pimi karşı kafanın deliğine düşer, çekme kuvvetini o zaman pim taşır; kablo yalnız sinyal taşır. Mıknatıs tutuşu, pin temas direnci ve akım fiziksel olarak test edilmedi; okumadaki 7,4 V ve 125 kbit/s temsilidir. Vagonların yakın yarısı ve sol kafanın alt köşesi kesik çizildi.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="T45 kuplör. Sol ok sağdaki vagonu yaklaştırır, sağ ok uzaklaştırır; Shift ile 10 mm. End ya da Enter birleştirir, Home ayırır, boşluk ikisi arasında geçer." aria-valuemin="0" aria-valuemax="${DMAX}" aria-valuenow="0">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

writePages("coupler", { title: "T45 kuplör", body, live });
console.log(`${R.items.length} items · ${R.solids.length} solids · ${R.tubes.length} tubes · ${R.routes.length} cores`);
// Coupled, the right cone sits in the left funnel; both are hidden behind the right head there, and apart the cone
// is drawn over the left face, which is where it is.
const ALLOW = [["coneR", "headL.upper"]];
A.auditOrExit(R, P, { frames: A.uniformStates(30), apart: true, allow: ALLOW });
