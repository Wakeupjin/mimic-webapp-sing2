import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowBlocked = process.argv.includes("--allow-blocked");
const failures = [];
const MIMIC_ROOT = "mimic/core";
const RECEIPT_SCHEMA_VERSION = "1.0.0";
const canonicalReceiptPath = path.join(root, "content-packs", "pinocchio", "v2", "release-receipt.json");
const publicReceiptPath = path.join(root, "public", "prototype-audio", "pinocchio-v2", "release-receipt.json");

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function resolveReceiptPath(relativePath) {
  assert(typeof relativePath === "string" && relativePath.length > 0, "Receipt contains an empty file path.");
  const resolved = path.resolve(root, relativePath || ".");
  assert(resolved.startsWith(`${root}${path.sep}`), `Receipt path escapes repository root: ${relativePath}`);
  return resolved;
}

async function verifyFile(record, expectedPath, label) {
  assert(record?.path === expectedPath, `${label}: unexpected receipt path.`);
  const buffer = await readFile(resolveReceiptPath(record?.path));
  assert(buffer.length === record?.bytes, `${label}: byte count differs from receipt.`);
  assert(sha256(buffer) === record?.sha256, `${label}: hash differs from receipt.`);
  return buffer;
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

const [canonicalReceiptRaw, publicReceiptRaw] = await Promise.all([
  readFile(canonicalReceiptPath, "utf8"),
  readFile(publicReceiptPath, "utf8"),
]);
assert(canonicalReceiptRaw === publicReceiptRaw, "Public release receipt differs from canonical receipt.");
const receipt = JSON.parse(publicReceiptRaw);
const { payloadSha256, ...receiptPayload } = receipt;
assert(receipt.schemaVersion === RECEIPT_SCHEMA_VERSION, "Unsupported release receipt schema.");
assert(receipt.contentPack === "pinocchio-v2-core", "Release receipt content pack mismatch.");
assert(receipt.compilerVersion === "vad-clamped-v2", "Release receipt compiler mismatch.");
assert(payloadSha256 === sha256(Buffer.from(JSON.stringify(receiptPayload))), "Release receipt payload hash mismatch.");
assert(receipt.offlineValidation?.pcmDecoded === true, "Release receipt lacks PCM validation evidence.");
assert(receipt.offlineValidation?.ffprobeMetadataChecked === true, "Release receipt lacks ffprobe validation evidence.");
assert(receipt.offlineValidation?.sourceEnergyFingerprintsChecked === true,
  "Release receipt lacks source fingerprint evidence.");
assert(Array.isArray(receipt.chapters) && receipt.chapters.length === 12, "Release receipt must contain 12 chapters.");

const derivedTotals = {
  chapters: 0,
  watch: 0,
  mimic: 0,
  guess: 0,
  word: 0,
  mimicAssets: 0,
  mimicBytes: 0,
  acousticallySafeBoundaries: 0,
  humanApprovedBoundaries: 0,
  releaseBlockedBoundaries: 0,
};
let allChaptersReleaseReady = true;

for (let chapter = 1; chapter <= 12; chapter += 1) {
  const chapterReceipt = receipt.chapters[chapter - 1];
  const stem = `session-${String(chapter).padStart(2, "0")}`;
  assert(chapterReceipt?.chapter === chapter, `Chapter ${chapter}: receipt order/number mismatch.`);
  const expectedPaths = {
    pack: `content-packs/pinocchio/v2/sessions/${stem}/pack.json`,
    timeline: `public/prototype-audio/pinocchio-v2/${stem}/lily-british/core.timeline.json`,
    provenance: `public/prototype-audio/pinocchio-v2/${stem}/lily-british/provenance.json`,
    master: `public/prototype-audio/pinocchio-v2/${stem}/lily-british/core.master.mp3`,
  };
  const [packBuffer, timelineBuffer, provenanceBuffer, masterBuffer] = await Promise.all([
    verifyFile(chapterReceipt.files?.pack, expectedPaths.pack, `Chapter ${chapter} pack`),
    verifyFile(chapterReceipt.files?.timeline, expectedPaths.timeline, `Chapter ${chapter} timeline`),
    verifyFile(chapterReceipt.files?.provenance, expectedPaths.provenance, `Chapter ${chapter} provenance`),
    verifyFile(chapterReceipt.files?.master, expectedPaths.master, `Chapter ${chapter} master`),
  ]);
  const pack = JSON.parse(packBuffer);
  const timeline = JSON.parse(timelineBuffer);
  const provenance = JSON.parse(provenanceBuffer);
  const level = pack.levels?.core;
  const masterSha256 = sha256(masterBuffer);

  const canonicalTimeline = await readFile(path.join(
    root,
    "content-packs", "pinocchio", "v2", "sessions", stem, "audio", "core.timeline.json",
  ));
  const canonicalProvenance = await readFile(path.join(
    root,
    "content-packs", "pinocchio", "v2", "sessions", stem, "audio", "provenance.json",
  ));
  assert(canonicalTimeline.equals(timelineBuffer), `Chapter ${chapter}: canonical/public timeline mismatch.`);
  assert(canonicalProvenance.equals(provenanceBuffer), `Chapter ${chapter}: canonical/public provenance mismatch.`);
  assert(pack.contentId === chapterReceipt.contentId, `Chapter ${chapter}: receipt contentId mismatch.`);
  assert(timeline.contentId === pack.contentId, `Chapter ${chapter}: timeline contentId mismatch.`);
  assert(timeline.schemaVersion === "1.2.0", `Chapter ${chapter}: timeline schema mismatch.`);
  assert(timeline.mimicAudio?.strategy === "independent-files", `Chapter ${chapter}: independent Mimic strategy missing.`);
  assert(timeline.mimicAudio?.root === MIMIC_ROOT, `Chapter ${chapter}: Mimic root mismatch.`);
  assert(timeline.mimicAudio?.count === 30, `Chapter ${chapter}: Mimic count mismatch.`);
  assert(Array.isArray(level?.lines) && level.lines.length === 16, `Chapter ${chapter}: Watch mapping count mismatch.`);
  assert(Array.isArray(level?.activities?.mimic?.items) && level.activities.mimic.items.length === 30,
    `Chapter ${chapter}: Mimic mapping count mismatch.`);
  assert(Array.isArray(level?.activities?.guess?.items) && level.activities.guess.items.length === 10,
    `Chapter ${chapter}: Guess mapping count mismatch.`);
  assert(Array.isArray(level?.activities?.word?.items) && level.activities.word.items.length === 10,
    `Chapter ${chapter}: Word mapping count mismatch.`);

  const mapping = mappingReceipt(timeline, level);
  assert(JSON.stringify(mapping) === JSON.stringify(chapterReceipt.mapping),
    `Chapter ${chapter}: 360-item mapping receipt is stale.`);
  assert(chapterReceipt.mappingSha256 === sha256(Buffer.from(JSON.stringify(mapping))),
    `Chapter ${chapter}: mapping hash mismatch.`);
  mapping.watch.forEach((item, index) => {
    assert(item.id === level.lines[index].id && item.text === level.lines[index].text,
      `Chapter ${chapter}: Watch ${index + 1} differs from pack.`);
  });
  mapping.mimic.forEach((item, index) => {
    const expected = level.activities.mimic.items[index];
    assert(item.id === expected.id && item.text === expected.text && item.sourceLineIndex === expected.sourceLineIndex,
      `Chapter ${chapter}: Mimic ${index + 1} differs from pack.`);
  });
  level.activities.guess.items.forEach((item, index) => {
    assert(Number.isInteger(item.audioLineIndex) && item.audioLineIndex >= 0 && item.audioLineIndex < level.lines.length,
      `Chapter ${chapter}: Guess ${index + 1} source line is invalid.`);
    const correct = item.options.find((option) => option.label === item.correctAnswer);
    assert(correct?.lineIndex === item.audioLineIndex,
      `Chapter ${chapter}: Guess ${index + 1} correct mapping is invalid.`);
    item.options.forEach((option) => {
      assert(option.text === level.lines[option.lineIndex]?.text,
        `Chapter ${chapter}: Guess ${index + 1} option mapping is invalid.`);
    });
  });
  level.activities.word.items.forEach((item, index) => {
    assert(item.text === level.lines[item.lineIndex]?.text,
      `Chapter ${chapter}: Word ${index + 1} mapping is invalid.`);
  });

  const expectedAssetNames = timeline.mimicItems.map((item) => `${item.id}.mp3`).sort();
  const publicAssetRoot = path.join(
    root,
    "public", "prototype-audio", "pinocchio-v2", stem, "lily-british", MIMIC_ROOT,
  );
  const actualAssetNames = (await readdir(publicAssetRoot)).filter((name) => name.endsWith(".mp3")).sort();
  assert(JSON.stringify(actualAssetNames) === JSON.stringify(expectedAssetNames),
    `Chapter ${chapter}: deployed Mimic asset set mismatch.`);
  assert(chapterReceipt.mimicAssets?.length === 30, `Chapter ${chapter}: receipt Mimic asset count mismatch.`);

  for (let index = 0; index < timeline.mimicItems.length; index += 1) {
    const item = timeline.mimicItems[index];
    const assetReceipt = chapterReceipt.mimicAssets[index];
    const expectedAudio = `${MIMIC_ROOT}/${item.id}.mp3`;
    assert(item.audio === expectedAudio, `Chapter ${chapter}: ${item.id} audio path mismatch.`);
    assert(item.start === 0 && item.end === item.duration, `Chapter ${chapter}: ${item.id} natural EOF contract mismatch.`);
    assert(assetReceipt?.id === item.id
      && assetReceipt?.sourceLineIndex === item.sourceLineIndex
      && assetReceipt?.text === item.text
      && assetReceipt?.audio === item.audio,
    `Chapter ${chapter}: ${item.id} receipt mapping mismatch.`);
    const asset = await readFile(path.join(publicAssetRoot, `${item.id}.mp3`));
    const assetSha256 = sha256(asset);
    assert(assetSha256 === item.audioSha256 && assetSha256 === assetReceipt?.sha256,
      `Chapter ${chapter}: ${item.id} asset hash mismatch.`);
    assert(asset.length === item.audioBytes && asset.length === assetReceipt?.bytes,
      `Chapter ${chapter}: ${item.id} asset byte count mismatch.`);
    assert(item.sourceStart === assetReceipt?.sourceStart
      && item.sourceEnd === assetReceipt?.sourceEnd
      && item.sourceEnergyFingerprint === assetReceipt?.sourceEnergyFingerprint,
    `Chapter ${chapter}: ${item.id} source evidence mismatch.`);
    if (index > 0) {
      assert(timeline.mimicItems[index - 1].sourceEnd <= item.sourceStart + 0.003,
        `Chapter ${chapter}: source windows overlap at ${item.id}.`);
    }
  }

  const assetSetSha256 = mimicAssetSetSha256(timeline.mimicItems);
  assert(assetSetSha256 === chapterReceipt.mimicAssetSetSha256,
    `Chapter ${chapter}: receipt Mimic asset-set hash mismatch.`);
  assert(assetSetSha256 === provenance.boundarySafety?.mimicAssetSetSha256,
    `Chapter ${chapter}: provenance Mimic asset-set hash mismatch.`);
  const safety = timeline.boundarySafety;
  assert(safety?.masterSha256 === masterSha256, `Chapter ${chapter}: boundary master hash mismatch.`);
  assert(provenance.boundarySafety?.masterSha256 === masterSha256,
    `Chapter ${chapter}: provenance master hash mismatch.`);
  assert(Array.isArray(safety?.boundaries) && safety.boundaries.length === 29,
    `Chapter ${chapter}: boundary evidence count mismatch.`);
  const pending = safety?.pendingBoundaryIds ?? [];
  const approvals = safety?.humanApprovals ?? [];
  const approvedBoundaryIds = [];
  const usedApprovals = new Set();
  safety.boundaries.forEach((boundary, index) => {
    const left = timeline.mimicItems[index];
    const right = timeline.mimicItems[index + 1];
    assert(boundary.id === `${left.id}--${right.id}`, `Chapter ${chapter}: boundary ${index + 1} ID mismatch.`);
    assert(left.sourceEnd === boundary.cut && right.sourceStart === boundary.cut,
      `Chapter ${chapter}: boundary ${index + 1} cut mismatch.`);
    if (boundary.method === "alignment-midpoint") {
      const evidence = approvalEvidence(masterSha256, safety.version, boundary, left, right);
      assert(JSON.stringify(boundary.humanApprovalEvidence) === JSON.stringify(evidence),
        `Chapter ${chapter}: boundary ${index + 1} approval evidence mismatch.`);
      const bound = approvals.filter((approval) => isBoundApproval(approval, evidence));
      assert(bound.length <= 1, `Chapter ${chapter}: boundary ${index + 1} has duplicate approvals.`);
      if (bound[0]) {
        usedApprovals.add(bound[0]);
        approvedBoundaryIds.push(boundary.id);
        assert(boundary.needsHumanReview === false
          && JSON.stringify(boundary.humanApproval) === JSON.stringify(bound[0]),
        `Chapter ${chapter}: boundary ${index + 1} bound approval mismatch.`);
      } else {
        assert(boundary.needsHumanReview === true && !Object.hasOwn(boundary, "humanApproval"),
          `Chapter ${chapter}: boundary ${index + 1} bypasses human approval.`);
      }
    } else {
      assert(boundary.method === "quiet-midpoint" && boundary.needsHumanReview === false,
        `Chapter ${chapter}: boundary ${index + 1} quiet certification mismatch.`);
    }
    assert(boundary.needsHumanReview === pending.includes(boundary.id),
      `Chapter ${chapter}: boundary ${index + 1} pending state mismatch.`);
  });
  assert(JSON.stringify(safety.approvedBoundaryIds ?? []) === JSON.stringify(approvedBoundaryIds),
    `Chapter ${chapter}: approved boundary IDs are stale.`);
  assert(approvals.length === usedApprovals.size, `Chapter ${chapter}: unbound human approval remains.`);
  const quietBoundaryCount = safety.boundaries.filter((boundary) => boundary.method === "quiet-midpoint").length;
  assert(safety.releaseBlockedBoundaries === pending.length,
    `Chapter ${chapter}: release-blocked boundary count mismatch.`);
  assert(safety.humanApprovedBoundaries === approvedBoundaryIds.length,
    `Chapter ${chapter}: human-approved boundary count mismatch.`);
  assert(safety.acousticallySafeBoundaries === quietBoundaryCount,
    `Chapter ${chapter}: acoustically safe boundary count mismatch.`);
  assert(safety.acousticallySafeBoundaries + safety.humanApprovedBoundaries + safety.releaseBlockedBoundaries === 29,
    `Chapter ${chapter}: boundary totals mismatch.`);
  assert(chapterReceipt.boundarySafety?.masterSha256 === masterSha256,
    `Chapter ${chapter}: receipt boundary master hash mismatch.`);
  assert(chapterReceipt.boundarySafety?.releaseBlockedBoundaries === pending.length
    && chapterReceipt.boundarySafety?.humanApprovedBoundaries === approvedBoundaryIds.length
    && chapterReceipt.boundarySafety?.acousticallySafeBoundaries === quietBoundaryCount,
  `Chapter ${chapter}: receipt boundary counts mismatch.`);

  const listenThroughIsValid = validListenThrough(
    provenance.humanListenThrough,
    chapter,
    masterSha256,
    safety.version,
    assetSetSha256,
  );
  const chapterReleaseReady = pending.length === 0
    && provenance.qaStatus === "human-listen-pass"
    && listenThroughIsValid;
  assert(chapterReceipt.status === (chapterReleaseReady ? "PASS" : "BLOCKED"),
    `Chapter ${chapter}: release status differs from receipt.`);
  assert(JSON.stringify(chapterReceipt.boundarySafety?.pendingBoundaryIds) === JSON.stringify(pending),
    `Chapter ${chapter}: receipt pending boundary IDs mismatch.`);
  assert(JSON.stringify(chapterReceipt.boundarySafety?.approvedBoundaryIds) === JSON.stringify(approvedBoundaryIds),
    `Chapter ${chapter}: receipt approved boundary IDs mismatch.`);
  assert(JSON.stringify(chapterReceipt.boundarySafety?.humanApprovals) === JSON.stringify(approvals),
    `Chapter ${chapter}: receipt human approval records mismatch.`);
  assert(chapterReceipt.qa?.qaStatus === provenance.qaStatus
    && JSON.stringify(chapterReceipt.qa?.humanListenThrough) === JSON.stringify(provenance.humanListenThrough ?? null),
  `Chapter ${chapter}: receipt QA evidence mismatch.`);

  allChaptersReleaseReady &&= chapterReleaseReady;
  derivedTotals.chapters += 1;
  derivedTotals.watch += mapping.watch.length;
  derivedTotals.mimic += mapping.mimic.length;
  derivedTotals.guess += mapping.guess.length;
  derivedTotals.word += mapping.word.length;
  derivedTotals.mimicAssets += chapterReceipt.mimicAssets.length;
  derivedTotals.mimicBytes += chapterReceipt.mimicAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  derivedTotals.acousticallySafeBoundaries += safety.acousticallySafeBoundaries;
  derivedTotals.humanApprovedBoundaries += safety.humanApprovedBoundaries;
  derivedTotals.releaseBlockedBoundaries += safety.releaseBlockedBoundaries;
}

assert(JSON.stringify(receipt.totals) === JSON.stringify(derivedTotals), "Release receipt totals mismatch.");
const derivedStatus = allChaptersReleaseReady ? "PASS" : "BLOCKED";
assert(receipt.status === derivedStatus, "Release receipt top-level status mismatch.");
assert(Array.isArray(receipt.releaseBlockers), "Release receipt blockers must be an array.");
assert(receipt.status === "PASS" ? receipt.releaseBlockers.length === 0 : receipt.releaseBlockers.length > 0,
  "Release receipt blocker list contradicts release status.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (!allowBlocked && receipt.status !== "PASS") {
  console.error("Pinocchio production deploy blocked: release receipt is not PASS.");
  process.exit(1);
}

console.log(JSON.stringify({
  validation: "node-only-deploy-receipt",
  mode: allowBlocked ? "preview" : "production",
  releaseGate: receipt.status,
  payloadSha256: receipt.payloadSha256,
  totals: derivedTotals,
}, null, 2));
