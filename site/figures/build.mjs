// Builds every Anatomy figure into public/figures (called by `pnpm figures`).
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const id of ["worm-drive", "track-joint", "charging-station", "coupler", "catalog"]) {
  const run = spawnSync(process.execPath, [join(HERE, id, "build.mjs"), ...process.argv.slice(2)], { stdio: "inherit" });
  if (run.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
