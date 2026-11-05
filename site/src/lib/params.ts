import paramsJson from "./generated/params.json";

type Group = Record<string, [number | string, string]>;
const raw = paramsJson as unknown as Record<string, Group | string> & { _values?: Record<string, number> };

/** Bir parametrenin sayısal değeri; türetilmiş (ifade) parametreler assets.mjs'te çözülür. */
export function param(name: string): number {
  const solved = raw._values?.[name];
  if (typeof solved === "number") return solved;
  for (const [key, group] of Object.entries(raw)) {
    if (key.startsWith("_") || typeof group !== "object") continue;
    const entry = (group as Group)[name];
    if (entry && typeof entry[0] === "number") return entry[0];
  }
  throw new Error(`parametre yok: ${name}`);
}

export const GAUGE = param("track_gauge");
export const STRAIGHT = param("track_len");
export const RADIUS = param("curve_radius");
export const CURVE_DEG = param("curve_angle");
export const TIE_LEN = param("tie_len");
export const TIE_PITCH = param("tie_pitch");
export const RAIL_HEAD = param("rail_head_w");
export const RAIL_CENTRE = GAUGE / 2 + RAIL_HEAD / 2;
export const WHEEL_D = param("wheel_d");
export const WHEELBASE = param("wheelbase");
export const CURVE_ARC = (RADIUS * Math.PI * CURVE_DEG) / 180;
