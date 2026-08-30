#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(repositoryRoot, "content-packs", "pinocchio", "v3");
const level = process.argv.find((value) => value.startsWith("--level="))?.slice("--level=".length) ?? "foundation";
const channelArgument = process.argv.find((value) => value.startsWith("--channel="))?.slice("--channel=".length);
const releaseChannel = channelArgument ?? (process.env.VERCEL_ENV === "production" ? "production" : "preview");
const supportedLevels = new Set(["foundation", "core", "studio"]);
const supportedChannels = new Set(["preview", "production"]);

if (!supportedLevels.has(level)) throw new Error(`Unsupported Story Pack level: ${level}`);
if (!supportedChannels.has(releaseChannel)) throw new Error(`Unsupported release channel: ${releaseChannel}`);

const publicRoot = path.join(repositoryRoot, "public", "books", "pinocchio", "v3", level);
const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
const rights = JSON.parse(await readFile(path.join(packRoot, manifest.rights), "utf8"));
const requiredHumanApprovals = ["editorial", "learning", "voice", "audio", "rights", "release"];

function sha256(value) {
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

async function copyWhenChanged(sourcePath, targetPath, expectedSha256) {
  if (await exists(targetPath)) {
    const current = sha256(await readFile(targetPath));
    if (current === expectedSha256) return;
  }
  await copyFile(sourcePath, targetPath);
}

function sentenceIds(masterText) {
  return masterText.trimEnd().split(/\r?\n/).map((text, index) => ({
    sentenceId: `S${String(index + 1).padStart(3, "0")}`,
    text: text.trim(),
  })).filter((line) => line.text);
}

function hasMillisecondTiming(segment) {
  return Number.isInteger(segment?.speechStartMs)
    && Number.isInteger(segment?.speechEndMs)
    && Number.isInteger(segment?.startMs)
    && Number.isInteger(segment?.endMs)
    && segment.speechStartMs >= 0
    && segment.speechEndMs > segment.speechStartMs
    && segment.startMs <= segment.speechStartMs
    && segment.endMs >= segment.speechEndMs;
}

function mimicTimelineMatches(timelineItems, authoredItems) {
  return timelineItems.length === authoredItems.length && timelineItems.every((item, index) => {
    const authored = authoredItems[index];
    return item.id === authored.id
      && item.sourceSentenceId === authored.sourceSentenceId
      && item.text === authored.text
      && hasMillisecondTiming(item)
      && item.chunks?.length === authored.chunks?.length
      && item.chunks.every((chunk, chunkIndex) => {
        const authoredChunk = authored.chunks[chunkIndex];
        return chunk.chunkId === authoredChunk.chunkId
          && chunk.text === authoredChunk.text
          && chunk.part === authoredChunk.part
          && chunk.parts === authoredChunk.parts
          && JSON.stringify(chunk.sourceTextRange) === JSON.stringify(authoredChunk.sourceTextRange)
          && hasMillisecondTiming(chunk);
      });
  });
}

const published = [];
const chapterAlignmentPending = [];
const chapterApprovalPending = [];
const chapterReleaseRecordsPending = [];

function approvalComplete(approval) {
  return typeof approval?.status === "string"
    && approval.status.endsWith("approved")
    && typeof approval.reviewer === "string"
    && approval.reviewer.length > 0
    && typeof approval.reviewedAt === "string"
    && approval.reviewedAt.length > 0;
}

for (const chapterEntry of manifest.chapters) {
  const chapterPath = path.join(packRoot, chapterEntry.path);
  const chapterRoot = path.dirname(chapterPath);
  const chapter = JSON.parse(await readFile(chapterPath, "utf8"));
  const levelConfig = chapter.levels?.[level];
  if (!levelConfig) throw new Error(`Chapter ${chapter.number} is missing its ${level} configuration.`);

  const productionPath = path.join(chapterRoot, levelConfig.production);
  const production = JSON.parse(await readFile(productionPath, "utf8"));
  const qaPath = path.join(chapterRoot, levelConfig.qa);
  const qa = JSON.parse(await readFile(qaPath, "utf8"));
  const masterPath = path.join(chapterRoot, levelConfig.master);
  const activitiesPath = path.join(chapterRoot, levelConfig.activities);
  const audioPath = production.outputs?.masterAudio
    ? path.join(packRoot, production.outputs.masterAudio)
    : path.join(chapterRoot, "audio", `${level}.master.mp3`);
  const timelinePath = production.outputs?.sentenceTimeline
    ? path.join(packRoot, production.outputs.sentenceTimeline)
    : path.join(chapterRoot, "audio", `${level}.timeline.json`);

  const audioExists = await exists(audioPath);
  const timelineExists = await exists(timelinePath);
  if (!audioExists || !timelineExists) {
    const state = audioExists === timelineExists ? "missing" : "only partially generated";
    throw new Error(`Chapter ${chapter.number} ${level} media is ${state}; all twelve Chapters are required.`);
  }

  const masterFile = await readFile(masterPath);
  const activitiesFile = await readFile(activitiesPath);
  const audioFile = await readFile(audioPath);
  const timelineFile = await readFile(timelinePath);
  const masterSha256 = sha256(masterFile);
  const activitiesSha256 = sha256(activitiesFile);
  const audioSha256 = sha256(audioFile);
  const timelineSha256 = sha256(timelineFile);
  const timeline = JSON.parse(timelineFile.toString("utf8"));
  const activities = JSON.parse(activitiesFile.toString("utf8"));
  const lines = sentenceIds(masterFile.toString("utf8"));

  if (
    timeline.storyPackId !== manifest.storyPackId
    || timeline.chapterId !== chapter.chapterId
    || timeline.level !== level
    || timeline.masterTextSha256 !== masterSha256
    || timeline.activitiesSha256 !== activitiesSha256
    || !Number.isFinite(timeline.duration)
    || timeline.lines?.length !== lines.length
    || timeline.lines.some((line, index) => line.sentenceId !== lines[index].sentenceId || line.text !== lines[index].text || !hasMillisecondTiming(line))
    || !Array.isArray(timeline.mimicItems)
    || !Array.isArray(activities.mimic)
    || !mimicTimelineMatches(timeline.mimicItems, activities.mimic)
  ) {
    throw new Error(`Chapter ${chapter.number} ${level} timeline is stale or malformed; refusing to publish it.`);
  }

  if (production.outputs?.checksum !== `sha256:${audioSha256}`) {
    throw new Error(`Chapter ${chapter.number} ${level} audio checksum is missing or does not match production.json.`);
  }

  if (timeline.alignmentSource !== "elevenlabs-forced-alignment") {
    chapterAlignmentPending.push(chapter.number);
  }
  const missingApprovals = requiredHumanApprovals.filter(
    (approvalName) => !approvalComplete(qa.humanApprovals?.[approvalName]),
  );
  if (missingApprovals.length) {
    chapterApprovalPending.push({ chapter: chapter.number, approvals: missingApprovals });
  }
  const blockingIssues = Array.isArray(qa.blockingIssues) ? qa.blockingIssues.filter(Boolean) : [];
  if (qa.status !== "release-approved" || production.status !== "release-approved" || blockingIssues.length) {
    chapterReleaseRecordsPending.push({
      chapter: chapter.number,
      qaStatus: qa.status ?? "missing",
      productionStatus: production.status ?? "missing",
      blockingIssues: blockingIssues.length,
    });
  }

  const audioBytes = (await stat(audioPath)).size;
  if (audioBytes < 1024) throw new Error(`Chapter ${chapter.number} ${level} audio is empty.`);

  const stem = `chapter-${String(chapter.number).padStart(2, "0")}`;
  const outputRoot = path.join(publicRoot, stem, "lily-british");
  await mkdir(outputRoot, { recursive: true });
  await copyWhenChanged(audioPath, path.join(outputRoot, "master.mp3"), audioSha256);
  await copyWhenChanged(timelinePath, path.join(outputRoot, "timeline.json"), timelineSha256);
  published.push({
    chapter: chapter.number,
    chapterId: chapter.chapterId,
    level,
    narrator: "Lily",
    voiceId: production.provider?.voiceId ?? null,
    durationSeconds: timeline.duration,
    audioBytes,
    audioSha256,
    timelineSha256,
    masterTextSha256: masterSha256,
    activitiesSha256,
    alignmentSource: timeline.alignmentSource ?? null,
    qaStatus: qa.status ?? null,
    audioUrl: `/books/pinocchio/v3/${level}/${stem}/lily-british/master.mp3`,
    timelineUrl: `/books/pinocchio/v3/${level}/${stem}/lily-british/timeline.json`,
  });
}

if (published.length !== 12) {
  throw new Error(`Refusing to publish an incomplete Story Pack: found ${published.length}/12 ${level} Chapters.`);
}

const releaseBlockers = [];
if (manifest.status !== "release-approved" || /draft/i.test(manifest.version ?? "")) {
  releaseBlockers.push("Story Pack manifest is still a draft and has not been marked release-approved.");
}
if (rights.commercialReleaseAllowed !== true) {
  releaseBlockers.push("Commercial rights approval is not recorded.");
}
if (!approvalComplete({
  status: rights.humanReview?.decision,
  reviewer: rights.humanReview?.reviewer,
  reviewedAt: rights.humanReview?.reviewedAt,
})) {
  releaseBlockers.push("Named human rights review is pending.");
}
if (chapterAlignmentPending.length) {
  releaseBlockers.push(`Per-Chapter Forced Alignment is pending for Chapters ${chapterAlignmentPending.join(", ")}.`);
}
if (chapterApprovalPending.length) {
  releaseBlockers.push(`Named human approvals are pending: ${chapterApprovalPending.map(({ chapter, approvals }) => `Chapter ${chapter} (${approvals.join(", ")})`).join("; ")}.`);
}
if (chapterReleaseRecordsPending.length) {
  releaseBlockers.push(`Chapter QA/production records are not release-approved or still contain blockers: ${chapterReleaseRecordsPending.map(({ chapter, qaStatus, productionStatus, blockingIssues }) => `Chapter ${chapter} (qa=${qaStatus}, production=${productionStatus}, blockers=${blockingIssues})`).join("; ")}.`);
}

try {
  const [fullTimeline, fullProvenance] = await Promise.all([
    readFile(path.join(packRoot, "audiobooks", `${level}.full.timeline.json`), "utf8").then(JSON.parse),
    readFile(path.join(packRoot, "audiobooks", `${level}.full.provenance.json`), "utf8").then(JSON.parse),
  ]);
  if (
    fullTimeline.alignmentSource !== "elevenlabs-forced-alignment"
    || fullProvenance.releaseTimingStatus !== "full-master-forced-alignment-complete"
  ) {
    releaseBlockers.push("The continuous full-story master has not passed final Forced Alignment.");
  }
} catch {
  releaseBlockers.push("The continuous full-story alignment evidence is missing.");
}

const releaseReady = releaseBlockers.length === 0;
if (releaseChannel === "production" && !releaseReady) {
  throw new Error(`Pinocchio ${level} is not approved for Production:\n- ${releaseBlockers.join("\n- ")}`);
}

await mkdir(publicRoot, { recursive: true });
await writeFile(
  path.join(publicRoot, "release.json"),
  `${JSON.stringify({
    schemaVersion: "1.0.0",
    storyPackId: manifest.storyPackId,
    version: manifest.version,
    level,
    channel: releaseChannel,
    releaseReady,
    releaseGate: {
      status: releaseReady ? "passed" : "internal-qa-preview-only",
      blockers: releaseBlockers,
    },
    generatedAt: new Date().toISOString(),
    chapters: published,
  }, null, 2)}\n`,
);

console.log(`Published ${published.length}/12 Pinocchio v3 ${level} Chapter media sets as ${releaseChannel} (releaseReady=${releaseReady}).`);
