#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const packRoot = resolve(root, "content-packs/pinocchio/v3");
const errors = [];
const warnings = [];
const results = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function json(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: ${error.message}`);
    return null;
  }
}

function text(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    errors.push(`${path}: ${error.message}`);
    return null;
  }
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sentenceIndex(id) {
  const match = /^S(\d{3})$/.exec(id ?? "");
  return match ? Number(match[1]) - 1 : -1;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sentenceBeat(beats, sentenceId) {
  const index = sentenceIndex(sentenceId);
  return beats.find(
    (beat) => index >= sentenceIndex(beat.sentenceStart) && index <= sentenceIndex(beat.sentenceEnd),
  )?.beatId;
}

function validateAudio(packRootPath, chapter, levelId, sentences, activities, activitiesChecksum, production, label) {
  if (production.status === "audio-not-generated") return null;
  const masterPath = resolve(packRootPath, production.outputs?.masterAudio ?? "missing");
  const timelinePath = resolve(packRootPath, production.outputs?.sentenceTimeline ?? "missing");
  const provenancePath = resolve(packRootPath, production.outputs?.provenance ?? "missing");
  const timeline = json(timelinePath);
  const provenance = json(provenancePath);
  let duration = null;
  try {
    const audio = readFileSync(masterPath);
    duration = Number(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      masterPath,
    ], { encoding: "utf8" }).trim());
    const checksum = hash(audio);
    check(statSync(masterPath).size > 100_000, `${label}: generated master is unexpectedly small.`);
    check(production.outputs?.checksum === `sha256:${checksum}`, `${label}: audio checksum is stale.`);
    check(
      duration >= production.targets.acceptedGoldenRangeSeconds[0] &&
        duration <= production.targets.acceptedGoldenRangeSeconds[1],
      `${label}: actual duration ${duration.toFixed(2)}s is outside the approved range.`,
    );
  } catch (error) {
    errors.push(`${label}: audio inspection failed: ${error.message}`);
  }
  check(timeline?.chapterId === chapter.chapterId, `${label}: timeline Chapter ID differs.`);
  check(timeline?.level === levelId, `${label}: timeline level differs.`);
  check(timeline?.activitiesSha256 === activitiesChecksum, `${label}: timeline activities checksum is stale.`);
  check(timeline?.voice?.id === production.provider.voiceId, `${label}: timeline voice differs.`);
  check(timeline?.lines?.length === sentences.length, `${label}: timeline sentence count differs.`);
  check(timeline?.mimicItems?.length === activities.mimic.length, `${label}: timeline Mimic count differs.`);
  for (const item of timeline?.mimicItems ?? []) {
    const authored = activities.mimic.find((candidate) => candidate.id === item.id);
    check(Boolean(authored), `${label}/${item.id}: timeline Mimic item is not authored.`);
    check(item.text === authored?.text, `${label}/${item.id}: timeline chunk text differs.`);
    check(
      JSON.stringify(item.sourceTextRange) === JSON.stringify(authored?.sourceTextRange),
      `${label}/${item.id}: timeline source-text range differs.`,
    );
    check(Number.isInteger(item.speechStartMs) && Number.isInteger(item.speechEndMs), `${label}/${item.id}: millisecond speech bounds are missing.`);
    check(item.speechEndMs > item.speechStartMs, `${label}/${item.id}: millisecond speech bounds are invalid.`);
    check(Number.isInteger(item.startMs) && Number.isInteger(item.endMs), `${label}/${item.id}: playback bounds are missing.`);
    check(
      item.startMs <= item.speechStartMs && item.speechEndMs <= item.endMs,
      `${label}/${item.id}: playback bounds clip aligned speech.`,
    );
    check(item.chunks?.length === authored?.chunks?.length, `${label}/${item.id}: timeline chunk count differs.`);
    let previousChunk = null;
    for (const chunk of item.chunks ?? []) {
      const authoredChunk = authored?.chunks?.find((candidate) => candidate.chunkId === chunk.chunkId);
      check(Boolean(authoredChunk), `${label}/${item.id}/${chunk.chunkId}: timeline chunk is not authored.`);
      check(chunk.text === authoredChunk?.text, `${label}/${item.id}/${chunk.chunkId}: timeline chunk text differs.`);
      check(
        JSON.stringify(chunk.sourceTextRange) === JSON.stringify(authoredChunk?.sourceTextRange),
        `${label}/${item.id}/${chunk.chunkId}: timeline chunk range differs.`,
      );
      check(
        Number.isInteger(chunk.speechStartMs) && Number.isInteger(chunk.speechEndMs),
        `${label}/${item.id}/${chunk.chunkId}: chunk millisecond bounds are missing.`,
      );
      check(chunk.speechEndMs > chunk.speechStartMs, `${label}/${item.id}/${chunk.chunkId}: chunk bounds are invalid.`);
      check(
        Number.isInteger(chunk.startMs) && Number.isInteger(chunk.endMs),
        `${label}/${item.id}/${chunk.chunkId}: chunk playback bounds are missing.`,
      );
      check(
        chunk.startMs <= chunk.speechStartMs && chunk.speechEndMs <= chunk.endMs,
        `${label}/${item.id}/${chunk.chunkId}: chunk playback bounds clip aligned speech.`,
      );
      check(
        item.startMs <= chunk.startMs && chunk.endMs <= item.endMs,
        `${label}/${item.id}/${chunk.chunkId}: chunk playback bounds escape the source sentence.`,
      );
      if (previousChunk) {
        check(
          previousChunk.speechEndMs <= chunk.speechStartMs,
          `${label}/${item.id}: sibling chunk speech bounds overlap.`,
        );
        check(
          previousChunk.endMs <= chunk.startMs,
          `${label}/${item.id}: sibling chunk playback handles overlap.`,
        );
      }
      previousChunk = chunk;
    }
  }
  check(provenance?.source?.sha256 === hash(sentences.join("\n") + "\n"), `${label}: provenance script checksum differs.`);
  check(provenance?.source?.activitiesSha256 === activitiesChecksum, `${label}: provenance activities checksum differs.`);
  check(provenance?.provider?.commercialPaidPlanConfirmed === true, `${label}: paid-plan evidence is missing.`);
  check(provenance?.strategy?.sentenceBySentenceGeneration === false, `${label}: sentence TTS must remain prohibited.`);
  return duration;
}

function validateLevel(packRootPath, chapterPath, chapter, levelId, level, levelSpec) {
  const label = `${chapter.chapterId}/${levelId}`;
  const chapterRoot = dirname(chapterPath);
  check(Boolean(level.master && level.activities && level.production && level.qa), `${label}: authored file references are incomplete.`);
  if (!(level.master && level.activities && level.production && level.qa)) return;

  const masterFileText = text(resolve(chapterRoot, level.master));
  const activitiesPath = resolve(chapterRoot, level.activities);
  const activitiesFileText = text(activitiesPath);
  let activities = null;
  try {
    activities = JSON.parse(activitiesFileText);
  } catch (error) {
    errors.push(`${activitiesPath}: ${error.message}`);
  }
  const production = json(resolve(chapterRoot, level.production));
  const qa = json(resolve(chapterRoot, level.qa));
  if (!masterFileText || !activitiesFileText || !activities || !production || !qa) return;

  const sentences = masterFileText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sentenceMap = new Map(sentences.map((line, index) => [`S${String(index + 1).padStart(3, "0")}`, line]));
  const words = sentences.flatMap((line) => line.split(/\s+/)).filter(Boolean);
  const checksum = hash(masterFileText);
  const activitiesChecksum = hash(activitiesFileText);
  const wpm = production.targets?.referenceWordsPerMinute;
  const estimatedDuration = Number(((words.length / wpm) * 60).toFixed(1));
  const range = production.targets?.acceptedGoldenRangeSeconds;
  const levelBeats = level.beatRanges ?? chapter.beats;

  check(chapter.levels?.[levelId]?.status?.includes("script"), `${label}: authored level status must identify the script.`);
  check(sentences.length >= 80 && sentences.length <= 130, `${label}: expected 80–130 complete sentences; found ${sentences.length}.`);
  check(Boolean(levelSpec), `${label}: language-band specification is missing.`);
  if (levelSpec) {
    check(
      words.length >= levelSpec.words.minimum && words.length <= levelSpec.words.maximum,
      `${label}: expected ${levelSpec.words.minimum}–${levelSpec.words.maximum} words; found ${words.length}.`,
    );
    check(wpm === levelSpec.referenceWordsPerMinute, `${label}: narration rate differs from the level specification.`);
  }
  check(Number.isFinite(wpm) && wpm > 0, `${label}: reference narration rate is missing.`);
  check(Array.isArray(range) && range.length === 2, `${label}: accepted Watch range is missing.`);
  if (Array.isArray(range)) {
    check(
      estimatedDuration >= range[0] && estimatedDuration <= range[1],
      `${label}: estimated Watch duration ${estimatedDuration}s is outside ${range[0]}–${range[1]}s.`,
    );
  }
  check(production.generation?.scriptChecksum === `sha256:${checksum}`, `${label}: production script checksum is stale.`);
  check(production.generation?.activitiesChecksum === `sha256:${activitiesChecksum}`, `${label}: production activities checksum is stale.`);
  check(qa.metrics?.activitiesSha256 === activitiesChecksum, `${label}: QA activities checksum is stale.`);
  check(production.generation?.sentenceBySentenceGenerationAllowed === false, `${label}: sentence TTS must be prohibited.`);
  check(production.provider?.approved === true, `${label}: narrator approval is missing.`);
  check(production.provider?.voiceCandidateName === "Lily", `${label}: narrator must be Lily.`);
  check(production.provider?.voiceId === "pFZP5JQG7iQjIQuC4Bku", `${label}: Lily voice ID differs.`);

  check(Array.isArray(levelBeats) && levelBeats.length === 8, `${label}: level must contain eight beat ranges.`);
  let expectedStart = 0;
  for (const beat of levelBeats ?? []) {
    const start = sentenceIndex(beat.sentenceStart);
    const end = sentenceIndex(beat.sentenceEnd);
    check(start === expectedStart, `${label}/${beat.beatId}: beat leaves a gap or overlap.`);
    check(end >= start && end < sentences.length, `${label}/${beat.beatId}: sentence range is invalid.`);
    expectedStart = end + 1;
  }
  check(expectedStart === sentences.length, `${label}: beats must cover every master sentence exactly once.`);

  const actBeatIds = production.generation?.actPlan?.flatMap((act) => act.beatIds) ?? [];
  check(
    JSON.stringify(actBeatIds) === JSON.stringify(levelBeats.map((beat) => beat.beatId)),
    `${label}: act plan must cover all beats exactly once and in order.`,
  );

  check(activities.chapterId === chapter.chapterId, `${label}: activities Chapter ID differs.`);
  check(activities.level === levelId, `${label}: activities level differs.`);
  check(activities.schemaVersion === "1.1.0", `${label}: activities must use nested Mimic schema 1.1.0.`);
  check(activities.mimic?.length === 30, `${label}: Mimic must contain exactly 30 items.`);
  check(activities.guess?.length === 10, `${label}: Guess must contain exactly 10 items.`);
  check(activities.word?.length === 10, `${label}: Word must contain exactly 10 items.`);

  const mimicSentenceIds = activities.mimic?.map((item) => item.sourceSentenceId) ?? [];
  check(unique(mimicSentenceIds), `${label}: Mimic must select 30 unique source sentences.`);
  const mimicByBeat = new Map();
  for (const item of activities.mimic ?? []) {
    const source = sentenceMap.get(item.sourceSentenceId);
    const [from, to] = item.sourceTextRange ?? [];
    check(
      Number.isInteger(from) && Number.isInteger(to) && from === 0 && to === (source?.length ?? -1),
      `${label}/${item.id}: Mimic item must span its complete source sentence.`,
    );
    check(source === item.text, `${label}/${item.id}: Mimic item is not the exact complete master sentence.`);
    check(sentenceBeat(levelBeats, item.sourceSentenceId) === item.beatId, `${label}/${item.id}: Mimic beat differs.`);
    check(Boolean(item.focus && item.selectionReason), `${label}/${item.id}: Mimic rationale is incomplete.`);
    mimicByBeat.set(item.beatId, (mimicByBeat.get(item.beatId) ?? 0) + 1);

    const chunks = item.chunks ?? [];
    check(chunks.length >= 1, `${label}/${item.id}: Mimic sentence has no practice chunks.`);
    let previousTo = 0;
    for (const [index, chunk] of chunks.entries()) {
      const [chunkFrom, chunkTo] = chunk.sourceTextRange ?? [];
      const chunkWords = chunk.text?.split(/\s+/).filter(Boolean).length ?? 0;
      check(chunk.chunkId === `${item.id}-C${String(index + 1).padStart(2, "0")}`, `${label}/${item.id}: chunk ID/order differs.`);
      check(chunk.part === index + 1 && chunk.parts === chunks.length, `${label}/${item.id}/${chunk.chunkId}: part metadata differs.`);
      check(
        Number.isInteger(chunkFrom) && Number.isInteger(chunkTo) && chunkFrom >= previousTo && chunkTo > chunkFrom && chunkTo <= (source?.length ?? -1),
        `${label}/${item.id}/${chunk.chunkId}: chunk range is invalid or overlaps.`,
      );
      check(/^\s*$/.test(source?.slice(previousTo, chunkFrom) ?? "x"), `${label}/${item.id}/${chunk.chunkId}: chunks skip non-space text.`);
      check(source?.slice(chunkFrom, chunkTo) === chunk.text, `${label}/${item.id}/${chunk.chunkId}: chunk is not an exact source range.`);
      check(chunkWords >= 2 && chunkWords <= 12, `${label}/${item.id}/${chunk.chunkId}: chunk must contain 2–12 words; found ${chunkWords}.`);
      previousTo = chunkTo;
    }
    check(/^\s*$/.test(source?.slice(previousTo) ?? "x"), `${label}/${item.id}: chunks do not cover the complete sentence.`);
    const sentenceWords = source?.split(/\s+/).filter(Boolean).length ?? 0;
    check(sentenceWords <= 12 ? chunks.length === 1 : chunks.length >= 2, `${label}/${item.id}: chunk count does not match sentence length.`);
  }
  for (const beat of levelBeats) {
    check((mimicByBeat.get(beat.beatId) ?? 0) >= 2, `${label}/${beat.beatId}: Mimic needs at least two source sentences.`);
  }

  const answerPositions = { A: 0, B: 0, C: 0 };
  for (const item of activities.guess ?? []) {
    check(item.options?.length === 3, `${label}/${item.id}: Guess must have three options.`);
    const correct = item.options?.find((option) => option.id === item.correctOptionId);
    check(Boolean(correct), `${label}/${item.id}: correct Guess option is missing.`);
    if (answerPositions[item.correctOptionId] !== undefined) answerPositions[item.correctOptionId] += 1;
    for (const option of item.options ?? []) {
      check(sentenceMap.get(option.sourceSentenceId) === option.text, `${label}/${item.id}/${option.id}: option is not an exact master sentence.`);
    }
  }
  const counts = Object.values(answerPositions);
  check(Math.max(...counts) - Math.min(...counts) <= 1, `${label}: Guess answer positions are not balanced.`);

  const wordIds = activities.word?.map((item) => item.sourceSentenceId) ?? [];
  check(unique(wordIds), `${label}: Word source sentences must be unique.`);
  for (const item of activities.word ?? []) {
    check(sentenceMap.get(item.sourceSentenceId) === item.text, `${label}/${item.id}: Word is not an exact master sentence.`);
    check(item.tokens?.join(" ") === item.text, `${label}/${item.id}: tokens do not rebuild the exact sentence.`);
    check(sentenceBeat(levelBeats, item.sourceSentenceId) === item.beatId, `${label}/${item.id}: Word beat differs.`);
  }

  check(qa.chapterId === chapter.chapterId && qa.level === levelId, `${label}: QA identity differs.`);
  check(qa.metrics?.sentenceCount === sentences.length, `${label}: QA sentence count is stale.`);
  check(qa.metrics?.wordCount === words.length, `${label}: QA word count is stale.`);
  check(qa.metrics?.masterSha256 === checksum, `${label}: QA script checksum is stale.`);
  const qaDuration = qa.metrics?.estimatedDurationSeconds ?? qa.metrics?.estimatedDurationSecondsAt128Wpm;
  check(qaDuration === estimatedDuration, `${label}: QA duration estimate is stale.`);
  warn(qa.humanApprovals?.editorial?.status !== "pending", `${label}: named editorial review remains pending.`);
  warn(qa.humanApprovals?.learning?.status !== "pending", `${label}: named learning review remains pending.`);

  const actualDuration = validateAudio(packRootPath, chapter, levelId, sentences, activities, activitiesChecksum, production, label);
  results.push({
    chapter: chapter.number,
    level: levelId,
    sentences: sentences.length,
    words: words.length,
    estimatedDurationSeconds: estimatedDuration,
    actualDurationSeconds: actualDuration,
    mimic: activities.mimic.length,
    guess: activities.guess.length,
    word: activities.word.length,
  });
}

const manifest = json(resolve(packRoot, "manifest.json"));
const seasonMap = json(resolve(packRoot, "season-map.json"));
const narratorPolicy = json(resolve(packRoot, manifest?.narratorPolicy ?? "narrator-policy.json"));
const levelSpecs = json(resolve(packRoot, manifest?.levelSpecs ?? "level-specs.json"));
check(manifest?.chapters?.length === 12, "Manifest must contain twelve Chapters.");
check(seasonMap?.chapters?.length === 12, "Season map must contain twelve Chapters.");
check(narratorPolicy?.status === "approved-for-batch-production", "Batch narrator decision is not approved.");
check(narratorPolicy?.decision?.voiceId === "pFZP5JQG7iQjIQuC4Bku", "Narrator policy must pin Lily's immutable voice ID.");

const chapterDirectory = resolve(packRoot, "chapters");
const chapterFiles = readdirSync(chapterDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^chapter-\d{2}$/.test(entry.name))
  .map((entry) => resolve(chapterDirectory, entry.name, "chapter.json"))
  .sort();

for (const chapterPath of chapterFiles) {
  const chapter = json(chapterPath);
  if (!chapter) continue;
  const season = seasonMap?.chapters?.find((item) => item.id === chapter.chapterId);
  check(Boolean(season), `${chapter.chapterId}: missing from season map.`);
  check(chapter.number === season?.number, `${chapter.chapterId}: Chapter number differs from season map.`);
  check(JSON.stringify(chapter.sourceChapters) === JSON.stringify(season?.sourceChapters), `${chapter.chapterId}: source range differs from season map.`);
  for (const [levelId, level] of Object.entries(chapter.levels ?? {})) {
    if (level.master) validateLevel(packRoot, chapterPath, chapter, levelId, level, levelSpecs?.levels?.[levelId]);
  }
}

const requiredLevels = (process.argv.find((value) => value.startsWith("--require-levels="))?.split("=")[1] ?? "foundation,core,studio")
  .split(",")
  .filter(Boolean);
for (const levelId of requiredLevels) {
  const count = results.filter((result) => result.level === levelId).length;
  check(count === 12, `Required level ${levelId} has ${count}/12 authored Chapters.`);
}

const output = {
  ok: errors.length === 0,
  authoredLevels: results.length,
  totals: {
    words: results.reduce((sum, result) => sum + result.words, 0),
    estimatedMinutes: Number((results.reduce((sum, result) => sum + result.estimatedDurationSeconds, 0) / 60).toFixed(2)),
    actualMinutes: Number((results.reduce((sum, result) => sum + (result.actualDurationSeconds ?? 0), 0) / 60).toFixed(2)),
    mimic: results.reduce((sum, result) => sum + result.mimic, 0),
    guess: results.reduce((sum, result) => sum + result.guess, 0),
    word: results.reduce((sum, result) => sum + result.word, 0),
  },
  results,
  warnings,
  errors,
};

console.log(JSON.stringify(output, null, 2));
if (errors.length) process.exitCode = 1;
