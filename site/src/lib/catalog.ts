import { PARTS, type PrintedPart } from "./bom";

export type ModelId = "bd-040" | "tender-160" | "yolcu-250" | "enerji-250" | "radar-250" | "sarj-250" | "ses-250" | "gozlem-250";
export type Family = "Lokomotif" | "Tender" | "Vagon";
/** TrenBus rolü: hatta güç verir mi, alır mı (docs/standart.md §3). */
export type BusRole = "besler" | "tüketir" | "ayrı devre";

export interface Model {
  id: ModelId;
  name: string;
  family: Family;
  kind: string;
  image: string;
  length: number;
  width: number;
  /** cad/out/3mf altındaki inceleme montajı; yoksa 3D sekmesi kapalıdır. */
  assembly?: string;
  /** Eski adet alanı (qty_per_*) — yeni modellerde parts.json qty_by_model kullanılır. */
  quantity?: "qty_per_loco" | "qty_per_tender" | "qty_per_coach";
  description: string;
  notes: string[];
  featured: string[];
  bus: BusRole;
  /** Vagonun TrenBus üzerinden yaptığı işler. */
  functions: { name: string; detail: string }[];
  /** Işık açılınca çizimde yanan şeyler. */
  lights: string;
  anatomy?: string;
}

const COMMON_CAR = ["tekerlek_test_d42", "vagon_boji", "kuplor_kafa", "vagon_platform_250"];

export const MODELS: Model[] = [
  { id: "bd-040", name: "BD 0-4-0", family: "Lokomotif", kind: "Lokomotif", image: "locomotive", length: 300, width: 95, assembly: "lokomotif_montaj", quantity: "qty_per_loco", description: "Klasik Avrupa silueti, kırmızı tekerlekler. Bataryalı 0-4-0 lokomotif; trenin CAN yöneticisi.", notes: ["45 mm hat açıklığı", "30:1 sonsuz vida", "Sökülebilir kazan ve kabin"], featured: ["tekerlek_test_d42", "sasi_motorlu_040", "lok_kazan", "lok_kabin", "sonsuz_vida_m1"], bus: "besler", functions: [{ name: "Çekiş", detail: "RS-370 motor, 30:1 sonsuz vida" }, { name: "Yönetici", detail: "hız, yön ve komutları CAN'e yayınlar" }, { name: "Fener", detail: "5 mm LED, Ø10 lens" }], lights: "ön fener", anatomy: "worm-drive" },
  { id: "tender-160", name: "Tender 160", family: "Tender", kind: "Tender", image: "tender", length: 160, width: 90, assembly: "tender_montaj", quantity: "qty_per_tender", description: "Kömürlük görünümünün altında ana 2S pil paketi. Kaldırılabilir kapak, iki uçta kuplör.", notes: ["160 mm gövde", "2S pil için hacim", "Sökülebilir üst kapak"], featured: ["tekerlek_test_d42", "tender_sasi", "tender_platform", "tender_depo", "tender_kapak"], bus: "besler", functions: [{ name: "Ana pil", detail: "2S Li-ion, 7,4 V nominal" }, { name: "BAT+ besleme", detail: "ideal diyot + akım sınırı ile hatta" }], lights: "—" },
  { id: "yolcu-250", anatomy: "coupler", name: "Yolcu 250", family: "Vagon", kind: "Yolcu vagonu", image: "car-yolcu", length: 250, width: 90, description: "Sekiz pencere, iki kapı, çatı altında sıcak beyaz LED şerit. Standart 250 mm şasinin temel vagonu.", notes: ["250 × 90 mm şasi", "8 pencere, şeffaf pencere bandı", "Çatı altı LED şerit"], featured: [...COMMON_CAR, "yolcu_govde", "yolcu_cati"], bus: "tüketir", functions: [{ name: "İç aydınlatma", detail: "LED şerit, CAN ile aç/kapa ve parlaklık" }, { name: "Kuyruk lambaları", detail: "son araçsa kırmızı" }], lights: "pencereler ve kuyruk lambaları" },
  { id: "enerji-250", anatomy: "coupler", name: "Enerji 250", family: "Vagon", kind: "Enerji vagonu", image: "car-enerji", length: 250, width: 90, description: "Kapalı yük vagonu görünümünde ek 2S paket ve BMS. Yan kapakta beş kademeli gerilim göstergesi.", notes: ["Ek 2S paket + BMS bölmesi", "Panjur ızgaraları", "Çatıda servis kapağı"], featured: [...COMMON_CAR, "enerji_govde", "enerji_cati"], bus: "besler", functions: [{ name: "Ek pil", detail: "hatta ikinci besleyici, ideal diyot ile" }, { name: "Gösterge", detail: "pil seviyesi, CAN'e telemetri" }], lights: "gerilim göstergesi" },
  { id: "radar-250", anatomy: "coupler", name: "Radar 250", family: "Vagon", kind: "Radar vagonu", image: "car-radar", length: 250, width: 90, description: "Kısa kabin ve açık platform. Dönen tabla üstünde çanak anten; kabin çatısında uyarı lambası.", notes: ["Ø60 dönen tabla, N20 dişli motor", "Ayrı basılan çanak anten", "Toplam yükseklik ≤ 160 mm"], featured: [...COMMON_CAR, "radar_tabla", "radar_anten"], bus: "tüketir", functions: [{ name: "Dönen anten", detail: "N20 motor, sınırlı ya da sürekli dönüş" }, { name: "Mesafe sensörü", detail: "önündeki engeli CAN'e bildirir (öneri)" }, { name: "Uyarı lambası", detail: "dönerken yanıp söner" }], lights: "uyarı lambası ve kabin" },
  { id: "sarj-250", anatomy: "coupler", name: "Şarj 250", family: "Vagon", kind: "Şarj vagonu", image: "car-sarj", length: 250, width: 90, description: "Alçak kasa; altında istasyona basan yaylı pabuçlar, yanında şarj durumu ışık çubuğu.", notes: ["İki yaylı şarj pabucu", "12 kademeli ışık çubuğu", "Çatıda katlanır şarj kolu"], featured: [...COMMON_CAR, "sarj_govde", "sarj_pabuc"], bus: "ayrı devre", functions: [{ name: "İstasyon şarjı", detail: "kendi pabuçları ve şarj devresi; kuplör pinlerinden şarj akımı geçmez" }, { name: "Durum çubuğu", detail: "şarj seviyesini gösterir, CAN'e telemetri" }], lights: "şarj durumu çubuğu" },
  { id: "ses-250", anatomy: "coupler", name: "Ses 250", family: "Vagon", kind: "Ses vagonu", image: "car-ses", length: 250, width: 90, description: "Posta/bagaj vagonu görünümü; iki yanda 40 mm hoparlör, çatıda düdük borusu.", notes: ["2 × 40 mm hoparlör yuvası", "İçte amfi kartı cebi", "Kayar kapılar"], featured: [...COMMON_CAR, "ses_govde", "ses_cati"], bus: "tüketir", functions: [{ name: "Düdük ve buhar sesi", detail: "hıza bağlı, lokomotif komutuyla" }, { name: "Anons", detail: "istasyona yaklaşınca (öneri)" }], lights: "hoparlör halkaları ve posta penceresi" },
  { id: "gozlem-250", anatomy: "coupler", name: "Gözlem 250", family: "Vagon", kind: "Gözlem vagonu", image: "car-gozlem", length: 250, width: 90, description: "Geniş pencereler, çatıda camlı kubbe ve kamera; arkada korkuluklu balkon. Trenin son vagonu.", notes: ["Camlı gözlem kubbesi", "Kamera yuvası", "Balkon ve fener"], featured: [...COMMON_CAR, "gozlem_govde", "gozlem_kubbe"], bus: "tüketir", functions: [{ name: "Kamera", detail: "hat görüntüsü (öneri, Wi-Fi ayrı)" }, { name: "Kuyruk feneri", detail: "son araç işareti" }, { name: "İç ışık", detail: "kubbe ve pencereler" }], lights: "kubbe, pencereler ve balkon feneri" },
];

const ALIAS: Record<string, ModelId> = { "coach-220": "yolcu-250" };

export function modelById(id?: string): Model {
  const key = (id && ALIAS[id]) || id;
  return MODELS.find((m) => m.id === key) ?? MODELS[0];
}

type WithModelQty = PrintedPart & { qty_by_model?: Record<string, number> };
export function qtyOf(part: PrintedPart, id: string) {
  const m = modelById(id);
  const byModel = (part as WithModelQty).qty_by_model;
  if (byModel && m.id in byModel) return byModel[m.id] ?? 0;
  return m.quantity ? (part[m.quantity] ?? 0) : 0;
}
export function modelParts(id: string) { return PARTS.filter((p) => qtyOf(p, id) > 0); }
export function partCount(id: string) { return modelParts(id).reduce((s, p) => s + qtyOf(p, id), 0); }
/** CAD dosyaları üretilmiş mi: parça listesinde en az bir parça varsa evet. */
export function hasCad(id: string) { return modelParts(id).length > 0; }

export function partImage(id: string) {
  if (id.includes("tekerlek")) return "part-wheel";
  if (id.startsWith("ray")) return "part-track";
  if (id.includes("kazan") || id.includes("baca") || id.includes("dom")) return "part-boiler";
  if (id.includes("boji") || id.includes("sasi")) return "part-bogie";
  return null;
}
