// Fig 2 · Ray bağlantısı: the near ends of two straight 200 mm modules on a ballast bed. The right module is lifted,
// slid until its end tie meets the left one, then lowered so each tongue drops into the other module's socket.
// Units are millimetres from cad/params.json; x along the track, y across, z up; base plate top z = 0.
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as A from "../../anatomy/kit/audit.mjs";
import { scene, basePlate, writePages } from "../common.mjs";
import { rtPrism } from "../runtime.mjs";

const W = 640;
const H = 400;

const BED_Z = 3; // ballast bed top
const TIE = { len: 66, w: 8, t: 5, pitch: 20, end: 12 };
const TIE_TOP = BED_Z + TIE.t; // 8
const RAIL = { h: 8, head: 5, headH: 2.5, web: 3, foot: 9, gauge: 45 };
const RAIL_TOP = TIE_TOP + RAIL.h;
const RAIL_Y = RAIL.gauge / 2 + RAIL.head / 2;
const HALF_GAP = 0.25; // rail end gap 0.5 total
const DT = { y: 12, neck: 6, tip: 9, len: 7, clear: 0.2 };
const GAP0 = 12; // start: 12 mm between the end ties
const LIFT = 6; // held above the bed by more than the tie thickness
const REACH = 62;

const half = TIE.len / 2;
const sock = (sign, side) => {
  // socket footprint edges of a module whose end face is x = 0 and whose body lies on side `side` (-1 left, +1 right)
  const yc = sign * DT.y;
  const n = DT.neck / 2 + DT.clear;
  const t = DT.tip / 2 + DT.clear;
  const d = side * (DT.len + DT.clear);
  return { yc, n, t, d };
};
// Left end tie (x ∈ [-12, 0]) with its socket at y = -12; tongue at y = +12 reaching to x = +7.
const LS = sock(-1, -1);
const LEFT_TIE = [[-TIE.end, -half], [0, -half], [0, LS.yc - LS.n], [LS.d, LS.yc - LS.t], [LS.d, LS.yc + LS.t], [0, LS.yc + LS.n], [0, half], [-TIE.end, half]];
const LEFT_TONGUE = [[0, DT.y - DT.neck / 2], [DT.len, DT.y - DT.tip / 2], [DT.len, DT.y + DT.tip / 2], [0, DT.y + DT.neck / 2]];
// Right end tie (x ∈ [0, 12]) with its socket at y = +12; tongue at y = -12 reaching to x = -7.
const RS = sock(1, 1);
const RIGHT_TIE = [[0, -half], [TIE.end, -half], [TIE.end, half], [0, half], [0, RS.yc + RS.n], [RS.d, RS.yc + RS.t], [RS.d, RS.yc - RS.t], [0, RS.yc - RS.n]];
const RIGHT_TONGUE = [[0, -DT.y - DT.neck / 2], [0, -DT.y + DT.neck / 2], [-DT.len, -DT.y + DT.tip / 2], [-DT.len, -DT.y - DT.tip / 2]];

const PLAN = { x: -76, y: -50, w: 152, d: 100, r: 9 };
const BED = { x: -REACH - 8, y: -42, w: (REACH + 8) * 2, d: 84, r: 6 };
const P = k.fitProjection([...k.boxCorners(PLAN, -15, 0), [-REACH, -half, RAIL_TOP], [REACH, half, RAIL_TOP + LIFT]], W, H, { pad: 18, azimuth: 50, elevation: 44 });
const Sc = scene(P);
const { R, at, S, Ln, Dots, box, prism, record } = Sc;
const FLOOR = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
const XF = { o: [0, 0, 0], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
const shift = (poly, dx) => poly.map(([x, y]) => [x + dx, y]);

// ── base plate and ballast bed ──
const back = [];
back.push(basePlate(P, PLAN, { ruler: { x: -62, y: 42, w: 76, d: 5, r: 1 }, label: { x: 26, y: 39, w: 34, d: 8, r: 1.2 } }));
record(A.slab(PLAN, -10, 10, { name: "stand.plate", ground: true }, 8));
const fadeA = at([-REACH, 0, 0]);
const fadeB = at([REACH, 0, 0]);
back.push(
  `<defs><linearGradient id="tj-fade" gradientUnits="userSpaceOnUse" x1="${fadeA[0].toFixed(1)}" y1="${fadeA[1].toFixed(1)}" x2="${fadeB[0].toFixed(1)}" y2="${fadeB[1].toFixed(1)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff" stop-opacity="1"/><stop offset=".88" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="tj-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"><rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="url(#tj-fade)"/></mask></defs>`,
);
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gravel = [];
for (let i = 0; i < 700; i++) {
  const x = BED.x + 2 + rand() * (BED.w - 4);
  const y = BED.y + 2 + rand() * (BED.d - 4);
  const [sx, sy] = at([x, y, BED_Z]);
  gravel.push([sx, sy, 0.35 + rand() * 0.65]);
}
back.push(
  `<g mask="url(#tj-mask)">${S(k.slabOf(BED, 0, BED_Z, P, 6, 0.8), { tone: "lo", inner: Ln(k.sideSeam(BED, 1.2, P, 6), { tone: "faint" }) })}${Dots(gravel, { size: 0.42, tone: "lo" })}</g>`,
);
record(A.slab(BED, 0, BED_Z, { name: "stand.bed", ground: true }, 6));

// ── rails ──
function railPoly(yc) {
  const f = RAIL.foot / 2, wb = RAIL.web / 2, h = RAIL.head / 2, c = 0.6;
  const z0 = TIE_TOP, zf = z0 + 1.6, zh = RAIL_TOP - RAIL.headH;
  return [[yc - f, z0], [yc + f, z0], [yc + f, zf], [yc + wb, zf + 1.2], [yc + wb, zh], [yc + h, zh], [yc + h, RAIL_TOP - c], [yc + h - c, RAIL_TOP], [yc - h + c, RAIL_TOP], [yc - h, RAIL_TOP - c], [yc - h, zh], [yc - wb, zh], [yc - wb, zf + 1.2], [yc - f, zf]];
}
const holeAt = (x) => [x, 0];
const screw = (x, z, dx = 0) => {
  const [cx, cy] = holeAt(x);
  return S(k.cylinder(cx + dx, cy, 2.75, z, 1.8, P, 24, 0.3), { tone: "mid" }) + Ln(k.lineOnTop([cx + dx - 2.2, cy - 1.3], [cx + dx + 2.2, cy + 1.3], z + 1.8, P), { tone: "lo" });
};

// Left module: everything static.
const tieXs = [30, 50];
for (const x of tieXs) {
  const plan = { x: -x - TIE.w / 2, y: -half, w: TIE.w, d: TIE.len, r: 0.8 };
  box("left.tie", [plan.x, -half, BED_Z], [plan.x + TIE.w, half, TIE_TOP], { tone: "mid" }, { r: 0.8, bevel: 0.5, extra: "", meta: {} });
}
const leftTie = prism("left.endtie", FLOOR, LEFT_TIE, BED_Z, TIE_TOP, { tone: "mid", inner: Ln(k.ring(-6, 0, 1.9, TIE_TOP, P, 20), { tone: "lo" }) });
put2("left.screw", [-6, 0, TIE_TOP + 1], screw(-6, TIE_TOP), [record(A.cylinder(-6, 0, 2.75, TIE_TOP, 1.8, { name: "left.screw" }))]);
// Printed rail chairs: a clip each side of the rail foot on every tie.
const chairPlans = (x, w) => [-1, 1].flatMap((sign) => [-1, 1].map((side) => ({ x: x - w / 2 + 1, y: sign * RAIL_Y + side * (RAIL.foot / 2 + 1) - 1, w: w - 2, d: 2, r: 0.4 })));
const chairSvg = (plan) => S(k.slabOf(plan, TIE_TOP, 2.2, P, 2, 0.3), { tone: "mid" });
for (const x of [...tieXs.map((t) => -t), -6]) for (const plan of chairPlans(x, x === -6 ? 10 : TIE.w)) box("left.chair", [plan.x, plan.y, TIE_TOP], [plan.x + plan.w, plan.y + plan.d, TIE_TOP + 2.2], { tone: "mid" }, { r: 0.4, steps: 2, bevel: 0.3 });
for (const sign of [-1, 1]) prism("left.rail", XF, railPoly(sign * RAIL_Y), -REACH - 4, -HALF_GAP, { tone: "mid" }, { inner: "" });
function put2(name, ref, svg, shapes, opts = {}) {
  return Sc.put(name, ref, svg, shapes, opts);
}

// ── the right module, built at its seated pose and moved as one group ──
const moving = [];
const rS = (paths, style) => S(paths, style);
for (const x of tieXs) moving.push({ key: k.depthOf([x, 0, BED_Z], P), svg: rS(k.slabOf({ x: x - TIE.w / 2, y: -half, w: TIE.w, d: TIE.len, r: 0.8 }, BED_Z, TIE.t, P, 3, 0.5), { tone: "mid" }) });
moving.sort((a, b) => a.key - b.key);
const rightChairs = [...tieXs, 6].flatMap((x) => chairPlans(x, x === 6 ? 10 : TIE.w)).sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P));
for (const plan of rightChairs) record(A.slab(plan, TIE_TOP, 2.2, { name: "right.chair" }, 2));
const rightRails = [-1, 1].map((sign) => rS(rtPrism(XF, railPoly(sign * RAIL_Y), HALF_GAP, REACH + 4, P), { tone: "mid" })).join("");
const rightScrew = Ln(k.ring(6, 0, 1.9, TIE_TOP, P, 20), { tone: "lo" }) + screw(6, TIE_TOP);
record(A.prism(FLOOR, RIGHT_TIE, BED_Z, TIE_TOP, { name: "right.endtie" }));
record(A.prism(FLOOR, RIGHT_TONGUE, BED_Z, TIE_TOP, { name: "right.tongue" }));
for (const x of tieXs) record(A.slab({ x: x - TIE.w / 2, y: -half, w: TIE.w, d: TIE.len, r: 0.8 }, BED_Z, TIE.t, { name: "right.tie" }, 3));

// ── settle the static part ──
const staticItems = Sc.finish();
const fadeNames = /left\.rail/;
const tagged = R.items.map((item) => `<g class="it" data-name="${item.name}"${fadeNames.test(item.name) ? ' mask="url(#tj-mask)"' : ""}>${item.svg}</g>`);
const endTieIndex = R.items.findIndex((item) => item.name === "left.endtie");
const slot = (name) => `<g data-part="${name}"></g>`;
tagged.splice(endTieIndex, 0, slot("tongue-low"));
void staticItems;

// The joint, back to front: the right tongue below the static tie top (a), the left module (b), the right tongue
// above it (c), the left tongue (d), the right end tie below the static tie top (e), the left tongue's top (f), the
// right end tie above it (g) and the rest of the right module.
const leftTongue = S(rtPrism(FLOOR, LEFT_TONGUE, BED_Z, TIE_TOP, P), { tone: "mid" });
const leftCap = (() => {
  const pts = LEFT_TONGUE.map(([x, y]) => at([x, y, TIE_TOP]));
  return `<path class="iso-fill" d="${k.pathOf(pts, true)}"/><path class="iso-top" d="${k.pathOf(pts, true)}"/><path class="iso-line iso-edge" data-tone="mid" d="${k.pathOf(pts, true)}"/>`;
})();
record(A.prism(FLOOR, LEFT_TONGUE, BED_Z, TIE_TOP, { name: "left.tongue" }));

const svg = k.figureSvg({
  width: W,
  height: H,
  label: "Bir balast yatağı üzerinde iki düz ray modülünün uçları. Sağdaki modül kaldırılıp kaydırılır, sonra indirilir: her uç traversteki kırlangıç dili karşı modülün yuvasına oturur, raylar arasında 0,5 mm boşluk kalır.",
  body: [
    ...back,
    `<g class="tj-static">${tagged.join("")}</g>`,
    slot("tongue-high"),
    `<g data-part="left-tongue">${leftTongue}</g>`,
    slot("tie-low"),
    `<g data-part="left-cap">${leftCap}</g>`,
    slot("tie-high"),
    `<g data-part="right">${moving.map((m) => m.svg).join("")}${rightScrew}${rightChairs.map(chairSvg).join("")}<g mask="url(#tj-mask)">${rightRails}</g></g>`,
  ],
});

const DATA = { P, FLOOR, BED_Z, TIE_TOP, RIGHT_TIE, RIGHT_TONGUE, GAP0, LIFT, SLIDE: 0.7, RAIL_GAP: HALF_GAP * 2, TIE_T: TIE.t };
const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const sr = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = { right: part("right"), tongueLow: part("tongue-low"), tongueHigh: part("tongue-high"), tieLow: part("tie-low"), tieHigh: part("tie-high") };
const fmt = (v) => v.toFixed(1).replace(".", ",");
const poseOf = (p) => p <= D.SLIDE ? { gap: D.GAP0 * (1 - p / D.SLIDE), lift: D.LIFT } : { gap: 0, lift: D.LIFT * (1 - (p - D.SLIDE) / (1 - D.SLIDE)) };
const shiftPoly = (poly, dx) => poly.map(([x, y]) => [x + dx, y]);
// The part below the static tie top is drawn before the static tie, the part above (or its top face) after it.
const capOf = (poly, z, lit) => { const d = pathOf(poly.map(([x, y]) => iso([x, y, z], P)), true); return '<g class="iso-solid"' + (lit ? " data-lit" : "") + '><path class="iso-fill" d="' + d + '"/><path class="iso-top" d="' + d + '"/><path class="iso-line iso-edge" data-tone="' + (lit ? "hi" : "mid") + '" d="' + d + '"/></g>'; };
function split(poly, z0, z1, cut, style) {
  const low = cut > z0 + 0.01 ? solidSvg(rtPrism(D.FLOOR, poly, z0, Math.min(cut, z1), P), { ...style, crease: "none" }) : "";
  const top = Math.max(cut, z0);
  const high = z1 > top + 0.01 ? solidSvg(rtPrism(D.FLOOR, poly, top, z1, P), style) : capOf(poly, z1, style.lit);
  return { low, high };
}
let p = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, phase = "";
const TOUR = [[0, 1.6], [1, 4.2], [1, 2.2], [0, 3.6]];
const TOUR_TOTAL = TOUR.reduce((s, [, d]) => s + d, 0);
const tourAt = (t) => { let at = t % TOUR_TOTAL; for (const [v, d] of TOUR) { if (at < d) return v; at -= d; } return 0; };
function draw() {
  const { gap, lift } = poseOf(p);
  el.right.setAttribute("transform", translateAlong(P, [gap, 0, lift]));
  const z0 = D.BED_Z + lift, z1 = D.TIE_TOP + lift;
  const tongue = split(shiftPoly(D.RIGHT_TONGUE, gap), z0, z1, D.TIE_TOP, { tone: "hi", lit: true });
  const tie = split(shiftPoly(D.RIGHT_TIE, gap), z0, z1, D.TIE_TOP, { tone: "mid" });
  el.tongueLow.innerHTML = tongue.low;
  el.tongueHigh.innerHTML = tongue.high;
  el.tieLow.innerHTML = tie.low;
  el.tieHigh.innerHTML = tie.high;
  let text, now;
  if (gap > 0.05) { text = "aralık " + fmt(gap) + " mm"; now = "aralık"; }
  else if (lift > 0.05) { text = "hizalı · dil " + fmt(Math.min(lift, D.TIE_T)) + " mm yukarıda"; now = "iniyor"; }
  else { text = "oturdu · ray boşluğu " + fmt(D.RAIL_GAP) + " mm"; now = "oturdu"; }
  if (readout.textContent !== text) readout.textContent = text;
  if (now !== phase) { phase = now; describe(text); }
}
function describe(text) {
  stage.setAttribute("aria-valuenow", String(Math.round(target * 100)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  p = calm ? target : p + (target - p) * (1 - Math.exp(-dt / 0.55));
  if (Math.abs(target - p) < 0.0008) p = target;
  draw();
  const settled = !touring && p === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (value) => {
  touring = false;
  target = Math.max(0, Math.min(1, value));
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const fromPointer = (event) => { const box = svg.getBoundingClientRect(); return 1 - Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width - 0.2) / 0.6)); };
stage.addEventListener("pointermove", (event) => steer(fromPointer(event)));
stage.addEventListener("pointerdown", (event) => steer(fromPointer(event)));
stage.addEventListener("keydown", (event) => {
  const from = touring ? p : target;
  let to = null;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = from + (event.shiftKey ? 0.3 : 0.1);
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = from - (event.shiftKey ? 0.3 : 0.1);
  if (event.key === "End" || event.key === " " || event.key === "Enter") to = 1;
  if (event.key === "Home" || event.key === "Escape") to = 0;
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(to * 100) / 100);
});
stage.addEventListener("focus", () => { if (sr) sr.textContent = readout.textContent; });
if (still.matches) { touring = false; target = 1; p = 1; }
describe("aralık 12,0 mm");
draw();
`;

const body = k.plateHtml({
  fig: "Şekil 2",
  title: "Ray bağlantısı",
  hint: "Sola gezdir · ← → · boşluk",
  readout: `aralık ${String(GAP0.toFixed(1)).replace(".", ",")} mm`,
  keys: [
    { mark: "lit", label: "Kırlangıç dili: boyun 6, uç 9, boy 7 mm" },
    { mark: "raised", label: "Uç traversi (12 mm) ve yuvası: her yüzde 0,2 mm boşluk" },
    { mark: "edge", label: "Ray: baş 5, gövde 3, taban 9 mm; ray açıklığı 45 mm" },
  ],
  caption:
    "Her düz modülün iki ucunda birer dil ve birer yuva var, eksenden 12 mm yanda; bu yüzden modül iki yönde de takılır. Dil yandan itilerek girmez: ucu boynundan geniş olduğu için yukarıdan indirilir ve iki modül artık ayrılamaz. Oturduğunda ray uçları arasında 0,5 mm genleşme boşluğu kalır (her uçta 0,25), ray başlarındaki 0,4 mm pah tekerleğin takılmasını önler. Her modül iki M3 vidayla zemine bağlanır.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Ray bağlantısı. Sol ok ve boşluk tuşu sağdaki modülü yaklaştırıp indirir, sağ ok ve Home geri çeker." aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${svg}<span class="iso-sr" role="status" aria-live="polite" data-status></span></div>`,
});

writePages("track-joint", { title: "Ray bağlantısı", body, live });
console.log(`${R.items.length} static items · ${R.solids.length} solids · ${moving.length + rightChairs.length + 6} moving parts`);
A.auditOrExit(R, P, {});
