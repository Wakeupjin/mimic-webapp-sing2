import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v2");
const levelIds = ["foundation", "core", "studio"];
const expectedChapters = Array.from({ length: 36 }, (_, index) => index + 1);

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

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
if (checksum(withoutChecksum(manifest)) !== manifest.checksum) fail("Manifest checksum mismatch.");
if (manifest.sessions.length !== 12) fail("Manifest must contain exactly twelve sessions.");
if (JSON.stringify(manifest.sourceChaptersCovered) !== JSON.stringify(expectedChapters)) {
  fail("The course does not cover original Chapters 1–36 exactly once and in order.");
}
if (Object.values(manifest.courseDesign.modeMinutes).reduce((sum, minutes) => sum + minutes, 0) !== 60) {
  fail("Watch, Mimic, Guess, and Word must total sixty minutes.");
}

const totals = { sessions: 0, lines: 0, words: 0, characters: 0, guess: 0, word: 0, beats: 0 };
const bandExceptions = { foundation: 0, core: 0, studio: 0 };

for (const [sessionIndex, entry] of manifest.sessions.entries()) {
  const number = sessionIndex + 1;
  if (entry.number !== number) fail(`Expected session ${number}.`);
  const pack = JSON.parse(await readFile(path.join(packRoot, entry.path), "utf8"));
  if (checksum(withoutChecksum(pack)) !== pack.checksum || entry.checksum !== pack.checksum) {
    fail(`Session ${number} checksum mismatch.`);
  }
  if (pack.course.minutes !== 60) fail(`Session ${number} must be sixty minutes.`);
  if (pack.livingStorybook.beats.length !== 8) fail(`Session ${number} must contain eight beats.`);
  totals.sessions += 1;
  totals.beats += 8;

  for (const levelId of levelIds) {
    const level = pack.levels[levelId];
    if (level.lines.length !== 16) fail(`Session ${number} ${levelId} must contain sixteen lines.`);
    if (level.activities.mimic.items.length !== 16) fail(`Session ${number} ${levelId} Mimic mismatch.`);
    if (level.activities.guess.items.length !== 8) fail(`Session ${number} ${levelId} needs eight Guess items.`);
    if (level.activities.word.items.length !== 8) fail(`Session ${number} ${levelId} needs eight Word items.`);
    if (!level.activities.word.retellPromptKo) fail(`Session ${number} ${levelId} needs a retell prompt.`);
    const minutes = level.activities.watch.minutes + level.activities.mimic.minutes + level.activities.guess.minutes + level.activities.word.minutes;
    if (minutes !== 60) fail(`Session ${number} ${levelId} activity minutes total ${minutes}.`);

    for (const [lineIndex, line] of level.lines.entries()) {
      if (level.activities.mimic.items[lineIndex].text !== line.text) fail(`Session ${number} ${levelId} line ${lineIndex + 1} mismatch.`);
      const count = wordCount(line.text);
      const inBand = levelId === "foundation" ? count >= 5 && count <= 11 : levelId === "core" ? count >= 8 && count <= 20 : count >= 12 && count <= 30;
      if (!inBand) bandExceptions[levelId] += 1;
    }
    for (const item of level.activities.guess.items) {
      const answer = item.options.find((option) => option.label === item.correctAnswer);
      if (!answer || answer.lineIndex !== item.audioLineIndex || new Set(item.options.map((option) => option.lineIndex)).size !== 3) {
        fail(`Session ${number} ${levelId} ${item.id} is invalid.`);
      }
    }
    totals.lines += level.stats.lines;
    totals.words += level.stats.words;
    totals.characters += level.stats.characters;
    totals.guess += level.activities.guess.items.length;
    totals.word += level.activities.word.items.length;
  }
}

console.log(JSON.stringify({ ...totals, originalChaptersCovered: 36, minutesPerSession: 60, bandExceptions }, null, 2));
