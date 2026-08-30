import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowPendingReview = process.argv.includes("--allow-pending-review");
const writeReceipt = process.argv.includes("--write-receipt");
const failures = [];
const releaseFailures = [];
const results = [];
const receiptChapters = [];
const RANGE_EPSILON_SECONDS = 0.003;
const DURATION_EPSILON_SECONDS = 0.12;
const SAMPLE_RATE = 44100;
const FINGERPRINT_FRAME_SECONDS = 0.02;
const MIMIC_ROOT = "mimic/core";
const RECEIPT_SCHEMA_VERSION = "1.0.0";
const CANONICAL_RECEIPT_PATH = path.join(root, "content-packs", "pinocchio", "v2", "release-receipt.json");
const PUBLIC_RECEIPT_PATH = path.join(root, "public", "prototype-audio", "pinocchio-v2", "release-receipt.json");

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function releaseAssert(condition, message) {
  if (!condition) releaseFailures.push(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function mimicAssetSetSha256(mimicItems) {
  return sha256(Buffer.from(mimicItems.map((item) => `${item.id}:${item.audioSha256}`).join("\n")));
}

function approvalEvidence(masterSha256, compilerVersion, boundary, leftItem, rightItem) {
  return {
    qaStatus: "human-listen-pass",
    masterSha256,
    boundaryId: boundary.id,
    cut: boundary.cut,
    compilerVersion,
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

function validListenThrough(record, chapter, masterSha256, compilerVersion, assetSetSha256) {
  return record?.qaStatus === "human-listen-pass"
    && record?.chapter === chapter
    && record?.masterSha256 === masterSha256
    && record?.compilerVersion === compilerVersion
    && record?.mimicAssetSetSha256 === assetSetSha256
    && typeof record?.reviewer === "string"
    && record.reviewer.trim().length > 0
    && typeof record?.reviewedAt === "string"
    && Number.isFinite(Date.parse(record.reviewedAt));
}

function fileReceipt(relativePath, bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return { path: relativePath, sha256: sha256(buffer), bytes: buffer.length };
}

function mappingReceipt(timeline, level) {
  return {
    watch: timeline.lines.map((item) => ({ id: item.id, text: item.text })),
    mimic: timeline.mimicItems.map((item) => ({
      id: item.id,
      sourceLineIndex: item.sourceLineIndex,
      text: item.text,
      audio: item.audio,
    })),
    guess: level.activities.guess.items.map((item) => ({
      id: item.id,
      audioLineIndex: item.audioLineIndex,
      correctAnswer: item.correctAnswer,
      options: item.options.map((option) => ({
        label: option.label,
        lineIndex: option.lineIndex,
        text: option.text,
      })),
    })),
    word: level.activities.word.items.map((item) => ({
      id: item.id,
      lineIndex: item.lineIndex,
      text: item.text,
      tokens: item.tokens,
    })),
  };
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function audioMetadata(filePath) {
  return JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,bit_rate:stream=codec_name,sample_rate,channels",
    "-of", "json",
    filePath,
  ], { encoding: "utf8" }));
}

function validateAudio(metadata, chapter, label, minimumDuration = 0.2) {
  const stream = metadata.streams?.[0] ?? {};
  const duration = Number(metadata.format?.duration || 0);
  assert(stream.codec_name === "mp3", `Chapter ${chapter}: ${label} must be MP3.`);
  assert(Number(stream.sample_rate) === SAMPLE_RATE, `Chapter ${chapter}: ${label} must be 44.1kHz.`);
  assert(Number(stream.channels) === 1, `Chapter ${chapter}: ${label} must be mono.`);
  assert(duration > minimumDuration, `Chapter ${chapter}: ${label} duration is unexpectedly short.`);
  return duration;
}

function decodePcm(filePath) {
  return execFileSync("ffmpeg", [
    "-v", "error",
    "-i", filePath,
    "-f", "s16le",
    "-acodec", "pcm_s16le",
    "-ac", "1",
    "-ar", String(SAMPLE_RATE),
    "pipe:1",
  ], { maxBuffer: 64 * 1024 * 1024 });
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

function validRange(item, duration) {
  return Number.isFinite(item.start)
    && Number.isFinite(item.end)
    && item.start >= 0
    && item.end > item.start
    && item.end <= duration + RANGE_EPSILON_SECONDS;
}

for (let chapter = 1; chapter <= 12; chapter += 1) {
  const stem = `session-${String(chapter).padStart(2, "0")}`;
  const canonicalRoot = path.join(root, "content-packs", "pinocchio", "v2", "sessions", stem);
  const publicAudioRoot = path.join(root, "public", "prototype-audio", "pinocchio-v2", stem, "lily-british");
  const canonicalAudioRoot = path.join(canonicalRoot, "audio");
  const publicMimicRoot = path.join(publicAudioRoot, MIMIC_ROOT);
  const canonicalMimicRoot = path.join(canonicalAudioRoot, MIMIC_ROOT);
  const packPath = path.join(canonicalRoot, "pack.json");
  const publicMasterPath = path.join(publicAudioRoot, "core.master.mp3");
  const canonicalMasterPath = path.join(canonicalAudioRoot, "core.master.mp3");
  const timelinePath = path.join(canonicalAudioRoot, "core.timeline.json");
  const provenancePath = path.join(canonicalAudioRoot, "provenance.json");
  const publicTimelinePath = path.join(publicAudioRoot, "core.timeline.json");
  const publicProvenancePath = path.join(publicAudioRoot, "provenance.json");
  const publicArt = path.join(root, "public", "prototype-art", "pinocchio-v2", `${stem}.png`);
  const canonicalArt = path.join(canonicalRoot, "assets", `${stem}.png`);

  try {
    const [packRaw, timelineRaw, provenanceRaw, publicTimelineRaw, publicProvenanceRaw] = await Promise.all([
      readFile(packPath, "utf8"),
      readFile(timelinePath, "utf8"),
      readFile(provenancePath, "utf8"),
      readFile(publicTimelinePath, "utf8"),
      readFile(publicProvenancePath, "utf8"),
    ]);
    const pack = JSON.parse(packRaw);
    const timeline = JSON.parse(timelineRaw);
    const provenance = JSON.parse(provenanceRaw);
    const level = pack.levels.core;
    const publicMasterAudio = await readFile(publicMasterPath);
    const masterSha256 = sha256(publicMasterAudio);
    const masterDuration = validateAudio(audioMetadata(publicMasterPath), chapter, "public continuous master", 60);
    const sourcePcm = decodePcm(publicMasterPath);

    assert(pack.course.session === chapter, `Chapter ${chapter}: pack number mismatch.`);
    assert(level.lines.length === 16, `Chapter ${chapter}: expected 16 Watch lines.`);
    assert(level.activities.mimic.items.length === 30, `Chapter ${chapter}: expected 30 Mimic units.`);
    assert(level.activities.guess.items.length === 10, `Chapter ${chapter}: expected 10 Guess items.`);
    assert(level.activities.word.items.length === 10, `Chapter ${chapter}: expected 10 Word items.`);
    assert(timeline.schemaVersion === "1.2.0", `Chapter ${chapter}: independent-file timeline schema missing.`);
    assert(timeline.contentId === pack.contentId, `Chapter ${chapter}: timeline contentId mismatch.`);
    assert(timeline.contentChecksum === pack.checksum, `Chapter ${chapter}: timeline checksum mismatch.`);
    assert(timeline.lines.length === 16, `Chapter ${chapter}: expected 16 aligned lines.`);
    assert(timeline.mimicItems.length === 30, `Chapter ${chapter}: expected 30 aligned Mimic units.`);
    assert(timeline.voice?.name === "Lily", `Chapter ${chapter}: expected Lily voice.`);
    assert(timeline.modelId === "eleven_v3", `Chapter ${chapter}: expected Eleven v3.`);
    assert(timeline.source === "one-continuous-master", `Chapter ${chapter}: Watch master is not continuous.`);
    assert(timeline.mimicAudio?.strategy === "independent-files", `Chapter ${chapter}: independent Mimic strategy missing.`);
    assert(timeline.mimicAudio?.root === MIMIC_ROOT, `Chapter ${chapter}: Mimic root mismatch.`);
    assert(timeline.mimicAudio?.count === 30, `Chapter ${chapter}: Mimic asset count mismatch.`);
    assert(timeline.mimicAudio?.extension === "mp3", `Chapter ${chapter}: Mimic extension mismatch.`);
    assert(!Object.hasOwn(timeline, "mimicDuration"), `Chapter ${chapter}: legacy sprite duration remains.`);
    assert(provenance.commercialPaidPlanConfirmed === true, `Chapter ${chapter}: paid-plan provenance missing.`);
    assert(Math.abs(timeline.duration - masterDuration) <= DURATION_EPSILON_SECONDS, `Chapter ${chapter}: master duration differs from timeline.`);
    assert(timeline.lines.every((item) => validRange(item, masterDuration)), `Chapter ${chapter}: invalid Watch timing.`);
    const lineIds = new Set();
    timeline.lines.forEach((line, index) => {
      const expected = level.lines[index];
      assert(line.id === expected.id, `Chapter ${chapter}: Watch line ${index + 1} id changed.`);
      assert(line.text === expected.text, `Chapter ${chapter}: Watch line ${index + 1} text changed.`);
      assert(!lineIds.has(line.id), `Chapter ${chapter}: duplicate Watch line id ${line.id}.`);
      lineIds.add(line.id);
    });

    const guessIds = new Set();
    level.activities.guess.items.forEach((item, index) => {
      assert(!guessIds.has(item.id), `Chapter ${chapter}: duplicate Guess id ${item.id}.`);
      guessIds.add(item.id);
      assert(Number.isInteger(item.audioLineIndex)
        && item.audioLineIndex >= 0
        && item.audioLineIndex < level.lines.length,
      `Chapter ${chapter}: Guess ${index + 1} audio line is invalid.`);
      assert(Array.isArray(item.options) && item.options.length === 3,
        `Chapter ${chapter}: Guess ${index + 1} must have three options.`);
      const labels = new Set(item.options.map((option) => option.label));
      assert(labels.size === item.options.length,
        `Chapter ${chapter}: Guess ${index + 1} option labels are not unique.`);
      const correct = item.options.find((option) => option.label === item.correctAnswer);
      assert(Boolean(correct), `Chapter ${chapter}: Guess ${index + 1} correct answer is missing.`);
      assert(correct?.lineIndex === item.audioLineIndex,
        `Chapter ${chapter}: Guess ${index + 1} correct option points to the wrong line.`);
      item.options.forEach((option) => {
        const validLineIndex = Number.isInteger(option.lineIndex)
          && option.lineIndex >= 0
          && option.lineIndex < level.lines.length;
        assert(validLineIndex,
          `Chapter ${chapter}: Guess ${index + 1} option ${option.label} line is invalid.`);
        assert(validLineIndex && option.text === level.lines[option.lineIndex].text,
          `Chapter ${chapter}: Guess ${index + 1} option ${option.label} text differs from its line.`);
      });
    });

    const wordIds = new Set();
    level.activities.word.items.forEach((item, index) => {
      assert(!wordIds.has(item.id), `Chapter ${chapter}: duplicate Word id ${item.id}.`);
      wordIds.add(item.id);
      const validLineIndex = Number.isInteger(item.lineIndex)
        && item.lineIndex >= 0
        && item.lineIndex < level.lines.length;
      assert(validLineIndex, `Chapter ${chapter}: Word ${index + 1} line is invalid.`);
      assert(validLineIndex && item.text === level.lines[item.lineIndex].text,
        `Chapter ${chapter}: Word ${index + 1} text differs from its line.`);
      assert(Array.isArray(item.tokens)
        && item.tokens.length > 0
        && item.tokens.every((token) => typeof token === "string" && token.length > 0),
      `Chapter ${chapter}: Word ${index + 1} tokens are invalid.`);
    });

    assert(timelineRaw === publicTimelineRaw, `Chapter ${chapter}: public timeline differs from canonical.`);
    assert(provenanceRaw === publicProvenanceRaw, `Chapter ${chapter}: public provenance differs from canonical.`);
    assert(!(await fileExists(path.join(publicAudioRoot, "core.mimic.mp3"))), `Chapter ${chapter}: legacy public Mimic sprite remains.`);
    assert(!(await fileExists(path.join(canonicalAudioRoot, "core.mimic.mp3"))), `Chapter ${chapter}: legacy canonical Mimic sprite remains.`);

    const expectedFilenames = level.activities.mimic.items.map((item) => `${item.id}.mp3`).sort();
    const publicFilenames = (await readdir(publicMimicRoot)).filter((name) => name.endsWith(".mp3")).sort();
    assert(JSON.stringify(publicFilenames) === JSON.stringify(expectedFilenames), `Chapter ${chapter}: public Mimic file set mismatch.`);
    if (await fileExists(canonicalMimicRoot)) {
      const canonicalFilenames = (await readdir(canonicalMimicRoot)).filter((name) => name.endsWith(".mp3")).sort();
      assert(JSON.stringify(canonicalFilenames) === JSON.stringify(expectedFilenames), `Chapter ${chapter}: canonical Mimic file set mismatch.`);
    }

    const expectedMimicItems = level.activities.mimic.items;
    let totalMimicBytes = 0;
    const mimicAssetReceipts = [];
    for (let index = 0; index < timeline.mimicItems.length; index += 1) {
      const item = timeline.mimicItems[index];
      const expected = expectedMimicItems[index];
      const expectedAudio = `${MIMIC_ROOT}/${item.id}.mp3`;
      assert(item.id === expected.id, `Chapter ${chapter}: Mimic ${index + 1} id changed.`);
      assert(item.text === expected.text, `Chapter ${chapter}: Mimic ${index + 1} text changed.`);
      assert(item.sourceLineIndex === expected.sourceLineIndex, `Chapter ${chapter}: Mimic ${index + 1} source line changed.`);
      assert(item.audio === expectedAudio, `Chapter ${chapter}: Mimic ${index + 1} audio path mismatch.`);
      assert(item.start === 0, `Chapter ${chapter}: Mimic ${index + 1} must start at natural file start.`);

      const publicItemPath = path.join(publicAudioRoot, item.audio);
      const publicAudio = await readFile(publicItemPath);
      const itemDuration = validateAudio(audioMetadata(publicItemPath), chapter, item.id);
      totalMimicBytes += publicAudio.length;
      mimicAssetReceipts.push({
        id: item.id,
        sourceLineIndex: item.sourceLineIndex,
        text: item.text,
        audio: item.audio,
        sha256: sha256(publicAudio),
        bytes: publicAudio.length,
        duration: item.duration,
        sourceStart: item.sourceStart,
        sourceEnd: item.sourceEnd,
        sourceEnergyFingerprint: item.sourceEnergyFingerprint,
      });
      assert(sha256(publicAudio) === item.audioSha256, `Chapter ${chapter}: ${item.id} public hash mismatch.`);
      assert(publicAudio.length === item.audioBytes, `Chapter ${chapter}: ${item.id} byte count mismatch.`);
      assert(Math.abs(item.duration - itemDuration) <= DURATION_EPSILON_SECONDS, `Chapter ${chapter}: ${item.id} duration metadata mismatch.`);
      assert(Math.abs(item.end - itemDuration) <= DURATION_EPSILON_SECONDS, `Chapter ${chapter}: ${item.id} does not end at natural EOF.`);
      assert(item.start <= item.speechStart && item.speechStart <= item.speechEnd && item.speechEnd <= item.end,
        `Chapter ${chapter}: ${item.id} speech bounds escape its file.`);
      assert(item.sourceStart <= item.sourceSpeechStart
        && item.sourceSpeechStart <= item.sourceSpeechEnd
        && item.sourceSpeechEnd <= item.sourceEnd,
      `Chapter ${chapter}: ${item.id} source speech bounds escape its source window.`);
      assert(item.sourceStart >= 0 && item.sourceEnd <= masterDuration + RANGE_EPSILON_SECONDS,
        `Chapter ${chapter}: ${item.id} source range escapes the continuous master.`);
      assert(item.sourceEnergyFingerprint === sourceEnergyFingerprint(sourcePcm, item.sourceStart, item.sourceEnd),
        `Chapter ${chapter}: ${item.id} source energy fingerprint mismatch.`);

      const canonicalItemPath = path.join(canonicalMimicRoot, `${item.id}.mp3`);
      if (await fileExists(canonicalItemPath)) {
        assert(sha256(await readFile(canonicalItemPath)) === item.audioSha256,
          `Chapter ${chapter}: ${item.id} canonical/public parity mismatch.`);
      }
      if (index > 0) {
        const previous = timeline.mimicItems[index - 1];
        assert(previous.sourceEnd <= item.sourceStart + RANGE_EPSILON_SECONDS,
          `Chapter ${chapter}: source windows overlap at Mimic ${index}/${index + 1}.`);
      }
    }

    const safety = timeline.boundarySafety;
    assert(safety?.version === "vad-clamped-v2", `Chapter ${chapter}: boundary compiler version missing.`);
    assert(safety?.masterSha256 === masterSha256, `Chapter ${chapter}: boundary approval master hash mismatch.`);
    assert(safety?.playbackIsolation === "independent-files", `Chapter ${chapter}: natural-EOF isolation missing.`);
    assert(safety?.naturalEof === true, `Chapter ${chapter}: natural EOF is not certified.`);
    assert(safety?.adjacentSpeechLeakagePrevented === true, `Chapter ${chapter}: adjacent-speech isolation is not certified.`);
    assert(safety?.boundaries?.length === 29, `Chapter ${chapter}: expected 29 boundary records.`);
    assert(safety?.totalBoundaries === 29, `Chapter ${chapter}: boundary total mismatch.`);
    assert(safety?.acousticallySafeBoundaries + safety?.humanApprovedBoundaries + safety?.releaseBlockedBoundaries === 29,
      `Chapter ${chapter}: boundary safety totals mismatch.`);
    const pending = safety?.pendingBoundaryIds ?? [];
    assert(pending.length === safety?.releaseBlockedBoundaries, `Chapter ${chapter}: pending boundary count mismatch.`);

    const humanApprovals = safety?.humanApprovals ?? [];
    const approvedBoundaryIds = [];
    const approvalRecordsUsed = new Set();
    (safety?.boundaries ?? []).forEach((boundary, index) => {
      const left = timeline.mimicItems[index];
      const right = timeline.mimicItems[index + 1];
      assert(boundary.id === `${left.id}--${right.id}`, `Chapter ${chapter}: boundary ${index + 1} id mismatch.`);
      assert(Math.abs(left.sourceEnd - boundary.cut) <= RANGE_EPSILON_SECONDS,
        `Chapter ${chapter}: left source cut ${index + 1} differs from boundary record.`);
      assert(Math.abs(right.sourceStart - boundary.cut) <= RANGE_EPSILON_SECONDS,
        `Chapter ${chapter}: right source cut ${index + 1} differs from boundary record.`);
      if (boundary.method === "quiet-midpoint") {
        assert(boundary.quietEnd - boundary.quietStart >= safety.minimumQuietSeconds - RANGE_EPSILON_SECONDS,
          `Chapter ${chapter}: boundary ${index + 1} quiet evidence is too short.`);
        assert(boundary.cut >= boundary.quietStart && boundary.cut <= boundary.quietEnd,
          `Chapter ${chapter}: boundary ${index + 1} cut is outside certified quiet audio.`);
        assert(boundary.needsHumanReview === false,
          `Chapter ${chapter}: acoustically safe boundary ${index + 1} is incorrectly blocked.`);
      } else {
        assert(boundary.method === "alignment-midpoint", `Chapter ${chapter}: boundary ${index + 1} has an unknown method.`);
        const evidence = approvalEvidence(masterSha256, safety.version, boundary, left, right);
        assert(JSON.stringify(boundary.humanApprovalEvidence) === JSON.stringify(evidence),
          `Chapter ${chapter}: boundary ${index + 1} approval evidence is stale.`);
        const boundApprovals = humanApprovals.filter((approval) => isBoundApproval(approval, evidence));
        assert(boundApprovals.length <= 1,
          `Chapter ${chapter}: boundary ${index + 1} has duplicate human approvals.`);
        const boundApproval = boundApprovals[0];
        if (boundApproval) {
          approvedBoundaryIds.push(boundary.id);
          approvalRecordsUsed.add(boundApproval);
          assert(boundary.needsHumanReview === false,
            `Chapter ${chapter}: approved boundary ${index + 1} is still blocked.`);
          assert(JSON.stringify(boundary.humanApproval) === JSON.stringify(boundApproval),
            `Chapter ${chapter}: boundary ${index + 1} embedded approval differs from its bound record.`);
        } else {
          assert(boundary.needsHumanReview === true,
            `Chapter ${chapter}: boundary ${index + 1} bypasses required human review.`);
          assert(!Object.hasOwn(boundary, "humanApproval"),
            `Chapter ${chapter}: boundary ${index + 1} contains an unbound approval.`);
        }
        assert(boundary.needsHumanReview === pending.includes(boundary.id),
          `Chapter ${chapter}: boundary ${index + 1} review state mismatch.`);
      }
    });

    assert(JSON.stringify(safety.approvedBoundaryIds ?? []) === JSON.stringify(approvedBoundaryIds),
      `Chapter ${chapter}: approved boundary IDs are not derived from bound approvals.`);
    assert(safety.humanApprovedBoundaries === approvedBoundaryIds.length,
      `Chapter ${chapter}: human-approved boundary count mismatch.`);
    assert(humanApprovals.length === approvalRecordsUsed.size,
      `Chapter ${chapter}: stale or unrelated human approval record remains.`);
    assert(provenance.boundarySafety?.masterSha256 === masterSha256,
      `Chapter ${chapter}: provenance master hash mismatch.`);
    const assetSetSha256 = mimicAssetSetSha256(timeline.mimicItems);
    assert(provenance.boundarySafety?.mimicAssetSetSha256 === assetSetSha256,
      `Chapter ${chapter}: provenance Mimic asset-set hash mismatch.`);

    releaseAssert(pending.length === 0,
      `Chapter ${chapter}: ${pending.length} coarticulated boundaries still require human listening approval.`);
    releaseAssert(provenance.qaStatus === "human-listen-pass",
      `Chapter ${chapter}: provenance qaStatus must exactly equal human-listen-pass.`);
    const listenThrough = provenance.humanListenThrough;
    const listenThroughIsValid = validListenThrough(
      listenThrough,
      chapter,
      masterSha256,
      safety.version,
      assetSetSha256,
    );
    releaseAssert(listenThroughIsValid,
    `Chapter ${chapter}: bound full-chapter human listen-through record is missing or stale.`);

    if (await fileExists(canonicalMasterPath)) {
      assert(sha256(await readFile(canonicalMasterPath)) === masterSha256,
        `Chapter ${chapter}: public master differs from canonical.`);
    }
    if (await fileExists(canonicalArt)) {
      assert(sha256(await readFile(canonicalArt)) === sha256(await readFile(publicArt)),
        `Chapter ${chapter}: public art differs from canonical.`);
    }

    const mapping = mappingReceipt(timeline, level);
    const chapterReleaseReady = pending.length === 0
      && provenance.qaStatus === "human-listen-pass"
      && listenThroughIsValid;
    receiptChapters.push({
      chapter,
      contentId: pack.contentId,
      status: chapterReleaseReady ? "PASS" : "BLOCKED",
      files: {
        pack: fileReceipt(`content-packs/pinocchio/v2/sessions/${stem}/pack.json`, packRaw),
        timeline: fileReceipt(`public/prototype-audio/pinocchio-v2/${stem}/lily-british/core.timeline.json`, publicTimelineRaw),
        provenance: fileReceipt(`public/prototype-audio/pinocchio-v2/${stem}/lily-british/provenance.json`, publicProvenanceRaw),
        master: fileReceipt(`public/prototype-audio/pinocchio-v2/${stem}/lily-british/core.master.mp3`, publicMasterAudio),
      },
      mapping,
      mappingSha256: sha256(Buffer.from(JSON.stringify(mapping))),
      mimicAssetSetSha256: assetSetSha256,
      mimicAssets: mimicAssetReceipts,
      boundarySafety: {
        compilerVersion: safety.version,
        masterSha256,
        acousticallySafeBoundaries: safety.acousticallySafeBoundaries,
        humanApprovedBoundaries: safety.humanApprovedBoundaries,
        releaseBlockedBoundaries: safety.releaseBlockedBoundaries,
        approvedBoundaryIds: safety.approvedBoundaryIds,
        pendingBoundaryIds: pending,
        humanApprovals,
      },
      qa: {
        qaStatus: provenance.qaStatus,
        humanListenThrough: listenThrough ?? null,
      },
    });

    results.push({
      chapter,
      sourceChapters: pack.story.sourceChapters,
      durationSeconds: Number(masterDuration.toFixed(2)),
      watchLines: timeline.lines.length,
      mimicUnits: timeline.mimicItems.length,
      mimicAssets: publicFilenames.length,
      mimicBytes: totalMimicBytes,
      guessItems: level.activities.guess.items.length,
      wordItems: level.activities.word.items.length,
      safeBoundaries: safety.acousticallySafeBoundaries,
      pendingBoundaries: pending.length,
    });
  } catch (error) {
    failures.push(`Chapter ${chapter}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (releaseFailures.length && !allowPendingReview) {
  console.error(releaseFailures.join("\n"));
  console.error("Release validation blocked. Human-listen every pending boundary, record approvals, then rerun.");
  process.exit(1);
}

const receiptPayload = {
  schemaVersion: RECEIPT_SCHEMA_VERSION,
  contentPack: "pinocchio-v2-core",
  compilerVersion: "vad-clamped-v2",
  offlineValidation: {
    pcmDecoded: true,
    ffprobeMetadataChecked: true,
    sourceEnergyFingerprintsChecked: true,
    deterministicRebuildRequired: "npm run check:pinocchio-v2-boundaries",
  },
  status: releaseFailures.length ? "BLOCKED" : "PASS",
  releaseBlockers: releaseFailures,
  totals: {
    chapters: receiptChapters.length,
    watch: receiptChapters.reduce((sum, chapter) => sum + chapter.mapping.watch.length, 0),
    mimic: receiptChapters.reduce((sum, chapter) => sum + chapter.mapping.mimic.length, 0),
    guess: receiptChapters.reduce((sum, chapter) => sum + chapter.mapping.guess.length, 0),
    word: receiptChapters.reduce((sum, chapter) => sum + chapter.mapping.word.length, 0),
    mimicAssets: receiptChapters.reduce((sum, chapter) => sum + chapter.mimicAssets.length, 0),
    mimicBytes: receiptChapters.reduce(
      (sum, chapter) => sum + chapter.mimicAssets.reduce((assetSum, asset) => assetSum + asset.bytes, 0),
      0,
    ),
    acousticallySafeBoundaries: receiptChapters.reduce(
      (sum, chapter) => sum + chapter.boundarySafety.acousticallySafeBoundaries,
      0,
    ),
    humanApprovedBoundaries: receiptChapters.reduce(
      (sum, chapter) => sum + chapter.boundarySafety.humanApprovedBoundaries,
      0,
    ),
    releaseBlockedBoundaries: receiptChapters.reduce(
      (sum, chapter) => sum + chapter.boundarySafety.releaseBlockedBoundaries,
      0,
    ),
  },
  chapters: receiptChapters,
};
const releaseReceipt = {
  ...receiptPayload,
  payloadSha256: sha256(Buffer.from(JSON.stringify(receiptPayload))),
};
const releaseReceiptJson = `${JSON.stringify(releaseReceipt, null, 2)}\n`;

if (writeReceipt) {
  await Promise.all([
    writeFile(CANONICAL_RECEIPT_PATH, releaseReceiptJson),
    writeFile(PUBLIC_RECEIPT_PATH, releaseReceiptJson),
  ]);
}

console.log(JSON.stringify({
  validationMode: allowPendingReview ? "structural-preview" : "release",
  releaseGate: releaseFailures.length ? "BLOCKED" : "PASS",
  releaseBlockers: releaseFailures,
  releaseReceipt: {
    status: releaseReceipt.status,
    payloadSha256: releaseReceipt.payloadSha256,
    written: writeReceipt,
    canonicalPath: path.relative(root, CANONICAL_RECEIPT_PATH),
    publicPath: path.relative(root, PUBLIC_RECEIPT_PATH),
  },
  chapters: results.length,
  sourceChaptersCovered: results.flatMap((result) => result.sourceChapters),
  totalAudioMinutes: Number((results.reduce((sum, result) => sum + result.durationSeconds, 0) / 60).toFixed(2)),
  totals: {
    watchLines: results.reduce((sum, result) => sum + result.watchLines, 0),
    mimicUnits: results.reduce((sum, result) => sum + result.mimicUnits, 0),
    mimicAssets: results.reduce((sum, result) => sum + result.mimicAssets, 0),
    mimicBytes: results.reduce((sum, result) => sum + result.mimicBytes, 0),
    guessItems: results.reduce((sum, result) => sum + result.guessItems, 0),
    wordItems: results.reduce((sum, result) => sum + result.wordItems, 0),
    safeBoundaries: results.reduce((sum, result) => sum + result.safeBoundaries, 0),
    pendingBoundaries: results.reduce((sum, result) => sum + result.pendingBoundaries, 0),
  },
  results,
}, null, 2));
