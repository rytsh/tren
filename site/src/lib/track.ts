import { CURVE_ARC, CURVE_DEG, RADIUS, STRAIGHT } from "./params";

export type PieceKind = "straight" | "curveLeft" | "curveRight" | "station";

export interface Pose {
  x: number;
  y: number;
  heading: number;
}

export interface Piece {
  id: number;
  kind: PieceKind;
  start: Pose;
}

export interface Layout {
  name: string;
  pieces: Piece[];
}

export const KIND_LABEL: Record<PieceKind, string> = {
  straight: "Düz ray 200 mm",
  curveLeft: "Viraj R750 15° sol",
  curveRight: "Viraj R750 15° sağ",
  station: "İstasyon rayı 200 mm",
};

const TURN = (CURVE_DEG * Math.PI) / 180;

export function lengthOf(kind: PieceKind): number {
  return kind === "curveLeft" || kind === "curveRight" ? CURVE_ARC : STRAIGHT;
}

export function endOf(kind: PieceKind, start: Pose): Pose {
  const { x, y, heading } = start;
  if (kind === "straight" || kind === "station") {
    return { x: x + Math.cos(heading) * STRAIGHT, y: y + Math.sin(heading) * STRAIGHT, heading };
  }
  const side = kind === "curveLeft" ? 1 : -1;
  const cx = x - Math.sin(heading) * RADIUS * side;
  const cy = y + Math.cos(heading) * RADIUS * side;
  const next = heading + TURN * side;
  return {
    x: cx + Math.sin(next) * RADIUS * side,
    y: cy - Math.cos(next) * RADIUS * side,
    heading: next,
  };
}

export function pointAlong(piece: Piece, t: number): Pose {
  const { kind, start } = piece;
  if (kind === "straight" || kind === "station") {
    return {
      x: start.x + Math.cos(start.heading) * STRAIGHT * t,
      y: start.y + Math.sin(start.heading) * STRAIGHT * t,
      heading: start.heading,
    };
  }
  const side = kind === "curveLeft" ? 1 : -1;
  const cx = start.x - Math.sin(start.heading) * RADIUS * side;
  const cy = start.y + Math.cos(start.heading) * RADIUS * side;
  const h = start.heading + TURN * side * t;
  return { x: cx + Math.sin(h) * RADIUS * side, y: cy - Math.cos(h) * RADIUS * side, heading: h };
}

export function rebuild(kinds: PieceKind[], origin: Pose = { x: 0, y: 0, heading: 0 }): Piece[] {
  const pieces: Piece[] = [];
  let pose = origin;
  kinds.forEach((kind, id) => {
    pieces.push({ id, kind, start: pose });
    pose = endOf(kind, pose);
  });
  return pieces;
}

export function endPose(pieces: Piece[]): Pose {
  if (!pieces.length) return { x: 0, y: 0, heading: 0 };
  const last = pieces[pieces.length - 1];
  return endOf(last.kind, last.start);
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface Closure {
  closed: boolean;
  gap: number;
  angle: number;
}

export function closure(pieces: Piece[]): Closure {
  if (pieces.length < 3) return { closed: false, gap: Infinity, angle: Infinity };
  const end = endPose(pieces);
  const start = pieces[0].start;
  const gap = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = Math.abs(wrapAngle(end.heading - start.heading));
  return { closed: gap < 1 && angle < 0.002, gap, angle: (angle * 180) / Math.PI };
}

export function totalLength(pieces: Piece[]): number {
  return pieces.reduce((sum, p) => sum + lengthOf(p.kind), 0);
}

export function counts(pieces: Piece[]): Record<PieceKind, number> {
  const out: Record<PieceKind, number> = { straight: 0, curveLeft: 0, curveRight: 0, station: 0 };
  for (const p of pieces) out[p.kind]++;
  return out;
}

export function bounds(pieces: Piece[]) {
  let minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0;
  for (const p of pieces) {
    for (let i = 0; i <= 8; i++) {
      const q = pointAlong(p, i / 8);
      minX = Math.min(minX, q.x);
      maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY };
}

const oval = (straights: number): PieceKind[] => {
  const half: PieceKind[] = Array(12).fill("curveLeft");
  const run: PieceKind[] = Array(straights).fill("straight");
  return [...run, ...half, ...run, ...half];
};

export const PRESETS: { id: string; name: string; note: string; kinds: PieceKind[] }[] = [
  { id: "circle", name: "Daire", note: "24 viraj, Ø1,5 m. En küçük kapalı hat.", kinds: Array(24).fill("curveLeft") },
  {
    id: "oval",
    name: "Oval",
    note: "24 viraj, 8 düz, 1 istasyon. Balkon veya teras için.",
    kinds: (() => {
      const k = oval(4);
      k.splice(2, 1, "station");
      return k;
    })(),
  },
  {
    id: "long",
    name: "Uzun oval",
    note: "24 viraj, 20 düz. Çimin kenarı boyunca uzun bir tur.",
    kinds: (() => {
      const k = oval(10);
      k.splice(5, 1, "station");
      return k;
    })(),
  },
  {
    id: "bean",
    name: "Fasulye",
    note: "Ters virajlı S geçişleri olan uzun tur. Yön değişimlerini dener.",
    kinds: (() => {
      const half: PieceKind[] = [
        ...Array(3).fill("straight"),
        ...Array(8).fill("curveLeft"),
        ...Array(4).fill("curveRight"),
        ...Array(8).fill("curveLeft"),
      ];
      const k = [...half, ...half];
      k.splice(1, 1, "station");
      return k;
    })(),
  },
];

export function encode(kinds: PieceKind[]): string {
  const code: Record<PieceKind, string> = { straight: "S", curveLeft: "L", curveRight: "R", station: "T" };
  return kinds.map((k) => code[k]).join("");
}

export function decode(text: string): PieceKind[] {
  const map: Record<string, PieceKind> = { S: "straight", L: "curveLeft", R: "curveRight", T: "station" };
  return [...text.toUpperCase()].slice(0,500).map((c) => map[c]).filter(Boolean);
}
