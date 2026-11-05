import { param } from "./params";

/**
 * Araçların hat önizlemesindeki ölçüleri: hepsi cad/params.json'dan. Yerel eksen: x araç boyu
 * (araç merkezi 0), yükseklik zeminden. `pivots`, aracın ray eksenine oturduğu noktalardır:
 * 0-4-0 için iki dingil, bojili vagon için iki boji pivotu. `front`/`rear` çeki kolu pimleridir:
 * lokomotif/tender çatal pimi ya da 250 vagonun platform altındaki pivotu. Araçlar arası
 * mesafe kol boyundan gelir (linkGap).
 */
export interface VehicleGeometry {
  /** CAD montaj 3MF'i (cad/out/3mf). */
  file: string;
  /** 3MF dünya koordinatındaki araç merkezi X (montaj ray modülü üstünde kurulur). */
  cadCentreX: number;
  pivots: [number, number];
  front: number;
  rear: number;
  /** Pim türü: lokomotif/tender çeki çatalı veya 250 vagon pivotu. */
  link: "fork" | "pivot";
  /** Gövdesi henüz modellenmemiş 250 vagon için ölçülü taslak gövde. */
  sketch?: CarSketch;
  /** Montajda açık modellenen şarj kolu: önizlemede kapatılır. */
  arm?: { mesh: string; x: number; y: number; swing: number };
  /** Montaj dosyası henüz üretilmemişse kullanılan yedek. */
  fallback?: string;
}

export interface CarSketch {
  /** Gövde kabuğu boyu ve genişliği. */
  length: number;
  width: number;
  /** Kasa tabanı, duvar üstü ve çatı tepesi, ray üstünden. */
  floor: number;
  wall: number;
  crown: number;
  colour: number;
  /** Radar kabini gibi kısa gövde: [x0, x1]. */
  span?: [number, number];
  extras?: SketchExtra[];
}

export type SketchExtra =
  | { kind: "cylinder"; x: number; y: number; z0: number; z1: number; r: number; colour: number }
  | { kind: "box"; x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; colour: number };

const AXLE_H = param("axle_h");
/** Yükseklik zeminden (travers altı = sahne y = 0); aks eksenine göre CAD değerinden. */
const z = (axleZ: number) => axleZ + AXLE_H + param("tie_t") + param("rail_h");
const DB = param("fork_pin_in");
const LOCO_REAR_PIN = param("cab_x0") + DB;
const TENDER_PIN = param("t_len") / 2 - DB;
const CAR_PIN = param("car_len") / 2 - param("dbc_pivot_in");
const CAR_PIV = param("car_bogie_x");
const BODY_L = param("car_body_l");
const BODY_W = param("car_body_w");
const FLOOR = z(param("fp_z") + param("fp_t"));

const sketch = (wall: string, crown: string, colour: number, more: Partial<CarSketch> = {}): CarSketch => ({
  length: BODY_L,
  width: BODY_W,
  floor: FLOOR,
  wall: z(param(wall)),
  crown: z(param(crown)),
  colour,
  ...more,
});

const car250 = (file: string, more: Partial<VehicleGeometry> = {}): VehicleGeometry => ({
  file,
  cadCentreX: param("track_len"),
  pivots: [-CAR_PIV, CAR_PIV],
  front: CAR_PIN,
  rear: -CAR_PIN,
  link: "pivot",
  ...more,
});

export const VEHICLES: Record<string, VehicleGeometry> = {
  "bd-040": { file: "lokomotif_montaj", cadCentreX: param("track_len") / 2, pivots: [-param("wheelbase") / 2, param("wheelbase") / 2], front: param("loco_len") / 2, rear: LOCO_REAR_PIN, link: "fork" },
  "tender-160": { file: "tender_montaj", cadCentreX: param("track_len") / 2, pivots: [-param("wheelbase") / 2, param("wheelbase") / 2], front: TENDER_PIN, rear: -TENDER_PIN, link: "fork" },
  "yolcu-250": car250("sasi250_montaj", { sketch: sketch("y5_wall_top", "y5_crown", 0x2f5a2a) }),
  "sarj-250": car250("sarj250_montaj", { arm: { mesh: "SjArm", x: param("sj_px"), y: param("sj_py"), swing: param("sj_swing") } }),
  "enerji-250": car250("sasi250_montaj", { sketch: sketch("en_wall_top", "en_crown", 0x6f7f5c) }),
  "ses-250": car250("sasi250_montaj", { sketch: sketch("ss_wall_top", "ss_crown", 0x7a4f3a, { extras: [{ kind: "cylinder", x: -10, y: 0, z0: z(param("ss_crown")) - 2, z1: z(param("ss_crown")) + 10, r: 4, colour: 0xd8b000 }] }) }),
  "gozlem-250": car250("sasi250_montaj", {
    sketch: sketch("gz_wall_top", "gz_crown", 0x3f5a73, {
      span: [param("gz_x0"), BODY_L / 2],
      extras: [{ kind: "box", x0: param("gz_dome_x") - param("gz_dome_l"), x1: param("gz_dome_x") + param("gz_dome_l"), y0: -param("gz_dome_w"), y1: param("gz_dome_w"), z0: z(param("gz_crown")) - 4, z1: z(param("gz_dome_top")), colour: 0xbcd3dc }],
    }),
  }),
  "radar-250": car250("sasi250_montaj", {
    sketch: sketch("rd_wall_top", "rd_crown", 0x8c3a2e, {
      span: [-BODY_L / 2, param("rd_cab_x1")],
      extras: [
        { kind: "cylinder", x: param("rd_x"), y: 0, z0: FLOOR, z1: z(param("rd_plate_top")) + 6, r: param("rd_tab_d") / 2, colour: 0xd8b000 },
        { kind: "cylinder", x: param("rd_x"), y: 0, z0: z(param("rd_plate_top")) + 6, z1: z(param("rd_dish_pin_z")), r: 3, colour: 0x6e6448 },
        { kind: "cylinder", x: param("rd_x"), y: 0, z0: z(param("rd_dish_pin_z")) - 2, z1: z(param("rd_dish_pin_z")) + 6, r: param("rd_dish_d") / 2, colour: 0xece3c6 },
      ],
    }),
  }),
};

export const vehicleOf = (id: string) => VEHICLES[id] ?? VEHICLES["yolcu-250"];

/** Arka arkaya iki aracı bağlayan çeki kolunun pim aralığı (öndekinin `rear` pimi → arkadakinin `front` pimi). */
export function linkGap(ahead: VehicleGeometry, behind: VehicleGeometry) {
  if (ahead.link === "pivot" && behind.link === "pivot") return param("dbc_L_car");
  if (ahead.link === "fork" && behind.link === "fork") return param("db_pitch");
  return param("dbc_L_tender");
}
