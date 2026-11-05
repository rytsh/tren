import { existsSync, readFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("src/lib/generated/parts.json","utf8"));
const parts = manifest.parts;
const missing = [];
for(const p of parts) for(const ext of ["stl","3mf","step"]) {
  const path = `public/models/${ext === "stl" ? "" : `${ext}/`}${p.id}.${ext}`;
  if(!existsSync(path)) missing.push(path);
}
for(const image of ["locomotive","tender","car-yolcu","car-enerji","car-radar","car-sarj","car-ses","car-gozlem","part-wheel","part-track","part-bogie","part-boiler"]) if(!existsSync(`public/figures/${image}.svg`)) missing.push(`figures/${image}.svg`);
for(const name of ["worm-drive","track-joint","charging-station","coupler"]) for(const theme of ["","-light"]) if(!existsSync(`public/figures/${name}${theme}.html`)) missing.push(`figures/${name}${theme}.html`);
for(const name of ["lokomotif_montaj","tender_montaj","vagon_montaj"]) if(!existsSync(`public/models/3mf/${name}.3mf`)) missing.push(`models/3mf/${name}.3mf`);
if(missing.length) { console.error("Eksik dosyalar:",missing.join("\n")); process.exit(1); }
console.log(`${parts.length} parçanın STL/3MF/STEP dosyaları, üç 3MF montajı ve bütün Anatomy figürleri mevcut.`);
