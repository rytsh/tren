import { param } from "./params";

/**
 * Araçların hat önizlemesindeki ölçüleri: hepsi cad/params.json'dan. Yerel eksen: x araç boyu
 * (araç merkezi 0). `pivots`, aracın ray eksenine oturduğu noktalardır:
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
  /** Montajda açık modellenen şarj kolu: önizlemede kapatılır. */
  arm?: { mesh: string; x: number; y: number; swing: number };
}

const DB = param("fork_pin_in");
const LOCO_REAR_PIN = param("cab_x0") + DB;
const TENDER_PIN = param("t_len") / 2 - DB;
const CAR_PIN = param("car_len") / 2 - param("dbc_pivot_in");
const CAR_PIV = param("car_bogie_x");

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
  "bd-040": { file: "lokomotif_montaj", cadCentreX: param("track_len") / 2, pivots: [-param("wheelbase") / 2, param("wheelbase") / 2], front: param("loco_len") / 2 /* önde bağlantı yok: tampon başı */, rear: LOCO_REAR_PIN, link: "fork" },
  "tender-160": { file: "tender_montaj", cadCentreX: param("track_len") / 2, pivots: [-param("wheelbase") / 2, param("wheelbase") / 2], front: TENDER_PIN, rear: -TENDER_PIN, link: "fork" },
  "yolcu-250": car250("yolcu250_montaj"),
  "sarj-250": car250("sarj250_montaj", { arm: { mesh: "SjArm", x: param("sj_px"), y: param("sj_py"), swing: param("sj_swing") } }),
  "enerji-250": car250("enerji250_montaj"),
  "ses-250": car250("ses250_montaj"),
  "gozlem-250": car250("gozlem250_montaj"),
  "radar-250": car250("radar250_montaj"),
};

export const vehicleOf = (id: string) => VEHICLES[id] ?? VEHICLES["yolcu-250"];

/** Arka arkaya iki aracı bağlayan çeki kolunun pim aralığı (öndekinin `rear` pimi → arkadakinin `front` pimi). */
export function linkGap(ahead: VehicleGeometry, behind: VehicleGeometry) {
  if (ahead.link === "pivot" && behind.link === "pivot") return param("dbc_L_car");
  if (ahead.link === "fork" && behind.link === "fork") return param("db_pitch");
  return param("dbc_L_tender");
}
