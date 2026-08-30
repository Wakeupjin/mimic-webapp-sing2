#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const repositoryRoot = process.cwd();
const registryPath = resolve(repositoryRoot, "content-studio/registry.json");
const errors = [];
const warnings = [];

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return null;
  }
}

function readText(path, label) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return null;
  }
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function hasUniqueValues(values) {
  return new Set(values).size === values.length;
}

function parseArgs() {
  const packArg = process.argv.find((argument) => argument.startsWith("--pack="));
  return { pack: packArg?.slice("--pack=".length) ?? null };
}

function resolveInside(base, reference, label, allowRepositoryRoot = false) {
  const cleanReference = reference.split("#", 1)[0];
  const resolvedPath = resolve(base, cleanReference);
  const allowedRoot = allowRepositoryRoot ? repositoryRoot : base;
  const pathFromAllowedRoot = relative(allowedRoot, resolvedPath);
  const escaped =
    pathFromAllowedRoot === ".." ||
    pathFromAllowedRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromAllowedRoot);
  check(!escaped, `${label} escapes its allowed root: ${reference}`);
  return resolvedPath;
}

function sentenceIdToIndex(sentenceId) {
  const match = /^S(\d{3})$/.exec(sentenceId ?? "");
  return match ? Number(match[1]) - 1 : -1;
}

const { pack: requestedPack } = parseArgs();
const registry = readJson(registryPath, "Content Studio registry");

if (!registry) process.exitCode = 1;

const record = registry?.packs?.find(
  (pack) =>
    pack.storyPackId === requestedPack ||
    pack.path === requestedPack ||
    (!requestedPack && pack === registry.packs[0]),
);

check(Boolean(record), `Story Pack not found in registry: ${requestedPack ?? "first pack"}`);

let summary = null;

if (record) {
  const manifestPath = resolveInside(repositoryRoot, record.path, "Registry pack path", true);
  const packRoot = dirname(manifestPath);
  const manifest = readJson(manifestPath, "Story Pack manifest");

  if (manifest) {
    const requiredManifestFields = [
      "schemaVersion",
      "storyPackId",
      "version",
      "status",
      "title",
      "format",
      "rights",
      "storyBible",
      "seasonMap",
      "levels",
      "chapters",
      "qa",
    ];
    for (const field of requiredManifestFields) {
      check(manifest[field] !== undefined, `Manifest field is required: ${field}`);
    }

    check(manifest.storyPackId === record.storyPackId, "Registry and manifest Story Pack IDs differ.");
    check(manifest.version === record.version, "Registry and manifest versions differ.");
    check(
      ["draft", "review", "approved", "staged", "published", "archived"].includes(manifest.status),
      `Unknown lifecycle status: ${manifest.status}`,
    );
    check(manifest.format?.classes === 12, "This registered season must contain twelve classes.");
    check(
      JSON.stringify(manifest.format?.modes) === JSON.stringify(["watch", "mimic", "guess", "word"]),
      "Mode order must be watch, mimic, guess, word.",
    );
    check(Array.isArray(manifest.chapters) && manifest.chapters.length === 12, "Manifest must list twelve Chapters.");

    const chapterNumbers = manifest.chapters?.map((chapter) => chapter.number) ?? [];
    check(
      chapterNumbers.every((number, index) => number === index + 1),
      "Manifest Chapter numbers must be sequential from 1 to 12.",
    );
    check(hasUniqueValues(manifest.chapters?.map((chapter) => chapter.slug) ?? []), "Chapter slugs must be unique.");

    const rightsPath = resolveInside(packRoot, manifest.rights, "Rights path");
    const storyBiblePath = resolveInside(packRoot, manifest.storyBible, "Story Bible path");
    const seasonMapPath = resolveInside(packRoot, manifest.seasonMap, "Season map path");
    const qaStandardPath = resolveInside(packRoot, manifest.qa?.standard ?? "", "QA standard path", true);
    const latestQaPath = resolveInside(packRoot, manifest.qa?.latestReport ?? "", "Latest QA path");
    const rights = readJson(rightsPath, "Rights registry");
    const storyBible = readText(storyBiblePath, "Story Bible");
    const seasonMap = readJson(seasonMapPath, "Season map");
    readText(qaStandardPath, "Story Pack standard");
    const latestQa = readJson(latestQaPath, "Latest QA report");

    check(Boolean(storyBible?.includes("## Twelve-Chapter arc")), "Story Bible must define the twelve-Chapter arc.");
    check(rights?.humanReview?.decision === "pending", "Draft rights review should remain explicitly pending.");
    check(rights?.commercialReleaseAllowed === false, "Draft pack must not claim commercial release permission.");
    warn(
      rights?.reviewStatus === "approved",
      "Rights remain pending; this is an expected release blocker for the draft.",
    );

    check(Array.isArray(seasonMap?.chapters) && seasonMap.chapters.length === 12, "Season map must contain twelve Chapters.");
    const coveredSourceChapters = seasonMap?.chapters?.flatMap((chapter) => chapter.sourceChapters) ?? [];
    check(
      coveredSourceChapters.length === 36 &&
        coveredSourceChapters.every((number, index) => number === index + 1),
      "Season map must cover original Chapters 1–36 exactly once and in order.",
    );

    const goldenReference = record.goldenSample ?? "chapter-01/core";
    const [goldenChapterSlug, goldenLevel] = goldenReference.split("/");
    const goldenChapterNumber = Number(goldenChapterSlug?.match(/(\d+)$/)?.[1]);
    const goldenManifestChapter = manifest.chapters?.find(
      (chapter) => chapter.number === goldenChapterNumber,
    );
    check(Boolean(goldenManifestChapter), `Golden Chapter is not listed: ${goldenChapterSlug}`);

    if (goldenManifestChapter) {
      const chapterPath = resolveInside(packRoot, goldenManifestChapter.path, "Golden Chapter path");
      const chapter = readJson(chapterPath, "Golden Chapter");

      if (chapter) {
        check(chapter.status === "golden-draft", "Golden Chapter must remain golden-draft before human approval.");
        check(Array.isArray(chapter.beats) && chapter.beats.length === 8, "Golden Chapter must have eight narrative beats.");
        check(chapter.levels?.[goldenLevel], `Golden Chapter level is missing: ${goldenLevel}`);

        const masterPath = resolveInside(dirname(chapterPath), chapter.levels?.[goldenLevel]?.master, "Master path");
        const activitiesPath = resolveInside(dirname(chapterPath), chapter.levels?.[goldenLevel]?.activities, "Activities path");
        const productionPath = resolveInside(dirname(chapterPath), chapter.levels?.[goldenLevel]?.production, "Production path");
        const masterText = readText(masterPath, "Golden master");
        const activities = readJson(activitiesPath, "Golden learning activities");
        const production = readJson(productionPath, "Golden production record");

        if (masterText && activities && production) {
          const sentences = masterText
            .split(/\r?\n/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);
          const sentenceMap = new Map(
            sentences.map((text, index) => [`S${String(index + 1).padStart(3, "0")}`, text]),
          );
          const words = sentences.flatMap((sentence) => sentence.split(/\s+/)).filter(Boolean);
          const estimatedDurationSeconds = Number(
            ((words.length / production.targets.referenceWordsPerMinute) * 60).toFixed(1),
          );
          const masterChecksum = createHash("sha256").update(masterText).digest("hex");

          check(
            production.generation?.scriptChecksum === `sha256:${masterChecksum}`,
            "Production script checksum does not match the canonical master.",
          );
          check(
            latestQa?.metrics?.masterSha256 === masterChecksum,
            "QA master checksum does not match the canonical master.",
          );
          check(latestQa?.metrics?.sentenceCount === sentences.length, "QA sentence count is stale.");
          check(latestQa?.metrics?.wordCount === words.length, "QA word count is stale.");
          check(
            latestQa?.metrics?.estimatedDurationSecondsAt128Wpm === estimatedDurationSeconds,
            "QA estimated duration is stale.",
          );

          check(sentences.length >= 80, "Golden master is too fragmented or too short for an eight-minute story.");
          check(words.length >= 950 && words.length <= 1100, `Golden master must be 950–1,100 words; found ${words.length}.`);
          check(
            estimatedDurationSeconds >= production.targets.acceptedGoldenRangeSeconds[0] &&
              estimatedDurationSeconds <= production.targets.acceptedGoldenRangeSeconds[1],
            `Estimated Watch duration ${estimatedDurationSeconds}s is outside the Golden range.`,
          );

          let expectedBeatStart = 0;
          for (const beat of chapter.beats) {
            const start = sentenceIdToIndex(beat.sentenceStart);
            const end = sentenceIdToIndex(beat.sentenceEnd);
            check(start === expectedBeatStart, `${beat.beatId} does not begin at the next uncovered sentence.`);
            check(end >= start, `${beat.beatId} has an invalid sentence range.`);
            check(end < sentences.length, `${beat.beatId} ends outside the master.`);
            expectedBeatStart = end + 1;
          }
          check(expectedBeatStart === sentences.length, "The eight beats must cover every master sentence exactly once.");

          check(activities.mimic?.length === 30, "Mimic must contain exactly 30 selections.");
          check(activities.guess?.length === 10, "Guess must contain exactly 10 items.");
          check(activities.word?.length === 10, "Word must contain exactly 10 items.");

          const mimicSourceIds = activities.mimic?.map((item) => item.sourceSentenceId) ?? [];
          check(hasUniqueValues(mimicSourceIds), "Mimic source sentences must be unique.");
          for (const item of activities.mimic ?? []) {
            check(sentenceMap.get(item.sourceSentenceId) === item.text, `${item.id} is not an exact master sentence.`);
            check(Boolean(item.selectionReason), `${item.id} is missing an editorial selection reason.`);
          }

          const correctPositions = { A: 0, B: 0, C: 0 };
          for (const item of activities.guess ?? []) {
            check(item.options?.length === 3, `${item.id} must have exactly three options.`);
            const optionIds = item.options?.map((option) => option.id) ?? [];
            check(hasUniqueValues(optionIds), `${item.id} option IDs must be unique.`);
            const correctOption = item.options?.find((option) => option.id === item.correctOptionId);
            check(Boolean(correctOption), `${item.id} correct option does not exist.`);
            if (correctPositions[item.correctOptionId] !== undefined) correctPositions[item.correctOptionId] += 1;
            for (const option of item.options ?? []) {
              check(
                sentenceMap.get(option.sourceSentenceId) === option.text,
                `${item.id}/${option.id} is not an exact master sentence.`,
              );
            }
          }
          const positionCounts = Object.values(correctPositions);
          check(Math.max(...positionCounts) - Math.min(...positionCounts) <= 1, "Guess answer positions must be balanced.");

          const wordSourceIds = activities.word?.map((item) => item.sourceSentenceId) ?? [];
          check(hasUniqueValues(wordSourceIds), "Word source sentences must be unique.");
          for (const item of activities.word ?? []) {
            check(sentenceMap.get(item.sourceSentenceId) === item.text, `${item.id} is not an exact master sentence.`);
            check(item.tokens?.join(" ") === item.text, `${item.id} tokens do not rebuild the exact master sentence.`);
          }

          check(
            [
              "audio-not-generated",
              "audio-generated-technical-review-pending",
              "audio-generated-technical-pass",
            ].includes(production.status),
            `Unknown Golden audio status: ${production.status}`,
          );
          if (production.provider?.approved) {
            check(Boolean(production.provider.voiceId), "Approved narrator is missing a durable voice ID.");
            check(
              Boolean(production.provider.approval?.role && production.provider.approval?.approvedAt),
              "Approved narrator is missing a human approval record.",
            );
          }
          check(
            production.generation?.sentenceBySentenceGenerationAllowed === false,
            "Sentence-by-sentence TTS generation must be prohibited.",
          );
          check(manifest.release?.replacesProductionVersion === false, "Draft v3 must not silently replace v2 production.");

          let mediaSummary = null;
          if (production.status !== "audio-not-generated") {
            const mediaPath = (reference, label) =>
              resolveInside(packRoot, reference ?? "", label);
            const masterAudioPath = mediaPath(production.outputs?.masterAudio, "Master audio path");
            const timelinePath = mediaPath(production.outputs?.sentenceTimeline, "Sentence timeline path");
            const alignmentPath = mediaPath(production.outputs?.forcedAlignment, "Alignment path");
            const provenancePath = mediaPath(production.outputs?.provenance, "Audio provenance path");
            const voiceSnapshotPath = mediaPath(production.outputs?.voiceProfileSnapshot, "Voice snapshot path");
            const timeline = readJson(timelinePath, "Golden sentence timeline");
            const alignment = readJson(alignmentPath, "Golden final alignment");
            const provenance = readJson(provenancePath, "Golden audio provenance");
            const voiceSnapshot = readJson(voiceSnapshotPath, "Golden voice snapshot");
            let audioBuffer = null;
            let actualDuration = null;
            try {
              audioBuffer = readFileSync(masterAudioPath);
              actualDuration = Number(
                execFileSync(
                  "ffprobe",
                  [
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=nw=1:nk=1",
                    masterAudioPath,
                  ],
                  { encoding: "utf8" },
                ).trim(),
              );
            } catch (error) {
              errors.push(`Golden master audio: ${error.message}`);
            }

            if (audioBuffer && Number.isFinite(actualDuration)) {
              const audioChecksum = createHash("sha256").update(audioBuffer).digest("hex");
              check(statSync(masterAudioPath).size > 100_000, "Golden master audio file is unexpectedly small.");
              check(
                production.outputs?.checksum === `sha256:${audioChecksum}`,
                "Production audio checksum does not match the Golden master file.",
              );
              check(
                actualDuration >= production.targets.acceptedGoldenRangeSeconds[0] &&
                  actualDuration <= production.targets.acceptedGoldenRangeSeconds[1],
                `Actual Golden audio duration ${actualDuration.toFixed(3)}s is outside the accepted range.`,
              );
              check(
                Math.abs((timeline?.duration ?? 0) - actualDuration) <= 0.5,
                "Timeline duration does not match the Golden master audio.",
              );
              check(timeline?.lines?.length === sentences.length, "Timeline must contain all 105 master sentences.");
              for (const [index, line] of (timeline?.lines ?? []).entries()) {
                const expectedId = `S${String(index + 1).padStart(3, "0")}`;
                check(line.sentenceId === expectedId, `Timeline sentence ${index + 1} has the wrong ID.`);
                check(line.text === sentences[index], `${expectedId} timeline text differs from the canonical master.`);
                check(line.start >= 0 && line.end > line.start, `${expectedId} has invalid playback bounds.`);
                check(line.speechStart >= 0 && line.speechEnd > line.speechStart, `${expectedId} has invalid speech bounds.`);
                check(line.end <= actualDuration + 0.25, `${expectedId} extends beyond the Golden master.`);
                if (index > 0) {
                  check(
                    line.start >= timeline.lines[index - 1].start,
                    `${expectedId} starts before the previous timeline sentence.`,
                  );
                }
              }
              check(timeline?.mimicItems?.length === 30, "Audio timeline must contain 30 Mimic selections.");
              for (const item of timeline?.mimicItems ?? []) {
                const authored = activities.mimic.find((candidate) => candidate.id === item.id);
                check(
                  Boolean(
                    authored &&
                      authored.sourceSentenceId === item.sourceSentenceId &&
                      authored.text === item.text,
                  ),
                  `${item.id} audio range differs from the authored Mimic selection.`,
                );
                check(item.start >= 0 && item.end > item.start, `${item.id} has invalid audio bounds.`);
              }
              check(timeline?.beats?.length === 8, "Audio timeline must contain eight beat ranges.");
              check(
                ["elevenlabs-forced-alignment", "per-act-elevenlabs-tts"].includes(timeline?.alignmentSource),
                "Timeline has an unknown alignment source.",
              );
              warn(
                timeline?.alignmentSource === "elevenlabs-forced-alignment",
                "Final Forced Alignment was unavailable; the timeline uses the two source-act timestamp offsets.",
              );
              check(Boolean(alignment), "Final alignment evidence is missing.");
              check(provenance?.source?.sha256 === masterChecksum, "Audio provenance points to a different master script.");
              check(provenance?.provider?.voice?.id === production.provider.voiceId, "Audio provenance voice ID differs.");
              check(provenance?.provider?.modelId === production.provider.modelId, "Audio provenance model differs.");
              check(provenance?.provider?.commercialPaidPlanConfirmed === true, "Commercial paid-plan evidence is missing.");
              check(provenance?.strategy?.sentenceBySentenceGeneration === false, "Provenance must prohibit sentence TTS.");
              check(
                provenance?.requests?.length === production.generation.actPlan.length,
                "Provenance request count must match the approved act plan.",
              );
              for (const request of provenance?.requests ?? []) {
                check(Boolean(request.requestId), `${request.actId} is missing the ElevenLabs request ID.`);
                check(
                  request.characters <= production.generation.requestCharacterLimit,
                  `${request.actId} exceeded the Eleven v3 character limit.`,
                );
                check(Boolean(request.audioSha256), `${request.actId} is missing its audio checksum.`);
              }
              check(provenance?.master?.audioSha256 === audioChecksum, "Provenance master checksum differs.");
              check(voiceSnapshot?.voiceId === production.provider.voiceId, "Voice snapshot ID differs.");
              check(
                voiceSnapshot?.approvedDisplayName === production.provider.voiceCandidateName &&
                  voiceSnapshot?.name?.startsWith(production.provider.voiceCandidateName),
                "Voice snapshot no longer matches the approved narrator label.",
              );

              mediaSummary = {
                actualDurationSeconds: Number(actualDuration.toFixed(3)),
                audioBytes: audioBuffer.length,
                audioSha256: audioChecksum,
                alignmentSource: timeline.alignmentSource,
                requestCount: provenance?.requests?.length ?? 0,
                billedCharactersEstimate: provenance?.cost?.billedCharactersEstimate ?? null,
              };
            }
          }

          summary = {
            storyPackId: manifest.storyPackId,
            version: manifest.version,
            status: manifest.status,
            goldenSample: goldenReference,
            chapterCount: manifest.chapters.length,
            sentenceCount: sentences.length,
            wordCount: words.length,
            estimatedDurationSeconds,
            referenceWordsPerMinute: production.targets.referenceWordsPerMinute,
            beatCount: chapter.beats.length,
            mimicCount: activities.mimic.length,
            guessCount: activities.guess.length,
            wordItemCount: activities.word.length,
            masterSha256: masterChecksum,
            media: mediaSummary,
          };
        }
      }
    }
  }
}

const result = {
  ok: errors.length === 0,
  summary,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
