import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shouldApply = process.argv.includes("--apply");
const shouldRecover = process.argv.includes("--recover");
const inputFlagIndex = process.argv.findIndex((value) => value === "--input");
const inputInline = process.argv.find((value) => value.startsWith("--input="))?.slice("--input=".length);
const inputArgument = inputInline || (inputFlagIndex >= 0 ? process.argv[inputFlagIndex + 1] : "");
const RECEIPT_PATHS = [
  path.join(root, "content-packs", "pinocchio", "v2", "release-receipt.json"),
  path.join(root, "public", "prototype-audio", "pinocchio-v2", "release-receipt.json"),
];
const EXPECTED_SCHEMA = "pinocchio-human-review/1.0.0";
const TARGET_SCHEMA = "pinocchio-human-review-targets/1.0.0";
const CONTENT_PACK = "pinocchio-v2-core";
const COMPILER_VERSION = "vad-clamped-v2";
const REQUIRED_BOUNDARIES = 28;
const REQUIRED_CHAPTERS = 12;
const EXPECTED_MUTATED_FILES = REQUIRED_CHAPTERS * 4 + 2;
const MINIMUM_COVERAGE = 0.98;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const LOCK_PATH = path.join(root, ".pinocchio-human-review-import.lock.json");
const BACKUP_ROOT = path.join(root, ".pinocchio-human-review-backup");
const STRICT_ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validTimestamp(value, label) {
  const parsed = Date.parse(value);
  assert(typeof value === "string"
    && STRICT_ISO_TIMESTAMP.test(value)
    && Number.isFinite(parsed)
    && new Date(parsed).toISOString() === value,
  `${label} must be a strict UTC ISO timestamp.`);
  assert(parsed <= Date.now() + MAX_FUTURE_CLOCK_SKEW_MS, `${label} is in the future.`);
  return parsed;
}

function exactEvidence(candidate, expected) {
  return candidate?.qaStatus === expected.qaStatus
    && candidate?.masterSha256 === expected.masterSha256
    && candidate?.boundaryId === expected.boundaryId
    && candidate?.cut === expected.cut
    && candidate?.compilerVersion === expected.compilerVersion
    && candidate?.leftAudioSha256 === expected.leftAudioSha256
    && candidate?.rightAudioSha256 === expected.rightAudioSha256;
}

function chapterPaths(chapter) {
  const stem = `session-${String(chapter).padStart(2, "0")}`;
  const canonical = path.join(root, "content-packs", "pinocchio", "v2", "sessions", stem, "audio");
  const publicRoot = path.join(root, "public", "prototype-audio", "pinocchio-v2", stem, "lily-british");
  return {
    timeline: [path.join(canonical, "core.timeline.json"), path.join(publicRoot, "core.timeline.json")],
    provenance: [path.join(canonical, "provenance.json"), path.join(publicRoot, "provenance.json")],
  };
}

function allowedRecoveryTarget(relativePath) {
  if (relativePath === "content-packs/pinocchio/v2/release-receipt.json"
    || relativePath === "public/prototype-audio/pinocchio-v2/release-receipt.json") return true;
  return /^content-packs\/pinocchio\/v2\/sessions\/session-(0[1-9]|1[0-2])\/audio\/(core\.timeline|provenance)\.json$/.test(relativePath)
    || /^public\/prototype-audio\/pinocchio-v2\/session-(0[1-9]|1[0-2])\/lily-british\/(core\.timeline|provenance)\.json$/.test(relativePath);
}

async function readMirroredJson(paths, label) {
  const [canonicalRaw, publicRaw] = await Promise.all(paths.map((filePath) => readFile(filePath, "utf8")));
  assert(canonicalRaw === publicRaw, `${label} canonical/public files differ.`);
  return { raw: canonicalRaw, value: JSON.parse(canonicalRaw) };
}

function stringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeAtomically(filePath, value) {
  const temporaryPath = `${filePath}.human-review-${process.pid}.tmp`;
  await writeFile(temporaryPath, value);
  await rename(temporaryPath, filePath);
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

async function stageAndCommitFiles(entries) {
  const staged = [];
  try {
    for (const [filePath, value] of entries) {
      const temporaryPath = `${filePath}.human-review-stage`;
      await writeFile(temporaryPath, value);
      staged.push([temporaryPath, filePath]);
    }
    for (const [temporaryPath, filePath] of staged) await rename(temporaryPath, filePath);
  } finally {
    await Promise.all(staged.map(([temporaryPath]) => rm(temporaryPath, { force: true })));
  }
}

async function restoreFiles(originals) {
  await stageAndCommitFiles(originals);
}

async function cleanupRecoveryArtifacts() {
  // Always remove the journal first. If the process stops before the backup
  // directory is removed, the next --recover can safely discard that orphan.
  await rm(LOCK_PATH, { force: true });
  await rm(BACKUP_ROOT, { recursive: true, force: true });
}

function run(command, argumentsList) {
  execFileSync(command, argumentsList, { cwd: root, stdio: "inherit" });
}

async function recoverInterruptedImport() {
  const lockExists = await fileExists(LOCK_PATH);
  const backupExists = await fileExists(BACKUP_ROOT);
  if (!lockExists && backupExists) {
    // This is either an interrupted preflight or the final cleanup after a
    // successful import/restoration. In both cases, no rollback is pending.
    await rm(BACKUP_ROOT, { recursive: true, force: true });
    console.log(JSON.stringify({ recovered: 0, status: "ORPHAN_BACKUP_CLEANED" }, null, 2));
    return;
  }
  assert(lockExists, "No interrupted Pinocchio review import was found.");
  assert(backupExists, "The recovery journal exists, but its backup directory is missing.");
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8"));
  assert(lock.schemaVersion === "pinocchio-human-review-import-lock/1.0.0"
    && Array.isArray(lock.files)
    && lock.files.length === EXPECTED_MUTATED_FILES,
  "The import recovery journal is invalid.");
  const originals = new Map();
  const seenBackups = new Set();
  for (const entry of lock.files) {
    assert(typeof entry.path === "string" && allowedRecoveryTarget(entry.path),
      `Unsafe recovery target ${entry.path}.`);
    const targetPath = path.resolve(root, entry.path);
    assert(!originals.has(targetPath), `Duplicate recovery target ${entry.path}.`);
    assert(/^\d{3}\.bak$/.test(entry.backup), `Unsafe recovery backup ${entry.backup}.`);
    assert(!seenBackups.has(entry.backup), `Duplicate recovery backup ${entry.backup}.`);
    seenBackups.add(entry.backup);
    const backupPath = path.join(BACKUP_ROOT, entry.backup);
    const backup = await readFile(backupPath);
    assert(backup.length === entry.bytes && sha256(backup) === entry.sha256,
      `Recovery backup ${entry.backup} failed its integrity check.`);
    originals.set(targetPath, backup);
  }
  await restoreFiles(originals);
  await cleanupRecoveryArtifacts();
  console.log(JSON.stringify({ recovered: originals.size, status: "RESTORED" }, null, 2));
}

if (shouldRecover) {
  await recoverInterruptedImport();
  process.exit(0);
}

if (await fileExists(LOCK_PATH) || await fileExists(BACKUP_ROOT)) {
  fail("An interrupted review import exists. Run this command with --recover before trying again.");
}

if (!inputArgument || inputArgument.startsWith("--")) {
  fail("Use --input <pinocchio-human-review.json>. Add --apply only after the dry-run passes, or use --recover.");
}

const inputPath = path.resolve(process.cwd(), inputArgument);
const payload = JSON.parse(await readFile(inputPath, "utf8"));
assert(payload.schemaVersion === EXPECTED_SCHEMA, `schemaVersion must be ${EXPECTED_SCHEMA}.`);
assert(payload.contentPack === CONTENT_PACK, `contentPack must be ${CONTENT_PACK}.`);
assert(payload.compilerVersion === COMPILER_VERSION, `compilerVersion must be ${COMPILER_VERSION}.`);
assert(typeof payload.reviewer === "string" && payload.reviewer.trim(), "reviewer is required.");
const reviewer = payload.reviewer.trim();
const startedAt = validTimestamp(payload.startedAt, "startedAt");
const completedAt = validTimestamp(payload.completedAt, "completedAt");
const exportedAt = validTimestamp(payload.exportedAt, "exportedAt");
assert(startedAt <= completedAt && completedAt <= exportedAt,
  "Review timestamps are out of order.");
assert(Array.isArray(payload.rejections) && payload.rejections.length === 0,
  "A review with any recut rejection cannot unlock production.");

run("npm", ["run", "validate:pinocchio-deploy:preview"]);

const receiptMirror = await readMirroredJson(RECEIPT_PATHS, "Release receipt");
const receipt = receiptMirror.value;
const { payloadSha256, ...receiptPayload } = receipt;
assert(payloadSha256 === sha256(JSON.stringify(receiptPayload)), "Current release receipt payload hash is invalid.");
assert(payload.sourceReceiptPayloadSha256 === payloadSha256, "Review was made against a different release receipt.");
assert(receipt.contentPack === CONTENT_PACK && receipt.compilerVersion === COMPILER_VERSION,
  "Current release receipt is for a different content pack or compiler.");
assert(receipt.status === "BLOCKED", "This importer only accepts the current BLOCKED review batch.");
assert(receipt.totals?.releaseBlockedBoundaries === REQUIRED_BOUNDARIES,
  `Expected ${REQUIRED_BOUNDARIES} pending boundaries in the current receipt.`);

const chapters = [];
const expectedBoundaries = [];
for (let chapter = 1; chapter <= REQUIRED_CHAPTERS; chapter += 1) {
  const paths = chapterPaths(chapter);
  const timelineMirror = await readMirroredJson(paths.timeline, `Chapter ${chapter} timeline`);
  const provenanceMirror = await readMirroredJson(paths.provenance, `Chapter ${chapter} provenance`);
  const timeline = timelineMirror.value;
  const provenance = provenanceMirror.value;
  const receiptChapter = receipt.chapters.find((item) => item.chapter === chapter);
  assert(receiptChapter, `Chapter ${chapter} is missing from the release receipt.`);
  assert(timeline.boundarySafety?.version === COMPILER_VERSION, `Chapter ${chapter} compiler mismatch.`);
  assert(timeline.boundarySafety?.masterSha256 === receiptChapter.files.master.sha256,
    `Chapter ${chapter} master hash mismatch.`);
  assert(provenance.boundarySafety?.mimicAssetSetSha256 === receiptChapter.mimicAssetSetSha256,
    `Chapter ${chapter} Mimic asset-set hash mismatch.`);

  timeline.boundarySafety.boundaries.forEach((boundary, index) => {
    if (!timeline.boundarySafety.pendingBoundaryIds.includes(boundary.id)) return;
    assert(boundary.method === "alignment-midpoint" && boundary.needsHumanReview === true,
      `Chapter ${chapter} boundary ${boundary.id} is not a pending coarticulated boundary.`);
    const evidence = boundary.humanApprovalEvidence;
    assert(evidence, `Chapter ${chapter} boundary ${boundary.id} has no approval evidence.`);
    assert(evidence.leftAudioSha256 === timeline.mimicItems[index].audioSha256
      && evidence.rightAudioSha256 === timeline.mimicItems[index + 1].audioSha256,
    `Chapter ${chapter} boundary ${boundary.id} audio evidence is stale.`);
    expectedBoundaries.push({ chapter, ...evidence });
  });

  chapters.push({ chapter, paths, timelineMirror, provenanceMirror, receiptChapter });
}

assert(expectedBoundaries.length === REQUIRED_BOUNDARIES,
  `Expected ${REQUIRED_BOUNDARIES} review targets, found ${expectedBoundaries.length}.`);
const targetManifest = {
  schemaVersion: TARGET_SCHEMA,
  contentPack: CONTENT_PACK,
  compilerVersion: COMPILER_VERSION,
  baseReleaseReceiptPayloadSha256: payloadSha256,
  boundaries: expectedBoundaries,
  chapters: chapters.map(({ chapter, timelineMirror, receiptChapter }) => ({
    chapter,
    masterSha256: receiptChapter.files.master.sha256,
    compilerVersion: receiptChapter.boundarySafety.compilerVersion,
    mimicAssetSetSha256: receiptChapter.mimicAssetSetSha256,
    contentChecksum: timelineMirror.value.contentChecksum,
  })),
};
const expectedTargetSetSha256 = sha256(JSON.stringify(targetManifest));
assert(payload.reviewTargetSetSha256 === expectedTargetSetSha256,
  "Review target hash is stale or does not cover the complete current target set.");

const boundaryApprovals = payload.approvals?.boundaries;
const listenThroughs = payload.approvals?.chapterListenThroughs;
assert(Array.isArray(boundaryApprovals) && boundaryApprovals.length === REQUIRED_BOUNDARIES,
  `Exactly ${REQUIRED_BOUNDARIES} passed boundary approvals are required.`);
assert(Array.isArray(listenThroughs) && listenThroughs.length === REQUIRED_CHAPTERS,
  `Exactly ${REQUIRED_CHAPTERS} full-chapter approvals are required.`);

const approvalByKey = new Map();
for (const approval of boundaryApprovals) {
  const key = `${approval.chapter}:${approval.boundaryId}`;
  assert(!approvalByKey.has(key), `Duplicate boundary approval ${key}.`);
  const expected = expectedBoundaries.find((item) => item.chapter === approval.chapter && item.boundaryId === approval.boundaryId);
  assert(expected && exactEvidence(approval, expected), `Boundary approval ${key} does not match current audio evidence.`);
  assert(approval.reviewer === reviewer, `Boundary approval ${key} reviewer mismatch.`);
  const reviewedAt = validTimestamp(approval.reviewedAt, `Boundary approval ${key} reviewedAt`);
  assert(reviewedAt >= startedAt && reviewedAt <= completedAt,
    `Boundary approval ${key} is outside the review session.`);
  assert(approval.reviewTargetSetSha256 === expectedTargetSetSha256,
    `Boundary approval ${key} target hash mismatch.`);
  const audit = payload.audit?.boundaryPlayback?.[key];
  assert(audit?.leftNaturalEof === true && audit?.rightNaturalEof === true && audit?.contextCrossedCut === true,
    `Boundary approval ${key} lacks complete natural-EOF/context playback evidence.`);
  approvalByKey.set(key, {
    qaStatus: expected.qaStatus,
    masterSha256: expected.masterSha256,
    boundaryId: expected.boundaryId,
    cut: expected.cut,
    compilerVersion: expected.compilerVersion,
    leftAudioSha256: expected.leftAudioSha256,
    rightAudioSha256: expected.rightAudioSha256,
    reviewer,
    reviewedAt: approval.reviewedAt,
  });
}

const listenByChapter = new Map();
for (const record of listenThroughs) {
  const chapter = Number(record.chapter);
  assert(Number.isInteger(chapter) && chapter >= 1 && chapter <= REQUIRED_CHAPTERS,
    `Invalid full-listen chapter ${record.chapter}.`);
  assert(!listenByChapter.has(chapter), `Duplicate full-listen approval for Chapter ${chapter}.`);
  const current = chapters[chapter - 1];
  assert(record.qaStatus === "human-listen-pass"
    && record.masterSha256 === current.receiptChapter.files.master.sha256
    && record.compilerVersion === COMPILER_VERSION
    && record.mimicAssetSetSha256 === current.receiptChapter.mimicAssetSetSha256
    && record.contentChecksum === current.timelineMirror.value.contentChecksum,
  `Chapter ${chapter} full-listen approval is stale.`);
  assert(record.reviewer === reviewer, `Chapter ${chapter} full-listen reviewer mismatch.`);
  const reviewedAt = validTimestamp(record.reviewedAt, `Chapter ${chapter} full-listen reviewedAt`);
  assert(reviewedAt >= startedAt && reviewedAt <= completedAt,
    `Chapter ${chapter} full-listen approval is outside the review session.`);
  assert(record.reviewTargetSetSha256 === expectedTargetSetSha256,
    `Chapter ${chapter} full-listen target hash mismatch.`);
  const audit = payload.audit?.chapterPlayback?.[String(chapter)];
  assert(audit?.reachedNaturalEnd === true
    && typeof audit?.coverageRatio === "number"
    && Number.isFinite(audit.coverageRatio)
    && audit.coverageRatio >= MINIMUM_COVERAGE
    && audit.coverageRatio <= 1,
    `Chapter ${chapter} needs at least 98% playback and natural EOF.`);
  listenByChapter.set(chapter, {
    qaStatus: "human-listen-pass",
    chapter,
    masterSha256: record.masterSha256,
    compilerVersion: COMPILER_VERSION,
    mimicAssetSetSha256: record.mimicAssetSetSha256,
    contentChecksum: record.contentChecksum,
    reviewTargetSetSha256: expectedTargetSetSha256,
    reviewer,
    reviewedAt: record.reviewedAt,
  });
}

const nextFiles = new Map();
for (const { chapter, paths, timelineMirror, provenanceMirror } of chapters) {
  const timeline = structuredClone(timelineMirror.value);
  const safety = timeline.boundarySafety;
  const humanApprovals = [];
  const approvedBoundaryIds = [];
  const pendingBoundaryIds = [];
  safety.boundaries = safety.boundaries.map((boundary) => {
    if (boundary.method === "quiet-midpoint") return boundary;
    const approval = approvalByKey.get(`${chapter}:${boundary.id}`) ?? boundary.humanApproval;
    if (!approval) {
      pendingBoundaryIds.push(boundary.id);
      const { humanApproval: _unused, ...withoutApproval } = boundary;
      return { ...withoutApproval, needsHumanReview: true };
    }
    humanApprovals.push(approval);
    approvedBoundaryIds.push(boundary.id);
    return { ...boundary, needsHumanReview: false, humanApproval: approval };
  });
  safety.humanApprovals = humanApprovals;
  safety.approvedBoundaryIds = approvedBoundaryIds;
  safety.pendingBoundaryIds = pendingBoundaryIds;
  safety.acousticallySafeBoundaries = safety.boundaries.filter((boundary) => boundary.method === "quiet-midpoint").length;
  safety.humanApprovedBoundaries = approvedBoundaryIds.length;
  safety.releaseBlockedBoundaries = pendingBoundaryIds.length;

  const provenance = structuredClone(provenanceMirror.value);
  provenance.boundarySafety.humanApprovedBoundaries = safety.humanApprovedBoundaries;
  provenance.boundarySafety.releaseBlockedBoundaries = safety.releaseBlockedBoundaries;
  provenance.boundarySafety.pendingBoundaryIds = pendingBoundaryIds;
  provenance.qaStatus = "human-listen-pass";
  provenance.humanListenThrough = listenByChapter.get(chapter);

  const timelineJson = stringify(timeline);
  const provenanceJson = stringify(provenance);
  paths.timeline.forEach((filePath) => nextFiles.set(filePath, timelineJson));
  paths.provenance.forEach((filePath) => nextFiles.set(filePath, provenanceJson));
}

const report = {
  mode: shouldApply ? "apply" : "dry-run",
  reviewer,
  sourceReceiptPayloadSha256: payloadSha256,
  reviewTargetSetSha256: expectedTargetSetSha256,
  boundaryApprovals: approvalByKey.size,
  chapterListenThroughs: listenByChapter.size,
  filesPrepared: nextFiles.size,
};

if (!shouldApply) {
  console.log(JSON.stringify({ ...report, next: "Rerun with --apply after reviewing this dry-run." }, null, 2));
  process.exit(0);
}

run("npm", ["run", "validate:pinocchio-deploy:preview"]);

const originals = new Map();
for (const filePath of [...nextFiles.keys(), ...RECEIPT_PATHS]) {
  originals.set(filePath, await readFile(filePath));
}

await mkdir(BACKUP_ROOT);
const lockFiles = [];
let backupIndex = 0;
for (const [filePath, value] of originals) {
  const backup = `${String(backupIndex).padStart(3, "0")}.bak`;
  await writeFile(path.join(BACKUP_ROOT, backup), value);
  lockFiles.push({
    path: path.relative(root, filePath),
    backup,
    bytes: value.length,
    sha256: sha256(value),
  });
  backupIndex += 1;
}
await writeAtomically(LOCK_PATH, stringify({
  schemaVersion: "pinocchio-human-review-import-lock/1.0.0",
  createdAt: new Date().toISOString(),
  inputPath,
  files: lockFiles,
}));

try {
  for (const [filePath, original] of originals) {
    assert(Buffer.compare(await readFile(filePath), original) === 0,
      `${path.relative(root, filePath)} changed during import preflight.`);
  }
  await stageAndCommitFiles(nextFiles);
  run("npm", ["run", "check:pinocchio-v2-boundaries"]);
  run(process.execPath, ["scripts/validate-pinocchio-core-chapters.mjs", "--write-receipt"]);
  run("npm", ["run", "validate:pinocchio-deploy"]);
  const nextReceipt = JSON.parse(await readFile(RECEIPT_PATHS[0], "utf8"));
  assert(nextReceipt.status === "PASS"
    && nextReceipt.totals?.humanApprovedBoundaries === REQUIRED_BOUNDARIES
    && nextReceipt.totals?.releaseBlockedBoundaries === 0,
  "Final release receipt did not reach PASS 28/28.");
  for (const { chapter, receiptChapter } of chapters) {
    const nextChapter = nextReceipt.chapters?.find((item) => item.chapter === chapter);
    assert(nextChapter?.files?.pack?.sha256 === receiptChapter.files.pack.sha256
      && nextChapter?.files?.master?.sha256 === receiptChapter.files.master.sha256
      && nextChapter?.mimicAssetSetSha256 === receiptChapter.mimicAssetSetSha256,
    `Chapter ${chapter} immutable media changed during review import.`);
  }
  await cleanupRecoveryArtifacts();
  console.log(JSON.stringify({ ...report, releaseReceiptPayloadSha256: nextReceipt.payloadSha256, status: "PASS" }, null, 2));
} catch (error) {
  try {
    await restoreFiles(originals);
    await cleanupRecoveryArtifacts();
    console.error("Human review import failed. All changed timelines, provenance records, and receipts were restored.");
    throw error;
  } catch (restoreError) {
    if (restoreError === error) throw error;
    console.error("Human review import and automatic restoration both failed. Keep the recovery journal and run --recover.");
    throw new AggregateError([error, restoreError], "Pinocchio review import restoration failed.");
  }
}
