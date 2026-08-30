#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
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

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function mediaDuration(filePath) {
  return Number(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    filePath,
  ], { encoding: "utf8" }).trim());
}

function milliseconds(seconds) {
  return Math.round(seconds * 1000);
}

function timedCharacters(characters, from, to) {
  const selected = characters.slice(from, to);
  const first = selected.find((character) => Number.isFinite(character.start));
  const last = [...selected].reverse().find((character) => Number.isFinite(character.end));
  if (!first || !last) fail(`Forced Alignment is missing timing for characters ${from}-${to}.`);
  return { start: first.start, end: last.end };
}

const levelId = argument("level", "core");
const confirmCharge = argument("confirm-alignment-charge") === "yes";
const envFile = argument("env-file");
if (!new Set(["foundation", "core", "studio"]).has(levelId)) fail("Unknown level.");
if (!confirmCharge) fail("Full-master Forced Alignment is billable. Pass --confirm-alignment-charge=yes.");

const outputRoot = path.join(packRoot, "audiobooks");
const audioPath = path.join(outputRoot, `${levelId}.full.master.mp3`);
const timelinePath = path.join(outputRoot, `${levelId}.full.timeline.json`);
const spokenTranscriptPath = path.join(outputRoot, `${levelId}.full.spoken-transcript.txt`);
const provenancePath = path.join(outputRoot, `${levelId}.full.provenance.json`);
const alignmentPath = path.join(outputRoot, `${levelId}.full.alignment.json`);
for (const required of [audioPath, timelinePath, spokenTranscriptPath, provenancePath]) {
  if (!(await exists(required))) fail(`Missing assembled full-story input: ${required}`);
}

const [audio, draftTimelineText, spokenTranscriptFileText, provenanceText] = await Promise.all([
  readFile(audioPath),
  readFile(timelinePath, "utf8"),
  readFile(spokenTranscriptPath, "utf8"),
  readFile(provenancePath, "utf8"),
]);
const draftTimeline = JSON.parse(draftTimelineText);
const provenance = JSON.parse(provenanceText);
const audioSha256 = checksum(audio);
const spokenTranscriptSha256 = checksum(spokenTranscriptFileText);
if (provenance.output?.audioSha256 !== audioSha256) fail("Full-master audio checksum differs from provenance.");
if (provenance.output?.spokenTranscriptSha256 !== spokenTranscriptSha256) fail("Spoken transcript checksum differs from provenance.");
if (draftTimeline.buildFingerprint !== provenance.buildFingerprint) fail("Full timeline build fingerprint differs from provenance.");

const envPaths = [path.join(root, ".env.local")];
if (envFile) envPaths.unshift(path.resolve(root, envFile));
try {
  const commonGitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  envPaths.push(path.join(path.dirname(commonGitDir), ".env.local"));
} catch {
  // A standalone checkout may still use its own environment.
}
for (const candidate of new Set(envPaths)) {
  if (process.env.ELEVENLABS_API_KEY) break;
  try {
    process.loadEnvFile(candidate);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
if (!process.env.ELEVENLABS_API_KEY) fail("ELEVENLABS_API_KEY is missing from the local environment.");

const alignmentInput = spokenTranscriptFileText.replace(/\s+/g, " ").trim();
const form = new FormData();
form.append("file", new Blob([audio], { type: "audio/mpeg" }), `${levelId}.full.master.mp3`);
form.append("text", alignmentInput);
const response = await fetch("https://api.elevenlabs.io/v1/forced-alignment", {
  method: "POST",
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
  body: form,
});
if (!response.ok) fail(`Full-master Forced Alignment returned HTTP ${response.status}: ${await response.text()}`);
const alignment = await response.json();
if (!alignment?.characters?.length) fail("Full-master Forced Alignment returned no character timing.");

const alignedText = alignment.characters.map((character) => character.text).join("");
let searchFrom = 0;
const rawLines = draftTimeline.lines.map((line) => {
  const offset = alignedText.indexOf(line.text, searchFrom);
  if (offset < 0) fail(`Could not locate ${line.id} in final full-master alignment.`);
  searchFrom = offset + line.text.length;
  const timed = timedCharacters(alignment.characters, offset, offset + line.text.length);
  return {
    ...line,
    alignmentCharacterRange: [offset, offset + line.text.length],
    speechStart: timed.start,
    speechEnd: timed.end,
  };
});

const fullDuration = mediaDuration(audioPath);
const boundaries = rawLines.slice(0, -1).map((line, index) =>
  (line.speechEnd + rawLines[index + 1].speechStart) / 2
);
const lines = rawLines.map((line, index) => {
  const start = index === 0 ? Math.max(0, line.speechStart - 0.08) : boundaries[index - 1];
  const end = index === rawLines.length - 1 ? Math.min(fullDuration, line.speechEnd + 0.22) : boundaries[index];
  return {
    ...line,
    speechStart: Number(line.speechStart.toFixed(3)),
    speechEnd: Number(line.speechEnd.toFixed(3)),
    speechStartMs: milliseconds(line.speechStart),
    speechEndMs: milliseconds(line.speechEnd),
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    startMs: milliseconds(start),
    endMs: milliseconds(end),
  };
});
const lineMap = new Map(lines.map((line) => [line.id, line]));

const mimicItems = draftTimeline.mimicItems.map((item) => {
  const source = lineMap.get(item.sourceSentenceId);
  if (!source) fail(`${item.id} references a missing globally-namespaced source sentence.`);
  const [sourceFrom] = source.alignmentCharacterRange;
  const parentTimed = timedCharacters(alignment.characters, sourceFrom, sourceFrom + source.text.length);
  const rawChunks = item.chunks.map((chunk) => {
    const [from, to] = chunk.sourceTextRange;
    const timed = timedCharacters(alignment.characters, sourceFrom + from, sourceFrom + to);
    return { ...chunk, speechStart: timed.start, speechEnd: timed.end };
  });
  const chunks = rawChunks.map((chunk, index) => {
    const previous = rawChunks[index - 1];
    const next = rawChunks[index + 1];
    const startLimit = previous ? (previous.speechEnd + chunk.speechStart) / 2 : source.start;
    const endLimit = next ? (chunk.speechEnd + next.speechStart) / 2 : source.end;
    const start = Math.max(startLimit, chunk.speechStart - 0.06);
    const end = Math.min(endLimit, chunk.speechEnd + 0.08);
    return {
      ...chunk,
      speechStart: Number(chunk.speechStart.toFixed(3)),
      speechEnd: Number(chunk.speechEnd.toFixed(3)),
      speechStartMs: milliseconds(chunk.speechStart),
      speechEndMs: milliseconds(chunk.speechEnd),
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      startMs: milliseconds(start),
      endMs: milliseconds(end),
    };
  });
  return {
    ...item,
    chunks,
    speechStart: Number(parentTimed.start.toFixed(3)),
    speechEnd: Number(parentTimed.end.toFixed(3)),
    speechStartMs: milliseconds(parentTimed.start),
    speechEndMs: milliseconds(parentTimed.end),
    start: source.start,
    end: source.end,
    startMs: source.startMs,
    endMs: source.endMs,
  };
});

const beats = draftTimeline.beats.map((beat) => {
  const first = lineMap.get(beat.sentenceStart);
  const last = lineMap.get(beat.sentenceEnd);
  if (!first || !last) fail(`${beat.id} references missing sentence bounds.`);
  return { ...beat, start: first.start, end: last.end, startMs: first.startMs, endMs: last.endMs };
});
const chapters = draftTimeline.chapters.map((chapter) => {
  const chapterLines = lines.filter((line) => line.chapterId === chapter.chapterId);
  const first = chapterLines.at(0);
  const last = chapterLines.at(-1);
  if (!first || !last) fail(`${chapter.chapterId} has no aligned lines.`);
  return { ...chapter, start: first.start, end: last.end, startMs: first.startMs, endMs: last.endMs };
});

const generatedAt = new Date().toISOString();
const finalTimeline = {
  ...draftTimeline,
  generatedAt,
  duration: Number(fullDuration.toFixed(3)),
  durationMs: milliseconds(fullDuration),
  alignmentSource: "elevenlabs-forced-alignment",
  releaseAlignmentRequired: null,
  alignment: {
    file: path.relative(packRoot, alignmentPath),
    loss: alignment.loss ?? null,
    requestId: response.headers.get("request-id") ?? response.headers.get("x-request-id"),
    traceId: response.headers.get("x-trace-id"),
  },
  chapters,
  beats,
  lines,
  mimicItems,
};
const alignmentText = `${JSON.stringify(alignment)}\n`;
const finalTimelineText = `${JSON.stringify(finalTimeline, null, 2)}\n`;
const finalProvenance = {
  ...provenance,
  releaseTimingStatus: "full-master-forced-alignment-complete",
  fullMasterForcedAlignment: {
    provider: "ElevenLabs",
    generatedAt,
    requestId: finalTimeline.alignment.requestId,
    traceId: finalTimeline.alignment.traceId,
    loss: alignment.loss ?? null,
    alignment: path.relative(packRoot, alignmentPath),
    alignmentSha256: checksum(alignmentText),
    spokenTranscriptSha256,
  },
  output: {
    ...provenance.output,
    timelineSha256: checksum(finalTimelineText),
    alignment: path.relative(packRoot, alignmentPath),
    alignmentSha256: checksum(alignmentText),
  },
};
const finalProvenanceText = `${JSON.stringify(finalProvenance, null, 2)}\n`;
const suffix = `.tmp-${process.pid}`;
const temporaryAlignmentPath = `${alignmentPath}${suffix}`;
const temporaryTimelinePath = `${timelinePath}${suffix}`;
const temporaryProvenancePath = `${provenancePath}${suffix}`;
await writeFile(temporaryAlignmentPath, alignmentText);
await writeFile(temporaryTimelinePath, finalTimelineText);
await writeFile(temporaryProvenancePath, finalProvenanceText);
await rename(temporaryAlignmentPath, alignmentPath);
await rename(temporaryTimelinePath, timelinePath);
await rename(temporaryProvenancePath, provenancePath);

console.log(JSON.stringify({
  level: levelId,
  alignmentSource: finalTimeline.alignmentSource,
  durationSeconds: finalTimeline.duration,
  lines: lines.length,
  mimicItems: mimicItems.length,
  chunks: mimicItems.reduce((total, item) => total + item.chunks.length, 0),
  loss: alignment.loss ?? null,
  alignment: path.relative(packRoot, alignmentPath),
  timeline: path.relative(packRoot, timelinePath),
}, null, 2));
