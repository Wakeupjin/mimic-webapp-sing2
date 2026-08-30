import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const results = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function audioMetadata(filePath) {
  return JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,bit_rate:stream=codec_name,sample_rate,channels",
    "-of", "json",
    filePath,
  ], { encoding: "utf8" }));
}

for (let chapter = 1; chapter <= 12; chapter += 1) {
  const stem = `session-${String(chapter).padStart(2, "0")}`;
  const canonicalRoot = path.join(root, "content-packs", "pinocchio", "v2", "sessions", stem);
  const publicAudioRoot = path.join(root, "public", "prototype-audio", "pinocchio-v2", stem, "lily-british");
  const publicArt = path.join(root, "public", "prototype-art", "pinocchio-v2", `${stem}.png`);
  const packPath = path.join(canonicalRoot, "pack.json");
  const audioPath = path.join(canonicalRoot, "audio", "core.master.mp3");
  const timelinePath = path.join(canonicalRoot, "audio", "core.timeline.json");
  const provenancePath = path.join(canonicalRoot, "audio", "provenance.json");
  const artPath = path.join(canonicalRoot, "assets", `${stem}.png`);

  try {
    const [pack, timeline, provenance] = await Promise.all([
      readFile(packPath, "utf8").then(JSON.parse),
      readFile(timelinePath, "utf8").then(JSON.parse),
      readFile(provenancePath, "utf8").then(JSON.parse),
    ]);
    const level = pack.levels.core;
    const metadata = audioMetadata(audioPath);
    const stream = metadata.streams?.[0] ?? {};
    const duration = Number(metadata.format?.duration || 0);

    assert(pack.course.session === chapter, `Chapter ${chapter}: pack number mismatch.`);
    assert(level.lines.length === 16, `Chapter ${chapter}: expected 16 Watch lines.`);
    assert(level.activities.mimic.items.length === 30, `Chapter ${chapter}: expected 30 Mimic units.`);
    assert(level.activities.guess.items.length === 10, `Chapter ${chapter}: expected 10 Guess items.`);
    assert(level.activities.word.items.length === 10, `Chapter ${chapter}: expected 10 Word items.`);
    assert(timeline.contentId === pack.contentId, `Chapter ${chapter}: timeline contentId mismatch.`);
    assert(timeline.contentChecksum === pack.checksum, `Chapter ${chapter}: timeline checksum mismatch.`);
    assert(timeline.lines.length === 16, `Chapter ${chapter}: expected 16 aligned lines.`);
    assert(timeline.mimicItems.length === 30, `Chapter ${chapter}: expected 30 aligned Mimic units.`);
    assert(timeline.voice?.name === "Lily", `Chapter ${chapter}: expected Lily voice.`);
    assert(timeline.modelId === "eleven_v3", `Chapter ${chapter}: expected Eleven v3.`);
    assert(timeline.source === "one-continuous-master", `Chapter ${chapter}: master is not continuous.`);
    assert(provenance.commercialPaidPlanConfirmed === true, `Chapter ${chapter}: paid-plan provenance missing.`);
    assert(stream.codec_name === "mp3", `Chapter ${chapter}: expected MP3 audio.`);
    assert(Number(stream.sample_rate) === 44100, `Chapter ${chapter}: expected 44.1kHz audio.`);
    assert(Number(stream.channels) === 1, `Chapter ${chapter}: expected mono audio.`);
    assert(duration > 60, `Chapter ${chapter}: audio duration is unexpectedly short.`);
    assert(timeline.lines.every((item) => item.start >= 0 && item.end > item.start), `Chapter ${chapter}: invalid line timing.`);
    assert(timeline.mimicItems.every((item) => item.start >= 0 && item.end > item.start), `Chapter ${chapter}: invalid Mimic timing.`);

    const publicAudio = path.join(publicAudioRoot, "core.master.mp3");
    const publicTimeline = path.join(publicAudioRoot, "core.timeline.json");
    const publicProvenance = path.join(publicAudioRoot, "provenance.json");
    assert(await sha256(audioPath) === await sha256(publicAudio), `Chapter ${chapter}: public audio differs from canonical.`);
    assert(await sha256(timelinePath) === await sha256(publicTimeline), `Chapter ${chapter}: public timeline differs from canonical.`);
    assert(await sha256(provenancePath) === await sha256(publicProvenance), `Chapter ${chapter}: public provenance differs from canonical.`);
    assert(await sha256(artPath) === await sha256(publicArt), `Chapter ${chapter}: public art differs from canonical.`);

    results.push({
      chapter,
      sourceChapters: pack.story.sourceChapters,
      durationSeconds: Number(duration.toFixed(2)),
      watchLines: timeline.lines.length,
      mimicUnits: timeline.mimicItems.length,
      guessItems: level.activities.guess.items.length,
      wordItems: level.activities.word.items.length,
    });
  } catch (error) {
    failures.push(`Chapter ${chapter}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  chapters: results.length,
  sourceChaptersCovered: results.flatMap((result) => result.sourceChapters),
  totalAudioMinutes: Number((results.reduce((sum, result) => sum + result.durationSeconds, 0) / 60).toFixed(2)),
  totals: {
    watchLines: results.reduce((sum, result) => sum + result.watchLines, 0),
    mimicUnits: results.reduce((sum, result) => sum + result.mimicUnits, 0),
    guessItems: results.reduce((sum, result) => sum + result.guessItems, 0),
    wordItems: results.reduce((sum, result) => sum + result.wordItems, 0),
  },
  results,
}, null, 2));
