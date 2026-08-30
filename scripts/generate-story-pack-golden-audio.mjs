#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIMING_EPSILON_SECONDS = 1e-6;

function argument(name, fallback = undefined) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sentenceIndex(sentenceId) {
  const match = /^S(\d{3})$/.exec(sentenceId ?? "");
  if (!match) fail(`Invalid sentence ID: ${sentenceId}`);
  return Number(match[1]) - 1;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
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
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath],
      { encoding: "utf8" },
    ).trim(),
  );
}

function milliseconds(seconds) {
  return Math.round(seconds * 1000);
}

function timedCharacterRange(alignment, from, to) {
  let start = null;
  let end = null;
  for (let index = from; index < to; index += 1) {
    const characterStart = alignment.character_start_times_seconds[index];
    const characterEnd = alignment.character_end_times_seconds[index];
    if (Number.isFinite(characterStart) && start === null) start = characterStart;
    if (Number.isFinite(characterEnd)) end = characterEnd;
  }
  if (start === null || end === null) fail(`Alignment is missing characters ${from}-${to}.`);
  return { start, end };
}

function validateActivitiesForGeneration(activities, sentenceRecords) {
  if (activities.schemaVersion !== "1.1.0") fail("Golden audio requires nested Mimic activities schema 1.1.0.");
  if (!Array.isArray(activities.mimic) || activities.mimic.length !== 30) {
    fail("Golden audio requires exactly 30 Mimic source sentences.");
  }
  if (new Set(activities.mimic.map((item) => item.sourceSentenceId)).size !== 30) {
    fail("Golden audio requires 30 unique Mimic source sentences.");
  }
  const sentenceMap = new Map(sentenceRecords.map((sentence) => [sentence.sentenceId, sentence]));
  for (const item of activities.mimic) {
    const source = sentenceMap.get(item.sourceSentenceId);
    if (!source) fail(`${item.id} references a missing source sentence.`);
    if (item.text !== source.text || item.sourceTextRange?.[0] !== 0 || item.sourceTextRange?.[1] !== source.text.length) {
      fail(`${item.id} must retain its complete source sentence.`);
    }
    if (item.beatId !== source.beatId) fail(`${item.id} references the wrong narrative beat.`);
    if (!Array.isArray(item.chunks) || item.chunks.length < 1) fail(`${item.id} requires nested practice chunks.`);
    let previousTo = 0;
    for (const [index, chunk] of item.chunks.entries()) {
      const [from, to] = chunk.sourceTextRange ?? [];
      const expectedChunkId = `${item.id}-C${String(index + 1).padStart(2, "0")}`;
      if (chunk.chunkId !== expectedChunkId || chunk.part !== index + 1 || chunk.parts !== item.chunks.length) {
        fail(`${item.id} has invalid chunk identity or part metadata.`);
      }
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < previousTo || to <= from || to > source.text.length) {
        fail(`${item.id}/${chunk.chunkId} has an invalid or overlapping source range.`);
      }
      if (!/^\s*$/.test(source.text.slice(previousTo, from))) fail(`${item.id}/${chunk.chunkId} skips source text.`);
      if (source.text.slice(from, to) !== chunk.text || chunk.text !== chunk.text.trim()) {
        fail(`${item.id}/${chunk.chunkId} must be an exact trimmed source range.`);
      }
      const words = chunk.text.split(/\s+/).filter(Boolean).length;
      if (words < 2 || words > 12) fail(`${item.id}/${chunk.chunkId} must contain 2–12 words.`);
      previousTo = to;
    }
    if (!/^\s*$/.test(source.text.slice(previousTo))) fail(`${item.id} chunks do not rebuild the full source sentence.`);
    const sentenceWords = source.text.split(/\s+/).filter(Boolean).length;
    if ((sentenceWords <= 12 && item.chunks.length !== 1) || (sentenceWords > 12 && item.chunks.length < 2)) {
      fail(`${item.id} chunk count does not match the source sentence length.`);
    }
  }
}

function buildSentenceTimeline(rawSentences, duration, activities, chapter) {
  const boundaries = rawSentences.slice(0, -1).map((sentence, index) => {
    const nextSentence = rawSentences[index + 1];
    return (sentence.speechEnd + nextSentence.speechStart) / 2;
  });
  const rawPlaybackBounds = new Map();
  const lines = rawSentences.map((sentence, index) => {
    const start = index === 0 ? Math.max(0, sentence.speechStart - 0.08) : boundaries[index - 1];
    const end = index === rawSentences.length - 1 ? Math.min(duration, sentence.speechEnd + 0.22) : boundaries[index];
    rawPlaybackBounds.set(sentence.sentenceId, { start, end });
    return {
      sentenceId: sentence.sentenceId,
      beatId: sentence.beatId,
      text: sentence.text,
      speechStart: Number(sentence.speechStart.toFixed(3)),
      speechEnd: Number(sentence.speechEnd.toFixed(3)),
      speechStartMs: milliseconds(sentence.speechStart),
      speechEndMs: milliseconds(sentence.speechEnd),
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      startMs: milliseconds(start),
      endMs: milliseconds(end),
    };
  });
  const lineMap = new Map(lines.map((line) => [line.sentenceId, line]));
  const rawLineMap = new Map(rawSentences.map((line) => [line.sentenceId, line]));
  const mimicItems = activities.mimic.map((item) => {
    const source = lineMap.get(item.sourceSentenceId);
    const rawSource = rawLineMap.get(item.sourceSentenceId);
    const sourceBounds = rawPlaybackBounds.get(item.sourceSentenceId);
    if (!source || !rawSource || !sourceBounds) fail(`${item.id} references a missing generated master sentence.`);
    const [from, to] = item.sourceTextRange ?? [0, source.text.length];
    if (from !== 0 || to !== source.text.length || item.text !== source.text) {
      fail(`${item.id} must retain its complete source sentence.`);
    }
    const characterAlignment = {
      character_start_times_seconds: rawSource.characterStartTimesSeconds,
      character_end_times_seconds: rawSource.characterEndTimesSeconds,
    };
    const timed = timedCharacterRange(characterAlignment, from, to);
    const start = Math.max(sourceBounds.start, timed.start - 0.06);
    const end = Math.min(sourceBounds.end, timed.end + 0.08);
    const chunkSpeechTimings = (item.chunks ?? []).map((chunk) => {
      const [chunkFrom, chunkTo] = chunk.sourceTextRange ?? [];
      if (source.text.slice(chunkFrom, chunkTo) !== chunk.text) {
        fail(`${item.id}/${chunk.chunkId} is not an exact contiguous source-sentence range.`);
      }
      const chunkTimed = timedCharacterRange(characterAlignment, chunkFrom, chunkTo);
      return { chunk, chunkFrom, chunkTo, chunkTimed };
    });
    const chunkBoundaries = chunkSpeechTimings.slice(0, -1).map(({ chunk, chunkTimed }, index) => {
      const next = chunkSpeechTimings[index + 1];
      if (chunkTimed.end > next.chunkTimed.start) {
        fail(`${item.id}/${chunk.chunkId} overlaps ${next.chunk.chunkId} in the speech alignment.`);
      }
      return (chunkTimed.end + next.chunkTimed.start) / 2;
    });
    const chunks = chunkSpeechTimings.map(({ chunk, chunkFrom, chunkTo, chunkTimed }, index) => {
      const lowerBoundary =
        index === 0 ? sourceBounds.start : Math.max(sourceBounds.start, chunkBoundaries[index - 1]);
      const upperBoundary =
        index === chunkSpeechTimings.length - 1
          ? sourceBounds.end
          : Math.min(sourceBounds.end, chunkBoundaries[index]);
      const chunkStart = Math.max(lowerBoundary, chunkTimed.start - 0.06);
      const chunkEnd = Math.min(upperBoundary, chunkTimed.end + 0.08);
      if (
        chunkStart - chunkTimed.start > TIMING_EPSILON_SECONDS ||
        chunkTimed.end - chunkEnd > TIMING_EPSILON_SECONDS
      ) {
        fail(`${item.id}/${chunk.chunkId} cannot be padded without clipping aligned speech.`);
      }
      return {
        chunkId: chunk.chunkId,
        text: chunk.text,
        sourceTextRange: [chunkFrom, chunkTo],
        part: chunk.part,
        parts: chunk.parts,
        speechStart: Number(chunkTimed.start.toFixed(3)),
        speechEnd: Number(chunkTimed.end.toFixed(3)),
        speechStartMs: milliseconds(chunkTimed.start),
        speechEndMs: milliseconds(chunkTimed.end),
        start: Number(chunkStart.toFixed(3)),
        end: Number(chunkEnd.toFixed(3)),
        startMs: milliseconds(chunkStart),
        endMs: milliseconds(chunkEnd),
      };
    });
    return {
      id: item.id,
      sourceSentenceId: item.sourceSentenceId,
      beatId: item.beatId,
      text: item.text,
      sourceTextRange: [from, to],
      chunks,
      speechStart: Number(timed.start.toFixed(3)),
      speechEnd: Number(timed.end.toFixed(3)),
      speechStartMs: milliseconds(timed.start),
      speechEndMs: milliseconds(timed.end),
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      startMs: milliseconds(start),
      endMs: milliseconds(end),
    };
  });
  const beats = chapter.beats.map((beat) => {
    const first = lineMap.get(beat.sentenceStart);
    const last = lineMap.get(beat.sentenceEnd);
    return {
      beatId: beat.beatId,
      title: beat.title,
      sentenceStart: beat.sentenceStart,
      sentenceEnd: beat.sentenceEnd,
      start: first.start,
      end: last.end,
      startMs: first.startMs,
      endMs: last.endMs,
    };
  });
  return { lines, mimicItems, beats };
}

function locateSentencesInCharacterAlignment(sentences, alignment, globalOffset = 0) {
  if (!alignment?.characters?.length) fail("ElevenLabs did not return character alignment.");
  const alignedText = alignment.characters.join("");
  let searchFrom = 0;
  return sentences.map((sentence) => {
    const offset = alignedText.indexOf(sentence.text, searchFrom);
    if (offset < 0) fail(`Could not locate ${sentence.sentenceId} in character alignment.`);
    searchFrom = offset + sentence.text.length;
    const timed = timedCharacterRange(alignment, offset, offset + sentence.text.length);
    return {
      ...sentence,
      speechStart: globalOffset + timed.start,
      speechEnd: globalOffset + timed.end,
      characterStartTimesSeconds: alignment.character_start_times_seconds
        .slice(offset, offset + sentence.text.length)
        .map((value) => (Number.isFinite(value) ? globalOffset + value : value)),
      characterEndTimesSeconds: alignment.character_end_times_seconds
        .slice(offset, offset + sentence.text.length)
        .map((value) => (Number.isFinite(value) ? globalOffset + value : value)),
    };
  });
}

function fitCharacterAlignmentToAudioDuration(alignment, audioDuration) {
  const finalAlignedEnd = [...(alignment.character_end_times_seconds ?? [])]
    .reverse()
    .find((value) => Number.isFinite(value));
  if (!Number.isFinite(finalAlignedEnd) || finalAlignedEnd <= 0) {
    fail("ElevenLabs character alignment has no usable final timestamp.");
  }
  const scale = finalAlignedEnd > audioDuration ? audioDuration / finalAlignedEnd : 1;
  if (scale === 1) return { alignment, scale, finalAlignedEnd };
  return {
    alignment: {
      ...alignment,
      character_start_times_seconds: alignment.character_start_times_seconds.map((value) =>
        Number.isFinite(value) ? value * scale : value
      ),
      character_end_times_seconds: alignment.character_end_times_seconds.map((value) =>
        Number.isFinite(value) ? value * scale : value
      ),
    },
    scale,
    finalAlignedEnd,
  };
}

function locateSentencesInForcedAlignment(sentences, forcedAlignment) {
  if (!forcedAlignment?.characters?.length) fail("Forced Alignment returned no characters.");
  const alignedText = forcedAlignment.characters.map((character) => character.text).join("");
  let searchFrom = 0;
  return sentences.map((sentence) => {
    const offset = alignedText.indexOf(sentence.text, searchFrom);
    if (offset < 0) fail(`Could not locate ${sentence.sentenceId} in final Forced Alignment.`);
    searchFrom = offset + sentence.text.length;
    const selected = forcedAlignment.characters.slice(offset, offset + sentence.text.length);
    const first = selected.find((character) => Number.isFinite(character.start));
    const last = [...selected].reverse().find((character) => Number.isFinite(character.end));
    if (!first || !last) fail(`Forced Alignment has no timing for ${sentence.sentenceId}.`);
    return {
      ...sentence,
      speechStart: first.start,
      speechEnd: last.end,
      characterStartTimesSeconds: selected.map((character) => character.start),
      characterEndTimesSeconds: selected.map((character) => character.end),
    };
  });
}

const mode = argument("mode", "estimate");
const chapterNumber = Number(argument("chapter", "1"));
const levelId = argument("level", "core");
const confirmPaidPlan = argument("confirm-commercial-paid-plan") === "yes";
const confirmGoldenScript = argument("confirm-golden-script") === "yes";
const allowOverwrite = argument("overwrite") === "yes";
const resume = argument("resume") === "yes";
const continuePaidGeneration = argument("continue-paid-generation") === "yes";
const retryForcedAlignment = argument("retry-forced-alignment") === "yes";
const allowAlignmentFallback = argument("allow-alignment-fallback") === "yes";
const envFile = argument("env-file");

if ([allowOverwrite, resume, continuePaidGeneration].filter(Boolean).length > 1) {
  fail("Use only one of --resume=yes, --continue-paid-generation=yes, or --overwrite=yes.");
}
if (retryForcedAlignment && !resume) fail("--retry-forced-alignment=yes is only valid with offline --resume=yes.");

if (!new Set(["estimate", "generate"]).has(mode)) fail("Use --mode=estimate or --mode=generate.");

const packRoot = path.join(repositoryRoot, "content-packs", "pinocchio", "v3");
const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
const manifestChapter = manifest.chapters.find((chapter) => chapter.number === chapterNumber);
if (!manifestChapter || manifestChapter.path.includes("#")) fail(`Chapter ${chapterNumber} has no authored chapter pack.`);

const chapterPath = path.join(packRoot, manifestChapter.path);
const chapterRoot = path.dirname(chapterPath);
const chapter = JSON.parse(await readFile(chapterPath, "utf8"));
const level = chapter.levels[levelId];
if (!level?.master || !level?.activities || !level?.production) fail(`Chapter ${chapterNumber} ${levelId} is not authored.`);
const levelBeats = (level.beatRanges ?? chapter.beats).map((range) => ({
  ...chapter.beats.find((beat) => beat.beatId === range.beatId),
  ...range,
}));

const masterPath = path.join(chapterRoot, level.master);
const activitiesPath = path.join(chapterRoot, level.activities);
const productionPath = path.join(chapterRoot, level.production);
const masterFileText = await readFile(masterPath, "utf8");
const masterText = masterFileText.trimEnd();
const activitiesFileText = await readFile(activitiesPath, "utf8");
const activities = JSON.parse(activitiesFileText);
const activitiesChecksum = sha256(activitiesFileText);
const production = JSON.parse(await readFile(productionPath, "utf8"));
const sentenceTexts = masterText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const sentenceRecords = sentenceTexts.map((text, index) => ({
  sentenceId: `S${String(index + 1).padStart(3, "0")}`,
  text,
  beatId: levelBeats.find(
    (beat) => index >= sentenceIndex(beat.sentenceStart) && index <= sentenceIndex(beat.sentenceEnd),
  )?.beatId,
}));

if (sentenceRecords.some((sentence) => !sentence.beatId)) fail("Every sentence must belong to a narrative beat.");
validateActivitiesForGeneration(activities, sentenceRecords);

const masterChecksum = sha256(masterFileText);
if (production.generation.scriptChecksum !== `sha256:${masterChecksum}`) {
  fail("production.json script checksum is stale; validate the canonical master before spending credits.");
}
if (production.generation.activitiesChecksum !== `sha256:${activitiesChecksum}`) {
  fail("production.json activities checksum is stale; validate the learning activities before spending credits.");
}
if (!production.provider.approved || !production.provider.voiceId) {
  fail("A human-approved narrator with a durable voice ID is required.");
}

const actPlan = production.generation.actPlan;
if (!Array.isArray(actPlan) || actPlan.length < 1) fail("production.json must define an act plan.");
const beatsById = new Map(levelBeats.map((beat) => [beat.beatId, beat]));
const acts = actPlan.map((plannedAct) => {
  const sourceSentences = [];
  const performanceLines = [production.provider.accentTag];
  for (const beatId of plannedAct.beatIds) {
    const beat = beatsById.get(beatId);
    if (!beat) fail(`${plannedAct.actId} references unknown beat ${beatId}.`);
    const cue = production.narrationDirection.beatCues?.[beatId];
    if (cue) performanceLines.push(cue);
    const beatSentences = sentenceRecords.slice(
      sentenceIndex(beat.sentenceStart),
      sentenceIndex(beat.sentenceEnd) + 1,
    );
    sourceSentences.push(...beatSentences);
    performanceLines.push(...beatSentences.map((sentence) => sentence.text));
  }
  const text = performanceLines.join("\n");
  if (text.length > production.generation.requestCharacterLimit) {
    fail(`${plannedAct.actId} is ${text.length} characters; the configured limit is ${production.generation.requestCharacterLimit}.`);
  }
  return {
    actId: plannedAct.actId,
    beatIds: plannedAct.beatIds,
    sourceSentences,
    text,
    inputSha256: sha256(text),
  };
});

const requestedSentenceIds = acts.flatMap((act) => act.sourceSentences.map((sentence) => sentence.sentenceId));
if (
  requestedSentenceIds.length !== sentenceRecords.length ||
  requestedSentenceIds.some((sentenceId, index) => sentenceId !== sentenceRecords[index].sentenceId)
) {
  fail("Act plan must cover every sentence exactly once and in order.");
}

const billedCharactersEstimate = acts.reduce((total, act) => total + act.text.length, 0);
const voiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};
const generationConfiguration = {
  modelId: production.provider.modelId,
  voiceId: production.provider.voiceId,
  languageCode: "en",
  seed: production.generation.seed,
  outputFormat: production.generation.outputFormat,
  applyTextNormalization: "auto",
  voiceSettings,
};
const generationConfigurationSha256 = sha256(JSON.stringify(generationConfiguration));
const estimate = {
  storyPackId: manifest.storyPackId,
  chapter: chapterNumber,
  level: levelId,
  modelId: production.provider.modelId,
  voice: { id: production.provider.voiceId, name: production.provider.voiceCandidateName },
  strategy: production.generation.selectedStrategy,
  master: {
    sentences: sentenceRecords.length,
    words: masterText.split(/\s+/).length,
    characters: masterText.length,
    sha256: masterChecksum,
  },
  acts: acts.map((act) => ({
    actId: act.actId,
    beatIds: act.beatIds,
    sentences: act.sourceSentences.length,
    characters: act.text.length,
    inputSha256: act.inputSha256,
  })),
  billedCharactersEstimate,
  generationConfiguration,
  generationConfigurationSha256,
  ttsApiListPriceEstimateUsd: Number(((billedCharactersEstimate / 1000) * 0.1).toFixed(3)),
  forcedAlignmentListPriceEstimateUsd: Number(((production.targets.watchDurationSeconds / 3600) * 0.22).toFixed(3)),
};

if (mode === "estimate") {
  console.log(JSON.stringify(estimate, null, 2));
  process.exit(0);
}

if (!confirmPaidPlan) fail("Generation is locked. Pass --confirm-commercial-paid-plan=yes.");
if (!confirmGoldenScript) fail("Generation is locked. Pass --confirm-golden-script=yes after editorial review.");

const envPaths = [path.join(repositoryRoot, ".env.local")];
if (envFile) envPaths.unshift(path.resolve(repositoryRoot, envFile));
try {
  const commonGitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: repositoryRoot,
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
if (!process.env.ELEVENLABS_API_KEY && (!resume || retryForcedAlignment)) {
  fail("ELEVENLABS_API_KEY is missing from the local environment.");
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const outputDir = path.join(chapterRoot, "audio");
const partsDir = path.join(outputDir, "parts");
const existingOutputPath = (key, fallback) =>
  production.outputs?.[key]
    ? path.join(packRoot, production.outputs[key])
    : path.join(outputDir, fallback);
const masterAudioPath = existingOutputPath("masterAudio", `${levelId}.master.mp3`);
const timelinePath = existingOutputPath("sentenceTimeline", `${levelId}.timeline.json`);
const alignmentPath = existingOutputPath("forcedAlignment", `${levelId}.alignment.json`);
const provenancePath = existingOutputPath("provenance", `${levelId}.provenance.json`);
const voiceSnapshotPath = existingOutputPath("voiceProfileSnapshot", `${levelId}.voice-profile.snapshot.json`);

let cachedProvenance = null;
if (await exists(provenancePath)) {
  try {
    cachedProvenance = JSON.parse(await readFile(provenancePath, "utf8"));
  } catch {
    fail("Existing audio provenance is unreadable; inspect it before resuming paid artifacts.");
  }
}

if ((await exists(masterAudioPath)) && !allowOverwrite && !resume && !continuePaidGeneration) {
  fail("Golden master already exists. Pass --overwrite=yes only after deciding to spend credits on a replacement.");
}
await mkdir(partsDir, { recursive: true });

let voiceSnapshot;
if (resume) {
  if (!(await exists(voiceSnapshotPath))) fail("Offline resume requires the existing voice snapshot.");
  voiceSnapshot = JSON.parse(await readFile(voiceSnapshotPath, "utf8"));
  if (voiceSnapshot.voiceId !== production.provider.voiceId) fail("Cached voice snapshot differs from the approved voice ID.");
} else {
  const voiceResponse = await fetch(
    `https://api.elevenlabs.io/v1/voices/${production.provider.voiceId}`,
    { headers: { "xi-api-key": apiKey } },
  );
  const voiceData = voiceResponse.ok ? await voiceResponse.json() : null;
  voiceSnapshot = {
    schemaVersion: "1.0.0",
    retrievedAt: new Date().toISOString(),
    provider: "ElevenLabs",
    verification: voiceResponse.ok ? "voice-endpoint-verified" : `voice-endpoint-unavailable-http-${voiceResponse.status}`,
    voiceId: voiceData?.voice_id ?? production.provider.voiceId,
    name: voiceData?.name ?? production.provider.voiceCandidateName,
    approvedDisplayName: production.provider.voiceCandidateName,
    category: voiceData?.category ?? "default",
    labels: voiceData?.labels ?? {},
    settings: voiceData?.settings ?? null,
    previewUrl: voiceData?.preview_url ?? null,
    retirementRisk: "ElevenLabs default voices are scheduled for retirement on 2026-12-31; Pinocchio masters and pickups must finish by the internal 2026-11-30 deadline.",
  };
  if (voiceResponse.ok && voiceSnapshot.voiceId !== production.provider.voiceId) {
    fail("The configured durable voice ID resolved to a different voice ID.");
  }
  await writeFile(voiceSnapshotPath, `${JSON.stringify(voiceSnapshot, null, 2)}\n`);
}

async function generateAct(act) {
  const audioPath = path.join(partsDir, `${levelId}.${act.actId}.mp3`);
  const alignmentFilePath = path.join(partsDir, `${levelId}.${act.actId}.alignment.json`);
  const inputPath = path.join(partsDir, `${levelId}.${act.actId}.input.txt`);
  const requestPath = path.join(partsDir, `${levelId}.${act.actId}.request.json`);

  const artifactPresence = {
    audio: await exists(audioPath),
    alignment: await exists(alignmentFilePath),
    request: await exists(requestPath),
  };
  const existingArtifactCount = Object.values(artifactPresence).filter(Boolean).length;
  const reuseExisting = resume || continuePaidGeneration;

  if (!reuseExisting && !allowOverwrite && existingArtifactCount > 0) {
    fail(
      `${act.actId} already has paid-generation artifacts. Use --resume=yes to reuse a complete matching request, ` +
        "or --overwrite=yes only after explicitly approving another paid generation.",
    );
  }
  if (resume && existingArtifactCount !== 3) {
    fail(`${act.actId} offline resume requires complete cached audio, alignment, and request artifacts; no network call was made.`);
  }
  if (continuePaidGeneration && existingArtifactCount > 0 && existingArtifactCount < 3) {
    fail(`${act.actId} has incomplete paid-generation artifacts; inspect them before deciding whether to overwrite.`);
  }
  if (reuseExisting && existingArtifactCount === 3) {
    const request = JSON.parse(await readFile(requestPath, "utf8"));
    if (request.inputSha256 !== act.inputSha256) fail(`${act.actId} resume input is stale.`);
    if (request.generationConfigurationSha256 !== generationConfigurationSha256) {
      fail(`${act.actId} resume configuration is stale.`);
    }
    const audio = await readFile(audioPath);
    const alignmentFileText = await readFile(alignmentFilePath, "utf8");
    const alignment = JSON.parse(alignmentFileText);
    const audioSha256 = sha256(audio);
    const alignmentSha256 = sha256(alignmentFileText);
    const provenanceRequest = cachedProvenance?.requests?.find((candidate) => candidate.actId === act.actId);
    const expectedAudioSha256 = request.audioSha256 ?? provenanceRequest?.audioSha256;
    if (expectedAudioSha256 && expectedAudioSha256 !== audioSha256) fail(`${act.actId} cached audio checksum differs.`);
    if (request.alignmentSha256 && request.alignmentSha256 !== alignmentSha256) fail(`${act.actId} cached alignment checksum differs.`);
    if (alignment.characters?.join("") !== act.text) fail(`${act.actId} cached alignment text differs from the locked act input.`);
    if (!request.audioSha256 || !request.alignmentSha256) {
      request.audioSha256 = audioSha256;
      request.alignmentSha256 = alignmentSha256;
      request.checksumBackfilledAt = new Date().toISOString();
      request.checksumBackfillEvidence = expectedAudioSha256
        ? "audio-verified-against-existing-provenance; alignment-text-verified-against-locked-input"
        : "alignment-text-verified-against-locked-input; legacy-audio-self-hash-locked-for-future-resume";
      await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
    }
    return {
      ...act,
      audioPath,
      alignment,
      request,
      duration: mediaDuration(audioPath),
      audioSha256,
      reused: true,
    };
  }

  await writeFile(inputPath, act.text);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${production.provider.voiceId}/with-timestamps?output_format=${production.generation.outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: act.text,
        model_id: production.provider.modelId,
        language_code: "en",
        seed: production.generation.seed,
        apply_text_normalization: "auto",
        voice_settings: voiceSettings,
      }),
    },
  );
  if (!response.ok) fail(`ElevenLabs TTS returned HTTP ${response.status}: ${await response.text()}`);
  const result = await response.json();
  const audio = Buffer.from(result.audio_base64, "base64");
  const alignment = result.alignment ?? result.normalized_alignment;
  if (!alignment?.characters?.length) fail(`${act.actId} returned no character alignment.`);
  const alignmentFileText = `${JSON.stringify(alignment)}\n`;
  const request = {
    actId: act.actId,
    beatIds: act.beatIds,
    requestId: response.headers.get("request-id") ?? response.headers.get("x-request-id"),
    traceId: response.headers.get("x-trace-id"),
    characterCost: response.headers.get("character-cost"),
    characters: act.text.length,
    inputSha256: act.inputSha256,
    modelId: production.provider.modelId,
    voiceId: production.provider.voiceId,
    seed: production.generation.seed,
    outputFormat: production.generation.outputFormat,
    languageCode: generationConfiguration.languageCode,
    applyTextNormalization: generationConfiguration.applyTextNormalization,
    voiceSettings,
    generationConfigurationSha256,
    audioSha256: sha256(audio),
    alignmentSha256: sha256(alignmentFileText),
    requestStitching: "not-supported-by-eleven-v3",
    generatedAt: new Date().toISOString(),
  };
  await writeFile(audioPath, audio);
  await writeFile(alignmentFilePath, alignmentFileText);
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  return {
    ...act,
    audioPath,
    alignment,
    request,
    duration: mediaDuration(audioPath),
    audioSha256: sha256(audio),
    reused: false,
  };
}

const generatedActs = [];
for (const act of acts) {
  const generated = await generateAct(act);
  generatedActs.push(generated);
  console.log(`${generated.reused ? "Reused" : "Generated"} ${act.actId}: ${generated.duration.toFixed(3)}s`);
}
if (resume) voiceSnapshot.offlineResumeVerifiedAt = new Date().toISOString();
else voiceSnapshot.successfulTtsGenerationVerifiedAt = new Date().toISOString();
await writeFile(voiceSnapshotPath, `${JSON.stringify(voiceSnapshot, null, 2)}\n`);

const concatInputs = generatedActs.flatMap((act) => ["-i", act.audioPath]);
const concatStreams = generatedActs.map((_, index) => `[${index}:a]`).join("");
execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...concatInputs,
    "-filter_complex",
    `${concatStreams}concat=n=${generatedActs.length}:v=0:a=1[out]`,
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    production.generation.outputFormat.endsWith("_192") ? "192k" : "128k",
    masterAudioPath,
  ],
  { stdio: "inherit" },
);
const masterDuration = mediaDuration(masterAudioPath);
const masterAudio = await readFile(masterAudioPath);

let rawSentences = [];
const actOffsets = [];
let cumulativeActDuration = 0;
for (const act of generatedActs) {
  actOffsets.push(cumulativeActDuration);
  const fitted = fitCharacterAlignmentToAudioDuration(act.alignment, act.duration);
  act.timelineAlignmentScale = fitted.scale;
  act.originalAlignmentEnd = fitted.finalAlignedEnd;
  rawSentences.push(...locateSentencesInCharacterAlignment(act.sourceSentences, fitted.alignment, cumulativeActDuration));
  cumulativeActDuration += act.duration;
}

let alignmentSource = generatedActs.some((act) => act.timelineAlignmentScale < 1)
  ? "per-act-elevenlabs-tts-duration-fitted"
  : "per-act-elevenlabs-tts";
let forcedAlignment = null;
let forcedAlignmentRecord = { status: "not-attempted" };
if (resume && !retryForcedAlignment) {
  if (await exists(alignmentPath)) {
    const cachedAlignment = JSON.parse(await readFile(alignmentPath, "utf8"));
    if (cachedAlignment?.characters?.length) {
      forcedAlignment = cachedAlignment;
      rawSentences = locateSentencesInForcedAlignment(sentenceRecords, forcedAlignment);
      alignmentSource = "elevenlabs-forced-alignment";
      forcedAlignmentRecord = {
        status: "reused-offline",
        loss: forcedAlignment.loss ?? null,
      };
    } else {
      forcedAlignmentRecord = {
        status: "offline-resume-used-per-act-timestamps",
        reason: "No completed Forced Alignment cache was available; no network request was allowed.",
      };
    }
  }
} else {
  try {
    const form = new FormData();
    form.append("file", new Blob([masterAudio], { type: "audio/mpeg" }), `${levelId}.master.mp3`);
    form.append("text", masterText.replaceAll("\n", " "));
    const response = await fetch("https://api.elevenlabs.io/v1/forced-alignment", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    forcedAlignment = await response.json();
    rawSentences = locateSentencesInForcedAlignment(sentenceRecords, forcedAlignment);
    alignmentSource = "elevenlabs-forced-alignment";
    forcedAlignmentRecord = {
      status: "completed",
      requestId: response.headers.get("request-id") ?? response.headers.get("x-request-id"),
      traceId: response.headers.get("x-trace-id"),
      loss: forcedAlignment.loss ?? null,
    };
    await writeFile(alignmentPath, `${JSON.stringify(forcedAlignment)}\n`);
  } catch (error) {
    if (!allowAlignmentFallback) {
      fail(
        `Forced Alignment failed after TTS generation (${error.message}). ` +
          "The paid act artifacts are preserved; rerun with --resume=yes for an offline per-act rebuild, " +
          "or explicitly add --retry-forced-alignment=yes after granting alignment access.",
      );
    }
    forcedAlignmentRecord = {
      status: "fallback-to-per-act-timestamps",
      reason: error.message,
    };
    await writeFile(
      alignmentPath,
      `${JSON.stringify({ schemaVersion: "1.0.0", source: alignmentSource, forcedAlignment: forcedAlignmentRecord }, null, 2)}\n`,
    );
    console.warn(`Forced Alignment unavailable; recorded per-act timestamp fallback: ${error.message}`);
  }
}
if (resume && !retryForcedAlignment && forcedAlignmentRecord.status === "not-attempted") {
  forcedAlignmentRecord = {
    status: "offline-resume-used-per-act-timestamps",
    reason: "No alignment cache existed; no network request was allowed.",
  };
}

const timelineData = buildSentenceTimeline(
  rawSentences,
  masterDuration,
  activities,
  { ...chapter, beats: levelBeats },
);
const generatedAt = new Date().toISOString();
const rawSentenceMap = new Map(rawSentences.map((sentence) => [sentence.sentenceId, sentence]));
const seams = generatedActs.slice(0, -1).map((act, index) => {
  const nextAct = generatedActs[index + 1];
  const afterSentenceId = act.sourceSentences.at(-1)?.sentenceId;
  const beforeSentenceId = nextAct.sourceSentences[0]?.sentenceId;
  const afterRecord = rawSentenceMap.get(afterSentenceId);
  const beforeRecord = rawSentenceMap.get(beforeSentenceId);
  const hasAlignedBoundary =
    Number.isFinite(afterRecord?.speechEnd) && Number.isFinite(beforeRecord?.speechStart);
  const at = hasAlignedBoundary
    ? (afterRecord.speechEnd + beforeRecord.speechStart) / 2
    : Math.min(masterDuration, actOffsets[index + 1]);
  return {
    afterActId: act.actId,
    beforeActId: nextAct.actId,
    afterSentenceId: afterSentenceId ?? null,
    beforeSentenceId: beforeSentenceId ?? null,
    at: Number(at.toFixed(3)),
    timingBasis: hasAlignedBoundary ? alignmentSource : "cumulative-source-audio-duration",
  };
});
const actBoundaries = [0, ...seams.map((seam) => seam.at), Number(masterDuration.toFixed(3))];
for (let index = 1; index < actBoundaries.length; index += 1) {
  if (actBoundaries[index] < actBoundaries[index - 1] || actBoundaries[index] > masterDuration + 0.001) {
    fail(`Act boundary ${index} is outside the final master timeline.`);
  }
}
const compatibilitySeam = seams.length === 1 ? seams[0] : null;
const coherentActStrategy =
  generatedActs.length === 1
    ? "single-coherent-act"
    : generatedActs.length === 2
      ? "two-coherent-acts"
      : "multiple-coherent-acts";
const timeline = {
  schemaVersion: "1.1.0",
  storyPackId: manifest.storyPackId,
  chapterId: chapter.chapterId,
  level: levelId,
  generatedAt,
  provider: "ElevenLabs",
  modelId: production.provider.modelId,
  voice: { id: production.provider.voiceId, name: production.provider.voiceCandidateName },
  accent: production.provider.accent,
  outputFormat: production.generation.outputFormat,
  timingPrecision: "milliseconds",
  seed: production.generation.seed,
  source: `single-editorial-master-rendered-as-${generatedActs.length}-coherent-${generatedActs.length === 1 ? "act" : "acts"}`,
  alignmentSource,
  masterTextSha256: masterChecksum,
  activitiesSha256: activitiesChecksum,
  duration: Number(masterDuration.toFixed(3)),
  acts: generatedActs.map((act, index) => {
    const start = actBoundaries[index];
    const end = actBoundaries[index + 1];
    return {
      actId: act.actId,
      beatIds: act.beatIds,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      concatenationOffset: Number(actOffsets[index].toFixed(3)),
      sourceAudioDuration: Number(act.duration.toFixed(3)),
      sourceAlignmentEnd: Number(act.originalAlignmentEnd.toFixed(3)),
      sourceAlignmentTimeScale: Number(act.timelineAlignmentScale.toFixed(9)),
      requestId: act.request.requestId,
      characters: act.text.length,
    };
  }),
  seams,
  seam: compatibilitySeam,
  beats: timelineData.beats,
  lines: timelineData.lines,
  mimicItems: timelineData.mimicItems,
};
await writeFile(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);

const provenance = {
  schemaVersion: "1.0.0",
  storyPackId: manifest.storyPackId,
  chapterId: chapter.chapterId,
  level: levelId,
  generatedAt,
  generator: "scripts/generate-story-pack-golden-audio.mjs",
  source: {
    master: toPosix(path.relative(packRoot, masterPath)),
    sha256: masterChecksum,
    activities: toPosix(path.relative(packRoot, activitiesPath)),
    activitiesSha256: activitiesChecksum,
    sentences: sentenceRecords.length,
    words: masterText.split(/\s+/).length,
  },
  provider: {
    name: "ElevenLabs",
    modelId: production.provider.modelId,
    voice: { id: production.provider.voiceId, name: production.provider.voiceCandidateName },
    voiceSnapshot: toPosix(path.relative(packRoot, voiceSnapshotPath)),
    accent: production.provider.accent,
    outputFormat: production.generation.outputFormat,
    seed: production.generation.seed,
    languageCode: generationConfiguration.languageCode,
    applyTextNormalization: generationConfiguration.applyTextNormalization,
    voiceSettings,
    generationConfigurationSha256,
    commercialPaidPlanConfirmed: true,
  },
  strategy: {
    type: coherentActStrategy,
    actCount: generatedActs.length,
    reason: `The eleven_v3 request limit is ${production.generation.requestCharacterLimit.toLocaleString("en-US")} characters and request stitching is unavailable for v3.`,
    sentenceBySentenceGeneration: false,
    concatenation: {
      method: "decode-concat-reencode",
      codec: "libmp3lame",
      sampleRateHz: 44100,
      channels: 1,
      bitrateKbps: production.generation.outputFormat.endsWith("_192") ? 192 : 128,
    },
    seams,
    seam: compatibilitySeam,
  },
  requests: generatedActs.map((act) => ({
    ...act.request,
    audio: toPosix(path.relative(packRoot, act.audioPath)),
    audioSha256: act.audioSha256,
    duration: Number(act.duration.toFixed(3)),
  })),
  forcedAlignment: forcedAlignmentRecord,
  master: {
    audio: toPosix(path.relative(packRoot, masterAudioPath)),
    timeline: toPosix(path.relative(packRoot, timelinePath)),
    alignment: toPosix(path.relative(packRoot, alignmentPath)),
    audioSha256: sha256(masterAudio),
    duration: Number(masterDuration.toFixed(3)),
  },
  cost: {
    billedCharactersEstimate,
    providerReportedCharacterCost: generatedActs.reduce(
      (total, act) => total + (Number(act.request.characterCost) || 0),
      0,
    ),
    ttsApiListPriceEstimateUsd: estimate.ttsApiListPriceEstimateUsd,
    forcedAlignmentListPriceEstimateUsd: estimate.forcedAlignmentListPriceEstimateUsd,
    note: "List-price estimates only; the account plan, included credits, voice multiplier, taxes, and retries may change actual billing.",
  },
  qaStatus: "technical-validation-pending-human-listen-through-pending",
};
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);

production.status = "audio-generated-technical-review-pending";
production.provider.voiceAvailabilityVerifiedAt = voiceSnapshot.retrievedAt;
production.generation.activitiesChecksum = `sha256:${activitiesChecksum}`;
production.generation.requests = provenance.requests.map((request) => ({
  actId: request.actId,
  requestId: request.requestId,
  traceId: request.traceId,
  characters: request.characters,
  characterCost: request.characterCost,
  inputSha256: request.inputSha256,
}));
production.generation.seams = seams.map((seam) => ({
  afterActId: seam.afterActId,
  beforeActId: seam.beforeActId,
  afterSentenceId: seam.afterSentenceId,
  beforeSentenceId: seam.beforeSentenceId,
  atSeconds: seam.at,
  timingBasis: seam.timingBasis,
  humanQaStatus: "pending",
}));
production.generation.generatedAt = generatedAt;
production.generation.operator = "codex";
production.generation.cost = provenance.cost;
production.outputs = {
  masterAudio: provenance.master.audio,
  sentenceTimeline: provenance.master.timeline,
  forcedAlignment: provenance.master.alignment,
  provenance: toPosix(path.relative(packRoot, provenancePath)),
  voiceProfileSnapshot: toPosix(path.relative(packRoot, voiceSnapshotPath)),
  checksum: `sha256:${provenance.master.audioSha256}`,
};
await writeFile(productionPath, `${JSON.stringify(production, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      ...estimate,
      generated: true,
      duration: Number(masterDuration.toFixed(3)),
      alignmentSource,
      forcedAlignment: forcedAlignmentRecord.status,
      masterAudio: provenance.master.audio,
      timeline: provenance.master.timeline,
      provenance: toPosix(path.relative(packRoot, provenancePath)),
    },
    null,
    2,
  ),
);
