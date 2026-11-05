import partsJson from "./generated/parts.json";
import type { PieceKind } from "./track";

export interface PrintedPart {
  id: string;
  name_tr: string;
  phase?: number | string;
  file?: { stl?: string; "3mf"?: string; step?: string };
  bbox_mm?: [number, number, number];
  volume_mm3?: number;
  mass_g_petg?: number;
  qty_per_loco?: number;
  qty_per_tender?: number;
  qty_per_coach?: number;
  qty_per_straight_track?: number;
  qty_by_model?: Record<string, number>;
  qty_per_curve_track?: number;
  /** İstasyon rayı başına (şarj istasyonu tutucusu). */
  qty_per_station?: number;
  notes_tr?: string;
}

export interface Hardware {
  id: string;
  name_tr: string;
  qty_per_loco?: number;
  qty_per_tender?: number;
  qty_per_coach?: number;
  qty_per_track_piece?: number;
  qty_by_model?: Record<string, number>;
  qty_per_station?: number;
  spec?: string;
}

const data = partsJson as unknown as { parts?: PrintedPart[]; hardware?: Hardware[] };
export const PARTS: PrintedPart[] = data.parts ?? [];
export const HARDWARE: Hardware[] = data.hardware ?? [];

/** Trendeki araç adetleri, model id'sine göre (catalog.ts). */
export type Consist = Record<string, number>;

/** Eski qty_per_* alanlarının hangi modele karşılık geldiği; yeni parçalar qty_by_model taşır. */
const LEGACY: Record<string, "qty_per_loco" | "qty_per_tender" | "qty_per_coach"> = { "bd-040": "qty_per_loco", "tender-160": "qty_per_tender", "yolcu-250": "qty_per_coach" };
type Counted = { qty_by_model?: Record<string, number>; qty_per_loco?: number; qty_per_tender?: number; qty_per_coach?: number };
export function vehicleQty(item: Counted, consist: Consist) {
  let total = 0;
  for (const [model, count] of Object.entries(consist)) {
    if (!count) continue;
    const per = item.qty_by_model && model in item.qty_by_model ? item.qty_by_model[model] : LEGACY[model] ? (item[LEGACY[model]] ?? 0) : 0;
    total += (per ?? 0) * count;
  }
  return total;
}

export interface Line {
  key: string;
  name: string;
  qty: number;
  massG: number;
  note?: string;
  file?: string;
  group: "ray" | "araç" | "satın alma";
}

const TRACK_PART: Record<PieceKind, string> = {
  straight: "ray_duz_200",
  station: "ray_duz_200",
  curveLeft: "ray_viraj_r750_15",
  curveRight: "ray_viraj_r750_15",
};

const FALLBACK_MASS: Record<string, number> = { ray_duz_200: 69, ray_viraj_r750_15: 71 };

export const FILAMENT_PRICE_PER_KG = 600;
export const SPOOL_G = 1000;

export function billOf(trackCounts: Record<PieceKind, number>, consist: Consist): Line[] {
  const byId = new Map(PARTS.map((p) => [p.id, p]));
  const lines: Line[] = [];
  const add = (key: string, qty: number, group: Line["group"], note?: string) => {
    if (qty <= 0) return;
    const part = byId.get(key);
    const unit = part?.mass_g_petg ?? FALLBACK_MASS[key] ?? 0;
    const existing = lines.find((l) => l.key === key);
    if (existing) {
      existing.qty += qty;
      existing.massG += unit * qty;
      return;
    }
    lines.push({ key, name: part?.name_tr ?? key, qty, massG: unit * qty, note: note ?? part?.notes_tr, file: part?.file?.stl, group });
  };
  for (const kind of Object.keys(trackCounts) as PieceKind[]) add(TRACK_PART[kind], trackCounts[kind], "ray");
  for (const part of PARTS) {
    if (part.id === "ray_duz_200" || part.id === "ray_viraj_r750_15") continue;
    add(part.id, (part.qty_per_station ?? 0) * trackCounts.station, "ray");
    add(part.id, vehicleQty(part, consist), "araç");
  }
  const pieces = Object.values(trackCounts).reduce((a, b) => a + b, 0);
  for (const hw of HARDWARE) {
    const qty = vehicleQty(hw, consist) + (hw.qty_per_track_piece ?? 0) * pieces + (hw.qty_per_station ?? 0) * trackCounts.station;
    if (qty > 0) lines.push({ key: hw.id, name: hw.name_tr, qty, massG: 0, note: hw.spec, group: "satın alma" });
  }
  return lines;
}

export function filament(lines: Line[]) {
  const grams = lines.reduce((s, l) => s + l.massG, 0);
  const withWaste = grams * 1.08;
  return {
    grams,
    withWaste,
    spools: Math.ceil(withWaste / SPOOL_G),
    cost: (withWaste / 1000) * FILAMENT_PRICE_PER_KG,
  };
}

export const tr = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
export const tr0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
