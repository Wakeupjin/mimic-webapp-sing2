import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  VISUAL_REVIEW_STATUS,
  sha256Digest,
  validateVisualPublicBetaBinding,
  validateVisualReviewState,
} from "../scripts/lib/pinocchio-v3-visual-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v3");
const visualFile = await readFile(path.join(packRoot, "visuals.json"));
const currentVisuals = JSON.parse(visualFile.toString("utf8"));
const currentVisualDigest = sha256Digest(visualFile);
const checkedAuthorization = JSON.parse(await readFile(path.join(packRoot, "release-beta.json"), "utf8"));

function approvedCatalog() {
  const catalog = structuredClone(currentVisuals);
  catalog.status = VISUAL_REVIEW_STATUS.approved;
  catalog.rendering.humanVisualReview = "approved";
  catalog.rendering.humanVisualReviewRecord = {
    reviewer: "Mina Kim (Visual Editor)",
    reviewedAt: "2026-08-30T12:00:00.000Z",
    evidence: ["content-packs/pinocchio/v3/reviews/foundation-visual-review.md"],
  };
  for (const chapter of catalog.chapters) chapter.humanVisualReview = "approved";
  return catalog;
}

test("the checked-in visual catalog remains a valid pending release blocker", () => {
  const result = validateVisualReviewState(currentVisuals, { now: Date.parse("2026-09-01T00:00:00.000Z") });
  assert.equal(result.valid, true);
  assert.equal(result.state, "pending");
  assert.equal(result.record, null);
});

test("visual review can transition atomically from pending to approved", () => {
  const result = validateVisualReviewState(approvedCatalog(), { now: Date.parse("2026-09-01T00:00:00.000Z") });
  assert.equal(result.valid, true);
  assert.equal(result.state, "approved");
  assert.equal(result.record.reviewer, "Mina Kim (Visual Editor)");
});

test("approved and mixed review claims fail without named date-and-evidence proof", () => {
  const missingEvidence = approvedCatalog();
  delete missingEvidence.rendering.humanVisualReviewRecord.evidence;
  const incomplete = validateVisualReviewState(missingEvidence, { now: Date.parse("2026-09-01T00:00:00.000Z") });
  assert.equal(incomplete.valid, false);
  assert.ok(incomplete.errors.some((error) => /evidence/.test(error)));

  const mixed = approvedCatalog();
  mixed.chapters[4].humanVisualReview = "pending";
  const inconsistent = validateVisualReviewState(mixed, { now: Date.parse("2026-09-01T00:00:00.000Z") });
  assert.equal(inconsistent.valid, false);
  assert.ok(inconsistent.errors.some((error) => /mixed review states/.test(error)));
});

test("the checked-in public-beta approval binds the exact pending visual catalog", () => {
  const result = validateVisualPublicBetaBinding(checkedAuthorization, {
    catalogReference: "visuals.json",
    catalogSha256: currentVisualDigest,
    reviewState: "pending",
  });
  assert.equal(result.valid, true);
  assert.equal(result.binding.catalogSha256, currentVisualDigest);
});

test("a new public-beta approval must bind the exact catalog digest and every pending visual-review disclosure", () => {
  const authorization = structuredClone(checkedAuthorization);
  authorization.acknowledgedOpenGates = authorization.acknowledgedOpenGates.filter((gate) => (
    !/visual|mobile[- ]crop|input[- ]reference|provenance/i.test(gate)
  ));
  authorization.visualCatalogApproval = {
    catalog: "visuals.json",
    catalogSha256: currentVisualDigest,
    decision: "explicitly-approved-for-production-public-beta",
    reviewStateAtAuthorization: "pending",
    evidence: "Product owner reviewed the twelve reused visuals and explicitly approved this exact catalog for public beta.",
  };
  authorization.acknowledgedOpenGates.push(
    "Named human visual and mobile-crop review remain pending for the twelve Chapter panoramas.",
  );

  const missingProvenanceAcknowledgement = validateVisualPublicBetaBinding(authorization, {
    catalogReference: "visuals.json",
    catalogSha256: currentVisualDigest,
    reviewState: "pending",
  });
  assert.equal(missingProvenanceAcknowledgement.valid, false);
  assert.ok(missingProvenanceAcknowledgement.errors.some((error) => /input-reference provenance/.test(error)));

  authorization.acknowledgedOpenGates.pop();
  authorization.acknowledgedOpenGates.push(
    "Named human visual, mobile-crop, and input-reference provenance review remain pending for the twelve Chapter panoramas.",
  );
  const accepted = validateVisualPublicBetaBinding(authorization, {
    catalogReference: "visuals.json",
    catalogSha256: currentVisualDigest,
    reviewState: "pending",
  });
  assert.equal(accepted.valid, true);

  authorization.visualCatalogApproval.catalogSha256 = `sha256:${"0".repeat(64)}`;
  const stale = validateVisualPublicBetaBinding(authorization, {
    catalogReference: "visuals.json",
    catalogSha256: currentVisualDigest,
    reviewState: "pending",
  });
  assert.equal(stale.valid, false);
  assert.ok(stale.errors.some((error) => /digest/.test(error)));
});
