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

function buildSentenceTimeline(rawSentences, duration, activities, chapter) {
  const boundaries = rawSentences.slice(0, -1).map((sentence, index) => {
    const nextSentence = rawSentences[index + 1];
    return (sentence.speechEnd + nextSentence.speechStart) / 2;
  });
  const lines = rawSentences.map((sentence, index) => ({
    sentenceId: sentence.sentenceId,
    beatId: sentence.beatId,
    text: sentence.text,
    speechStart: Number(sentence.speechStart.toFixed(3)),
    speechEnd: Number(sentence.speechEnd.toFixed(3)),
    start: Number((index === 0 ? Math.max(0, sentence.speechStart - 0.08) : boundaries[index - 1]).toFixed(3)),
    end: Number(
      (index === rawSentences.length - 1 ? Math.min(duration, sentence.speechEnd + 0.22) : boundaries[index]).toFixed(3),
    ),
  }));
  const lineMap = new Map(lines.map((line) => [line.sentenceId, line]));
  const mimicItems = activities.mimic.map((item) => {
    const source = lineMap.get(item.sourceSentenceId);
    if (!source || source.text !== item.text) fail(`${item.id} is not an exact generated master sentence.`);
    return {
      id: item.id,
      sourceSentenceId: item.sourceSentenceId,
      beatId: item.beatId,
      text: item.text,
      start: Number(Math.max(0, source.speechStart - 0.12).toFixed(3)),
      end: Number(Math.min(duration, source.speechEnd + 0.1).toFixed(3)),
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
    };
  });
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
const allowAlignmentFallback = argument("allow-alignment-fallback") === "yes";
const envFile = argument("env-file");

if (allowOverwrite && resume) fail("Use either --resume=yes or --overwrite=yes, not both.");

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

const masterPath = path.join(chapterRoot, level.master);
const activitiesPath = path.join(chapterRoot, level.activities);
const productionPath = path.join(chapterRoot, level.production);
const masterFileText = await readFile(masterPath, "utf8");
const masterText = masterFileText.trimEnd();
const activities = JSON.parse(await readFile(activitiesPath, "utf8"));
const production = JSON.parse(await readFile(productionPath, "utf8"));
const sentenceTexts = masterText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const sentenceRecords = sentenceTexts.map((text, index) => ({
  sentenceId: `S${String(index + 1).padStart(3, "0")}`,
  text,
  beatId: chapter.beats.find(
    (beat) => index >= sentenceIndex(beat.sentenceStart) && index <= sentenceIndex(beat.sentenceEnd),
  )?.beatId,
}));

if (sentenceRecords.some((sentence) => !sentence.beatId)) fail("Every sentence must belong to a narrative beat.");
if (activities.mimic.length !== 30) fail("Golden audio requires exactly 30 Mimic selections.");

const masterChecksum = sha256(masterFileText);
if (production.generation.scriptChecksum !== `sha256:${masterChecksum}`) {
  fail("production.json script checksum is stale; validate the canonical master before spending credits.");
}
if (!production.provider.approved || !production.provider.voiceId) {
  fail("A human-approved narrator with a durable voice ID is required.");
}

const actPlan = production.generation.actPlan;
if (!Array.isArray(actPlan) || actPlan.length < 1) fail("production.json must define an act plan.");
const beatsById = new Map(chapter.beats.map((beat) => [beat.beatId, beat]));
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
if (!process.env.ELEVENLABS_API_KEY) fail("ELEVENLABS_API_KEY is missing from the local environment.");

const apiKey = process.env.ELEVENLABS_API_KEY;
const outputDir = path.join(chapterRoot, "audio");
const partsDir = path.join(outputDir, "parts");
const masterAudioPath = path.join(outputDir, `${levelId}.master.mp3`);
const timelinePath = path.join(outputDir, `${levelId}.timeline.json`);
const alignmentPath = path.join(outputDir, `${levelId}.alignment.json`);
const provenancePath = path.join(outputDir, "provenance.json");
const voiceSnapshotPath = path.join(outputDir, "voice-profile.snapshot.json");

if ((await exists(masterAudioPath)) && !allowOverwrite && !resume) {
  fail("Golden master already exists. Pass --overwrite=yes only after deciding to spend credits on a replacement.");
}
await mkdir(partsDir, { recursive: true });

const voiceResponse = await fetch(
  `https://api.elevenlabs.io/v1/voices/${production.provider.voiceId}`,
  { headers: { "xi-api-key": apiKey } },
);
const voiceData = voiceResponse.ok ? await voiceResponse.json() : null;
const voiceSnapshot = {
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
  retirementRisk: "ElevenLabs default voices are scheduled for retirement on 2026-12-31; batch narrator A/B is required.",
};
if (
  voiceResponse.ok &&
  voiceSnapshot.voiceId !== production.provider.voiceId
) {
  fail("The configured durable voice ID resolved to a different voice ID.");
}
await writeFile(voiceSnapshotPath, `${JSON.stringify(voiceSnapshot, null, 2)}\n`);

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

  if (!resume && !allowOverwrite && existingArtifactCount > 0) {
    fail(
      `${act.actId} already has paid-generation artifacts. Use --resume=yes to reuse a complete matching request, ` +
        "or --overwrite=yes only after explicitly approving another paid generation.",
    );
  }
  if (resume && existingArtifactCount > 0 && existingArtifactCount < 3) {
    fail(`${act.actId} has incomplete paid-generation artifacts; inspect them before deciding whether to overwrite.`);
  }
  if (resume && existingArtifactCount === 3) {
    const request = JSON.parse(await readFile(requestPath, "utf8"));
    if (request.inputSha256 !== act.inputSha256) fail(`${act.actId} resume input is stale.`);
    if (request.generationConfigurationSha256 !== generationConfigurationSha256) {
      fail(`${act.actId} resume configuration is stale.`);
    }
    return {
      ...act,
      audioPath,
      alignment: JSON.parse(await readFile(alignmentFilePath, "utf8")),
      request,
      duration: mediaDuration(audioPath),
      audioSha256: sha256(await readFile(audioPath)),
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
    requestStitching: "not-supported-by-eleven-v3",
    generatedAt: new Date().toISOString(),
  };
  await writeFile(audioPath, audio);
  await writeFile(alignmentFilePath, `${JSON.stringify(alignment)}\n`);
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
voiceSnapshot.successfulTtsGenerationVerifiedAt = new Date().toISOString();
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
let actOffset = 0;
for (const act of generatedActs) {
  rawSentences.push(...locateSentencesInCharacterAlignment(act.sourceSentences, act.alignment, actOffset));
  actOffset += act.duration;
}

let alignmentSource = "per-act-elevenlabs-tts";
let forcedAlignment = null;
let forcedAlignmentRecord = { status: "not-attempted" };
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
        "The paid act artifacts are preserved; rerun with --resume=yes --allow-alignment-fallback=yes to use their timestamps.",
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

const timelineData = buildSentenceTimeline(rawSentences, masterDuration, activities, chapter);
const generatedAt = new Date().toISOString();
const seamAfter = generatedActs[0]?.sourceSentences.at(-1)?.sentenceId ?? null;
const seamBefore = generatedActs[1]?.sourceSentences[0]?.sentenceId ?? null;
const seamAfterRecord = rawSentences.find((sentence) => sentence.sentenceId === seamAfter);
const seamBeforeRecord = rawSentences.find((sentence) => sentence.sentenceId === seamBefore);
const seamTime =
  seamAfterRecord && seamBeforeRecord
    ? (seamAfterRecord.speechEnd + seamBeforeRecord.speechStart) / 2
    : generatedActs[0]?.duration ?? null;
const timeline = {
  schemaVersion: "1.0.0",
  storyPackId: manifest.storyPackId,
  chapterId: chapter.chapterId,
  level: levelId,
  generatedAt,
  provider: "ElevenLabs",
  modelId: production.provider.modelId,
  voice: { id: production.provider.voiceId, name: production.provider.voiceCandidateName },
  accent: production.provider.accent,
  outputFormat: production.generation.outputFormat,
  seed: production.generation.seed,
  source: "single-editorial-master-rendered-as-two-coherent-acts",
  alignmentSource,
  masterTextSha256: masterChecksum,
  duration: Number(masterDuration.toFixed(3)),
  acts: generatedActs.map((act, index) => {
    const start = index === 0 ? 0 : seamTime;
    const end = index === generatedActs.length - 1 ? masterDuration : seamTime;
    return {
      actId: act.actId,
      beatIds: act.beatIds,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      requestId: act.request.requestId,
      characters: act.text.length,
    };
  }),
  seam: { afterSentenceId: seamAfter, beforeSentenceId: seamBefore, at: Number(seamTime?.toFixed(3)) },
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
    type: "two-coherent-acts",
    reason: "The eleven_v3 HTTP limit is 5,000 characters and request stitching is unavailable for v3.",
    sentenceBySentenceGeneration: false,
    concatenation: {
      method: "decode-concat-reencode",
      codec: "libmp3lame",
      sampleRateHz: 44100,
      channels: 1,
      bitrateKbps: production.generation.outputFormat.endsWith("_192") ? 192 : 128,
    },
    seam: { afterSentenceId: seamAfter, beforeSentenceId: seamBefore, at: Number(seamTime?.toFixed(3)) },
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
production.generation.requests = provenance.requests.map((request) => ({
  actId: request.actId,
  requestId: request.requestId,
  traceId: request.traceId,
  characters: request.characters,
  characterCost: request.characterCost,
  inputSha256: request.inputSha256,
}));
production.generation.seams = [
  {
    afterSentenceId: seamAfter,
    beforeSentenceId: seamBefore,
    atSeconds: Number(seamTime?.toFixed(3)),
    humanQaStatus: "pending",
  },
];
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
