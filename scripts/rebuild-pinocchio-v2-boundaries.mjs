import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");
const chapterArgument = process.argv.find((value) => value.startsWith("--chapter="))?.split("=")[1] ?? "all";

const COMPILER_VERSION = "vad-clamped-v2";
const HEAD_PADDING_SECONDS = 0.12;
const TAIL_PADDING_SECONDS = 0.1;
const QUIET_THRESHOLD_DB = -38;
const MIN_QUIET_SECONDS = 0.025;
const BOUNDARY_SEARCH_PADDING_SECONDS = 0.08;
const FADE_SECONDS = 0.008;
const SAMPLE_RATE = 44100;
const ENERGY_FRAME_SECONDS = 0.01;
const FINGERPRINT_FRAME_SECONDS = 0.02;
const MIMIC_ROOT = "mimic/core";

if (shouldWrite && shouldCheck) fail("Use either --write or --check, not both.");

function fail(message) {
  throw new Error(message);
}

function round(value) {
  return Number(value.toFixed(3));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function chapterNumbers() {
  if (chapterArgument === "all") return Array.from({ length: 12 }, (_, index) => index + 1);
  const selected = chapterArgument.split(",").map(Number);
  if (selected.some((value) => !Number.isInteger(value) || value < 1 || value > 12)) {
    fail("Use --chapter=all or a comma-separated list from 1 to 12.");
  }
  return selected;
}

function audioDuration(filePath) {
  const result = JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "json",
    filePath,
  ], { encoding: "utf8" }));
  return Number(result.format?.duration || 0);
}

function detectQuietRanges(filePath) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner",
    "-i", filePath,
    "-af", `silencedetect=noise=${QUIET_THRESHOLD_DB}dB:d=${MIN_QUIET_SECONDS}`,
    "-f", "null",
    "-",
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`ffmpeg silence detection failed for ${filePath}.`);

  const ranges = [];
  let start = null;
  for (const line of result.stderr.split("\n")) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
    if (startMatch) start = Number(startMatch[1]);
    const endMatch = line.match(/silence_end:\s*([0-9.]+)/);
    if (endMatch && start !== null) {
      ranges.push({ start, end: Number(endMatch[1]) });
      start = null;
    }
  }
  return ranges;
}

function decodePcm(filePath) {
  const result = spawnSync("ffmpeg", [
    "-v", "error",
    "-i", filePath,
    "-f", "s16le",
    "-acodec", "pcm_s16le",
    "-ac", "1",
    "-ar", String(SAMPLE_RATE),
    "pipe:1",
  ], { maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`ffmpeg PCM decode failed for ${filePath}.`);
  return result.stdout;
}

function energyFrames(pcm) {
  const samplesPerFrame = Math.round(SAMPLE_RATE * ENERGY_FRAME_SECONDS);
  const bytesPerFrame = samplesPerFrame * 2;
  const frames = [];
  for (let offset = 0; offset + bytesPerFrame <= pcm.length; offset += bytesPerFrame) {
    let sumSquares = 0;
    for (let sample = 0; sample < samplesPerFrame; sample += 1) {
      const value = pcm.readInt16LE(offset + sample * 2) / 32768;
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / samplesPerFrame);
    frames.push({
      time: (offset / 2 / SAMPLE_RATE) + ENERGY_FRAME_SECONDS / 2,
      db: 20 * Math.log10(rms + 1e-9),
    });
  }
  return frames;
}

function sourceEnergyFingerprint(pcm, start, end) {
  const firstSample = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const lastSample = Math.min(Math.floor(pcm.length / 2), Math.ceil(end * SAMPLE_RATE));
  const samplesPerFrame = Math.round(SAMPLE_RATE * FINGERPRINT_FRAME_SECONDS);
  const quantized = [];
  for (let frameStart = firstSample; frameStart < lastSample; frameStart += samplesPerFrame) {
    const frameEnd = Math.min(lastSample, frameStart + samplesPerFrame);
    let sumSquares = 0;
    for (let sample = frameStart; sample < frameEnd; sample += 1) {
      const value = pcm.readInt16LE(sample * 2) / 32768;
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, frameEnd - frameStart));
    const db = Math.max(-90, Math.min(0, 20 * Math.log10(rms + 1e-9)));
    quantized.push(Math.round(db));
  }
  return `sha256:${sha256(Buffer.from(JSON.stringify(quantized)))}`;
}

function closestQuietRange(ranges, leftSpeechEnd, rightSpeechStart) {
  const target = (leftSpeechEnd + rightSpeechStart) / 2;
  const searchStart = leftSpeechEnd - BOUNDARY_SEARCH_PADDING_SECONDS;
  const searchEnd = rightSpeechStart + BOUNDARY_SEARCH_PADDING_SECONDS;
  return ranges
    .filter((range) => range.end >= searchStart && range.start <= searchEnd)
    .sort((left, right) => {
      const leftDistance = Math.abs((left.start + left.end) / 2 - target);
      const rightDistance = Math.abs((right.start + right.end) / 2 - target);
      return leftDistance - rightDistance || (right.end - right.start) - (left.end - left.start);
    })[0] ?? null;
}

function minimumEnergyCut(frames, leftSpeechEnd, rightSpeechStart) {
  const searchStart = leftSpeechEnd - BOUNDARY_SEARCH_PADDING_SECONDS;
  const searchEnd = rightSpeechStart + BOUNDARY_SEARCH_PADDING_SECONDS;
  const target = (leftSpeechEnd + rightSpeechStart) / 2;
  const candidates = frames.filter((frame) => frame.time >= searchStart && frame.time <= searchEnd);
  if (!candidates.length) return { cut: target, db: null };
  candidates.sort((left, right) => left.db - right.db || Math.abs(left.time - target) - Math.abs(right.time - target));
  return { cut: candidates[0].time, db: candidates[0].db };
}

function alignmentBounds(item) {
  const alignmentStart = Number.isFinite(item.sourceAlignmentStart)
    ? item.sourceAlignmentStart
    : Number.isFinite(item.alignmentStart)
      ? item.alignmentStart
      : round(item.start + HEAD_PADDING_SECONDS);
  const alignmentEnd = Number.isFinite(item.sourceAlignmentEnd)
    ? item.sourceAlignmentEnd
    : Number.isFinite(item.alignmentEnd)
      ? item.alignmentEnd
      : round(item.end - TAIL_PADDING_SECONDS);
  return { alignmentStart, alignmentEnd };
}

function compileSourceItems(items, quietRanges, frames, duration) {
  const aligned = items.map((item) => ({ ...item, ...alignmentBounds(item) }));
  const speechBounds = aligned.map((item) => ({
    start: Math.max(0, item.alignmentStart),
    end: Math.min(duration, item.alignmentEnd),
  }));
  const boundaries = [];

  for (let index = 0; index < aligned.length - 1; index += 1) {
    const left = aligned[index];
    const right = aligned[index + 1];
    const boundaryId = `${left.id}--${right.id}`;
    const quiet = closestQuietRange(quietRanges, left.alignmentEnd, right.alignmentStart);
    if (quiet) {
      const cut = (quiet.start + quiet.end) / 2;
      speechBounds[index].end = Math.min(speechBounds[index].end, quiet.start);
      speechBounds[index + 1].start = Math.max(speechBounds[index + 1].start, quiet.end);
      boundaries.push({
        id: boundaryId,
        leftId: left.id,
        rightId: right.id,
        cut: round(cut),
        method: "quiet-midpoint",
        quietStart: round(quiet.start),
        quietEnd: round(quiet.end),
        leftAlignmentDelta: round(left.alignmentEnd - quiet.start),
        rightAlignmentDelta: round(quiet.end - right.alignmentStart),
        needsHumanReview: false,
      });
      continue;
    }

    const energyCut = minimumEnergyCut(frames, left.alignmentEnd, right.alignmentStart);
    const providerCut = (left.alignmentEnd + right.alignmentStart) / 2;
    const cut = Number.isFinite(providerCut) ? providerCut : energyCut.cut;
    boundaries.push({
      id: boundaryId,
      leftId: left.id,
      rightId: right.id,
      cut: round(cut),
      method: "alignment-midpoint",
      observedMinimumDb: energyCut.db === null ? null : Number(energyCut.db.toFixed(1)),
      needsHumanReview: true,
    });
  }

  const sourceItems = aligned.map((item, index) => {
    const start = index === 0
      ? Math.max(0, speechBounds[index].start - HEAD_PADDING_SECONDS)
      : boundaries[index - 1].cut;
    const end = index === aligned.length - 1 ? duration : boundaries[index].cut;
    return {
      id: item.id,
      sourceLineIndex: item.sourceLineIndex,
      text: item.text,
      alignmentStart: round(item.alignmentStart),
      alignmentEnd: round(item.alignmentEnd),
      speechStart: round(Math.max(start, speechBounds[index].start)),
      speechEnd: round(Math.min(end, speechBounds[index].end)),
      start: round(start),
      end: round(end),
    };
  });
  const pendingBoundaryIds = boundaries.filter((boundary) => boundary.needsHumanReview).map((boundary) => boundary.id);
  return {
    items: sourceItems,
    safety: {
      version: COMPILER_VERSION,
      quietThresholdDb: QUIET_THRESHOLD_DB,
      minimumQuietSeconds: MIN_QUIET_SECONDS,
      searchPaddingSeconds: BOUNDARY_SEARCH_PADDING_SECONDS,
      source: "one-continuous-master",
      totalBoundaries: boundaries.length,
      acousticallySafeBoundaries: boundaries.filter((boundary) => boundary.method === "quiet-midpoint").length,
      humanApprovedBoundaries: 0,
      releaseBlockedBoundaries: pendingBoundaryIds.length,
      approvedBoundaryIds: [],
      humanApprovals: [],
      pendingBoundaryIds,
      boundaries,
    },
  };
}

function approvalEvidence(masterSha256, boundary, leftItem, rightItem) {
  return {
    qaStatus: "human-listen-pass",
    masterSha256,
    boundaryId: boundary.id,
    cut: boundary.cut,
    compilerVersion: COMPILER_VERSION,
    leftAudioSha256: leftItem.audioSha256,
    rightAudioSha256: rightItem.audioSha256,
  };
}

function isBoundApproval(approval, evidence) {
  return approval
    && approval.qaStatus === evidence.qaStatus
    && approval.masterSha256 === evidence.masterSha256
    && approval.boundaryId === evidence.boundaryId
    && approval.cut === evidence.cut
    && approval.compilerVersion === evidence.compilerVersion
    && approval.leftAudioSha256 === evidence.leftAudioSha256
    && approval.rightAudioSha256 === evidence.rightAudioSha256
    && typeof approval.reviewer === "string"
    && approval.reviewer.trim().length > 0
    && typeof approval.reviewedAt === "string"
    && Number.isFinite(Date.parse(approval.reviewedAt));
}

function applyHumanApprovals(safety, mimicItems, masterSha256, previousApprovals = []) {
  const validApprovals = [];
  const boundaries = safety.boundaries.map((boundary, index) => {
    if (boundary.method === "quiet-midpoint") return boundary;
    const evidence = approvalEvidence(masterSha256, boundary, mimicItems[index], mimicItems[index + 1]);
    const approval = previousApprovals.find((candidate) => isBoundApproval(candidate, evidence));
    if (approval) validApprovals.push(approval);
    return {
      ...boundary,
      needsHumanReview: !approval,
      humanApprovalEvidence: evidence,
      ...(approval ? { humanApproval: approval } : {}),
    };
  });
  const approvedBoundaryIds = boundaries
    .filter((boundary) => boundary.method === "alignment-midpoint" && !boundary.needsHumanReview)
    .map((boundary) => boundary.id);
  const pendingBoundaryIds = boundaries
    .filter((boundary) => boundary.needsHumanReview)
    .map((boundary) => boundary.id);
  return {
    ...safety,
    masterSha256,
    acousticallySafeBoundaries: boundaries.filter((boundary) => boundary.method === "quiet-midpoint").length,
    humanApprovedBoundaries: approvedBoundaryIds.length,
    releaseBlockedBoundaries: pendingBoundaryIds.length,
    approvedBoundaryIds,
    humanApprovals: validApprovals,
    pendingBoundaryIds,
    boundaries,
  };
}

function mimicAssetSetSha256(mimicItems) {
  return sha256(Buffer.from(mimicItems.map((item) => `${item.id}:${item.audioSha256}`).join("\n")));
}

function mimicFileName(item) {
  if (!/^mimic-\d{2}$/.test(item.id)) fail(`Unsafe Mimic id "${item.id}".`);
  return `${item.id}.mp3`;
}

function generateIndependentFiles(sourcePath, sourceItems, outputRoot) {
  const filters = [];
  const outputArguments = [];
  sourceItems.forEach((item, index) => {
    const duration = item.end - item.start;
    const fadeSeconds = Math.min(FADE_SECONDS, duration / 4);
    const fadeOutStart = Math.max(0, duration - fadeSeconds);
    filters.push(
      `[0:a]atrim=start=${item.start}:end=${item.end},asetpts=PTS-STARTPTS,`
      + `afade=t=in:st=0:d=${fadeSeconds},afade=t=out:st=${fadeOutStart}:d=${fadeSeconds}[clip${index}]`
    );
    outputArguments.push(
      "-map", `[clip${index}]`,
      "-ac", "1",
      "-ar", String(SAMPLE_RATE),
      "-b:a", "192k",
      path.join(outputRoot, mimicFileName(item)),
    );
  });
  execFileSync("ffmpeg", [
    "-y",
    "-v", "error",
    "-i", sourcePath,
    "-filter_complex", filters.join(";"),
    ...outputArguments,
  ]);
}

async function buildIndependentTimeline(sourceItems, outputRoot, sourcePcm) {
  return Promise.all(sourceItems.map(async (item) => {
    const filename = mimicFileName(item);
    const filePath = path.join(outputRoot, filename);
    const audio = await readFile(filePath);
    const duration = round(audioDuration(filePath));
    const sourceDuration = item.end - item.start;
    return {
      id: item.id,
      sourceLineIndex: item.sourceLineIndex,
      text: item.text,
      audio: `${MIMIC_ROOT}/${filename}`,
      audioSha256: sha256(audio),
      audioBytes: audio.length,
      duration,
      alignmentStart: round(Math.max(0, item.alignmentStart - item.start)),
      alignmentEnd: round(Math.min(duration, item.alignmentEnd - item.start)),
      speechStart: round(Math.max(0, item.speechStart - item.start)),
      speechEnd: round(Math.min(duration, item.speechEnd - item.start)),
      start: 0,
      end: duration,
      sourceStart: item.start,
      sourceEnd: item.end,
      sourceAlignmentStart: item.alignmentStart,
      sourceAlignmentEnd: item.alignmentEnd,
      sourceSpeechStart: item.speechStart,
      sourceSpeechEnd: item.speechEnd,
      sourceDuration: round(sourceDuration),
      sourceEnergyFingerprint: sourceEnergyFingerprint(sourcePcm, item.start, item.end),
    };
  }));
}

function clampLines(lines, duration) {
  return lines.map((line, index) => {
    const start = Math.max(0, Math.min(duration, line.start));
    const end = index === lines.length - 1
      ? duration
      : Math.max(start, Math.min(duration, line.end));
    return { ...line, start: round(start), end: round(end) };
  });
}

const reports = [];
for (const chapter of chapterNumbers()) {
  const stem = `session-${String(chapter).padStart(2, "0")}`;
  const canonicalAudioRoot = path.join(root, "content-packs", "pinocchio", "v2", "sessions", stem, "audio");
  const publicAudioRoot = path.join(root, "public", "prototype-audio", "pinocchio-v2", stem, "lily-british");
  const canonicalMimicRoot = path.join(canonicalAudioRoot, MIMIC_ROOT);
  const publicMimicRoot = path.join(publicAudioRoot, MIMIC_ROOT);
  const audioPath = path.join(canonicalAudioRoot, "core.master.mp3");
  const timelinePath = path.join(canonicalAudioRoot, "core.timeline.json");
  const publicTimelinePath = path.join(publicAudioRoot, "core.timeline.json");
  const provenancePath = path.join(canonicalAudioRoot, "provenance.json");
  const publicProvenancePath = path.join(publicAudioRoot, "provenance.json");

  const [timelineRaw, provenanceRaw, masterAudio] = await Promise.all([
    readFile(timelinePath, "utf8"),
    readFile(provenancePath, "utf8"),
    readFile(audioPath),
  ]);
  const timeline = JSON.parse(timelineRaw);
  const provenance = JSON.parse(provenanceRaw);
  const duration = round(audioDuration(audioPath));
  if (!(duration > 0)) fail(`Chapter ${chapter}: invalid audio duration.`);
  const sourcePcm = decodePcm(audioPath);
  const compiled = compileSourceItems(
    timeline.mimicItems,
    detectQuietRanges(audioPath),
    energyFrames(sourcePcm),
    duration,
  );

  let assetRoot = null;
  let temporaryRoot = null;
  if (shouldWrite) {
    await Promise.all([
      rm(canonicalMimicRoot, { recursive: true, force: true }),
      rm(publicMimicRoot, { recursive: true, force: true }),
      rm(path.join(canonicalAudioRoot, "core.mimic.mp3"), { force: true }),
      rm(path.join(publicAudioRoot, "core.mimic.mp3"), { force: true }),
    ]);
    await Promise.all([
      mkdir(canonicalMimicRoot, { recursive: true }),
      mkdir(publicMimicRoot, { recursive: true }),
    ]);
    generateIndependentFiles(audioPath, compiled.items, canonicalMimicRoot);
    await Promise.all(compiled.items.map(async (item) => {
      const filename = mimicFileName(item);
      await writeFile(path.join(publicMimicRoot, filename), await readFile(path.join(canonicalMimicRoot, filename)));
    }));
    assetRoot = canonicalMimicRoot;
  } else if (shouldCheck) {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "pinocchio-boundary-check-"));
    assetRoot = path.join(temporaryRoot, MIMIC_ROOT);
    await mkdir(assetRoot, { recursive: true });
    generateIndependentFiles(audioPath, compiled.items, assetRoot);
  }

  if (!assetRoot) {
    reports.push({
      chapter,
      duration,
      mimicItems: compiled.items.length,
      safeBoundaries: compiled.safety.acousticallySafeBoundaries,
      releaseBlockedBoundaries: compiled.safety.releaseBlockedBoundaries,
      firstCut: compiled.safety.boundaries[0]?.cut,
    });
    continue;
  }

  try {
    const mimicItems = await buildIndependentTimeline(compiled.items, assetRoot, sourcePcm);
    const masterSha256 = sha256(masterAudio);
    const boundarySafety = applyHumanApprovals(
      compiled.safety,
      mimicItems,
      masterSha256,
      timeline.boundarySafety?.humanApprovals,
    );
    const { mimicDuration: _obsoleteMimicDuration, ...timelineWithoutSprite } = timeline;
    const nextTimeline = {
      ...timelineWithoutSprite,
      schemaVersion: "1.2.0",
      duration,
      lines: clampLines(timeline.lines, duration),
      mimicAudio: {
        strategy: "independent-files",
        root: MIMIC_ROOT,
        count: mimicItems.length,
        extension: "mp3",
      },
      mimicItems,
      boundarySafety: {
        ...boundarySafety,
        playbackIsolation: "independent-files",
        naturalEof: true,
        fadeSeconds: FADE_SECONDS,
        adjacentSpeechLeakagePrevented: true,
      },
    };
    const nextProvenance = {
      ...provenance,
      boundarySafety: {
        version: COMPILER_VERSION,
        playbackIsolation: "independent-files",
        mimicAssetCount: mimicItems.length,
        masterSha256,
        mimicAssetSetSha256: mimicAssetSetSha256(mimicItems),
        humanApprovedBoundaries: boundarySafety.humanApprovedBoundaries,
        releaseBlockedBoundaries: boundarySafety.releaseBlockedBoundaries,
        pendingBoundaryIds: boundarySafety.pendingBoundaryIds,
      },
    };
    const timelineJson = `${JSON.stringify(nextTimeline, null, 2)}\n`;
    const provenanceJson = `${JSON.stringify(nextProvenance, null, 2)}\n`;

    if (shouldWrite) {
      await Promise.all([
        writeFile(timelinePath, timelineJson),
        writeFile(publicTimelinePath, timelineJson),
        writeFile(provenancePath, provenanceJson),
        writeFile(publicProvenancePath, provenanceJson),
      ]);
    }

    if (shouldCheck) {
      if (timelineRaw !== timelineJson) fail(`Chapter ${chapter}: timeline rebuild is not idempotent.`);
      if (provenanceRaw !== provenanceJson) fail(`Chapter ${chapter}: provenance rebuild is not idempotent.`);
      const [publicTimelineRaw, publicProvenanceRaw] = await Promise.all([
        readFile(publicTimelinePath, "utf8"),
        readFile(publicProvenancePath, "utf8"),
      ]);
      if (publicTimelineRaw !== timelineJson) fail(`Chapter ${chapter}: public timeline is not canonical.`);
      if (publicProvenanceRaw !== provenanceJson) fail(`Chapter ${chapter}: public provenance is not canonical.`);
      await Promise.all(mimicItems.map(async (item) => {
        const filename = path.basename(item.audio);
        const [temporary, canonical, publicAsset] = await Promise.all([
          readFile(path.join(assetRoot, filename)),
          readFile(path.join(canonicalMimicRoot, filename)),
          readFile(path.join(publicMimicRoot, filename)),
        ]);
        if (sha256(temporary) !== item.audioSha256) fail(`Chapter ${chapter}: ${item.id} metadata hash mismatch.`);
        if (sha256(canonical) !== item.audioSha256) fail(`Chapter ${chapter}: ${item.id} rebuild is not deterministic.`);
        if (sha256(publicAsset) !== item.audioSha256) fail(`Chapter ${chapter}: public ${item.id} is not canonical.`);
      }));
    }

    reports.push({
      chapter,
      duration,
      mimicItems: mimicItems.length,
      safeBoundaries: boundarySafety.acousticallySafeBoundaries,
      humanApprovedBoundaries: boundarySafety.humanApprovedBoundaries,
      releaseBlockedBoundaries: boundarySafety.releaseBlockedBoundaries,
      firstCut: boundarySafety.boundaries[0]?.cut,
      independentAssets: mimicItems.length,
      totalMimicBytes: mimicItems.reduce((sum, item) => sum + item.audioBytes, 0),
    });
  } finally {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({
  mode: shouldWrite ? "write" : shouldCheck ? "check" : "preview",
  compilerVersion: COMPILER_VERSION,
  chapters: reports.length,
  totals: {
    mimicItems: reports.reduce((sum, report) => sum + report.mimicItems, 0),
    independentAssets: reports.reduce((sum, report) => sum + (report.independentAssets ?? 0), 0),
    totalMimicBytes: reports.reduce((sum, report) => sum + (report.totalMimicBytes ?? 0), 0),
    boundaries: reports.reduce((sum, report) => sum + report.safeBoundaries + (report.humanApprovedBoundaries ?? 0) + report.releaseBlockedBoundaries, 0),
    acousticallySafeBoundaries: reports.reduce((sum, report) => sum + report.safeBoundaries, 0),
    humanApprovedBoundaries: reports.reduce((sum, report) => sum + (report.humanApprovedBoundaries ?? 0), 0),
    releaseBlockedBoundaries: reports.reduce((sum, report) => sum + report.releaseBlockedBoundaries, 0),
  },
  reports,
}, null, 2));
