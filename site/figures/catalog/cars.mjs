// The 250 mm car family (docs/standart.md): one shared underframe with two bogies and two T45 couplers,
// and six bodies. Explanatory catalog drawings, not production geometry. Lit parts carry classes
// (tc-glass, tc-lamp, tc-led, tc-glow) so the page can switch them on with `.tcat.lit`.
import * as k from "../../anatomy/kit/iso-kit.mjs";
import * as G from "../../anatomy/kit/lathe.mjs";
import { scene } from "../common.mjs";

// heights from the rail top: underframe top 51, cantrail 121, roof crown 133 (≤ 135, docs/standart.md)
export const CAR = { half: 45, x0: -118, x1: 118, beam: 125, bogie: 75, wb: 48, z0: 51, side: 121, crown: 133 };

const alongX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const alongZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const F0 = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);

export function makeCar(api, kind) {
  const { wheelset, circleY, rectY, rectX, circleX, track, halo, svgOf, AXLE_H, Z } = api;
  const W = 800, H = 500;
  const tall = { radar: 160, gozlem: 166 }[kind] ?? CAR.crown + 8;
  const P = k.fitProjection([[-160, -36, -13], [160, 36, -13], [-128, 47, 0], [128, -47, 0], [-122, -47, tall], [122, 47, tall]], W, H, { pad: 12, azimuth: 56, elevation: 26 });
  const Sc = scene(P);
  const { box, prism, Ln, Dots, at, disc, put, record } = Sc;
  const C = CAR;
  const glow = [];

  // ── underframe: bogies, frame, beams, T45 couplers ──
  for (const bx of [-C.bogie, C.bogie]) {
    for (const x of [bx - C.wb / 2, bx + C.wb / 2]) wheelset(Sc, x, { spokes: 8, prefix: "bogie.wheel" });
    for (const y of [-19, 13]) box("bogie.side", [bx - 32, y, Z(-9)], [bx + 32, y + 6, Z(11)], { tone: "hi" }, { r: 2, extra: y > 0 ? Ln([bx - 24, bx + 24].map((x) => circleY(P, y + 6, x, AXLE_H, 4.5)).join("") + rectY(P, y + 6, bx - 10, bx + 10, Z(-6), Z(8), 2), { tone: "mid" }) + Dots([bx - 28, bx - 14, bx + 14, bx + 28].map((x) => at([x, y + 6, Z(7)])), { size: 0.45, tone: "hi" }) : "" });
    for (const x of [bx - 24, bx + 24]) box("bogie.axlebox", [x - 5, 19, AXLE_H - 5], [x + 5, 21.5, AXLE_H + 5], { tone: "hi" }, { r: 0.8, steps: 2 });
    box("bogie.bolster", [bx - 5, -13, Z(5)], [bx + 5, 13, Z(11)], { tone: "hi" }, { r: 0.6 });
    disc("bogie.pivot", alongZ([bx, 0, 0]), Z(11), Z(26), 4, { tone: "hi" });
  }
  box("underframe", [-C.beam + 4, -C.half, Z(26)], [C.beam - 4, C.half, C.z0], { tone: "hi" }, { r: 1.2, bevel: 0.4, extra: Dots(Array.from({ length: 24 }, (_, i) => at([-C.beam + 12 + i * 10.3, C.half, Z(26) + 2])), { size: 0.4, tone: "hi" }) });
  box("solebar", [-C.beam + 8, C.half - 3, Z(18)], [C.beam - 8, C.half - 1, Z(26)], { tone: "hi" }, { r: 0.4, steps: 2 });
  // underfloor node box: the car's CAN node (ESP32-C3 + transceiver) and its fuse
  box("node.box", [-28, -14, Z(14)], [28, 22, Z(26)], { tone: "hi" }, { r: 1, bevel: 0.3, extra: Ln(rectY(P, 22, -22, -4, Z(16), Z(24), 1), { tone: "mid" }) + `<path class="tc-led" data-c="g" d="${circleY(P, 22, 16, Z(20), 1.4, 16)}"/>` + Dots([at([-25, 22, Z(24)]), at([25, 22, Z(24)])], { size: 0.45, tone: "hi" }) });
  // bus cable along the solebar, from coupler to coupler
  for (const sign of [-1, 1]) beam(sign);

  function beam(sign) {
    const face = sign * C.beam;
    const x0 = sign > 0 ? face - 4 : face;
    box("beam", [x0, -C.half, Z(13)], [x0 + 4, C.half, Z(30)], { tone: "hi", className: "rt-red" }, { r: 0.6, bevel: 0.4, extra: Dots([-38, -20, 20, 38].map((y) => at([face, y, Z(27)])), { size: 0.55, tone: "hi" }) });
    for (const y of [-32, 32]) {
      const F = G.frameOf([face, y, Z(20)], [sign, 0, 0], [0, 1, 0], [0, 0, 1]);
      disc("buffer.stock", F, 0, 4.5, 4.6, { tone: "hi" }, { bevel: 0.3 });
      disc("buffer.rod", F, 4.5, 5.2, 2.6, { tone: "hi" });
      disc("buffer.head", F, 5.2, 6.8, 6.4, { tone: "hi" }, { bevel: 0.4 });
    }
    // T45 coupler: arm in a beam pocket, head with cone/funnel and two pogo strips
    const zc = Z(20);
    box("coupler.arm", [sign > 0 ? face : face - 10, -4, zc - 2.5], [sign > 0 ? face + 10 : face, 4, zc + 2.5], { tone: "hi" }, { r: 0.5, steps: 2 });
    const hx0 = sign > 0 ? face + 10 : face - 16, hx1 = hx0 + 6;
    const fx = sign > 0 ? hx1 : hx0;
    box("coupler.head", [hx0, -13, zc - 9], [hx1, 13, zc + 9], { tone: "hi", className: "tc-signal" }, {
      r: 1.6, bevel: 0.5,
      extra: sign > 0
        ? `<path class="tc-hole" d="${circleX(P, fx, -6, zc + 3, 3.2, 28)}"/>` +
          Ln(circleX(P, fx, 6, zc + 3, 4.2, 28), { tone: "hi" }) +
          `<path class="tc-hole" d="${rectX(P, fx, -10, -1.5, zc - 7, zc - 3, 0.8)}"/><path class="tc-hole" d="${rectX(P, fx, 1.5, 10, zc - 7, zc - 3, 0.8)}"/>` +
          Dots([-8.6, -6.2, -3.8, -1.4 + 0].map((y) => at([fx, y + 0.4, zc - 5])), { size: 0.6, tone: "lit" }) +
          Dots([2.6, 5, 7.4, 9.8].map((y) => at([fx, y - 0.4, zc - 5])), { size: 0.6, tone: "lit" }) +
          Dots([at([(hx0 + hx1) / 2, 0, zc + 9])], { size: 0.9, tone: "hi" })
        : Dots([at([(hx0 + hx1) / 2, 0, zc + 9])], { size: 0.9, tone: "hi" }),
    });
    if (sign > 0) {
      const cone = G.frameOf([fx, 6, zc + 3], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      Sc.turned("coupler.cone", cone, [[0, 4.2], [3.2, 3.2, 1], [5.6, 1.4, 1]], { tone: "hi", className: "tc-signal" });
    }
    // cable from the head into the beam, held by a tie
    const back = sign > 0 ? face - 2 : face + 2;
    Sc.cable(`bus${sign}`, [[sign > 0 ? hx0 : hx1, 0, zc - 9.5], [sign > 0 ? face + 3 : face - 3, 0, zc - 11], [back, 0, Z(12)]], 0.9, { tone: "hi", ends: [false, true] });
  }

  // ── body ──
  const R = (C.half ** 2 + (C.crown - C.side) ** 2) / (2 * (C.crown - C.side));
  const zc = C.crown - R;
  const arc = (half, rr, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const y = half - (2 * half * i) / n; return [y, zc + Math.sqrt(Math.max(0, rr * rr - y * y))]; });
  const roofTop = zc + R + 2.6;
  const roof = ({ vents = [-80, -40, 0, 40, 80], x0 = C.x0, x1 = C.x1 } = {}) => {
    prism("roof", F0, [...arc(C.half + 2, R + 0.2), ...arc(C.half + 2, R + 2.6).reverse()], x0 - 2, x1 + 2, { tone: "hi" });
    for (const x of vents) {
      disc("vent", alongZ([x, 0, 0]), roofTop - 1, roofTop + 2.5, 3.2, { tone: "hi" }, { bevel: 0.3 });
      disc("vent.cap", alongZ([x, 0, 0]), roofTop + 2.5, roofTop + 3.6, 4.4, { tone: "hi" });
    }
  };
  const handles = (xs) => {
    for (const x of xs) put("grab", [x, C.half + 1.4, Z(60)], Ln(k.pathOf([at([x, C.half + 1.4, Z(46)]), at([x, C.half + 1.4, Z(80)])]), { tone: "hi" }) + Dots([at([x, C.half + 1.4, Z(46)]), at([x, C.half + 1.4, Z(80)])], { size: 0.8, tone: "hi" }), [record(Sc.A.box([x - 0.5, C.half + 1, Z(46)], [x + 0.5, C.half + 2, Z(80)], { name: "grab" }))], { bias: 0.5 });
  };
  const steps = (xs) => {
    for (const x of xs) {
      box("step", [x - 7, C.half - 4, Z(8)], [x + 7, C.half + 2, Z(9.6)], { tone: "hi" }, { r: 0.4, steps: 2 });
      box("step.hanger", [x - 6, C.half, Z(9.6)], [x - 4.6, C.half + 1.4, Z(26)], { tone: "hi" }, { r: 0.2, steps: 1 });
      box("step.hanger", [x + 4.6, C.half, Z(9.6)], [x + 6, C.half + 1.4, Z(26)], { tone: "hi" }, { r: 0.2, steps: 1 });
    }
  };
  const rivetRow = (z, n = 26) => Dots(Array.from({ length: n }, (_, i) => at([C.x0 + 5 + i * ((C.x1 - C.x0 - 10) / (n - 1)), C.half, z])), { size: 0.42, tone: "hi" });
  const belt = (zs) => Ln(zs.map((z) => k.pathOf([at([C.x0, C.half, z]), at([C.x1, C.half, z])]) + k.pathOf([at([C.x1, -C.half, z]), at([C.x1, C.half, z])])).join(""), { tone: "mid" });
  const windowY = (x0, x1, z0, z1, r = 3) => `<path class="tc-glass" d="${rectY(P, C.half, x0, x1, z0, z1, r)}"/>` + Ln(rectY(P, C.half, x0 - 1.5, x1 + 1.5, z0 - 1.5, z1 + 1.5, r + 0.6), { tone: "mid" });
  const windowX = (y0, y1, z0, z1, r = 2.5) => `<path class="tc-glass" d="${rectX(P, C.x1, y0, y1, z0, z1, r)}"/>`;
  const endDoor = (glass = true) => `<path class="tc-hole" d="${rectX(P, C.x1, -10, 10, C.z0, Z(88), 3)}"/>` + (glass ? `<path class="tc-glass" d="${rectX(P, C.x1, -6.5, 6.5, Z(66), Z(84), 2)}"/>` : "");
  const tail = `<path class="tc-lamp" d="${circleX(P, C.x1, 30, Z(40), 3, 20)}"/><path class="tc-lamp" d="${circleX(P, C.x1, -30, Z(40), 3, 20)}"/>`;
  const glowAt = (p, r) => { const [x, y] = at(p); glow.push(`<circle class="tc-glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#__GLOW__)"/>`); };

  let label = "";
  if (kind === "yolcu") {
    const n = 8, pitch = 25;
    const xs = Array.from({ length: n }, (_, i) => -((n - 1) * pitch) / 2 + i * pitch);
    const wins = xs.map((x) => windowY(x - 8.5, x + 8.5, Z(60), Z(88), 3)).join("") + Ln(xs.map((x) => k.pathOf([at([x - 8.5, C.half, Z(80)]), at([x + 8.5, C.half, Z(80)])])).join(""), { tone: "mid" });
    const doors = [-1, 1].map((s) => Ln(rectY(P, C.half, s * 108 - 8, s * 108 + 8, C.z0 + 2, Z(90), 2), { tone: "mid" }) + windowY(s * 108 - 5, s * 108 + 5, Z(68), Z(86), 2)).join("");
    prism("body", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], C.x0, C.x1, { tone: "hi" }, { extra: wins + doors + belt([Z(55), Z(94)]) + endDoor() + [-30, 30].map((y) => windowX(y - 7, y + 7, Z(62), Z(86))).join("") + rivetRow(C.z0 + 4) + tail });
    roof();
    handles([-99, -117 + 0, 99, 117].filter((x) => Math.abs(x) < 118));
    steps([-108, 108]);
    xs.forEach((x) => glowAt([x, C.half, Z(74)], 22));
    label = "Yolcu 250: sekiz pencereli, iki kapılı yolcu vagonu; çatı altında LED şerit, iki bojide kırmızı tekerlekler, iki uçta T45 kuplör.";
  } else if (kind === "enerji") {
    const ribs = Ln(Array.from({ length: 11 }, (_, i) => C.x0 + 10 + i * 21.6).map((x) => k.pathOf([at([x, C.half, C.z0 + 3]), at([x, C.half, Z(96)])])).join(""), { tone: "mid" });
    const louvres = Ln([-60, 60].map((cx) => Array.from({ length: 6 }, (_, i) => k.pathOf([at([cx - 16, C.half, Z(54) + i * 5]), at([cx + 16, C.half, Z(54) + i * 5])])).join("")).join(""), { tone: "hi" }) + Ln([-60, 60].map((cx) => rectY(P, C.half, cx - 18, cx + 18, Z(51), Z(82), 1.5)).join(""), { tone: "mid" });
    const gauge = `<path class="tc-hole" d="${rectY(P, C.half, -14, 14, Z(62), Z(80), 1.5)}"/>` + [0, 1, 2, 3, 4].map((i) => `<path class="tc-led" data-c="${i < 4 ? "g" : "b"}" d="${rectY(P, C.half, -11 + i * 4.6, -8 + i * 4.6, Z(66), Z(76), 0.6)}"/>`).join("");
    const doorRail = Ln(k.pathOf([at([-40, C.half, Z(97)]), at([40, C.half, Z(97)])]) + rectY(P, C.half, -36, 36, C.z0 + 2, Z(95), 1), { tone: "mid" });
    prism("body", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], C.x0, C.x1, { tone: "hi" }, { extra: ribs + louvres + doorRail + gauge + rivetRow(C.z0 + 4) + rivetRow(Z(96), 30) + `<path class="tc-hole" d="${rectX(P, C.x1, -18, 18, C.z0 + 4, Z(86), 2)}"/>` + Ln(rectX(P, C.x1, -18, 18, C.z0 + 4, Z(86), 2), { tone: "hi" }) });
    roof({ vents: [-70, 70] });
    box("roof.hatch", [-26, -18, roofTop - 1.5], [26, 18, roofTop + 1], { tone: "hi" }, { r: 1.5, bevel: 0.4, extra: Dots([[-23, -15], [23, -15], [-23, 15], [23, 15]].map(([x, y]) => at([x, y, roofTop + 1])), { size: 0.5, tone: "hi" }) });
    put("bolt", [0, C.half, Z(104)], Ln(k.pathOf([at([-6, C.half + 0.2, Z(103)]), at([2, C.half + 0.2, Z(110)]), at([-1, C.half + 0.2, Z(110)]), at([6, C.half + 0.2, Z(117)])]), { tone: "hi" }), [], { bias: 0.4 });
    glowAt([0, C.half, Z(71)], 18);
    label = "Enerji 250: kapalı yük vagonu görünümünde ek 2S pil paketi; yanlarda panjur ızgaraları ve gerilim göstergesi, çatıda servis kapağı.";
  } else if (kind === "radar") {
    // low cabin at the rear half, open deck with a turntable at the front half
    const cab = { x0: C.x0, x1: -18 };
    prism("cabin", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], cab.x0, cab.x1, { tone: "hi" }, { extra: [-92, -64, -36].map((x) => windowY(x - 8, x + 8, Z(62), Z(84), 2.5)).join("") + belt([Z(56), Z(92)].slice(0, 1)) + Ln(k.pathOf([at([cab.x1, -C.half, Z(56)]), at([cab.x1, C.half, Z(56)])]), { tone: "mid" }) + `<path class="tc-hole" d="${rectX(P, cab.x1, -9, 9, C.z0, Z(86), 3)}"/>` + rivetRow(C.z0 + 4, 12).replace(/.*/, (m) => m) });
    prism("cabin.roof", F0, [...arc(C.half + 2, R + 0.2), ...arc(C.half + 2, R + 2.6).reverse()], cab.x0 - 2, cab.x1 + 2, { tone: "hi" });
    box("deck", [cab.x1 + 2, -C.half, C.z0], [C.x1, C.half, C.z0 + 3], { tone: "hi" }, { r: 1, bevel: 0.4, extra: Ln(Array.from({ length: 9 }, (_, i) => cab.x1 + 14 + i * 12).map((x) => k.pathOf([at([x, -C.half + 3, C.z0 + 3]), at([x, C.half - 3, C.z0 + 3])])).join(""), { tone: "lo" }) });
    for (const y of [-C.half + 1.5, C.half - 1.5]) for (const x of [0, 36, 72, 112]) box("rail.post", [x - 0.7, y - 0.7, C.z0 + 3], [x + 0.7, y + 0.7, C.z0 + 18], { tone: "hi" }, { r: 0.3, steps: 1 });
    put("deck.rail", [56, C.half - 1.5, C.z0 + 18], Ln(k.pathOf([at([0, C.half - 1.5, C.z0 + 18]), at([112, C.half - 1.5, C.z0 + 18])]), { tone: "hi" }) + Dots([at([0, C.half - 1.5, C.z0 + 18]), at([112, C.half - 1.5, C.z0 + 18])], { size: 0.8, tone: "hi" }), [record(Sc.A.box([0, C.half - 2, C.z0 + 17.5], [112, C.half - 1, C.z0 + 18.5], { name: "deckrail" }))], { bias: 0.6 });
    const RX = 58, base = C.z0 + 3;
    disc("radar.plinth", alongZ([RX, 0, 0]), base, base + 10, 18, { tone: "hi" }, { bevel: 0.5, extra: Dots(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 2 * Math.PI; return at([RX + 15 * Math.cos(a), 15 * Math.sin(a), base + 10]); }), { size: 0.5, tone: "hi" }) });
    disc("radar.table", alongZ([RX, 0, 0]), base + 10, base + 14, 30, { tone: "hi", className: "tc-signal" }, { bevel: 0.5, inner: Ln(k.ring(RX, 0, 26, base + 14, P, 48), { tone: "mid" }) });
    disc("radar.mast", alongZ([RX, 0, 0]), base + 14, base + 60, 3.2, { tone: "hi" });
    disc("radar.hub", alongZ([RX, 0, 0]), base + 56, base + 64, 6, { tone: "hi" }, { bevel: 0.4 });
    // dish: a turned shell facing +y, tilted up a little
    const dishF = G.frameOf([RX, 4, base + 64], [0.42, 0.84, 0.34], [0.894, -0.447, 0], [-0.152, -0.304, 0.94]);
    Sc.turned("radar.dish", dishF, [[0, 4], [2, 14, 1], [5, 24, 1], [8, 30, 1], [9, 31]], { tone: "hi" }, { inner: Ln(G.arcOf(dishF, 5, 24, P) + G.arcOf(dishF, 2, 14, P), { tone: "mid" }) });
    disc("radar.feed", dishF, 9, 22, 1.2, { tone: "hi" });
    disc("radar.horn", dishF, 22, 26, 2.6, { tone: "hi" }, { bevel: 0.3 });
    disc("beacon", alongZ([-60, 0, 0]), roofTop - 1, roofTop + 5, 3.2, { tone: "hi" }, { extra: `<path class="tc-led" d="${k.ring(-60, 0, 2.6, roofTop + 5, P, 20)}"/>` });
    glowAt([-60, 0, roofTop + 6], 16);
    glowAt([RX, 30, base + 74], 14);
    label = "Radar 250: kısa kabin ve açık platform; dönen tabla üstünde çanak anten, kabin çatısında uyarı lambası.";
  } else if (kind === "sarj") {
    const low = { side: Z(70), crown: Z(78) };
    const R2 = (C.half ** 2 + (low.crown - low.side) ** 2) / (2 * (low.crown - low.side));
    const zc2 = low.crown - R2;
    const arc2 = (half, rr, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const y = half - (2 * half * i) / n; return [y, zc2 + Math.sqrt(Math.max(0, rr * rr - y * y))]; });
    const lightbar = `<path class="tc-hole" d="${rectY(P, C.half, -90, 90, Z(54), Z(60), 1.5)}"/>` + Array.from({ length: 12 }, (_, i) => `<path class="tc-led" data-c="${i < 9 ? "g" : "b"}" d="${rectY(P, C.half, -87 + i * 14.8, -77 + i * 14.8, Z(55.2), Z(58.8), 0.6)}"/>`).join("");
    const plates = Ln([-80, -40, 0, 40, 80].map((x) => k.pathOf([at([x, C.half, C.z0 + 3]), at([x, C.half, Z(50)])])).join("") + belt([Z(50), Z(64)]).replace(/^/, ""), { tone: "mid" });
    prism("body", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc2(C.half, R2)], C.x0, C.x1, { tone: "hi" }, { extra: plates + lightbar + rivetRow(C.z0 + 4) + `<path class="tc-hole" d="${rectX(P, C.x1, -16, 16, C.z0 + 4, Z(62), 2)}"/>` + [-6, 6].map((y) => `<path class="tc-led" d="${circleX(P, C.x1, y, Z(48), 2, 16)}"/>`).join("") });
    prism("roof", F0, [...arc2(C.half + 2, R2 + 0.2), ...arc2(C.half + 2, R2 + 2.6).reverse()], C.x0 - 2, C.x1 + 2, { tone: "hi" });
    const top2 = zc2 + R2 + 2.6;
    // pantograph-like charge arm folded on the roof and two shoes under the frame
    box("arm.base", [-20, -10, top2 - 1], [20, 10, top2 + 3], { tone: "hi" }, { r: 1, bevel: 0.3 });
    for (const y of [-7, 7]) box("arm.link", [-16, y - 1, top2 + 3], [26, y + 1, top2 + 6], { tone: "hi" }, { r: 0.4, steps: 1 });
    box("arm.head", [24, -14, top2 + 6], [30, 14, top2 + 8], { tone: "hi", className: "tc-signal" }, { r: 0.6, steps: 2 });
    for (const x of [-30, 30]) box("shoe", [x - 12, C.half - 14, Z(1)], [x + 12, C.half - 8, Z(5)], { tone: "hi", className: "tc-signal" }, { r: 1, bevel: 0.3 });
    for (const x of [-30, 30]) box("shoe.spring", [x - 2, C.half - 13, Z(5)], [x + 2, C.half - 9, Z(14)], { tone: "hi" }, { r: 0.4, steps: 1, extra: Ln([0, 1, 2, 3].map((i) => k.pathOf([at([x - 2, C.half - 9, Z(6) + i * 2]), at([x + 2, C.half - 9, Z(7) + i * 2])])).join(""), { tone: "hi" }) });
    glowAt([0, C.half, Z(57)], 30);
    label = "Şarj 250: alçak kasalı şarj vagonu; altında yaylı istasyon pabuçları, yanında şarj durumu ışık çubuğu, çatıda katlanır şarj kolu.";
  } else if (kind === "ses") {
    const grille = (cx) => `<path class="tc-grille" d="${circleY(P, C.half, cx, Z(66), 13, 40)}"/>` + Ln(circleY(P, C.half, cx, Z(66), 15.5, 40) + circleY(P, C.half, cx, Z(66), 4, 20), { tone: "hi" }) + Dots(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 2 * Math.PI, r = i % 2 ? 7.5 : 10.5; return at([cx + r * Math.cos(a), C.half, Z(66) + r * Math.sin(a)]); }), { size: 0.5, tone: "lit" });
    const doors = [-1, 1].map((s) => Ln(rectY(P, C.half, s * 30 - 22, s * 30 + 22, C.z0 + 2, Z(92), 1.5) + k.pathOf([at([s * 30, C.half, C.z0 + 2]), at([s * 30, C.half, Z(92)])]), { tone: "mid" })).join("");
    prism("body", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], C.x0, C.x1, { tone: "hi" }, { extra: grille(-86) + grille(86) + doors + windowY(-12, 12, Z(70), Z(86), 2) + Ln(k.pathOf([at([-58, C.half, Z(96)]), at([58, C.half, Z(96)])]), { tone: "mid" }) + belt([Z(55)]) + rivetRow(C.z0 + 4) + endDoor(false) + tail });
    roof({ vents: [-90, 90] });
    // horn trumpet on the roof
    const hornF = G.frameOf([0, 0, roofTop + 7], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    disc("horn.base", alongZ([-10, 0, 0]), roofTop - 1, roofTop + 7, 4, { tone: "hi" });
    Sc.turned("horn", hornF, [[-18, 2], [-4, 2.6, 1], [8, 4.4, 1], [16, 8.6, 1], [18, 9.4]], { tone: "hi", className: "tc-signal" }, { extra: `<path class="tc-hole" d="${circleX(P, 18, 0, roofTop + 7, 7.6, 32)}"/>` });
    glowAt([-86, C.half, Z(66)], 20);
    glowAt([86, C.half, Z(66)], 20);
    label = "Ses 250: posta/bagaj vagonu görünümü; iki yanda hoparlör ızgarası, çatıda düdük borusu, kayar kapılar.";
  } else if (kind === "gozlem") {
    const pitch = 32, xs = [-80, -48, -16, 16, 48];
    const wins = xs.map((x) => windowY(x - 13, x + 13, Z(56), Z(92), 2.5)).join("");
    prism("body", F0, [[-C.half, C.z0], [C.half, C.z0], ...arc(C.half, R)], C.x0, C.x1 - 22, { tone: "hi" }, { extra: wins + belt([Z(52)]).replace(/.*/, (m) => m) + rivetRow(C.z0 + 4, 22) + `<path class="tc-glass" d="${rectX(P, C.x1 - 22, -32, 32, Z(56), Z(92), 3)}"/>` });
    void pitch;
    prism("roof", F0, [...arc(C.half + 2, R + 0.2), ...arc(C.half + 2, R + 2.6).reverse()], C.x0 - 2, C.x1 - 20, { tone: "hi" });
    // dome: a glazed cupola on the roof
    const domeZ = roofTop - 2;
    box("dome.base", [-60, -26, domeZ], [-4, 26, domeZ + 6], { tone: "hi" }, { r: 4, bevel: 0.4 });
    prism("dome", G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[-24, domeZ + 6], [24, domeZ + 6], [18, domeZ + 24], [-18, domeZ + 24]], -58, -6, { tone: "hi" }, { extra: `<path class="tc-glass" d="${k.pathOf([at([-54, 25, domeZ + 8]), at([-10, 25, domeZ + 8]), at([-10, 19, domeZ + 22]), at([-54, 19, domeZ + 22])], true)}"/>` + `<path class="tc-glass" d="${k.pathOf([at([-6, 21, domeZ + 8]), at([-6, -21, domeZ + 8]), at([-6, -16, domeZ + 22]), at([-6, 16, domeZ + 22])], true)}"/>` });
    disc("camera", alongZ([-32, 0, 0]), domeZ + 24, domeZ + 28, 5, { tone: "hi" }, { extra: `<path class="tc-led" data-c="b" d="${k.ring(-32, 0, 2.2, domeZ + 28, P, 16)}"/>` });
    // rear balcony with railing
    box("balcony", [C.x1 - 22, -C.half, C.z0], [C.x1, C.half, C.z0 + 2.5], { tone: "hi" }, { r: 1, extra: Ln([0, 1, 2, 3, 4].map((i) => k.pathOf([at([C.x1 - 20 + i * 4.5, -C.half + 2, C.z0 + 2.5]), at([C.x1 - 20 + i * 4.5, C.half - 2, C.z0 + 2.5])])).join(""), { tone: "lo" }) });
    for (const [x, y] of [[C.x1 - 1, -C.half + 1], [C.x1 - 1, C.half - 1], [C.x1 - 12, C.half - 1], [C.x1 - 1, -14], [C.x1 - 1, 14]]) box("balcony.post", [x - 0.6, y - 0.6, C.z0 + 2.5], [x + 0.6, y + 0.6, C.z0 + 24], { tone: "hi" }, { r: 0.3, steps: 1 });
    put("balcony.rail", [C.x1 - 1, 0, C.z0 + 24], Ln(k.pathOf([at([C.x1 - 22, C.half - 1, C.z0 + 24]), at([C.x1 - 1, C.half - 1, C.z0 + 24]), at([C.x1 - 1, 14, C.z0 + 24])]) + k.pathOf([at([C.x1 - 1, -14, C.z0 + 24]), at([C.x1 - 1, -C.half + 1, C.z0 + 24])]) + k.pathOf([at([C.x1 - 22, C.half - 1, C.z0 + 14]), at([C.x1 - 1, C.half - 1, C.z0 + 14]), at([C.x1 - 1, 14, C.z0 + 14])]), { tone: "hi" }) + Dots([at([C.x1 - 22, C.half - 1, C.z0 + 24]), at([C.x1 - 22, C.half - 1, C.z0 + 14]), at([C.x1 - 1, 14, C.z0 + 24]), at([C.x1 - 1, 14, C.z0 + 14]), at([C.x1 - 1, -14, C.z0 + 24])], { size: 0.8, tone: "hi" }), [record(Sc.A.box([C.x1 - 22, -C.half, C.z0 + 13], [C.x1, C.half, C.z0 + 25], { name: "balconyrail" }))], { bias: 0.8 });
    disc("lantern", alongX([C.x1 - 22, 0, Z(98)]), 0, 5, 4, { tone: "hi" }, { extra: `<path class="tc-lamp" d="${circleX(P, C.x1 - 17, 0, Z(98), 2.8, 18)}"/>` });
    xs.forEach((x) => glowAt([x, C.half, Z(74)], 24));
    glowAt([-32, 0, domeZ + 16], 26);
    label = "Gözlem 250: geniş pencereli gözlem vagonu; çatıda camlı kubbe ve kamera, arkada korkuluklu balkon ve fener.";
  }

  const glowDefs = `<radialGradient id="${kind}-glow"><stop offset="0" stop-color="#ffd25a" stop-opacity=".7"/><stop offset=".45" stop-color="#ffbf3a" stop-opacity=".28"/><stop offset="1" stop-color="#ffbf3a" stop-opacity="0"/></radialGradient>`;
  const body = [halo(P, { x: -130, y: -44, w: 260, d: 88, r: 20 }, -13), track(P, -160, 160), Sc.finish(), `<g class="tc-glows">${glow.join("").replaceAll("__GLOW__", `${kind}-glow`)}</g>`].join("");
  return svgOf({ id: `car-${kind}`, width: W, height: H, label, body, P, fade: [-160, 160], defs: glowDefs });
}
