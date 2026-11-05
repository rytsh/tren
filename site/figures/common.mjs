import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../anatomy/kit/iso-kit.mjs";
import * as G from "../anatomy/kit/lathe.mjs";
import * as A from "../anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../anatomy/kit/tube.mjs";
import { kitScript } from "../anatomy/scripts/inline-kit.mjs";
import { rtPrism } from "./runtime.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = join(HERE, "..", "public", "figures");

export const runtimeScript = () =>
  readFileSync(join(HERE, "runtime.mjs"), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "");

// Page tweaks for an <iframe> embed: no page margins, transparent page, red tokens for the driving wheels.
export const EMBED_CSS = `
html:has(body[data-theme="light"]){color-scheme:light}
body.iso{background:transparent}
.iso-page{width:100%!important;max-width:940px;margin:0 auto!important;padding:1px 1px 4px}
.iso-figure{margin:0}
.iso-stage{outline:none;touch-action:pan-y;cursor:ew-resize}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso{--rt-red-0:#3b1513;--rt-red-1:#471917;--rt-red-2:#561e1b;--rt-red-3:#652420;--rt-red-top:#742a25;--rt-hole:#0a0a0a;--rt-lamp:#ffd27a;--rt-lamp-off:#2a2a2a}
.iso[data-theme="light"]{--rt-red-0:#c4615c;--rt-red-1:#d0736e;--rt-red-2:#db8681;--rt-red-3:#e59a95;--rt-red-top:#efb1ad;--rt-hole:#c9c9c6;--rt-lamp:#f0a020;--rt-lamp-off:#e4e4e1}
.rt-red>.iso-shade[data-shade="0"]{fill:var(--rt-red-0)}
.rt-red>.iso-shade[data-shade="1"]{fill:var(--rt-red-1)}
.rt-red>.iso-shade[data-shade="2"]{fill:var(--rt-red-2)}
.rt-red>.iso-shade[data-shade="3"]{fill:var(--rt-red-3)}
.rt-red>.iso-top{fill:var(--rt-red-top)}
.rt-red[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--rt-red-0)}
.rt-red[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--rt-red-1)}
.rt-red[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--rt-red-2)}
.rt-red[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--rt-red-3)}
.rt-red[data-seamless]>.iso-top{stroke:var(--rt-red-top)}
.rt-hole{fill:var(--rt-hole);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.iso[data-theme="light"]{
  --anatomy-page:#faf5e4;--anatomy-card:#faf5e4;--anatomy-paper:#faf5e4;--anatomy-face:#fdfaf0;--anatomy-top:#fdfaf0;
  --anatomy-shade-0:#d6caa3;--anatomy-shade-1:#e0d6b6;--anatomy-shade-2:#ebe3c9;--anatomy-shade-3:#f4eedb;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#f1ead3;
  --anatomy-hi:#2b2616;--anatomy-mid:#6e6448;--anatomy-lo:#998d6a;--anatomy-faint:#c4b78f;--anatomy-lit:#000000;
  --anatomy-text:#3d3622;--anatomy-strong:#2b2616;--anatomy-muted:#6e6448;--anatomy-dot:#2b2616;
  --anatomy-halo:#7a6f50;--anatomy-halo-opacity:.3;--anatomy-weight:.75px;
  --rt-red-0:#8e1b1f;--rt-red-1:#a42226;--rt-red-2:#b8292d;--rt-red-3:#c83236;--rt-red-top:#d64246;--rt-hole:#3d3622}
.iso[data-theme="light"] .rt-red>.iso-edge{stroke:#3d0c0e}
.iso[data-theme="light"] .rt-red>.iso-fill{fill:#b3262a}
.iso[data-theme="light"] .iso-edge{stroke-width:1px}
.iso[data-theme="light"] .iso-dots circle{opacity:.45}
.iso[data-theme="light"] .iso-dots[data-tone="hi"] circle{opacity:.9}
.iso[data-theme="light"] .iso-plate-corner,.iso[data-theme="light"] .iso-legend{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.iso[data-theme="light"] .iso-plate-corner{font-size:12.5px;letter-spacing:0;text-transform:none}
.iso[data-theme="light"] .iso-plate-corner[data-corner="readout"]{color:var(--anatomy-strong);font-weight:500}
.iso[data-theme="light"] .iso-plate{box-shadow:0 0 0 1px #d6caa3}
html.embed-stage .iso-legend{display:none}
html.embed-stage .iso-page{max-width:none;padding:0}
html.embed-stage .iso-plate{border:0;box-shadow:none;border-radius:0}
html.embed-stage body.iso{background:transparent}
html.embed-stage,html.embed-stage body{height:100%;overflow:hidden;margin:0}
html.embed-stage .iso-page,html.embed-stage .iso-figure,html.embed-stage .iso-plate{height:100%;margin:0;box-sizing:border-box}
html.embed-stage .iso-plate{padding:34px 8px 30px;display:flex;flex-direction:column;background:transparent}
html.embed-stage .iso-plate-corner[data-corner="fig"],html.embed-stage .iso-plate-corner[data-corner="title"]{display:none}
html.embed-stage .iso-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
html.embed-stage .iso-stage>svg,html.embed-stage .iso-svg{width:100%;height:100%;max-height:100%;margin:0}
.iso-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:560px){.iso-plate-corner{font-size:9px}}
`;

// ?embed=stage shows only the plate (drawing and corner labels); set before first paint by the head script.
const EMBED_HEAD = `<script>if(new URLSearchParams(location.search).get("embed")==="stage")document.documentElement.classList.add("embed-stage")</script>`;

export const heightScript = (id) => `
const postHeight = () => parent.postMessage({ type: "anatomy-height", id: ${JSON.stringify(id)}, height: document.documentElement.scrollHeight }, "*");
addEventListener("load", postHeight);
new ResizeObserver(postHeight).observe(document.body);
postHeight();
`;

export function writePages(id, { title, body, live }) {
  mkdirSync(OUT, { recursive: true });
  for (const theme of ["dark", "light"]) {
    const page = k.pageHtml({ title, theme, body: `<style>${EMBED_CSS}</style>${body}`, script: kitScript() + runtimeScript() + live + heightScript(id), width: 900 }).replace('<html lang="en">', '<html lang="tr">').replace("</title>", "</title>" + EMBED_HEAD);
    const name = theme === "light" ? `${id}-light.html` : `${id}.html`;
    writeFileSync(join(OUT, name), page);
    console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
  }
}

// A scene: a recorder plus drawing helpers that put an item and record its true shape.
export function scene(P) {
  const R = A.recorder(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const KS = G.scaleOf(P);
  let count = 0;
  const put = (name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) => R.put({ name: R.nameFor(name), at: ref, bias, svg, shapes, piece: "fig", ...rest });
  const record = R.solid;
  const wrap = (svg, part) => (part ? `<g data-part="${part}">${svg}</g>` : svg);

  function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, part, meta = {} } = {}) {
    const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
    const shape = record(A.slab(plan, z0, z1 - z0, { name, ...meta }, steps));
    put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrap(S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, part), [shape], { bias });
    return shape;
  }
  function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, ref, part, meta = {} } = {}) {
    const shape = record(A.prism(F, poly, s0, s1, { name, ...meta }));
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
    put(name, ref ?? centre, wrap(S(rtPrism(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra, part), [shape], { bias });
    return shape;
  }
  function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, part, steps, bevel = 0, meta = {} } = {}) {
    const paths = G.solidOf(profile, F, P, { bevel, ...(steps ? { steps } : {}) });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const shape = record(A.solid(F, profile, { name, ...meta }));
    put(name, G.add3(F.o, G.mul3(F.a, mid)), wrap(S(paths, { tone: "mid", ...style, inner }) + extra, part), [shape], { bias });
    return shape;
  }
  const disc = (name, F, s0, s1, r, style = {}, options = {}) => turned(name, F, [[s0, r], [s1, r]], style, options);
  function ball(name, c, r, style = {}, { bias = 0, extra = "", part } = {}) {
    const shape = record(A.ball(c, r, { name }));
    put(name, c, wrap(S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }) + extra, part), [shape], { bias });
    return shape;
  }
  function cable(name, points, r = 0.55, { tone = "mid", bend = 3, ends = [true, true], maxLength = 14, bias = 0.05 } = {}) {
    const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    R.route(name, route, r, { limp: true, piece: "fig" });
    tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)) }).forEach((piece, index) =>
      put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias, route: name, chunk: index }),
    );
    [0, 1].forEach((index) => {
      if (!ends[index]) return;
      const end = index ? route[route.length - 1] : route[0];
      const size = Math.max(0.5, r * KS * 0.9);
      put(`${name}.end${index}`, end, Dots([at(end)], { size, tone: "hi" }), [A.ball(end, size / KS, { name: `${name}.end${index}`, owner: name })], { bias: bias + 0.15 });
    });
    return route;
  }
  function finish() {
    A.settle(R, P);
    R.items.sort((a, b) => a.key - b.key);
    return R.items.map((item) => `<g class="it" data-name="${item.name}">${item.svg}</g>`).join("");
  }
  return { R, P, at, S, Ln, Dots, KS, put, record, box, prism, turned, disc, ball, cable, finish, A, G, k };
}

export function basePlate(P, plan, { h = 10, foot = 5, label, ruler } = {}) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const at = (p) => k.iso(p, P);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, -h - foot, h, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 22))) {
    out.push(S(k.cylinder(x, y, 7, -h - foot, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -h - foot + 1.6, foot - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plan, -h, h, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(plan, -h / 2, P, 8), { tone: "faint" }) }));
  out.push(Ln(k.planOutline(k.insetPlan(plan, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(plan, 10);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(k.dotsSvg(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (ruler) {
    out.push(S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y, 0.6, [1.8, 3.4], P);
    out.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
  }
  if (label) {
    out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
    out.push(Ln(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
    out.push(Ln([0.6, 0.42, 0.5].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3.4 + i * 3], [label.x + 4 + (label.w - 12) * w, label.y + 3.4 + i * 3], 0.8, P)).join(""), { tone: "lo", free: true }));
    out.push(k.dotsSvg([at([label.x + label.w - 2.6, label.y + 2.4, 0.8]), at([label.x + label.w - 2.6, label.y + label.d - 2.4, 0.8])], { size: 0.45 }));
  }
  return out.join("");
}
