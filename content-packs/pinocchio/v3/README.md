# Pinocchio Story Pack v3

This directory is the draft, reproducible Story Pack for a twelve-class
Pinocchio Book Track. It does not replace the published v2 course.

## Product intent

- one complete Pinocchio arc across twelve Chapters;
- one selected level per learner: Foundation, Core, or Studio;
- each Chapter uses `Watch → Mimic → Guess → Word`;
- Watch is a real six-to-ten-minute narrative master;
- Mimic selects thirty unique, high-value source sentences from that master;
  each stays one learner-facing item, while long sentences contain nested
  practice chunks split only at natural thought and breath boundaries;
- Guess and Word are grounded in the same canonical master.

## Current gate

All thirty-six Chapter-level scripts are authored. Lily
(`pFZP5JQG7iQjIQuC4Bku`) is approved as the British narrator for this finite
twelve-Chapter, three-level Story Pack. Continuing paid batch narration remains
gated behind named human editorial and learning approval. A generated audio
file is not approved merely because its timestamps validate.

Lily is scheduled to retire from future generation on 2026-12-31, so all
approved masters and pickups must finish by the internal 2026-11-30 deadline.
Store the audio, sentence timeline, request evidence, settings, and checksums as
company assets. See `narrator-policy.json` for the immutable production decision.

## Foundation public beta

The product owner explicitly authorized the twelve Foundation Chapters for a
Production public beta on 2026-08-30 after the open alignment, human-review,
and final legal gates were disclosed. `release-beta.json` is deliberately
scoped to Foundation only. It allows deployment without changing
`releaseReady`, rights, QA, or approval records; every unresolved blocker stays
in the generated release catalog and the learner UI remains visibly labeled
`BETA · 검수 중`.

The beta does not relax technical integrity checks. Publishing still fails for
an incomplete Chapter set, missing or empty media, stale identities, malformed
millisecond timelines, checksum mismatches, or any change to the
manifest-pinned beta authorization digest. Set
`PINOCCHIO_PRODUCTION_RELEASE=v2` to bypass v3 publishing and restore the
previous production route as an emergency rollback.

Foundation also reuses the twelve original v2 paper-theatre panoramas as its
operational Chapter stages. This is deliberate asset reuse, not a relabeling:
`visuals.json` proves that every v2 and v3 ordinal Chapter covers the same
original Collodi Chapter group, and locks both the canonical/public image digest
and 1672×941 dimensions. Human visual, mobile-crop, and rights review remain
pending, and the registry explicitly describes the current limitation: one
static panorama per Chapter, not eight independently timed scenes.

The original 2026-08-30 beta authorization predated this visual catalog and was
not silently extended to it. After the pending visual, mobile-crop, and
input-reference provenance reviews were explicitly disclosed, the product
owner separately approved Production public beta for the exact catalog. The
updated manifest-pinned `release-beta.json` now names `visuals.json`, binds its
exact SHA-256 digest, records the pending review state seen at authorization
time, and preserves all three visual gates as unresolved blockers. Any later
catalog change invalidates this exception until a new digest-bound approval is
recorded.

Visual review has one atomic state transition. `pending` requires the catalog,
rendering record, and all twelve Chapter records to remain pending and continues
to be a release blocker. `approved` requires the catalog status
`operational-human-visual-review-approved`, all twelve Chapter records marked
approved, and `rendering.humanVisualReviewRecord` with a named reviewer, valid
`reviewedAt`, and non-empty evidence. Mixed states or approval without that
evidence fail validation, publishing, and production loading.

## Validate

```bash
npm run validate:story-pack
npm run validate:pinocchio-visual-release
```

The validator checks the pack structure, twelve-Chapter map, every authored
level's duration envelope, exact activity sourcing, v2/v3 visual grouping and
asset identity, and release-state claims.
