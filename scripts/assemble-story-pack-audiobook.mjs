#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs/pinocchio/v3");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function fail(message) {
  throw new Error(message);
}

function duration(file) {
  return Number(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    file,
  ], { encoding: "utf8" }).trim());
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function offsetRange(item, seconds, milliseconds) {
  const shifted = { ...item };
  for (const key of ["start", "end", "speechStart", "speechEnd"]) {
    if (Number.isFinite(item[key])) shifted[key] = Number((item[key] + seconds).toFixed(3));
  }
  for (const key of ["startMs", "endMs", "speechStartMs", "speechEndMs"]) {
    if (Number.isInteger(item[key])) shifted[key] = item[key] + milliseconds;
  }
  return shifted;
}

const levelId = argument("level", "core");
const gapMs = Number(argument("chapter-gap-ms", "1500"));
if (!new Set(["foundation", "core", "studio"]).has(levelId)) fail("Unknown level.");
if (!Number.isInteger(gapMs) || gapMs < 0 || gapMs > 5000) fail("Chapter gap must be 0–5,000ms.");

const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
const chapters = [];
for (const manifestChapter of manifest.chapters) {
  if (manifestChapter.path.includes("#")) fail(`Chapter ${manifestChapter.number} is not authored.`);
  const chapterPath = path.join(packRoot, manifestChapter.path);
  const chapter = JSON.parse(await readFile(chapterPath, "utf8"));
  const level = chapter.levels[levelId];
  if (!level?.master || !level?.activities || !level?.production) fail(`${chapter.chapterId}/${levelId} is not authored.`);
  const chapterRoot = path.dirname(chapterPath);
  const production = JSON.parse(await readFile(path.join(chapterRoot, level.production), "utf8"));
  if (!production.status.startsWith("audio-generated")) fail(`${chapter.chapterId}/${levelId} audio is not generated.`);
  const audioPath = path.join(packRoot, production.outputs.masterAudio);
  const timelinePath = path.join(packRoot, production.outputs.sentenceTimeline);
  const provenancePath = path.join(packRoot, production.outputs.provenance);
  const masterPath = path.join(chapterRoot, level.master);
  const activitiesPath = path.join(chapterRoot, level.activities);
  const [audio, timelineText, provenanceText, masterFileText, activitiesText] = await Promise.all([
    readFile(audioPath),
    readFile(timelinePath, "utf8"),
    readFile(provenancePath, "utf8"),
    readFile(masterPath, "utf8"),
    readFile(activitiesPath, "utf8"),
  ]);
  const timeline = JSON.parse(timelineText);
  const provenance = JSON.parse(provenanceText);
  const activities = JSON.parse(activitiesText);
  const audioSha256 = checksum(audio);
  const masterSha256 = checksum(masterFileText);
  const activitiesSha256 = checksum(activitiesText);
  const chapterDuration = duration(audioPath);
  const sentences = masterFileText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (production.generation?.scriptChecksum !== `sha256:${masterSha256}`) fail(`${chapter.chapterId}: production script checksum is stale.`);
  if (production.generation?.activitiesChecksum !== `sha256:${activitiesSha256}`) fail(`${chapter.chapterId}: production activities checksum is stale.`);
  if (production.outputs?.checksum !== `sha256:${audioSha256}`) fail(`${chapter.chapterId}: production audio checksum is stale.`);
  if (timeline.schemaVersion !== "1.1.0") fail(`${chapter.chapterId}: nested timeline schema 1.1.0 is required.`);
  if (timeline.masterTextSha256 !== masterSha256 || timeline.activitiesSha256 !== activitiesSha256) {
    fail(`${chapter.chapterId}: timeline input checksum is stale.`);
  }
  if (timeline.voice?.id !== production.provider.voiceId) fail(`${chapter.chapterId}: timeline narrator differs.`);
  if (timeline.lines?.length !== sentences.length) fail(`${chapter.chapterId}: timeline sentence count differs.`);
  for (const [index, line] of timeline.lines.entries()) {
    if (line.sentenceId !== `S${String(index + 1).padStart(3, "0")}` || line.text !== sentences[index]) {
      fail(`${chapter.chapterId}: timeline sentence ${index + 1} differs from the locked transcript.`);
    }
  }
  if (timeline.mimicItems?.length !== 30 || activities.mimic?.length !== 30) fail(`${chapter.chapterId}: nested Mimic timeline is incomplete.`);
  if (Math.abs((timeline.duration ?? 0) - chapterDuration) > 0.05) fail(`${chapter.chapterId}: timeline duration differs from audio.`);
  if (provenance.source?.sha256 !== masterSha256 || provenance.source?.activitiesSha256 !== activitiesSha256) {
    fail(`${chapter.chapterId}: provenance input checksum is stale.`);
  }
  if (provenance.provider?.voice?.id !== production.provider.voiceId) fail(`${chapter.chapterId}: provenance narrator differs.`);
  chapters.push({
    chapter,
    production,
    audioPath,
    audioSha256,
    duration: chapterDuration,
    timeline,
    timelineSha256: checksum(timelineText),
    provenanceSha256: checksum(provenanceText),
    masterPath,
    masterText: masterFileText.trimEnd(),
    masterSha256,
    activitiesPath,
    activitiesSha256,
  });
}

const outputDir = path.join(packRoot, "audiobooks");
await mkdir(outputDir, { recursive: true });
const audioPath = path.join(outputDir, `${levelId}.full.master.mp3`);
const timelinePath = path.join(outputDir, `${levelId}.full.timeline.json`);
const transcriptPath = path.join(outputDir, `${levelId}.full.transcript.txt`);
const spokenTranscriptPath = path.join(outputDir, `${levelId}.full.spoken-transcript.txt`);
const provenancePath = path.join(outputDir, `${levelId}.full.provenance.json`);
const temporarySuffix = `.tmp-${process.pid}`;
const temporaryAudioPath = path.join(outputDir, `.${levelId}.full.master${temporarySuffix}.mp3`);
const temporaryTimelinePath = `${timelinePath}${temporarySuffix}`;
const temporaryTranscriptPath = `${transcriptPath}${temporarySuffix}`;
const temporarySpokenTranscriptPath = `${spokenTranscriptPath}${temporarySuffix}`;
const temporaryProvenancePath = `${provenancePath}${temporarySuffix}`;

const inputs = chapters.flatMap((chapter) => ["-i", chapter.audioPath]);
const filters = chapters.map((_, index) =>
  index === chapters.length - 1
    ? `[${index}:a]anull[a${index}]`
    : `[${index}:a]apad=pad_dur=${gapMs / 1000}[a${index}]`,
);
const streams = chapters.map((_, index) => `[a${index}]`).join("");
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  ...inputs,
  "-filter_complex", `${filters.join(";")};${streams}concat=n=${chapters.length}:v=0:a=1[out]`,
  "-map", "[out]",
  "-ar", "44100",
  "-ac", "1",
  "-c:a", "libmp3lame",
  "-b:a", "128k",
  temporaryAudioPath,
], { stdio: "inherit" });

const fullDuration = duration(temporaryAudioPath);
let offsetSeconds = 0;
let offsetMilliseconds = 0;
const chapterRanges = [];
const lines = [];
const mimicItems = [];
const beats = [];
for (const [index, source] of chapters.entries()) {
  const start = offsetSeconds;
  const startMs = offsetMilliseconds;
  const end = start + source.duration;
  const endMs = startMs + Math.round(source.duration * 1000);
  chapterRanges.push({
    chapterId: source.chapter.chapterId,
    number: source.chapter.number,
    title: source.chapter.titles.en,
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    startMs,
    endMs,
    gapAfterMs: index === chapters.length - 1 ? 0 : gapMs,
  });
  lines.push(...source.timeline.lines.map((item) => ({
    ...offsetRange(item, start, startMs),
    chapterId: source.chapter.chapterId,
    id: `${source.chapter.chapterId}-${item.sentenceId}`,
    chapterSentenceId: item.sentenceId,
    beatId: `${source.chapter.chapterId}-${item.beatId}`,
    chapterBeatId: item.beatId,
  })));
  mimicItems.push(...source.timeline.mimicItems.map((item) => ({
    ...offsetRange(item, start, startMs),
    chunks: (item.chunks ?? []).map((chunk) => ({
      ...offsetRange(chunk, start, startMs),
      chunkId: `${source.chapter.chapterId}-${chunk.chunkId}`,
      chapterChunkId: chunk.chunkId,
    })),
    chapterId: source.chapter.chapterId,
    id: `${source.chapter.chapterId}-${item.id}`,
    chapterItemId: item.id,
    sourceSentenceId: `${source.chapter.chapterId}-${item.sourceSentenceId}`,
    chapterSourceSentenceId: item.sourceSentenceId,
    beatId: `${source.chapter.chapterId}-${item.beatId}`,
    chapterBeatId: item.beatId,
  })));
  beats.push(...source.timeline.beats.map((item) => ({
    ...offsetRange(item, start, startMs),
    chapterId: source.chapter.chapterId,
    id: `${source.chapter.chapterId}-${item.beatId}`,
    beatId: `${source.chapter.chapterId}-${item.beatId}`,
    chapterBeatId: item.beatId,
    sentenceStart: `${source.chapter.chapterId}-${item.sentenceStart}`,
    chapterSentenceStart: item.sentenceStart,
    sentenceEnd: `${source.chapter.chapterId}-${item.sentenceEnd}`,
    chapterSentenceEnd: item.sentenceEnd,
  })));
  offsetSeconds = end + (index === chapters.length - 1 ? 0 : gapMs / 1000);
  offsetMilliseconds = endMs + (index === chapters.length - 1 ? 0 : gapMs);
}

const transcript = chapters.map((source) =>
  `CHAPTER ${String(source.chapter.number).padStart(2, "0")} — ${source.chapter.titles.en}\n\n${source.masterText}`,
).join("\n\n");
const spokenTranscript = chapters.map((source) => source.masterText).join("\n\n");
await writeFile(temporaryTranscriptPath, `${transcript}\n`);
await writeFile(temporarySpokenTranscriptPath, `${spokenTranscript}\n`);

const generatedAt = new Date().toISOString();
const buildInputs = chapters.map((source) => ({
  chapterId: source.chapter.chapterId,
  scriptSha256: source.masterSha256,
  activitiesSha256: source.activitiesSha256,
  timelineSha256: source.timelineSha256,
  audioSha256: source.audioSha256,
  voiceId: source.production.provider.voiceId,
}));
const buildFingerprint = checksum(JSON.stringify({ levelId, gapMs, buildInputs }));
const timeline = {
  schemaVersion: "1.1.0",
  storyPackId: manifest.storyPackId,
  level: levelId,
  kind: "full-story-audiobook-master",
  generatedAt,
  narrator: { name: "Lily", voiceId: "pFZP5JQG7iQjIQuC4Bku", accent: "British English" },
  timingPrecision: "milliseconds",
  duration: Number(fullDuration.toFixed(3)),
  durationMs: Math.round(fullDuration * 1000),
  chapterGapMs: gapMs,
  buildFingerprint: `sha256:${buildFingerprint}`,
  alignmentSource: "chapter-timeline-offsets-draft",
  releaseAlignmentRequired: "forced-align-the-final-full-master-against-the-spoken-transcript",
  chapters: chapterRanges,
  beats,
  lines,
  mimicItems,
};
const timelineText = `${JSON.stringify(timeline, null, 2)}\n`;
await writeFile(temporaryTimelinePath, timelineText);

const audio = await readFile(temporaryAudioPath);
const provenance = {
  schemaVersion: "1.0.0",
  storyPackId: manifest.storyPackId,
  level: levelId,
  kind: "full-story-audiobook-master",
  generatedAt,
  narrator: timeline.narrator,
  method: {
    studentFacingOutput: "one continuous full-story audio master",
    providerRequests: "fewest coherent acts per Chapter because eleven_v3 cannot accept the full book in one HTTP request",
    sentenceBySentenceGeneration: false,
    chapterAssembly: "decode-concat-reencode with fixed chapter gaps",
    chapterGapMs: gapMs,
    releaseTiming: "draft offsets only; full-master Forced Alignment is required before release",
  },
  buildFingerprint: `sha256:${buildFingerprint}`,
  chapters: chapters.map((source) => ({
    chapterId: source.chapter.chapterId,
    audio: path.relative(packRoot, source.audioPath),
    audioSha256: source.audioSha256,
    transcript: path.relative(packRoot, source.masterPath),
    transcriptSha256: checksum(`${source.masterText}\n`),
    activities: path.relative(packRoot, source.activitiesPath),
    activitiesSha256: source.activitiesSha256,
    timelineSha256: source.timelineSha256,
    provenanceSha256: source.provenanceSha256,
    duration: Number(source.duration.toFixed(3)),
  })),
  output: {
    audio: path.relative(packRoot, audioPath),
    audioSha256: checksum(audio),
    timeline: path.relative(packRoot, timelinePath),
    timelineSha256: checksum(timelineText),
    transcript: path.relative(packRoot, transcriptPath),
    transcriptSha256: checksum(`${transcript}\n`),
    spokenTranscript: path.relative(packRoot, spokenTranscriptPath),
    spokenTranscriptSha256: checksum(`${spokenTranscript}\n`),
    duration: Number(fullDuration.toFixed(3)),
  },
};
await writeFile(temporaryProvenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
await rename(temporaryAudioPath, audioPath);
await rename(temporaryTimelinePath, timelinePath);
await rename(temporaryTranscriptPath, transcriptPath);
await rename(temporarySpokenTranscriptPath, spokenTranscriptPath);
await rename(temporaryProvenancePath, provenancePath);

console.log(JSON.stringify({
  level: levelId,
  chapters: chapters.length,
  durationSeconds: Number(fullDuration.toFixed(3)),
  durationMinutes: Number((fullDuration / 60).toFixed(2)),
  lines: lines.length,
  mimicItems: mimicItems.length,
  audio: path.relative(packRoot, audioPath),
  timeline: path.relative(packRoot, timelinePath),
  transcript: path.relative(packRoot, transcriptPath),
  spokenTranscript: path.relative(packRoot, spokenTranscriptPath),
  provenance: path.relative(packRoot, provenancePath),
}, null, 2));
