// T45 coupler model: sizes from docs/standart.md and cad/params.json, and the pure coupling sequence the page runs.
// Units are millimetres. Local car coordinates: x along the car (the coupling plane at x = 0 when coupled, the car
// body on −x), y across (+y is the head's right as seen from in front of its face), z up from the rail top.

export const DMAX = 30; // face gap when apart
export const BEAM = { face: -20, t: 4, z0: 34, z1: 50, half: 45, notchY: 13, notchZ: 46 }; // 20 mm coupler reach
export const DECK = { x0: -104, z0: 47, z1: 50, cutX: -62, cutY: -12 };
export const CARRIER = { x0: -61, x1: -20, half: 12, z0: 31, z1: 34 };
export const HANGER = { x0: -61, x1: -50, y0: -14, y1: -12, z0: 31, z1: 47 };
export const PIVOT = { x: -55, r: 1.6, head: 3, washer: 5 };
export const ARM = { z0: 34, z1: 39.5, half: 5, eye: 5 };
export const HEAD = { x0: -12, x1: 0, half: 18, z0: 25, z1: 51, cut: 9 };
export const UP_Z = 45.5; // cone and funnel axis
export const CONE = { y: 9, len: 7, base: 4.5, tip: 0.9 };
export const FUNNEL = { y: -9, mouth: 5.5, depth: 7.5, bottom: 2 };
export const MAGNET = { r: 5, t: 3, proud: 0.6 };
export const MOD = { y: 9, half: 3.2, z0: 27.2, z1: 38.4, depth: 9, bore: 7.6, boreR: 0.8 };
export const PINS = [36.61, 34.07, 31.53, 28.99]; // 2.54 mm pitch, pin 1 on top
export const LINES = ["BAT+", "CAN-H", "CAN-L", "GND"];
export const POGO = { rod: 0.45, collar: 0.75, collarT: 0.6, free: 1, travel: 1, spring: 3, coil: 0.62, turns: 5 };
export const LUG = { x0: -6, x1: 6, y0: 2, y1: 16, z0: 51, z1: 53.5 };
export const LOCK = { x: 3, y: 9, r: 1.5, head: 2.4, headT: 1.2, drop: 5 };
export const GLAND = { x0: -14, r: 3.6, z: 44 };
export const CORE = { r: 0.6, pitch: 1.35, z: 44, deck: 50.9 };
export const CLAMP = { x0: -19.5, x1: -15, half: 4.4, post: 3.6 };
export const NODE = { x0: -86, x1: -68.5, half: 11, z1: 58 };
export const TERMINAL = { x0: -68.5, x1: -66, half: 4.5, z1: 53 };
export const WHEEL = { x: -46, axle: 21, r: 21, flange: 23.5, back: 20, width: 7.5 };
export const BUFFER = { y: 30, z: 39, len: 8, stock: 5, head: 7, headT: 2 };
export const ARM_REACH = HEAD.x0 - PIVOT.x; // pivot to the head's back face, 43 mm
export const ALIGN = { offset: 1.6, start: CONE.len }; // the arriving head is off by 1.6 mm until the cone enters
export const MAGNET_REACH = 2.5; // inside this gap the magnets pull the faces shut

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const offsetAt = (gap) => ALIGN.offset * clamp01(gap / ALIGN.start);
export const compressionAt = (gap) => Math.max(0, Math.min(POGO.travel, POGO.free - gap));
export const contactsAt = (gap) => (gap <= POGO.free + 1e-6 ? 8 : 0);
export function phaseOf(gap, pinDown) {
  if (pinDown > 0.98) return "kilitli";
  if (gap <= POGO.free + 1e-6) return "temas";
  if (gap <= ALIGN.start) return "hizalanıyor";
  return "ayrık";
}
