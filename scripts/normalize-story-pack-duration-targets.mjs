import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packRoot = resolve(process.argv[2] ?? "content-packs/pinocchio/v3");
const chaptersRoot = resolve(packRoot, "chapters");

const chapterNames = readdirSync(chaptersRoot)
  .filter((name) => /^chapter-\d{2}$/.test(name))
  .sort();

let updated = 0;
for (const chapterName of chapterNames) {
  for (const level of ["foundation", "core", "studio"]) {
    const productionPath = resolve(chaptersRoot, chapterName, "levels", level, "production.json");
    const production = JSON.parse(readFileSync(productionPath, "utf8"));
    const previousRange =
      production.targets.preferredGoldenRangeSeconds ?? production.targets.acceptedGoldenRangeSeconds;

    production.targets.preferredGoldenRangeSeconds = previousRange;
    production.targets.acceptedGoldenRangeSeconds = [360, 600];
    production.targets.durationPolicy =
      "Six to ten minutes is the acceptance window; eight minutes is the editorial target, never a reason to trim a natural performance.";

    writeFileSync(productionPath, `${JSON.stringify(production, null, 2)}\n`);
    updated += 1;
  }
}

console.log(`Normalised duration policy for ${updated} authored level productions.`);
