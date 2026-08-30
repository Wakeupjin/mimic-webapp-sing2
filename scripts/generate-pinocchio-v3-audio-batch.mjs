#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function fail(message) {
  throw new Error(message);
}

function range(value) {
  if (value === "all") return Array.from({ length: 12 }, (_, index) => index + 1);
  const chapters = value.split(",").flatMap((part) => {
    const match = /^(\d+)-(\d+)$/.exec(part);
    if (!match) return [Number(part)];
    const from = Number(match[1]);
    const to = Number(match[2]);
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  });
  if (chapters.some((chapter) => !Number.isInteger(chapter) || chapter < 1 || chapter > 12)) {
    fail("Use --chapters=all, a comma list, or an inclusive range inside 1–12.");
  }
  return [...new Set(chapters)];
}

function readProduction(chapter, level) {
  const chapterRoot = path.join(
    root,
    "content-packs/pinocchio/v3/chapters",
    `chapter-${String(chapter).padStart(2, "0")}`,
  );
  const chapterRecord = JSON.parse(readFileSync(path.join(chapterRoot, "chapter.json"), "utf8"));
  const productionReference = chapterRecord.levels?.[level]?.production;
  if (!productionReference) fail(`Chapter ${chapter} ${level} is not authored.`);
  return JSON.parse(readFileSync(path.join(chapterRoot, productionReference), "utf8"));
}

function cachedActState(chapter, level, production) {
  const partsRoot = path.join(
    root,
    "content-packs/pinocchio/v3/chapters",
    `chapter-${String(chapter).padStart(2, "0")}`,
    "audio/parts",
  );
  const completeActIds = [];
  const missingActIds = [];
  for (const act of production.generation?.actPlan ?? []) {
    const files = [
      path.join(partsRoot, `${level}.${act.actId}.mp3`),
      path.join(partsRoot, `${level}.${act.actId}.alignment.json`),
      path.join(partsRoot, `${level}.${act.actId}.request.json`),
    ];
    const count = files.filter(existsSync).length;
    if (count === 3) completeActIds.push(act.actId);
    else if (count === 0) missingActIds.push(act.actId);
    else fail(`Chapter ${chapter} ${level} ${act.actId} has incomplete paid artifacts; inspect before batch generation.`);
  }
  return { completeActIds, missingActIds };
}

function generator(args) {
  const output = execFileSync(
    process.execPath,
    [path.join(root, "scripts/generate-story-pack-golden-audio.mjs"), ...args],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const start = output.lastIndexOf("\n{");
  return JSON.parse((start >= 0 ? output.slice(start + 1) : output).trim());
}

const mode = argument("mode", "estimate");
const chapters = range(argument("chapters", "all"));
const levels = argument("levels", "core").split(",").filter(Boolean);
const skipExisting = argument("skip-existing", "yes") === "yes";
const confirmation = argument("confirm-batch");
const maximumCharacters = Number(argument("max-billed-characters", "0"));
const envFile = argument("env-file");

if (!new Set(["estimate", "generate"]).has(mode)) fail("Use --mode=estimate or --mode=generate.");
if (levels.some((level) => !new Set(["foundation", "core", "studio"]).has(level))) {
  fail("Levels must be foundation, core, or studio.");
}

const jobs = [];
for (const chapter of chapters) {
  for (const level of levels) {
    const production = readProduction(chapter, level);
    if (skipExisting && production.status !== "audio-not-generated") {
      jobs.push({ chapter, level, status: "existing-master-skipped", billedCharactersEstimate: 0 });
      continue;
    }
    const estimate = generator([
      "--mode=estimate",
      `--chapter=${chapter}`,
      `--level=${level}`,
    ]);
    const cache = cachedActState(chapter, level, production);
    const missingCharacters = estimate.acts
      .filter((act) => cache.missingActIds.includes(act.actId))
      .reduce((total, act) => total + act.characters, 0);
    const executionMode = cache.completeActIds.length === 0
      ? "fresh-paid-generation"
      : cache.missingActIds.length === 0
        ? "offline-cache-rebuild"
        : "continue-paid-generation";
    jobs.push({
      chapter,
      level,
      status: "ready",
      ...estimate,
      ...cache,
      executionMode,
      billedCharactersEstimate: missingCharacters,
      ttsApiListPriceEstimateUsd: Number(((missingCharacters / 1000) * 0.1).toFixed(3)),
    });
  }
}

const billedCharactersEstimate = jobs.reduce(
  (total, job) => total + (job.billedCharactersEstimate ?? 0),
  0,
);
const listPriceEstimateUsd = Number(
  jobs.reduce((total, job) => total + (job.ttsApiListPriceEstimateUsd ?? 0), 0).toFixed(3),
);
const report = {
  mode,
  narrator: { name: "Lily", voiceId: "pFZP5JQG7iQjIQuC4Bku", accent: "British English" },
  chapters,
  levels,
  jobCount: jobs.length,
  newGenerationJobs: jobs.filter((job) => job.status === "ready").length,
  existingMastersSkipped: jobs.filter((job) => job.status === "existing-master-skipped").length,
  billedCharactersEstimate,
  ttsApiListPriceEstimateUsd: listPriceEstimateUsd,
  jobs: jobs.map((job) => ({
    chapter: job.chapter,
    level: job.level,
    status: job.status,
    executionMode: job.executionMode ?? null,
    sentences: job.master?.sentences ?? null,
    words: job.master?.words ?? null,
    billedCharactersEstimate: job.billedCharactersEstimate,
    ttsApiListPriceEstimateUsd: job.ttsApiListPriceEstimateUsd ?? 0,
  })),
};

if (mode === "estimate") {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (confirmation !== "PINOCCHIO-LILY-BATCH") {
  fail("Paid batch generation is locked. Pass --confirm-batch=PINOCCHIO-LILY-BATCH.");
}
if (!Number.isFinite(maximumCharacters) || maximumCharacters <= 0) {
  fail("Paid batch generation requires a positive --max-billed-characters cap.");
}
if (billedCharactersEstimate > maximumCharacters) {
  fail(`Estimated ${billedCharactersEstimate} billed characters exceed the approved cap ${maximumCharacters}.`);
}

for (const job of jobs.filter((candidate) => candidate.status === "ready")) {
  const args = [
    "--mode=generate",
    `--chapter=${job.chapter}`,
    `--level=${job.level}`,
    "--confirm-commercial-paid-plan=yes",
    "--confirm-golden-script=yes",
    "--allow-alignment-fallback=yes",
  ];
  if (job.executionMode === "offline-cache-rebuild") args.push("--resume=yes");
  if (job.executionMode === "continue-paid-generation") args.push("--continue-paid-generation=yes");
  if (envFile) args.push(`--env-file=${envFile}`);
  generator(args);
  console.log(`Generated Chapter ${job.chapter} ${job.level}.`);
}

console.log(JSON.stringify({ ...report, mode: "generate", completed: true }, null, 2));
