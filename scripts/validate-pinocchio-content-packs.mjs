import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v1");
const manifestPath = path.join(packRoot, "manifest.json");
const levelIds = ["foundation", "core", "studio"];

function fail(message) {
  throw new Error(message);
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withoutChecksum(value) {
  const { checksum: _checksum, ...core } = value;
  return core;
}

async function pngSize(filePath) {
  const file = await readFile(filePath);
  if (file.length < 24 || file.toString("ascii", 1, 4) !== "PNG") {
    fail(`${path.relative(root, filePath)} is not a readable PNG.`);
  }
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (checksum(withoutChecksum(manifest)) !== manifest.checksum) fail("Manifest checksum mismatch.");
if (manifest.chapters.length !== 12) fail("Manifest must contain exactly 12 chapters.");

const totals = {
  lines: 0,
  words: 0,
  characters: 0,
  guess: 0,
  word: 0,
  retell: 0,
  beats: 0,
  images: 0,
};

for (const [index, entry] of manifest.chapters.entries()) {
  const number = index + 1;
  if (entry.number !== number) fail(`Expected chapter ${number} in manifest order.`);
  const packPath = path.join(packRoot, entry.path);
  const pack = JSON.parse(await readFile(packPath, "utf8"));
  if (checksum(withoutChecksum(pack)) !== pack.checksum) fail(`Chapter ${number} checksum mismatch.`);
  if (entry.checksum !== pack.checksum) fail(`Chapter ${number} manifest checksum mismatch.`);
  if (pack.status !== "content-ready-audio-pending") fail(`Chapter ${number} has an unexpected status.`);
  if (pack.story.chapter !== number) fail(`Chapter ${number} story number mismatch.`);
  if (pack.livingStorybook.beats.length !== 6) fail(`Chapter ${number} must have six beats.`);
  totals.beats += pack.livingStorybook.beats.length;

  const imagePath = path.resolve(path.dirname(packPath), pack.livingStorybook.panorama);
  await stat(imagePath);
  const { width, height } = await pngSize(imagePath);
  if (width < 1600 || height < 900 || Math.abs(width / height - 16 / 9) > 0.02) {
    fail(`Chapter ${number} image must be production-size 16:9; got ${width}x${height}.`);
  }
  totals.images += 1;

  for (const levelId of levelIds) {
    const level = pack.levels[levelId];
    if (!level || level.lines.length < 8) fail(`Chapter ${number} ${levelId} is incomplete.`);
    if (level.activities.mimic.length !== level.lines.length) fail(`Chapter ${number} ${levelId} Mimic mismatch.`);
    if (level.activities.guess.length !== 4) fail(`Chapter ${number} ${levelId} must have four Guess items.`);
    if (level.activities.word.length !== 4) fail(`Chapter ${number} ${levelId} must have four Word items.`);
    if (!level.activities.retellPromptKo) fail(`Chapter ${number} ${levelId} needs a retell prompt.`);

    for (const [lineIndex, line] of level.lines.entries()) {
      if (level.activities.mimic[lineIndex].text !== line.text) {
        fail(`Chapter ${number} ${levelId} Mimic line ${lineIndex + 1} diverges from the master script.`);
      }
    }

    for (const item of level.activities.guess) {
      const labels = item.options.map((option) => option.label);
      if (new Set(labels).size !== 3 || !labels.includes(item.correctAnswer)) {
        fail(`Chapter ${number} ${levelId} ${item.id} has invalid options.`);
      }
      const answer = item.options.find((option) => option.label === item.correctAnswer);
      if (answer.lineIndex !== item.audioLineIndex) fail(`Chapter ${number} ${levelId} ${item.id} answer mismatch.`);
    }

    totals.lines += level.stats.lines;
    totals.words += level.stats.words;
    totals.characters += level.stats.characters;
    totals.guess += level.activities.guess.length;
    totals.word += level.activities.word.length;
    totals.retell += 1;
  }
}

console.log(JSON.stringify({ chapters: manifest.chapters.length, ...totals }, null, 2));
