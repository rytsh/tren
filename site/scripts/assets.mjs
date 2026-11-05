import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAD = join(SITE, "..", "cad");
const OUT_PHOTOS = join(SITE, "public", "photos");
const OUT_MODELS = join(SITE, "public", "models");
const GEN = join(SITE, "src", "lib", "generated");

for (const dir of [OUT_PHOTOS, OUT_MODELS, GEN]) mkdirSync(dir, { recursive: true });

const PHOTOS = {
  "preserved-narrow-gauge-steam-engine-de-jhangeli": { id: "jhangeli", alt: "Lüksemburg'da korunan dar hat buharlı lokomotif De Jhangeli, kırmızı tamponlu siyah kazan, arkasında Niederpallen istasyon binası" },
  "locomotive-pour-voie-d-un-metre-construite": { id: "corpet-1878", crop: ["-crop", "1760x1380+60+170", "+repage"], alt: "Revue industrielle 1878: Corpet ve Bourdon'un metre hat lokomotifinin ölçülü yan kesit çizimi" },
  "treibrader-kuppelstangen-der-db-01-1063-braunschweig": { id: "db01-rods", alt: "DB 01 1063 lokomotifinin kırmızı tahrik tekerlekleri ve biyel kolları, Braunschweig" },
  "nice-neat-garden-railway-trackwork": { id: "garden-track", alt: "Çakıl balast içinde kıvrılan bahçe demiryolu rayı, çiçekli taş duvar kenarı" },
  "20160910-feldbahn-wiesloch-msgb-dampflok-29468815534": { id: "wiesloch", alt: "Wiesloch dekovil müzesinde önden görülen yeşil küçük buharlı lokomotif, bacadan duman çıkıyor" },
  "narrow-gauge-steam-locomotive-with-short-rounded": { id: "heritage-040t", alt: "Kısa yuvarlak su tanklı dar hat 0-4-0T buharlı lokomotif, yaklaşık 1920" },
  "henschel-feldbahn-dampflok-wien-33": { id: "henschel-wien33", crop: ["-gravity", "West", "-crop", "58%x100%+0+0", "+repage"], alt: "Henschel dekovil buharlı lokomotifi Wien 33 ve iki işçi, yaklaşık 1915" },
  "trainfest-2024-024-wisconsin-garden-railway-society": { id: "trainfest", alt: "Wisconsin Garden Railway Society Trainfest 2024'te halı üzerinde G ölçek bahçe treni düzeni" },
  "types-of-steam-locomotive-engraving": { id: "locomobiles", alt: "Gaudry, Machines à vapeur: on iki lokomobil tipinin gravürü" },
};

const credits = JSON.parse(readFileSync(join(SITE, "assets", "credits.json"), "utf8"));
const list = (Array.isArray(credits) ? credits : credits.items ?? []).filter((item) => item.media === "image");
const photos = [];
for (const item of list) {
  const file = join(SITE, item.file);
  const stem = basename(item.file).replace(/\.[^.]+$/, "");
  const meta = PHOTOS[stem];
  if (!meta || !existsSync(file)) continue;
  const sizes = [];
  for (const width of [800, 1600]) {
    const target = join(OUT_PHOTOS, `${meta.id}-${width}.webp`);
    if (!existsSync(target)) execFileSync("convert", [file, ...(meta.crop ?? []), "-resize", `${width}x${width * 2}>`, "-strip", "-quality", "80", target]);
    sizes.push(width);
  }
  const dims = execFileSync("identify", ["-format", "%w %h", join(OUT_PHOTOS, `${meta.id}-1600.webp`)], { encoding: "utf8" }).split(" ").map(Number);
  photos.push({
    id: meta.id,
    alt: meta.alt,
    src: `photos/${meta.id}-1600.webp`,
    srcset: sizes.map((w) => `photos/${meta.id}-${w}.webp ${w}w`).join(", "),
    width: dims[0],
    height: dims[1],
    title: item.title,
    creator: item.creator,
    license: item.license,
    licenseUrl: item.licenseUrl,
    page: item.page,
  });
}
writeFileSync(join(GEN, "photos.json"), JSON.stringify(photos, null, 1));

const models = [];
const stlDir = join(CAD, "out", "stl");
if (existsSync(stlDir)) {
  for (const name of readdirSync(stlDir).filter((f) => f.endsWith(".stl"))) {
    copyFileSync(join(stlDir, name), join(OUT_MODELS, name));
    models.push(name.replace(/\.stl$/, ""));
  }
}
for (const sub of ["3mf", "step"]) {
  const dir = join(CAD, "out", sub);
  if (!existsSync(dir)) continue;
  mkdirSync(join(OUT_MODELS, sub), { recursive: true });
  for (const name of readdirSync(dir)) copyFileSync(join(dir, name), join(OUT_MODELS, sub, name));
}
const manifest = join(CAD, "parts.json");
writeFileSync(join(GEN, "parts.json"), existsSync(manifest) ? readFileSync(manifest, "utf8") : JSON.stringify({ parts: [], hardware: [] }));
const params = JSON.parse(readFileSync(join(CAD, "params.json"), "utf8"));
writeFileSync(join(GEN, "params.json"), JSON.stringify(params, null, 1));
console.log(`photos ${photos.length}, models ${models.length}`);
