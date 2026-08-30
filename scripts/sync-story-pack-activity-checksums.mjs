#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(repositoryRoot, "content-packs", "pinocchio", "v3");
const chaptersRoot = path.join(packRoot, "chapters");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const chapterDirectories = (await readdir(chaptersRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^chapter-\d{2}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

let updatedLevels = 0;
for (const chapterDirectory of chapterDirectories) {
  const chapterRoot = path.join(chaptersRoot, chapterDirectory);
  const chapter = JSON.parse(await readFile(path.join(chapterRoot, "chapter.json"), "utf8"));
  for (const [levelId, level] of Object.entries(chapter.levels ?? {})) {
    if (!(level.activities && level.production && level.qa)) continue;
    const activitiesPath = path.join(chapterRoot, level.activities);
    const productionPath = path.join(chapterRoot, level.production);
    const qaPath = path.join(chapterRoot, level.qa);
    const activitiesFileText = await readFile(activitiesPath, "utf8");
    const checksum = sha256(activitiesFileText);
    const production = JSON.parse(await readFile(productionPath, "utf8"));
    const qa = JSON.parse(await readFile(qaPath, "utf8"));

    production.generation ??= {};
    production.generation.activitiesChecksum = `sha256:${checksum}`;
    qa.metrics ??= {};
    qa.metrics.activitiesSha256 = checksum;

    await writeFile(productionPath, `${JSON.stringify(production, null, 2)}\n`);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    updatedLevels += 1;
    console.log(`${chapter.chapterId}/${levelId}: ${checksum}`);
  }
}

console.log(`Synchronized ${updatedLevels} authored level activity checksums.`);
