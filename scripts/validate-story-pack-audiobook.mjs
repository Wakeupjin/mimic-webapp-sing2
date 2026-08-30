#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs/pinocchio/v3");
const supportedLevels = new Set(["foundation", "core", "studio"]);
const errors = [];

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function check(condition, message) {
  if (!condition) errors.push(message);
  return condition;
}

function fail(message) {
  throw new Error(message);
}

function relative(filePath) {
  return path.relative(packRoot, filePath);
}

function resolvePackPath(value, label) {
  if (!check(typeof value === "string" && value.length > 0, `${label}: path is missing.`)) return null;
  const resolved = path.resolve(packRoot, value);
  const insidePack = resolved === packRoot || resolved.startsWith(`${packRoot}${path.sep}`);
  if (!check(insidePack, `${label}: path escapes the Story Pack root.`)) return null;
  return resolved;
}

async function requiredFile(filePath, label, encoding) {
  try {
    return await readFile(filePath, encoding);
  } catch (error) {
    errors.push(`${label}: required file is missing or unreadable (${relative(filePath)}; ${error.code ?? error.message}).`);
    return null;
  }
}

function parseJson(text, label) {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message}).`);
    return null;
  }
}

function mediaDuration(filePath, label) {
  try {
    const value = Number(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      filePath,
    ], { encoding: "utf8" }).trim());
    if (!Number.isFinite(value) || value <= 0) fail("ffprobe returned an invalid duration");
    return value;
  } catch (error) {
    errors.push(`${label}: could not read MP3 duration (${error.message}).`);
    return null;
  }
}

function masterLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function exactJsonRange(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function checkMilliseconds(item, label, durationMs, speechRequired = false) {
  const startValid = Number.isInteger(item?.startMs) && Number.isInteger(item?.endMs);
  check(startValid, `${label}: integer startMs/endMs are required.`);
  if (startValid) {
    check(item.startMs >= 0 && item.endMs > item.startMs && item.endMs <= durationMs, `${label}: playback bounds fall outside the full master.`);
  }
  if (Number.isFinite(item?.start) && Number.isInteger(item?.startMs)) {
    check(Math.abs(item.start * 1000 - item.startMs) <= 1.1, `${label}: start and startMs disagree.`);
  }
  if (Number.isFinite(item?.end) && Number.isInteger(item?.endMs)) {
    check(Math.abs(item.end * 1000 - item.endMs) <= 1.1, `${label}: end and endMs disagree.`);
  }

  const hasSpeech = [item?.speechStartMs, item?.speechEndMs, item?.speechStart, item?.speechEnd]
    .some((value) => value !== undefined);
  if (speechRequired || hasSpeech) {
    const speechValid = Number.isInteger(item?.speechStartMs) && Number.isInteger(item?.speechEndMs);
    check(speechValid, `${label}: integer speechStartMs/speechEndMs are required.`);
    if (speechValid && startValid) {
      check(
        item.startMs <= item.speechStartMs
          && item.speechEndMs > item.speechStartMs
          && item.speechEndMs <= item.endMs,
        `${label}: exact speech bounds must sit inside the padded playback bounds.`,
      );
    }
    if (Number.isFinite(item?.speechStart) && Number.isInteger(item?.speechStartMs)) {
      check(Math.abs(item.speechStart * 1000 - item.speechStartMs) <= 1.1, `${label}: speechStart and speechStartMs disagree.`);
    }
    if (Number.isFinite(item?.speechEnd) && Number.isInteger(item?.speechEndMs)) {
      check(Math.abs(item.speechEnd * 1000 - item.speechEndMs) <= 1.1, `${label}: speechEnd and speechEndMs disagree.`);
    }
  }
}

function addGlobalId(seen, id, label) {
  if (!check(typeof id === "string" && id.length > 0, `${label}: global ID is missing.`)) return;
  check(!seen.has(id), `${label}: duplicate global ID ${id}.`);
  seen.add(id);
}

async function loadJsonFile(filePath, label) {
  const text = await requiredFile(filePath, label, "utf8");
  return { text, value: parseJson(text, label) };
}

async function loadChapterSources(levelId, manifest, narrator) {
  const sources = [];
  for (const [index, manifestChapter] of manifest.chapters.entries()) {
    const expectedNumber = index + 1;
    check(manifestChapter.number === expectedNumber, `${levelId}: manifest Chapter order must be 1–12.`);
    const chapterPath = resolvePackPath(manifestChapter.path, `${levelId}/Chapter ${expectedNumber}`);
    if (!chapterPath) continue;
    const chapterFile = await loadJsonFile(chapterPath, `${levelId}/Chapter ${expectedNumber} definition`);
    const chapter = chapterFile.value;
    if (!chapter) continue;
    check(chapter.chapterId === `chapter-${String(expectedNumber).padStart(2, "0")}`, `${levelId}/Chapter ${expectedNumber}: canonical Chapter ID differs.`);
    check(chapter.number === expectedNumber, `${levelId}/${chapter.chapterId}: Chapter number differs.`);
    const level = chapter.levels?.[levelId];
    if (!check(Boolean(level?.master && level?.activities && level?.production), `${levelId}/${chapter.chapterId}: authored level files are incomplete.`)) continue;
    const chapterRoot = path.dirname(chapterPath);
    const masterPath = path.resolve(chapterRoot, level.master);
    const activitiesPath = path.resolve(chapterRoot, level.activities);
    const productionPath = path.resolve(chapterRoot, level.production);
    const [masterText, activitiesFile, productionFile] = await Promise.all([
      requiredFile(masterPath, `${levelId}/${chapter.chapterId} master transcript`, "utf8"),
      loadJsonFile(activitiesPath, `${levelId}/${chapter.chapterId} activities`),
      loadJsonFile(productionPath, `${levelId}/${chapter.chapterId} production`),
    ]);
    const activities = activitiesFile.value;
    const production = productionFile.value;
    if (masterText === null || !activities || !production) continue;
    check(activities.schemaVersion === "1.1.0", `${levelId}/${chapter.chapterId}: nested activities schema 1.1.0 is required.`);
    check(production.provider?.voiceId === narrator.voiceId, `${levelId}/${chapter.chapterId}: production narrator is not the approved narrator.`);

    const audioPath = resolvePackPath(production.outputs?.masterAudio, `${levelId}/${chapter.chapterId} source audio`);
    const timelinePath = resolvePackPath(production.outputs?.sentenceTimeline, `${levelId}/${chapter.chapterId} source timeline`);
    const provenancePath = resolvePackPath(production.outputs?.provenance, `${levelId}/${chapter.chapterId} source provenance`);
    if (!audioPath || !timelinePath || !provenancePath) continue;
    const [audio, timelineText, sourceProvenanceText] = await Promise.all([
      requiredFile(audioPath, `${levelId}/${chapter.chapterId} source audio`),
      requiredFile(timelinePath, `${levelId}/${chapter.chapterId} source timeline`, "utf8"),
      requiredFile(provenancePath, `${levelId}/${chapter.chapterId} source provenance`, "utf8"),
    ]);
    if (audio === null || timelineText === null || sourceProvenanceText === null) continue;
    const chapterDuration = mediaDuration(audioPath, `${levelId}/${chapter.chapterId} source audio`);
    sources.push({
      chapter,
      level,
      masterPath,
      masterText,
      masterSha256: checksum(masterText),
      activitiesPath,
      activities,
      activitiesSha256: checksum(activitiesFile.text),
      production,
      audioPath,
      audioSha256: checksum(audio),
      duration: chapterDuration,
      timelinePath,
      timelineSha256: checksum(timelineText),
      provenancePath,
      provenanceSha256: checksum(sourceProvenanceText),
    });
  }
  check(sources.length === 12, `${levelId}: all twelve current Chapter sources must be readable before the full audiobook can pass.`);
  return sources;
}

async function validateLevel(levelId, manifest, narrator) {
  const errorStart = errors.length;
  const outputRoot = path.join(packRoot, "audiobooks");
  const paths = {
    audio: path.join(outputRoot, `${levelId}.full.master.mp3`),
    timeline: path.join(outputRoot, `${levelId}.full.timeline.json`),
    transcript: path.join(outputRoot, `${levelId}.full.transcript.txt`),
    spokenTranscript: path.join(outputRoot, `${levelId}.full.spoken-transcript.txt`),
    provenance: path.join(outputRoot, `${levelId}.full.provenance.json`),
    alignment: path.join(outputRoot, `${levelId}.full.alignment.json`),
  };
  const [audio, timelineFile, transcript, spokenTranscript, provenanceFile, alignmentFile] = await Promise.all([
    requiredFile(paths.audio, `${levelId} full master MP3`),
    loadJsonFile(paths.timeline, `${levelId} final timeline`),
    requiredFile(paths.transcript, `${levelId} display transcript`, "utf8"),
    requiredFile(paths.spokenTranscript, `${levelId} spoken transcript`, "utf8"),
    loadJsonFile(paths.provenance, `${levelId} full provenance`),
    loadJsonFile(paths.alignment, `${levelId} raw full-master Forced Alignment`),
  ]);
  const timeline = timelineFile.value;
  const provenance = provenanceFile.value;
  const alignment = alignmentFile.value;
  if (audio === null || transcript === null || spokenTranscript === null || !timeline || !provenance || !alignment) {
    return { level: levelId, ok: false, chapters: 0, lines: 0, mimicItems: 0, chunks: 0 };
  }

  const durationSeconds = mediaDuration(paths.audio, `${levelId} full master MP3`);
  const durationMs = durationSeconds === null ? null : Math.round(durationSeconds * 1000);
  if (durationMs === null) return { level: levelId, ok: false, chapters: 0, lines: 0, mimicItems: 0, chunks: 0 };

  const canonical = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, relative(value)]));
  const output = provenance.output ?? {};
  check(output.audio === canonical.audio, `${levelId}: provenance must point to the one canonical full master MP3.`);
  check(output.timeline === canonical.timeline, `${levelId}: provenance must point to the canonical final timeline.`);
  check(output.transcript === canonical.transcript, `${levelId}: provenance must point to the canonical display transcript.`);
  check(output.spokenTranscript === canonical.spokenTranscript, `${levelId}: provenance must point to the canonical spoken transcript.`);
  check(output.alignment === canonical.alignment, `${levelId}: provenance must point to the canonical raw Forced Alignment.`);
  check(timeline.alignment?.file === canonical.alignment, `${levelId}: timeline must point to the canonical raw Forced Alignment.`);
  check(provenance.fullMasterForcedAlignment?.alignment === canonical.alignment, `${levelId}: full-master alignment provenance path differs.`);

  const outputHashes = {
    audioSha256: checksum(audio),
    timelineSha256: checksum(timelineFile.text),
    transcriptSha256: checksum(transcript),
    spokenTranscriptSha256: checksum(spokenTranscript),
    alignmentSha256: checksum(alignmentFile.text),
  };
  for (const [key, value] of Object.entries(outputHashes)) {
    check(output[key] === value, `${levelId}: provenance ${key} is stale.`);
  }
  check(
    provenance.fullMasterForcedAlignment?.alignmentSha256 === outputHashes.alignmentSha256,
    `${levelId}: full-master alignment checksum is stale.`,
  );
  check(
    provenance.fullMasterForcedAlignment?.spokenTranscriptSha256 === outputHashes.spokenTranscriptSha256,
    `${levelId}: full-master alignment transcript checksum is stale.`,
  );

  check(timeline.schemaVersion === "1.1.0", `${levelId}: final timeline schema 1.1.0 is required.`);
  check(timeline.storyPackId === manifest.storyPackId && provenance.storyPackId === manifest.storyPackId, `${levelId}: Story Pack identity differs.`);
  check(timeline.level === levelId && provenance.level === levelId, `${levelId}: level identity differs.`);
  check(timeline.kind === "full-story-audiobook-master" && provenance.kind === "full-story-audiobook-master", `${levelId}: output kind differs.`);
  check(timeline.timingPrecision === "milliseconds", `${levelId}: final timeline must declare millisecond precision.`);
  check(timeline.alignmentSource === "elevenlabs-forced-alignment", `${levelId}: release timing must come from final full-master Forced Alignment.`);
  check(timeline.releaseAlignmentRequired === null, `${levelId}: final full-master alignment is still marked as required.`);
  check(provenance.releaseTimingStatus === "full-master-forced-alignment-complete", `${levelId}: provenance does not mark release timing complete.`);
  check(provenance.fullMasterForcedAlignment?.provider === "ElevenLabs", `${levelId}: Forced Alignment provider differs.`);
  check(timeline.buildFingerprint === provenance.buildFingerprint, `${levelId}: timeline and provenance build fingerprints differ.`);
  check(/^sha256:[a-f0-9]{64}$/.test(timeline.buildFingerprint ?? ""), `${levelId}: build fingerprint is malformed.`);
  check(timeline.durationMs === durationMs, `${levelId}: timeline durationMs differs from the MP3.`);
  check(Math.abs((timeline.duration ?? 0) - durationSeconds) <= 0.05, `${levelId}: timeline duration differs from the MP3.`);
  check(Math.abs((output.duration ?? 0) - durationSeconds) <= 0.05, `${levelId}: provenance duration differs from the MP3.`);

  for (const [field, expected] of Object.entries(narrator)) {
    check(timeline.narrator?.[field] === expected, `${levelId}: timeline narrator ${field} differs from policy.`);
    check(provenance.narrator?.[field] === expected, `${levelId}: provenance narrator ${field} differs from policy.`);
  }

  const sources = await loadChapterSources(levelId, manifest, narrator);
  if (sources.length === 12) {
    const provenanceChapters = provenance.chapters ?? [];
    check(provenanceChapters.length === 12, `${levelId}: provenance must contain exactly twelve Chapters.`);
    for (const [index, source] of sources.entries()) {
      const entry = provenanceChapters[index];
      const label = `${levelId}/${source.chapter.chapterId}`;
      if (!check(Boolean(entry), `${label}: missing from full-master provenance.`)) continue;
      check(entry.chapterId === source.chapter.chapterId, `${label}: provenance Chapter order differs.`);
      check(entry.audio === relative(source.audioPath), `${label}: provenance audio path differs.`);
      check(entry.audioSha256 === source.audioSha256, `${label}: source audio checksum is stale.`);
      check(entry.transcript === relative(source.masterPath), `${label}: provenance transcript path differs.`);
      check(entry.transcriptSha256 === checksum(`${source.masterText.trimEnd()}\n`), `${label}: source transcript checksum is stale.`);
      check(entry.activities === relative(source.activitiesPath), `${label}: provenance activities path differs.`);
      check(entry.activitiesSha256 === source.activitiesSha256, `${label}: source activities checksum is stale.`);
      check(entry.timelineSha256 === source.timelineSha256, `${label}: source timeline checksum is stale.`);
      check(entry.provenanceSha256 === source.provenanceSha256, `${label}: source provenance checksum is stale.`);
      if (source.duration !== null) check(Math.abs((entry.duration ?? 0) - source.duration) <= 0.05, `${label}: source duration is stale.`);
    }

    const buildInputs = sources.map((source) => ({
      chapterId: source.chapter.chapterId,
      scriptSha256: source.masterSha256,
      activitiesSha256: source.activitiesSha256,
      timelineSha256: source.timelineSha256,
      audioSha256: source.audioSha256,
      voiceId: narrator.voiceId,
    }));
    const gapMs = timeline.chapterGapMs;
    check(Number.isInteger(gapMs) && gapMs >= 0, `${levelId}: chapterGapMs is invalid.`);
    check(provenance.method?.chapterGapMs === gapMs, `${levelId}: Chapter gap differs between timeline and provenance.`);
    check(manifest.fullStoryOutputs?.chapterGapMilliseconds === gapMs, `${levelId}: Chapter gap differs from the Story Pack manifest.`);
    const expectedFingerprint = `sha256:${checksum(JSON.stringify({ levelId, gapMs, buildInputs }))}`;
    check(timeline.buildFingerprint === expectedFingerprint, `${levelId}: build fingerprint is stale against the current twelve Chapter inputs.`);

    const expectedDisplayTranscript = `${sources.map((source) =>
      `CHAPTER ${String(source.chapter.number).padStart(2, "0")} — ${source.chapter.titles.en}\n\n${source.masterText.trimEnd()}`
    ).join("\n\n")}\n`;
    const expectedSpokenTranscript = `${sources.map((source) => source.masterText.trimEnd()).join("\n\n")}\n`;
    check(transcript === expectedDisplayTranscript, `${levelId}: display transcript is not the exact current twelve-Chapter text.`);
    check(spokenTranscript === expectedSpokenTranscript, `${levelId}: spoken transcript is not the exact current twelve-Chapter text.`);

    const expectedLines = sources.flatMap((source) => {
      const beatRanges = source.level.beatRanges ?? source.chapter.beats ?? [];
      return masterLines(source.masterText).map((text, index) => {
        const sentenceId = `S${String(index + 1).padStart(3, "0")}`;
        const beat = beatRanges.find((candidate) => {
          const start = Number(candidate.sentenceStart?.slice(1));
          const end = Number(candidate.sentenceEnd?.slice(1));
          return index + 1 >= start && index + 1 <= end;
        });
        return {
          chapterId: source.chapter.chapterId,
          sentenceId,
          id: `${source.chapter.chapterId}-${sentenceId}`,
          beatId: beat?.beatId,
          text,
        };
      });
    });
    const lines = timeline.lines ?? [];
    check(lines.length === expectedLines.length, `${levelId}: final timeline line count differs from the spoken transcript.`);
    const seenIds = new Set();
    const lineMap = new Map();
    for (const [index, expected] of expectedLines.entries()) {
      const line = lines[index];
      const label = `${levelId}/line ${index + 1}`;
      if (!check(Boolean(line), `${label}: missing from final timeline.`)) continue;
      check(line.id === expected.id, `${label}: global sentence ID differs.`);
      check(line.chapterId === expected.chapterId, `${label}: Chapter identity differs.`);
      check(line.sentenceId === expected.sentenceId && line.chapterSentenceId === expected.sentenceId, `${label}: local sentence ID differs.`);
      check(line.beatId === `${expected.chapterId}-${expected.beatId}` && line.chapterBeatId === expected.beatId, `${label}: global or local beat reference differs.`);
      check(line.text === expected.text, `${label}: text differs from the exact spoken transcript line.`);
      addGlobalId(seenIds, line.id, label);
      lineMap.set(line.id, line);
      checkMilliseconds(line, label, durationMs, true);
    }

    const characters = alignment.characters ?? [];
    check(Array.isArray(characters) && characters.length > 0, `${levelId}: raw Forced Alignment has no characters.`);
    const alignedText = Array.isArray(characters) ? characters.map((character) => character.text).join("") : "";
    const alignmentInput = spokenTranscript.replace(/\s+/g, " ").trim();
    check(alignedText === alignmentInput, `${levelId}: raw Forced Alignment text differs from the spoken transcript supplied to alignment.`);
    let lastCharacterEnd = 0;
    for (const [index, character] of characters.entries()) {
      if (!Number.isFinite(character.start) || !Number.isFinite(character.end)) continue;
      check(character.start >= 0 && character.end >= character.start && character.end <= durationSeconds, `${levelId}/alignment character ${index}: timing falls outside the MP3.`);
      check(character.start + 0.002 >= lastCharacterEnd, `${levelId}/alignment character ${index}: timing moves backward.`);
      lastCharacterEnd = Math.max(lastCharacterEnd, character.end);
    }
    for (const line of lines) {
      const [from, to] = line.alignmentCharacterRange ?? [];
      const label = `${levelId}/${line.id}`;
      check(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to > from && to <= characters.length, `${label}: alignment character range is invalid.`);
      if (Number.isInteger(from) && Number.isInteger(to)) {
        check(alignedText.slice(from, to) === line.text, `${label}: alignment character range does not reproduce the exact line.`);
      }
    }

    const chapterRanges = timeline.chapters ?? [];
    check(chapterRanges.length === 12, `${levelId}: final timeline must contain exactly twelve Chapter ranges.`);
    let previousChapterEnd = 0;
    for (const [index, source] of sources.entries()) {
      const item = chapterRanges[index];
      const label = `${levelId}/${source.chapter.chapterId} range`;
      if (!check(Boolean(item), `${label}: missing.`)) continue;
      check(item.chapterId === source.chapter.chapterId && item.number === source.chapter.number, `${label}: Chapter identity or order differs.`);
      check(item.title === source.chapter.titles.en, `${label}: Chapter title differs.`);
      checkMilliseconds(item, label, durationMs);
      if (Number.isInteger(item.startMs) && Number.isInteger(item.endMs)) {
        check(item.startMs >= previousChapterEnd, `${label}: Chapter ranges overlap or move backward.`);
        previousChapterEnd = item.endMs;
      }
      addGlobalId(seenIds, item.chapterId, label);
    }

    const expectedBeats = sources.flatMap((source) => {
      const ranges = source.level.beatRanges ?? source.chapter.beats ?? [];
      return ranges.map((beat) => ({
        chapterId: source.chapter.chapterId,
        id: `${source.chapter.chapterId}-${beat.beatId}`,
        beatId: beat.beatId,
        sentenceStart: `${source.chapter.chapterId}-${beat.sentenceStart}`,
        sentenceEnd: `${source.chapter.chapterId}-${beat.sentenceEnd}`,
      }));
    });
    const beats = timeline.beats ?? [];
    check(beats.length === expectedBeats.length, `${levelId}: final timeline beat count differs from the twelve Chapter definitions.`);
    for (const [index, expected] of expectedBeats.entries()) {
      const beat = beats[index];
      const label = `${levelId}/beat ${index + 1}`;
      if (!check(Boolean(beat), `${label}: missing.`)) continue;
      check(beat.id === expected.id && beat.beatId === expected.id, `${label}: global beat ID differs.`);
      check(beat.chapterId === expected.chapterId && beat.chapterBeatId === expected.beatId, `${label}: local beat identity differs.`);
      check(beat.sentenceStart === expected.sentenceStart && beat.sentenceEnd === expected.sentenceEnd, `${label}: sentence bounds differ.`);
      check(lineMap.has(beat.sentenceStart) && lineMap.has(beat.sentenceEnd), `${label}: sentence bounds reference missing lines.`);
      addGlobalId(seenIds, beat.id, label);
      checkMilliseconds(beat, label, durationMs);
    }

    const expectedMimic = sources.flatMap((source) => (source.activities.mimic ?? []).map((item) => ({ source, item })));
    const mimicItems = timeline.mimicItems ?? [];
    check(expectedMimic.length === 360, `${levelId}: authored activities must contain 360 Mimic parents.`);
    check(mimicItems.length === 360, `${levelId}: final timeline must contain exactly 360 Mimic parents.`);
    const mimicPerChapter = new Map();
    const mimicSourceIds = new Set();
    let chunkCount = 0;
    for (const [index, expected] of expectedMimic.entries()) {
      const timed = mimicItems[index];
      const authored = expected.item;
      const chapterId = expected.source.chapter.chapterId;
      const expectedId = `${chapterId}-${authored.id}`;
      const expectedSourceId = `${chapterId}-${authored.sourceSentenceId}`;
      const label = `${levelId}/${expectedId}`;
      if (!check(Boolean(timed), `${label}: missing from final timeline.`)) continue;
      check(timed.id === expectedId && timed.chapterItemId === authored.id, `${label}: global or local Mimic ID differs.`);
      check(timed.chapterId === chapterId, `${label}: Chapter identity differs.`);
      check(timed.sourceSentenceId === expectedSourceId && timed.chapterSourceSentenceId === authored.sourceSentenceId, `${label}: source sentence identity differs.`);
      check(timed.beatId === `${chapterId}-${authored.beatId}` && timed.chapterBeatId === authored.beatId, `${label}: global or local beat reference differs.`);
      check(timed.text === authored.text, `${label}: parent text differs from authored activities.`);
      check(exactJsonRange(timed.sourceTextRange, authored.sourceTextRange), `${label}: parent source text range differs.`);
      check(exactJsonRange(timed.sourceTextRange, [0, timed.text?.length]), `${label}: parent must span the complete source sentence.`);
      check(lineMap.get(expectedSourceId)?.text === timed.text, `${label}: parent is not the exact referenced transcript line.`);
      addGlobalId(seenIds, timed.id, label);
      check(!mimicSourceIds.has(timed.sourceSentenceId), `${label}: source sentence is selected more than once.`);
      mimicSourceIds.add(timed.sourceSentenceId);
      mimicPerChapter.set(chapterId, (mimicPerChapter.get(chapterId) ?? 0) + 1);
      checkMilliseconds(timed, label, durationMs, true);
      const sourceLine = lineMap.get(expectedSourceId);
      if (sourceLine) {
        for (const field of ["startMs", "endMs", "speechStartMs", "speechEndMs"]) {
          check(timed[field] === sourceLine[field], `${label}: parent ${field} differs from its aligned source line.`);
        }
      }

      const authoredChunks = authored.chunks ?? [];
      const chunks = timed.chunks ?? [];
      check(chunks.length === authoredChunks.length && chunks.length >= 1, `${label}: nested chunk count differs.`);
      let previousTextTo = 0;
      let previousChunk = null;
      for (const [chunkIndex, authoredChunk] of authoredChunks.entries()) {
        const chunk = chunks[chunkIndex];
        const expectedChunkId = `${chapterId}-${authoredChunk.chunkId}`;
        const chunkLabel = `${label}/${expectedChunkId}`;
        if (!check(Boolean(chunk), `${chunkLabel}: missing.`)) continue;
        const [from, to] = chunk.sourceTextRange ?? [];
        const wordCount = chunk.text?.split(/\s+/).filter(Boolean).length ?? 0;
        check(chunk.chunkId === expectedChunkId && chunk.chapterChunkId === authoredChunk.chunkId, `${chunkLabel}: global or local chunk ID differs.`);
        check(chunk.text === authoredChunk.text, `${chunkLabel}: chunk text differs from authored activities.`);
        check(exactJsonRange(chunk.sourceTextRange, authoredChunk.sourceTextRange), `${chunkLabel}: source range differs from authored activities.`);
        check(chunk.part === chunkIndex + 1 && chunk.parts === chunks.length, `${chunkLabel}: part metadata differs.`);
        check(Number.isInteger(from) && Number.isInteger(to) && from >= previousTextTo && to > from && to <= timed.text.length, `${chunkLabel}: source range is invalid or overlaps.`);
        if (Number.isInteger(from) && Number.isInteger(to)) {
          check(/^\s*$/.test(timed.text.slice(previousTextTo, from)), `${chunkLabel}: chunks skip non-space source text.`);
          check(timed.text.slice(from, to) === chunk.text, `${chunkLabel}: chunk is not an exact source-text slice.`);
          previousTextTo = to;
        }
        check(wordCount >= 2 && wordCount <= 12, `${chunkLabel}: chunk must contain 2–12 words.`);
        addGlobalId(seenIds, chunk.chunkId, chunkLabel);
        checkMilliseconds(chunk, chunkLabel, durationMs, true);
        if (Number.isInteger(timed.startMs) && Number.isInteger(timed.endMs) && Number.isInteger(chunk.startMs) && Number.isInteger(chunk.endMs)) {
          check(chunk.startMs >= timed.startMs && chunk.endMs <= timed.endMs, `${chunkLabel}: padded chunk falls outside its parent sentence.`);
        }
        if (previousChunk) {
          check(previousChunk.endMs <= chunk.startMs, `${chunkLabel}: padded playback overlaps the previous sibling chunk.`);
          check(previousChunk.speechEndMs <= chunk.speechStartMs, `${chunkLabel}: exact speech overlaps the previous sibling chunk.`);
        }
        previousChunk = chunk;
        chunkCount += 1;
      }
      check(/^\s*$/.test(timed.text.slice(previousTextTo)), `${label}: chunks do not cover the complete parent sentence.`);
      const sentenceWords = timed.text?.split(/\s+/).filter(Boolean).length ?? 0;
      check(sentenceWords <= 12 ? chunks.length === 1 : chunks.length >= 2, `${label}: nested chunk count does not match sentence length.`);
    }
    for (const source of sources) {
      check((mimicPerChapter.get(source.chapter.chapterId) ?? 0) === 30, `${levelId}/${source.chapter.chapterId}: final timeline must contain exactly 30 Mimic parents.`);
    }
    check(mimicSourceIds.size === 360, `${levelId}: all 360 Mimic parents must reference unique source sentences.`);

    return {
      level: levelId,
      ok: errors.length === errorStart,
      chapters: chapterRanges.length,
      lines: lines.length,
      mimicItems: mimicItems.length,
      chunks: chunkCount,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      buildFingerprint: timeline.buildFingerprint,
    };
  }

  return { level: levelId, ok: false, chapters: 0, lines: 0, mimicItems: 0, chunks: 0 };
}

const manifestFile = await loadJsonFile(path.join(packRoot, "manifest.json"), "Story Pack manifest");
const manifest = manifestFile.value;
if (!manifest) fail("Cannot validate full audiobooks without a readable Story Pack manifest.");
check(Array.isArray(manifest.chapters) && manifest.chapters.length === 12, "Story Pack manifest must contain exactly twelve Chapters.");

const narratorPolicyPath = resolvePackPath(manifest.narratorPolicy, "Narrator policy");
const narratorPolicyFile = narratorPolicyPath ? await loadJsonFile(narratorPolicyPath, "Narrator policy") : { value: null };
const narratorDecision = narratorPolicyFile.value?.decision;
if (!narratorDecision) fail("Cannot validate full audiobooks without an approved narrator policy.");
check(narratorPolicyFile.value.status === "approved-for-batch-production", "Narrator policy is not approved for batch production.");
const narrator = {
  name: narratorDecision.displayName,
  voiceId: narratorDecision.voiceId,
  accent: narratorDecision.accent,
};
check(Boolean(narrator.name && narrator.voiceId && narrator.accent), "Narrator policy is incomplete.");

const selectedArgument = argument("levels") ?? argument("level") ?? "foundation,core,studio";
const selectedLevels = selectedArgument.split(",").map((value) => value.trim()).filter(Boolean);
if (!selectedLevels.length) fail("Select at least one level with --levels=foundation,core,studio.");
if (new Set(selectedLevels).size !== selectedLevels.length) fail("Selected levels must be unique.");
for (const levelId of selectedLevels) {
  if (!supportedLevels.has(levelId)) fail(`Unknown level: ${levelId}`);
}

const results = [];
for (const levelId of selectedLevels) results.push(await validateLevel(levelId, manifest, narrator));

const report = {
  ok: errors.length === 0,
  storyPackId: manifest.storyPackId,
  narrator,
  selectedLevels,
  results,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
