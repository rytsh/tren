// Fig 4 · Vagon bağlantısı: the facing ends of two 250 cars. Each car carries a drawbar on its front pivot under the
// deck; the right car rolls in until its rear pivot sits under the left car's drawbar eye, the M3 pin drops through,
// and then the four-core TrenBus jumper is plugged into the end-wall sockets. The near half of each deck over the
// pivot is cut away so the boss, the bar and the pin show.
// Units are millimetres (docs/standart.md §2, cad/params.json); x along the track, y across (+y toward the viewer),
// z up from the rail top. The left car's beam face is x = −20, the right car's x = +20 when coupled (40 mm apart).
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { scene, writePages } from "../common.mjs";
import { rtSpokes } from "../runtime.mjs";

const W = 640;
const H = 420;

const GAP = 40; // beam faces apart when coupled (dbc_gap)
const PIV_IN = 38; // pivot inside the beam face (dbc_pivot_in)
const PITCH = GAP + 2 * PIV_IN; // 116 (dbc_L_car)
const DMAX = 34; // how far the right car starts out
const AXLE = 21; // axle centre above rail top
const Z = (a) => a + AXLE; // a height from params (axle frame) on the rail-top frame
const DECK = { z0: Z(26), z1: Z(29) };
const BEAM = { t: 4, z0: Z(15), z1: DECK.z1 };
const BAR = { w: 8, t: 5.5, eye: 5, z0: Z(16) };
BAR.z1 = BAR.z0 + BAR.t;
const BOSS = { r: 4.5, z0: BAR.z1, z1: DECK.z0 + 0.5 };
const PIN = { r: 1.5, head: 2.8, headT: 1.6, washer: 3.4 };
const BODY = { half: 40, z0: DECK.z1, z1: Z(70) };
const SOCK = { half: 6.2, z: Z(42), h: 3.1 };
const BUF = { y: 38, z: Z(20), stock: 4, head: 6, len: 8, headT: 2 };
const WHEEL = { x: 75 - 24, r: 21, flange: 23.5, back: 20, width: 7.5 };
const NOTCH = 14; // beam notch half width round the bar
const FADE = 118;

const LEFT = { beam: -GAP / 2, pivot: -GAP / 2 - PIV_IN };
const RIGHT = { beam: GAP / 2, pivot: GAP / 2 + PIV_IN };

const fitPoints = [];
for (const x of [-FADE + 12, FADE + DMAX - 12]) for (const y of [-45, 45]) for (const z of [0, BODY.z1]) fitPoints.push([x, y, z]);
const P = k.fitProjection(fitPoints, W, H, { pad: 14, azimuth: Number(process.env.AZ ?? 66), elevation: Number(process.env.EL ?? 12) });
const Sc = scene(P);
const { R, at, S, Ln, Dots } = Sc;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const rectOnX = (x, y0, y1, z0, z1, r) => path3(k.roundedPlan({ x: y0, y: z0, w: y1 - y0, d: z1 - z0, r }, 4).map(([y, z]) => [x, y, z]), true);
const circleOnY = (y, cx, cz, r, n = 48) => path3(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), y, cz + r * Math.sin((i / n) * 2 * Math.PI)]), true);
const alongY = (o, s = 1) => G.frameOf(o, [0, s, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (o, s = 1) => G.frameOf(o, [s, 0, 0], [0, s, 0], [0, 0, 1]);
const alongZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

let piece = "left";
const move = () => (piece === "right" ? [DMAX, 0, 0] : [0, 0, 0]);
function put(name, ref, svg, shapes, bias = 0) {
  R.put({ name: R.nameFor(name), at: ref, bias, svg, shapes, piece, move: move() });
}
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, meta = {}, wrap = (s) => s } = {}) {
  const plan = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), r };
  const shape = R.solid(A.slab(plan, z0, z1 - z0, { name, ...meta }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrap(S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra), [shape], bias);
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", bias = 0, bevel = 0, meta = {}, wrap = (s) => s } = {}) {
  const paths = G.solidOf(profile, F, P, { bevel });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = R.solid(A.solid(F, profile, { name, ...meta }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), wrap(S(paths, { tone: "mid", ...style }) + extra), [shape], bias);
}
const disc = (name, F, s0, s1, r, style = {}, opts = {}) => turned(name, F, [[s0, r], [s1, r]], style, opts);

// fades: decks and bodies run out to the far ends
const defs = [];
function fade(id, x0, x1) {
  const a = at([x0, 0, 40]);
  const b = at([x1, 0, 40]);
  defs.push(
    `<linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${id}-g)"/></mask>`,
  );
}
fade("vb-fade-l", -FADE + 34, -FADE);
fade("vb-fade-r", FADE - 34, FADE);
const masked = (id) => (svg) => `<g mask="url(#${id})">${svg}</g>`;

// ── track (static) ──
const RAIL = { h: 8, head: 5, headH: 2.5, web: 3, foot: 9 };
const TIE = { t: 5, len: 66, w: 8, pitch: 20 };
const ties = [];
for (let x = -FADE; x <= FADE + DMAX; x += TIE.pitch) ties.push(S(k.slabOf({ x: x - TIE.w / 2, y: -TIE.len / 2, w: TIE.w, d: TIE.len, r: 0.6 }, -RAIL.h - TIE.t, TIE.t, P, 3, 0.4), { tone: "lo" }));
const railY = 22.5 + RAIL.head / 2;
function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, z0 = -RAIL.h, zh = -RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, z0 + 1.6], [yc + wb, z0 + 2.8], [yc + wb, zh], [yc + h, zh], [yc + h, -0.6], [yc + h - 0.6, 0], [yc - h + 0.6, 0], [yc - h, -0.6], [yc - h, zh], [yc - wb, zh], [yc - wb, z0 + 2.8], [yc - f, z0 + 1.6]];
}
const St = scene(P);
for (const s of [-1, 1]) St.prism("rail", G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), railPoly(s * railY), -FADE, FADE + DMAX, { tone: "mid" });
const track = `<g mask="url(#vb-track)">${ties.join("")}${St.finish()}</g>`;
{
  const a = at([-FADE, 0, 0]);
  const b = at([FADE + DMAX, 0, 0]);
  defs.push(
    `<linearGradient id="vb-track-g" gradientUnits="userSpaceOnUse" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff" stop-opacity="1"/><stop offset=".9" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="vb-track" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#vb-track-g)"/></mask>`,
  );
}
for (const s of [-1, 1]) R.solid(A.prism(G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), railPoly(s * railY), -FADE, FADE + DMAX, { name: "stand.rail", ground: true }));

// ── one car end: σ = +1 left car (body on −x), −1 right car (body on +x, built coupled, moved by DMAX) ──
const wheelSlots = [];
function carEnd(σ) {
  piece = σ > 0 ? "left" : "right";
  const tag = σ > 0 ? "L" : "R";
  const face = σ > 0 ? LEFT.beam : RIGHT.beam;
  const pivot = σ > 0 ? LEFT.pivot : RIGHT.pivot;
  const far = -σ * FADE;
  const x = (a, b) => [Math.min(a, b), Math.max(a, b)];
  const wrap = masked(σ > 0 ? "vb-fade-l" : "vb-fade-r");
  const inner = face - σ * BEAM.t; // beam back face

  // deck: far half runs to the fade, near half stops short of the pivot so the bar and pin show
  const [dx0, dx1] = x(far, inner);
  box(`deck${tag}.far`, [dx0, -45, DECK.z0], [dx1, 0, DECK.z1], {}, { r: 0.8, bevel: 0.4, wrap, extra: Dots(Array.from({ length: 9 }, (_, i) => at([inner - σ * (6 + i * 10), -42, DECK.z1])), { size: 0.4, tone: "mid" }) });
  const cut = pivot - σ * 12;
  const [nx0, nx1] = x(far, cut);
  box(`deck${tag}.near`, [nx0, 0, DECK.z0], [nx1, 45, DECK.z1], {}, { r: 0.8, bevel: 0.4, wrap, extra: Dots(Array.from({ length: 6 }, (_, i) => at([cut - σ * (6 + i * 10), 42, DECK.z1])), { size: 0.4, tone: "mid" }) });
  const [vx0, vx1] = x(far, cut);
  box(`valance${tag}`, [vx0, 43, DECK.z0 - 6], [vx1, 45, DECK.z0], {}, { r: 0.3, steps: 2, wrap });

  // end beam with a notch under the bar
  const [bx0, bx1] = x(face, inner);
  for (const [y0, y1] of [[-45, -NOTCH], [NOTCH, 45]]) box(`beam${tag}`, [bx0, y0, BEAM.z0], [bx1, y1, BEAM.z1], { className: "rt-red" }, { r: 0.5, bevel: 0.3 });
  box(`beam${tag}.top`, [bx0, -NOTCH, BAR.z1 + 0.5], [bx1, NOTCH, BEAM.z1], { className: "rt-red" }, { r: 0.3, steps: 2 });
  for (const y of [-BUF.y, BUF.y]) {
    const F = alongX([face, y, BUF.z], -σ);
    disc(`buffer${tag}.stock`, F, 0, BUF.len - BUF.headT, BUF.stock, {}, {});
    disc(`buffer${tag}.head`, F, BUF.len - BUF.headT, BUF.len, BUF.head, {}, { bevel: 0.3 });
  }

  // body end wall with the TrenBus socket
  const bodyEnd = face - σ * 9;
  const [ex0, ex1] = x(far, bodyEnd);
  const socket = `<path class="rt-hole" d="${rectOnX(bodyEnd, -SOCK.half, SOCK.half, SOCK.z - SOCK.h, SOCK.z + SOCK.h, 0.8)}"/>` +
    `<g data-part="sock-${tag}">${Dots([-4.5, -1.5, 1.5, 4.5].map((y) => at([bodyEnd, y, SOCK.z])), { size: 0.5, tone: "lo" })}</g>` +
    Ln(rectOnX(bodyEnd, -SOCK.half - 1.6, SOCK.half + 1.6, SOCK.z - SOCK.h - 1.6, SOCK.z + SOCK.h + 1.6, 1.2), { tone: "mid" });
  box(`body${tag}`, [ex0, -BODY.half, BODY.z0], [ex1, BODY.half, BODY.z1], {}, {
    r: 1.6,
    bevel: 0.5,
    wrap,
    inner: Ln(k.sideSeam({ x: ex0, y: -BODY.half, w: ex1 - ex0, d: BODY.half * 2, r: 1.6 }, BODY.z0 + 4, P, 3), { tone: "faint" }),
    extra: (σ > 0 ? socket : "") + Dots(Array.from({ length: 8 }, (_, i) => at([bodyEnd - σ * (4 + i * 9), BODY.half, BODY.z1 - 4])), { size: 0.4, tone: "mid" }),
  });
  if (σ < 0) {
    // the right car's socket faces −x, away from the viewer: drawn as an outline on the near side via a small plate
    box(`sockR.plate`, [bodyEnd - 0.6, -SOCK.half - 1.6, SOCK.z - SOCK.h - 1.6], [bodyEnd, SOCK.half + 1.6, SOCK.z + SOCK.h + 1.6], { tone: "lo" }, { r: 0.6, steps: 2 });
  }

  // bogie under the end (one axle shown) with its wheel on the near side
  const wx = pivot - σ * 13;
  box(`bogie${tag}`, [Math.min(wx - 26, wx + 26), 13, Z(-9)], [Math.max(wx - 26, wx + 26), 19, Z(11)], {}, { r: 2, bevel: 0.4, wrap });
  const flange = [[WHEEL.back, WHEEL.flange - 0.7], [WHEEL.back + 0.5, WHEEL.flange], [WHEEL.back + 1.2, WHEEL.flange], [WHEEL.back + 1.8, WHEEL.r + 0.3]];
  const tread = [[WHEEL.back + 1.8, WHEEL.r], [WHEEL.back + WHEEL.width, WHEEL.r - 0.3]];
  const F = alongY([wx, 0, AXLE], 1);
  const slot = `spokes-${tag}`;
  turned(`wheel${tag}.flange`, F, flange, { className: "rt-red" }, { wrap });
  turned(`wheel${tag}.tread`, F, tread, { className: "rt-red" }, { wrap, extra: Ln(circleOnY(WHEEL.back + WHEEL.width, wx, AXLE, WHEEL.r - 3.6) + circleOnY(WHEEL.back + WHEEL.width, wx, AXLE, 6), { tone: "lo" }) + `<g data-part="${slot}"></g>` + Dots([at([wx, WHEEL.back + WHEEL.width, AXLE])], { size: 0.5, tone: "hi" }) });
  wheelSlots.push({ part: slot, x: wx, moving: σ < 0 });

  // pivot boss under the deck
  disc(`boss${tag}`, alongZ([pivot, 0, 0]), BOSS.z0, BOSS.z1, BOSS.r, {}, { bevel: 0.3 });
}
carEnd(1);
carEnd(-1);

// ── the left car's drawbar (static) and pin; the right car's pin drops in when the eye is over its boss ──
piece = "left";
const barPoly = [];
for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 + (i / 12) * Math.PI; barPoly.push([LEFT.pivot + BAR.eye * Math.cos(a), BAR.eye * Math.sin(a)]); }
for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; barPoly.push([LEFT.pivot + PITCH + BAR.eye * Math.cos(a), BAR.eye * Math.sin(a)]); }
const barShape = R.solid(A.prism(G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), barPoly, BAR.z0, BAR.z1, { name: "bar" }));
const barSvg = S(k.extrude(barPoly, BAR.z0, BAR.t, P, { convex: true, bevel: 0.3 }), { tone: "hi", lit: true }) +
  Ln(k.onTop([[LEFT.pivot + 9, 0], [LEFT.pivot + PITCH - 9, 0]], BAR.z1, P), { tone: "lo", free: true }) +
  `<path class="rt-hole" d="${k.ring(LEFT.pivot, 0, PIN.r + 0.2, BAR.z1, P, 20)}"/><path class="rt-hole" d="${k.ring(LEFT.pivot + PITCH, 0, PIN.r + 0.2, BAR.z1, P, 20)}"/>`;
R.put({ name: "bar", at: [LEFT.pivot + PITCH / 2, 0, (BAR.z0 + BAR.z1) / 2], bias: 0.2, svg: barSvg, shapes: [barShape], piece: "left", move: [0, 0, 0] });
// left pin: head under the bar, shank up into the boss
const pinL = alongZ([LEFT.pivot, 0, 0]);
disc("pinL.washer", pinL, BAR.z0 - 0.6, BAR.z0, PIN.washer, { tone: "hi" });
disc("pinL.head", pinL, BAR.z0 - 0.6 - PIN.headT, BAR.z0 - 0.6, PIN.head, { tone: "hi" }, { bevel: 0.2, extra: Ln(k.lineOnTop([LEFT.pivot - 1.8, 0], [LEFT.pivot + 1.8, 0], BAR.z0 - 0.6 - PIN.headT, P), { tone: "lo", free: true }) });

// the right pin is drawn live in a slot ordered where the pin sits (under the right boss)
piece = "right";
const pinShape = R.solid(A.cylinder(LEFT.pivot + PITCH, 0, PIN.head, BAR.z0 - 0.6 - PIN.headT, BOSS.z1 - BAR.z0 + 0.6 + PIN.headT, { name: "pinR" }));
R.put({ name: "pinR", at: [LEFT.pivot + PITCH, 0, BAR.z0 - 2], bias: 0.3, svg: `<g data-part="pinR"></g>`, shapes: [pinShape], piece: "left", move: [0, 0, 0] });
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const items = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.piece === "right" ? " data-right" : ""}>${item.svg}</g>`).join("");
const DATA = { P, DMAX, PIN, BAR, BOSS, eye: LEFT.pivot + PITCH, wheels: wheelSlots, AXLE, OUT: WHEEL.back + WHEEL.width, WR: WHEEL.r, SOCK, plugL: LEFT.beam - 9, plugR: RIGHT.beam + 9 };

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "İki 250 vagonun birbirine bakan uçları. Soldaki vagonun platformu altındaki pivotta dönen çeki kolu sağa uzanır. Sağdaki vagon yaklaşınca kolun gözü onun pivot göbeğinin altına gelir, M3 pim takılır; sonra iki alın duvarındaki 4 pinli yuvalara ara kablo takılır ve hat açılır.",
  body: [`<defs>${defs.join("")}</defs>`, track, `<g data-part="items">${items}</g>`, `<g data-part="jumper"></g>`],
});

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const moving = [...svg.querySelectorAll('[data-part="items"] > [data-right]')];
const pinEl = part("pinR"), jumper = part("jumper");
const spokes = D.wheels.map((w) => ({ el: part(w.part), x: w.x, moving: w.moving }));
const fmt = (v, d = 1) => v.toFixed(d).replace(".", ",");
let gap = D.DMAX, target = D.DMAX, pin = 0, plug = 0, auto = !still.matches, since = 0, frame = 0, last = 0, visible = false, said = "";
// phases: apart → aligned (eye over boss) → pinned → plugged
function phase() {
  if (plug > 0.98) return "hat açık";
  if (pin > 0.98) return "pim takılı";
  if (gap < 0.05) return "göz pivotta";
  return "ayrık";
}
function pinSvg() {
  const x = D.eye, z = D.BAR.z0 - 0.6 - 18 * (1 - pin);
  const F = { o: [x, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const shank = solidSvg(cylinder(x, 0, D.PIN.r, z, D.BOSS.z1 - D.BAR.z0 + 0.6 + 0.2, P, 16), { tone: "hi" });
  const head = solidSvg(cylinder(x, 0, D.PIN.head, z - D.PIN.headT, D.PIN.headT, P, 20), { tone: "hi" });
  const washer = solidSvg(cylinder(x, 0, D.PIN.washer, z, 0.6, P, 20), { tone: "hi" });
  void F;
  return pin > 0.01 ? '<g opacity="' + Math.min(1, pin * 3).toFixed(2) + '">' + shank + washer + head + '</g>' : "";
}
function jumperSvg() {
  if (plug < 0.01) return "";
  const xL = D.plugL - 3, xR = D.plugR + 3 + gap, z = D.SOCK.z, sag = 14 + 6 * (1 - plug);
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([xL + (xR - xL) * t, 3, z - sag * Math.sin(Math.PI * t)]); }
  const line = '<path class="vb-jumper" d="' + pathOf(pts.map((p) => iso(p, P))) + '" style="opacity:' + plug.toFixed(2) + '"/>';
  const plugs = solidSvg(slabOf({ x: D.plugL - 6, y: -6, w: 6, d: 12, r: 1 }, z - 3.5, 7, P, 2, 0.3), { tone: "hi" }) +
    solidSvg(slabOf({ x: D.plugR + gap, y: -6, w: 6, d: 12, r: 1 }, z - 3.5, 7, P, 2, 0.3), { tone: "hi" });
  return '<g style="opacity:' + plug.toFixed(2) + '">' + plugs + line + '</g>';
}
function draw() {
  const t = translateAlong(P, [gap, 0, 0]);
  for (const el of moving) el.setAttribute("transform", t);
  pinEl.innerHTML = pinSvg();
  jumper.innerHTML = jumperSvg();
  for (const s of spokes) s.el.innerHTML = lineSvg(rtSpokes([s.x + (s.moving ? 0 : 0), 0, D.AXLE], D.OUT, 6, D.WR - 3.6, 6, (s.moving ? -gap : 0) / D.WR, P), { tone: "lo" });
  part("sock-L").setAttribute("data-on", plug > 0.98 ? "" : null);
  const ph = phase();
  const text = fmt(gap) + " mm · " + ph + (plug > 0.98 ? " · BAT+ CAN-H CAN-L GND" : "");
  if (readout.textContent !== text) readout.textContent = text;
  if (ph !== said) { said = ph; stage.setAttribute("aria-valuetext", ph); if (sr && document.activeElement === stage) sr.textContent = ph; }
  stage.setAttribute("aria-valuenow", Math.round(D.DMAX - gap));
}
function step(dt) {
  since += dt;
  if (auto) {
    const cycle = since % 9;
    target = cycle < 3.2 ? 0 : cycle < 7.4 ? 0 : D.DMAX;
    const wantPin = cycle > 3.4 && cycle < 7.6 ? 1 : 0;
    const wantPlug = cycle > 4.4 && cycle < 7.2 ? 1 : 0;
    pin += (wantPin - pin) * (1 - Math.exp(-dt / 0.18));
    plug += (wantPlug - plug) * (1 - Math.exp(-dt / 0.22));
  } else {
    const wantPin = gap < 0.05 ? 1 : 0;
    pin += (wantPin - pin) * (1 - Math.exp(-dt / 0.18));
    const wantPlug = pin > 0.98 ? 1 : 0;
    plug += (wantPlug - plug) * (1 - Math.exp(-dt / 0.25));
  }
  if (pin > 0.5 && target > 0 && !auto) target = 0;
  gap += (target - gap) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(gap - target) < 0.02) gap = target;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  step(dt);
  draw();
  const settled = !auto && Math.abs(gap - target) < 0.02 && (pin < 0.002 || pin > 0.998) && (plug < 0.002 || plug > 0.998);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
let idle = 0;
const take = () => { auto = false; clearTimeout(idle); idle = setTimeout(() => { auto = !still.matches; since = 0; run(); }, 6000); };
const steer = (v) => { take(); if (pin > 0.5 && v > 0) { pin = 0; plug = 0; } target = Math.max(0, Math.min(D.DMAX, v)); run(); };
const fromPointer = (e) => { const r = stage.getBoundingClientRect(); return D.DMAX * Math.max(0, Math.min(1, (e.clientX - r.left) / r.width * 1.4 - 0.2)); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType !== "mouse") steer(fromPointer(e)); });
stage.addEventListener("pointerdown", (e) => steer(fromPointer(e)));
stage.addEventListener("keydown", (e) => {
  const big = e.shiftKey ? 10 : 2;
  if (e.key === "ArrowLeft") steer(target - big);
  else if (e.key === "ArrowRight") steer(target + big);
  else if (e.key === "End" || e.key === "Enter") steer(0);
  else if (e.key === "Home") steer(D.DMAX);
  else if (e.key === " ") steer(target > 0 ? 0 : D.DMAX);
  else return;
  e.preventDefault();
});
stage.addEventListener("focus", () => { if (sr) sr.textContent = said; });
if (still.matches) { auto = false; gap = 0; target = 0; pin = 1; plug = 1; }
draw();
`;

const style = `<style>
.vb-jumper{fill:none;stroke:var(--vb-cable);stroke-width:2.2px;stroke-linecap:round;vector-effect:non-scaling-stroke}
.iso{--vb-cable:#e9b824}.iso[data-theme="light"]{--vb-cable:#b07c10}
[data-part="sock-L"][data-on] circle{fill:var(--vb-cable);opacity:1}
</style>`;

const body =
  style +
  k.plateHtml({
    fig: "Şekil 4",
    title: "Vagon bağlantısı · çeki kolu + ara kablo",
    hint: "Sürükle ya da ← → : vagonu yaklaştır",
    readout: `${DMAX},0 mm · ayrık`,
    keys: [
      { mark: "lit", label: "Çeki kolu: 116 mm pim aralığı, 8 × 5,5 mm; platform altındaki pivotta döner" },
      { mark: "raised", label: "Pivot göbeği ve M3 pim (pulla, sıkılmaz); kiriş altında ±12° kol çentiği" },
      { mark: "edge", label: "Alın duvarında 4 pinli TrenBus yuvası; ara kablo BAT+, CAN-H, CAN-L, GND taşır" },
      { mark: "red", label: "Tampon kirişi ve boji tekerleği, Ø42" },
    ],
    caption:
      "Tasarım önerisi, basılmış ya da denenmiş bir parça değil. Her 250 vagonun ön pivotunda bir çeki kolu vardır; arkadaki vagon yaklaşınca kolun gözü onun arka pivot göbeğinin altına gelir ve alttan bir M3 pim (pulla, sıkılmadan) takılır. Çekme kuvvetini kol ve pim taşır. Güç ve veri ayrı: iki alın duvarındaki 4 pinli yuvaya 80 mm'lik ara kablo elle takılır. R750 virajında kol vagona göre ≈ 11° döner, tampon başları arasında ≈ 11 mm kalır (düzlemsel hesap). Konnektör tipi ve kablo kesiti seçilmedi. Vagonların yakın yarısı pivot üstünde kesik çizildi.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Vagon bağlantısı. Sol ok sağdaki vagonu yaklaştırır, sağ ok uzaklaştırır; Shift ile 10 mm. End ya da Enter bağlar, Home ayırır." aria-valuemin="0" aria-valuemax="${DMAX}" aria-valuenow="0">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

writePages("coupler", { title: "Vagon bağlantısı", body, live });
console.log(`${R.items.length} items · ${R.solids.length} solids`);
A.auditOrExit(R, P, { apart: true });
