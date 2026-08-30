# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
Codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
PINOCCHIO CHAPTER 1–12 MIMIC BOUNDARY SAFETY — PREVIEW READY, PRODUCTION BLOCKED FOR HUMAN QA
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Human-listen the 28 coarticulated Mimic boundaries and all twelve chapter masters, then release only after explicit production approval
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Starting from production main `fcd89bf`, all twelve Pinocchio Core chapters were rebuilt so Mimic no longer seeks and stops inside a shared master. The same one-take ElevenLabs performance now produces 360 independent, sample-accurate Mimic MP3s with short edge fades and natural file EOF, while Watch, Guess, and Word keep the continuous chapter master. Runtime validation fails closed on stale or incomplete timelines and a deterministic release receipt binds the complete pack. A mobile-first preview-only human QA room now presents the 28 ambiguous boundaries and 12 full masters, records operator-attested natural-EOF/context evidence and 98% listen coverage, and exports a review bundle tied to both the receipt hash and deterministic review-target hash. A local importer independently reconstructs every current media binding, treats the playback audit as trusted owner attestation, and rejects incomplete, stale, future-dated, or recut-containing bundles before any mutation.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/dev/pinocchio-chapters/lessonData.ts
- app/dev/pinocchio-chapters/types.ts
- app/dev/pinocchio-chapters/timelineValidation.ts
- app/dev/pinocchio-chapters/pinocchio-chapters.module.css
- app/dev/pinocchio-session-1/[mode]/page.tsx
- content-packs/pinocchio/v2/sessions/session-01..12/audio/core.timeline.json
- content-packs/pinocchio/v2/sessions/session-01..12/audio/provenance.json
- content-packs/pinocchio/v2/sessions/session-01..12/audio/mimic/core/*.mp3
- content-packs/pinocchio/v2/release-receipt.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/core.timeline.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/provenance.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/mimic/core/*.mp3
- public/prototype-audio/pinocchio-v2/release-receipt.json
- scripts/rebuild-pinocchio-v2-boundaries.mjs
- scripts/validate-pinocchio-core-chapters.mjs
- scripts/validate-pinocchio-deploy-receipt.mjs
- scripts/build-with-pinocchio-gate.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- scripts/import-pinocchio-human-review.mjs
- app/dev/pinocchio-audio-review/page.tsx
- app/dev/pinocchio-audio-review/AudioReviewClient.tsx
- app/dev/pinocchio-audio-review/audio-review.module.css
- package.json
- vercel.json
- .vercelignore
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Boundary rebuild check, full ffmpeg-backed preview validation, Node-only deploy-receipt validation, TypeScript, whitespace checks, and a 54-route Next preview build pass. The validators confirm 12 chapters, 192 Watch lines, 360 independent Mimic assets, 120 Guess items, 120 Word items, 25,942,390 Mimic audio bytes, exact canonical/public parity, 320 automatically safe boundaries, and 28 coarticulated boundaries requiring human listening. The QA importer dry-run accepts an exact synthetic 28+12 bundle, rejects the same bundle when its target hash is stale, revalidates the receipt-bound 360 files before mutation, and keeps a hashed 50-file crash-recovery journal. Browser QA confirmed LEFT/RIGHT natural-EOF and master-context gating, reviewer locking, rapid-tap isolation, and live progress updates; a normal media `abort` false-positive discovered during the test was removed and retested. Strict production validation and `VERCEL_ENV=production npm run build` remain intentionally blocked, while the preview build passes. Receipt SHA-256: `8c6a9f00acbb0ef42aec66648822cc30b35f6d76d3c89df11f30d8ad37f516c4`; review-target SHA-256: `df6d3d069ae849cb5b1475eaaef34430ba226f245b2c4d9fe857819501c5c790`.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production remains deliberately blocked: 28 boundaries with no measurable quiet gap need a bound human-listen approval, and all twelve chapters need a bound full-master listen-through with `qaStatus: human-listen-pass`. The current reviewer identity is locally entered and cryptographically bound to content hashes but is not a server-authenticated signature; that is acceptable for the owner-operated QA phase, not a multi-reviewer compliance system. No production deployment has been made from this branch. Foundation/Studio media remains pending, Lily expires on 2026-12-31, and Korean-market rights confirmation remains separate.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Open the preview-only `/dev/pinocchio-audio-review`, complete all 28 boundary checks and 12 full-master listen-throughs, export the JSON bundle, dry-run then apply it with `npm run import:pinocchio-human-review -- --input <file> [--apply]`, and request explicit production deployment approval only after the regenerated receipt is PASS.
<!-- HANDOFF:NEXT_ACTION:END -->
