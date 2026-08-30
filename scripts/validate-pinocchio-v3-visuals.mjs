#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  sha256Digest,
  validateVisualReviewState,
} from "./lib/pinocchio-v3-visual-release.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v3Root = path.join(repositoryRoot, "content-packs", "pinocchio", "v3");

function fail(message) {
  throw new Error(message);
}

async function json(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function pngDimensions(buffer, label) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    fail(`${label} is not a valid PNG header.`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function resolveFromV3(reference, label) {
  if (typeof reference !== "string" || !reference.trim()) fail(`${label} path is missing.`);
  const resolved = path.resolve(v3Root, reference);
  const relative = path.relative(repositoryRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`${label} escapes the repository.`);
  return resolved;
}

const manifest = await json(path.join(v3Root, "manifest.json"), "v3 manifest");
if (manifest.visuals !== "visuals.json") fail("v3 manifest must reference visuals.json.");

const visualRegistryPath = resolveFromV3(manifest.visuals, "Visual registry");
const visualRegistryFile = await readFile(visualRegistryPath);
const visuals = JSON.parse(visualRegistryFile.toString("utf8"));
const visualCatalogSha256 = sha256Digest(visualRegistryFile);
const visualReview = validateVisualReviewState(visuals);
const rights = await json(resolveFromV3(manifest.rights, "Rights registry"), "Rights registry");
const sourceManifest = await json(resolveFromV3(visuals.sourceReuse?.sourceManifest, "v2 source manifest"), "v2 source manifest");

if (visuals.schemaVersion !== "1.0.0" || visuals.storyPackId !== manifest.storyPackId) {
  fail("Visual registry identity does not match the v3 Story Pack.");
}
if (JSON.stringify(visuals.levelScope) !== JSON.stringify(["foundation"])) {
  fail("Visual reuse must remain explicitly scoped to Foundation.");
}
if (visuals.rendering?.assetType !== "single-chapter-paper-theatre-panorama") {
  fail("Visual registry must identify the single-panorama stage limitation.");
}
if (!visualReview.valid) {
  fail(`Visual review state is invalid: ${visualReview.errors.join(" ")}`);
}
if (sourceManifest.contentSetId !== visuals.sourceReuse?.sourceStoryPackId) {
  fail("Visual registry does not identify the v2 source pack correctly.");
}
if (manifest.chapters?.length !== 12 || sourceManifest.sessions?.length !== 12 || visuals.chapters?.length !== 12) {
  fail("v2, v3, and the visual registry must each contain exactly twelve Chapters.");
}
if (
  typeof rights.commercialReleaseAllowed !== "boolean"
  || !["pending", "approved"].includes(rights.humanReview?.decision)
) {
  fail("Rights registry must keep a distinct pending or approved human-rights decision.");
}
if (!rights.works?.some((work) => work.assetType === "visual-stage-art" && work.assetRegistry === manifest.visuals)) {
  fail("Rights registry must identify visuals.json as the visual-stage asset register.");
}

const chapters = [];
for (let index = 0; index < 12; index += 1) {
  const number = index + 1;
  const suffix = String(number).padStart(2, "0");
  const v3Entry = manifest.chapters[index];
  const v2Entry = sourceManifest.sessions[index];
  const visual = visuals.chapters[index];
  const v3Chapter = await json(resolveFromV3(v3Entry.path, `v3 Chapter ${number}`), `v3 Chapter ${number}`);
  const v2Pack = await json(resolveFromV3(`../v2/${v2Entry.path}`, `v2 Chapter ${number}`), `v2 Chapter ${number}`);

  if (v3Entry.number !== number || v2Entry.number !== number || visual.number !== number) {
    fail(`Chapter ${number} ordinal identity differs between v2, v3, and visuals.json.`);
  }
  if (visual.chapterId !== `chapter-${suffix}` || v3Chapter.chapterId !== visual.chapterId) {
    fail(`Chapter ${number} visual identity does not match v3.`);
  }
  const v2Group = v2Pack.story?.sourceChapters;
  const v3Group = v3Chapter.sourceChapters;
  if (
    JSON.stringify(v2Group) !== JSON.stringify(v3Group)
    || JSON.stringify(visual.sourceChapterGroup) !== JSON.stringify(v3Group)
  ) {
    fail(`Chapter ${number} original-source grouping differs between v2, v3, and visuals.json.`);
  }

  const expectedSourceAsset = `../v2/sessions/session-${suffix}/assets/session-${suffix}.png`;
  const expectedPublicAsset = `../../../public/prototype-art/pinocchio-v2/session-${suffix}.png`;
  const expectedPublicUrl = `/prototype-art/pinocchio-v2/session-${suffix}.png`;
  if (
    visual.sourceAsset !== expectedSourceAsset
    || visual.publicAsset !== expectedPublicAsset
    || visual.publicUrl !== expectedPublicUrl
  ) {
    fail(`Chapter ${number} visual paths do not follow the stable v2 reuse contract.`);
  }

  const sourceFile = await readFile(resolveFromV3(visual.sourceAsset, `Chapter ${number} source art`));
  const publicFile = await readFile(resolveFromV3(visual.publicAsset, `Chapter ${number} public art`));
  const sourceDigest = sha256(sourceFile);
  const publicDigest = sha256(publicFile);
  if (sourceDigest !== publicDigest || visual.sha256 !== `sha256:${sourceDigest}`) {
    fail(`Chapter ${number} visual checksum differs between canonical, public, and registry assets.`);
  }

  const sourceSize = pngDimensions(sourceFile, `Chapter ${number} source art`);
  const publicSize = pngDimensions(publicFile, `Chapter ${number} public art`);
  if (
    sourceSize.width !== 1672
    || sourceSize.height !== 941
    || JSON.stringify(sourceSize) !== JSON.stringify(publicSize)
    || visual.width !== sourceSize.width
    || visual.height !== sourceSize.height
  ) {
    fail(`Chapter ${number} visual dimensions must be the locked 1672x941 stage contract.`);
  }
  if (visual.technicalStatus !== "passed" || visual.humanVisualReview !== visualReview.state) {
    fail(`Chapter ${number} must record technical pass and the catalog-wide ${visualReview.state} human visual review state separately.`);
  }

  chapters.push({
    chapter: number,
    sourceChapters: v3Group,
    publicUrl: visual.publicUrl,
    dimensions: `${visual.width}x${visual.height}`,
    sha256: sourceDigest,
    humanVisualReview: visual.humanVisualReview,
  });
}

console.log(JSON.stringify({
  storyPackId: manifest.storyPackId,
  levelScope: visuals.levelScope,
  chapters: chapters.length,
  sourceGroupingCompatibility: "12/12 exact",
  assetIdentity: "12/12 canonical-public-registry match",
  dimensions: "12/12 1672x941",
  visualCatalogSha256,
  humanVisualReview: visualReview.state,
  humanVisualReviewer: visualReview.record?.reviewer ?? null,
}, null, 2));
