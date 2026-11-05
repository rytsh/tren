// Pure drawing helpers shared by the build scripts and inlined into the pages (imports and exports stripped).
import { iso, pathOf, cameraOf } from "../anatomy/kit/iso-kit.mjs";

export const rtDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function rtView(P) {
  const { sinA, cosA, sinE, cosE } = cameraOf(P);
  return [cosA * cosE, sinA * cosE, sinE];
}

export function rtLight(P) {
  const { sinA, cosA } = cameraOf(P);
  const l = [-sinA, cosA, 1.2];
  const n = Math.hypot(l[0], l[1], l[2]);
  return [l[0] / n, l[1] / n, l[2] / n];
}

export function rtBand(score) {
  const bands = [0, 0.2, 0.42, 0.62];
  let tone = 0;
  while (tone < bands.length && score >= bands[tone]) tone++;
  return tone;
}

export const rtAt = (F, s, x, y) => [
  F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y,
  F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y,
  F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y,
];

const rtSigned = (poly) => poly.reduce((sum, [x, y], i) => {
  const [x2, y2] = poly[(i + 1) % poly.length];
  return sum + x * y2 - x2 * y;
}, 0);

const rtScreenOriented = (pts) => (rtSigned(pts) < 0 ? [...pts].reverse() : pts);

function rtRuns(flags, want) {
  const count = flags.length;
  const runs = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

// A prism of any (also concave) polygon in the frame's u, v plane, extruded along F.a from s0 to s1.
export function rtPrism(F, poly, s0, s1, P) {
  const V = rtView(P);
  const L = rtLight(P);
  const ring = rtSigned(poly) > 0 ? poly : [...poly].reverse();
  const n = ring.length;
  const capNear = rtDot(F.a, V) > 0;
  const [nearS, farS] = capNear ? [s1, s0] : [s0, s1];
  const near = ring.map(([x, y]) => iso(rtAt(F, nearS, x, y), P));
  const far = ring.map(([x, y]) => iso(rtAt(F, farS, x, y), P));
  const normals = ring.map(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % n];
    const m = [F.u[0] * (y1 - y0) - F.v[0] * (x1 - x0), F.u[1] * (y1 - y0) - F.v[1] * (x1 - x0), F.u[2] * (y1 - y0) - F.v[2] * (x1 - x0)];
    const l = Math.hypot(m[0], m[1], m[2]) || 1;
    return [m[0] / l, m[1] / l, m[2] / l];
  });
  const facing = normals.map((m) => rtDot(m, V) > 1e-9);
  const outline = [];
  const crease = [];
  for (const run of rtRuns(facing, false)) outline.push(pathOf(run.map((i) => near[i])));
  for (const run of rtRuns(facing, true)) {
    crease.push(pathOf(run.map((i) => near[i])));
    outline.push(pathOf(run.map((i) => far[i])));
  }
  for (let i = 0; i < n; i++) if (facing[(i + n - 1) % n] !== facing[i]) outline.push(pathOf([near[i], far[i]]));
  const parts = [pathOf(rtScreenOriented(near), true), pathOf(rtScreenOriented(far), true)];
  const buckets = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    if (!facing[i]) continue;
    const quad = rtScreenOriented([near[i], near[(i + 1) % n], far[(i + 1) % n], far[i]]);
    parts.push(pathOf(quad, true));
    buckets[rtBand(rtDot(normals[i], L))].push(pathOf(quad, true));
  }
  const capNormal = capNear ? F.a : [-F.a[0], -F.a[1], -F.a[2]];
  buckets[rtBand(rtDot(capNormal, L))].push(pathOf(rtScreenOriented(near), true));
  return { fill: parts.join(""), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((b) => b.join("")) };
}

// A spur gear outline in the u, v plane: `teeth` trapezoid teeth between rRoot and rTip, turned by `phase`.
export function rtGear(teeth, rTip, rRoot, phase) {
  const pitch = (Math.PI * 2) / teeth;
  const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const c = phase + i * pitch;
    pts.push(polar(rRoot, c - 0.27 * pitch), polar(rTip, c - 0.12 * pitch), polar(rTip, c + 0.12 * pitch), polar(rRoot, c + 0.27 * pitch), polar(rRoot, c + 0.5 * pitch));
  }
  return pts;
}

// The visible runs of a helix of radius r round F.a (a worm's thread crest), ending exactly on the limbs.
export function rtHelix(F, s0, s1, r, lead, phase, P, step = 0.1) {
  const V = rtView(P);
  const angleAt = (s) => phase + (Math.PI * 2 * (s - s0)) / lead;
  const facing = (s) => {
    const a = angleAt(s);
    return Math.cos(a) * rtDot(F.u, V) + Math.sin(a) * rtDot(F.v, V);
  };
  const pointAt = (s) => {
    const a = angleAt(s);
    return iso(rtAt(F, s, r * Math.cos(a), r * Math.sin(a)), P);
  };
  const runs = [];
  let run = facing(s0) > 0 ? [pointAt(s0)] : null;
  let prev = s0;
  let prevF = facing(s0);
  for (let s = s0 + step; prev < s1 - 1e-9; s += step) {
    const here = Math.min(s, s1);
    const f = facing(here);
    if ((f > 0) !== (prevF > 0)) {
      let lo = prev;
      let hi = here;
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if ((facing(mid) > 0) === (prevF > 0)) lo = mid;
        else hi = mid;
      }
      const edge = pointAt((lo + hi) / 2);
      if (run) {
        run.push(edge);
        runs.push(run);
        run = null;
      } else run = [edge];
    }
    if (run && f > 0) run.push(pointAt(here));
    prev = here;
    prevF = f;
  }
  if (run && run.length > 1) runs.push(run);
  return runs.map((points) => pathOf(points)).join("");
}

// Radial spokes on a face normal to y (a wheel seen from its side), between two rings.
export function rtSpokes(c, y, r0, r1, count, phase, P) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.push(pathOf([iso([c[0] + r0 * ca, y, c[2] + r0 * sa], P), iso([c[0] + r1 * ca, y, c[2] + r1 * sa], P)]));
  }
  return out.join("");
}

export const rtClamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const rtComma = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
