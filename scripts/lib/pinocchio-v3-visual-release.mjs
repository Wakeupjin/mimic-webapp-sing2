import { createHash } from "node:crypto";

export const VISUAL_REVIEW_STATUS = Object.freeze({
  pending: "operational-public-beta-human-visual-review-pending",
  approved: "operational-human-visual-review-approved",
});

const GENERIC_REVIEWERS = new Set([
  "approver",
  "human",
  "owner",
  "pending",
  "product-owner",
  "reviewer",
  "tbd",
]);

export function sha256Digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function namedReviewer(value) {
  return typeof value === "string"
    && value.trim().length >= 4
    && !GENERIC_REVIEWERS.has(value.trim().toLowerCase());
}

function reviewEvidence(value) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }
  return [];
}

export function validateVisualReviewState(catalog, { now = Date.now() } = {}) {
  const errors = [];
  const catalogStatus = catalog?.status;
  const renderingState = catalog?.rendering?.humanVisualReview;
  const chapterStates = Array.isArray(catalog?.chapters)
    ? catalog.chapters.map((chapter) => chapter?.humanVisualReview)
    : [];
  const state = catalogStatus === VISUAL_REVIEW_STATUS.pending
    ? "pending"
    : catalogStatus === VISUAL_REVIEW_STATUS.approved
      ? "approved"
      : null;

  if (!state) {
    errors.push(`Visual catalog status must be ${VISUAL_REVIEW_STATUS.pending} or ${VISUAL_REVIEW_STATUS.approved}.`);
  }
  if (state && renderingState !== state) {
    errors.push(`Visual rendering review must be ${state} when the catalog is ${state}.`);
  }
  if (state && (chapterStates.length !== 12 || chapterStates.some((chapterState) => chapterState !== state))) {
    errors.push(`All twelve Chapter visual reviews must be ${state}; mixed review states are not allowed.`);
  }

  const record = catalog?.rendering?.humanVisualReviewRecord;
  if (state === "pending" && record != null) {
    errors.push("A pending visual catalog must not carry an approval record.");
  }
  if (state === "approved") {
    const reviewedAt = Date.parse(record?.reviewedAt ?? "");
    const evidence = reviewEvidence(record?.evidence);
    if (!namedReviewer(record?.reviewer)) errors.push("Approved visuals require a named human reviewer.");
    if (!Number.isFinite(reviewedAt)) errors.push("Approved visuals require a valid reviewedAt date.");
    if (Number.isFinite(reviewedAt) && reviewedAt > now + 5 * 60 * 1000) errors.push("Visual approval cannot be future-dated.");
    if (evidence.length === 0) errors.push("Approved visuals require review evidence.");
  }

  return {
    valid: errors.length === 0,
    state,
    record: state === "approved" ? record : null,
    errors,
  };
}

export function validateVisualPublicBetaBinding(authorization, {
  catalogReference,
  catalogSha256,
  reviewState,
} = {}) {
  const errors = [];
  const binding = authorization?.visualCatalogApproval;
  const acknowledgements = Array.isArray(authorization?.acknowledgedOpenGates)
    ? authorization.acknowledgedOpenGates
      .filter((item) => typeof item === "string")
      .map((item) => item.toLowerCase())
    : [];

  if (!binding || typeof binding !== "object") {
    errors.push("Public-beta authorization does not explicitly approve the visual catalog.");
    return { valid: false, binding: null, errors };
  }
  if (binding.catalog !== catalogReference) errors.push("Visual approval references a different catalog.");
  if (binding.catalogSha256 !== catalogSha256) errors.push("Visual approval digest does not match the exact visual catalog being published.");
  if (binding.decision !== "explicitly-approved-for-production-public-beta") {
    errors.push("Visual catalog is not explicitly approved for Production public beta.");
  }
  if (binding.reviewStateAtAuthorization !== reviewState) {
    errors.push("Visual approval was recorded against a different human-review state.");
  }
  if (reviewEvidence(binding.evidence).length === 0) {
    errors.push("Visual public-beta approval requires evidence.");
  }
  const pendingVisualGateAcknowledged = acknowledgements.some((acknowledgement) => (
    /visual/.test(acknowledgement)
    && /mobile[- ]crop/.test(acknowledgement)
    && /input[- ]reference/.test(acknowledgement)
    && /provenance/.test(acknowledgement)
  ));
  if (reviewState === "pending" && !pendingVisualGateAcknowledged) {
    errors.push("Pending visual, mobile-crop, and input-reference provenance review must be explicitly acknowledged together in the public-beta authorization.");
  }

  return { valid: errors.length === 0, binding, errors };
}
