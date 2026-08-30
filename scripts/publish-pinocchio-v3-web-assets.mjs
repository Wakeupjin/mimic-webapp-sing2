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
if (process.env.PINOCCHIO_PRODUCTION_RELEASE === "v2") {
  console.log("Skipped Pinocchio v3 publishing because PINOCCHIO_PRODUCTION_RELEASE=v2 is the active rollback.");
  process.exit(0);
}

const publicRoot = path.join(repositoryRoot, "public", "books", "pinocchio", "v3", level);
const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
const rights = JSON.parse(await readFile(path.join(packRoot, manifest.rights), "utf8"));
const narratorPolicy = JSON.parse(await readFile(path.join(packRoot, manifest.narratorPolicy), "utf8"));
const requiredHumanApprovals = ["editorial", "learning", "voice", "audio", "rights", "release"];

if (
  narratorPolicy.storyPackId !== manifest.storyPackId
  || narratorPolicy.status !== "approved-for-batch-production"
  || narratorPolicy.decision?.provider !== "ElevenLabs"
  || narratorPolicy.decision?.modelId !== "eleven_v3"
  || typeof narratorPolicy.decision?.voiceId !== "string"
  || !narratorPolicy.decision.voiceId
  || narratorPolicy.decision?.displayName !== "Lily"
) {
  throw new Error("The Pinocchio narrator policy is missing or not locked to the approved Lily Eleven v3 identity.");
}

const approvedNarrator = narratorPolicy.decision;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function publicBetaAuthorization() {
  const reference = manifest.betaReleaseAuthorization;
  if (typeof reference !== "string" || !reference.trim()) {
    return { valid: false, errors: ["The manifest does not reference a public-beta authorization."] };
  }

  const authorizationPath = path.resolve(packRoot, reference);
  const relativePath = path.relative(packRoot, authorizationPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return { valid: false, errors: ["The public-beta authorization path escapes the Story Pack."] };
  }

  let file;
  let authorization;
  try {
    file = await readFile(authorizationPath);
    authorization = JSON.parse(file.toString("utf8"));
  } catch {
    return { valid: false, errors: ["The public-beta authorization cannot be read or parsed."] };
  }

  const errors = [];
  const fileSha256 = sha256(file);
  const authorizedAt = Date.parse(authorization.authorizedAt ?? "");
  const namedAuthorizer = typeof authorization.authorizedBy === "string"
    && authorization.authorizedBy.trim().length >= 4
    && !["product-owner", "owner", "pending"].includes(authorization.authorizedBy.trim().toLowerCase());
  const exactFoundationScope = Array.isArray(authorization.levels)
    && authorization.levels.length === 1
    && authorization.levels[0] === "foundation"
    && level === "foundation";
  const acknowledgements = Array.isArray(authorization.acknowledgedOpenGates)
    ? authorization.acknowledgedOpenGates.filter((item) => typeof item === "string" && item.trim())
    : [];
  const acknowledgedText = acknowledgements.join(" ").toLowerCase();

  if (authorization.schemaVersion !== "1.0.0") errors.push("Authorization schemaVersion must be 1.0.0.");
  if (manifest.betaReleaseAuthorizationSha256 !== `sha256:${fileSha256}`) errors.push("Public-beta authorization does not match the manifest-pinned approval digest.");
  if (authorization.storyPackId !== manifest.storyPackId) errors.push("Authorization Story Pack identity does not match.");
  if (authorization.authorizationType !== "product-owner-explicit-public-beta") errors.push("Explicit product-owner public-beta authorization is missing.");
  if (authorization.status !== "active") errors.push("Public-beta authorization is not active.");
  if (authorization.channel !== "production") errors.push("Public-beta authorization is not scoped to Production.");
  if (!exactFoundationScope) errors.push("Public-beta authorization must be scoped to Foundation only.");
  if (!namedAuthorizer) errors.push("Public-beta authorization requires a named product owner.");
  if (!Number.isFinite(authorizedAt)) errors.push("Public-beta authorization requires a valid authorizedAt timestamp.");
  if (Number.isFinite(authorizedAt) && authorizedAt > Date.now() + 5 * 60 * 1000) errors.push("Public-beta authorization cannot be future-dated.");
  if (authorization.expiresAt !== null || authorization.revokedAt !== null) errors.push("Public-beta authorization is expired or revoked.");
  if (typeof authorization.releaseId !== "string" || !authorization.releaseId.trim()) errors.push("Public-beta authorization requires a releaseId.");
  if (typeof authorization.scope !== "string" || !/foundation/i.test(authorization.scope)) errors.push("Public-beta authorization scope is incomplete.");
  if (typeof authorization.authorizationEvidence !== "string" || !/forced alignment/i.test(authorization.authorizationEvidence) || !/legal/i.test(authorization.authorizationEvidence)) {
    errors.push("Public-beta authorization evidence does not record the disclosed alignment and legal risks.");
  }
  if (
    acknowledgements.length < 5
    || !/forced alignment/.test(acknowledgedText)
    || !/editorial/.test(acknowledgedText)
    || !/legal/.test(acknowledgedText)
    || !/beta/.test(acknowledgedText)
  ) {
    errors.push("Public-beta authorization does not acknowledge every disclosed open gate.");
  }
  if (
    authorization.rollback?.environmentVariable !== "PINOCCHIO_PRODUCTION_RELEASE"
    || authorization.rollback?.value !== "v2"
  ) {
    errors.push("Public-beta authorization does not declare the v2 rollback.");
  }

  return {
    valid: errors.length === 0,
    errors,
    authorization,
    sha256: fileSha256,
  };
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
    chapter.storyPackId !== manifest.storyPackId
    || chapter.number !== chapterEntry.number
    || chapter.chapterId !== `chapter-${String(chapterEntry.number).padStart(2, "0")}`
    || production.chapterId !== chapter.chapterId
    || production.level !== level
    || activities.chapterId !== chapter.chapterId
    || activities.level !== level
    || qa.chapterId !== chapter.chapterId
    || qa.level !== level
  ) {
    throw new Error(`Chapter ${chapter.number} ${level} source, activity, QA, and production identities do not match.`);
  }

  if (
    production.provider?.name !== approvedNarrator.provider
    || production.provider?.modelId !== approvedNarrator.modelId
    || production.provider?.voiceId !== approvedNarrator.voiceId
    || production.provider?.voiceCandidateName !== approvedNarrator.displayName
    || production.provider?.accent !== approvedNarrator.accent
    || production.provider?.approved !== true
    || timeline.provider !== approvedNarrator.provider
    || timeline.modelId !== approvedNarrator.modelId
    || timeline.voice?.id !== approvedNarrator.voiceId
    || timeline.voice?.name !== approvedNarrator.displayName
    || timeline.accent !== approvedNarrator.accent
  ) {
    throw new Error(`Chapter ${chapter.number} ${level} is not bound to the approved Lily Eleven v3 narrator policy.`);
  }

  if (
    production.generation?.scriptChecksum !== `sha256:${masterSha256}`
    || production.generation?.activitiesChecksum !== `sha256:${activitiesSha256}`
    || timeline.outputFormat !== production.generation?.outputFormat
  ) {
    throw new Error(`Chapter ${chapter.number} ${level} production evidence does not match its locked script, activities, or output format.`);
  }

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
    narrator: approvedNarrator.displayName,
    voiceId: approvedNarrator.voiceId,
    modelId: approvedNarrator.modelId,
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
const betaAuthorization = releaseChannel === "production" && !releaseReady
  ? await publicBetaAuthorization()
  : { valid: false, errors: [] };
const publicBetaActive = releaseChannel === "production" && !releaseReady && betaAuthorization.valid;
const deploymentAllowed = releaseChannel !== "production" || releaseReady || publicBetaActive;

if (!deploymentAllowed) {
  const authorizationErrors = betaAuthorization.errors?.length
    ? `\nPublic-beta authorization rejected:\n- ${betaAuthorization.errors.join("\n- ")}`
    : "";
  throw new Error(`Pinocchio ${level} is not approved for Production:\n- ${releaseBlockers.join("\n- ")}${authorizationErrors}`);
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
    deploymentAllowed,
    beta: {
      active: publicBetaActive,
      label: publicBetaActive ? "BETA · 검수 중" : null,
    },
    releaseGate: {
      status: releaseReady
        ? "passed"
        : publicBetaActive
          ? "public-beta-authorized"
          : "internal-qa-preview-only",
      blockers: releaseBlockers,
      authorization: publicBetaActive ? {
        releaseId: betaAuthorization.authorization.releaseId,
        authorizationType: betaAuthorization.authorization.authorizationType,
        authorizedBy: betaAuthorization.authorization.authorizedBy,
        authorizedAt: betaAuthorization.authorization.authorizedAt,
        scope: betaAuthorization.authorization.scope,
        levels: betaAuthorization.authorization.levels,
        authorizationSha256: `sha256:${betaAuthorization.sha256}`,
      } : null,
    },
    generatedAt: new Date().toISOString(),
    chapters: published,
  }, null, 2)}\n`,
);

const publicationStatus = publicBetaActive ? "production-public-beta" : releaseReady ? "release-ready" : "preview";
console.log(`Published ${published.length}/12 Pinocchio v3 ${level} Chapter media sets as ${publicationStatus} (releaseReady=${releaseReady}, deploymentAllowed=${deploymentAllowed}).`);
