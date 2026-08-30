# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
DEPLOYING
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Prepare the twelve-Chapter Foundation Pinocchio experience on the same Watch/Mimic/Guess/Word learning shell as Sing2, using the existing Mimic-created Chapter art while keeping Production behind explicit release approval
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Moved Pinocchio's four modes onto the canonical Sing2 lesson shell and shared completion controls, removed the production route's dependency on a dev page, and wired all twelve existing 1672×941 Mimic-created panoramas through a checksum-locked visual registry. Watch/Mimic/Guess/Word now share the same 16:9 mobile stage and dock geometry as Sing2. Mimic preserves exact phrase playback without exposing the English answer, repeated Word chips are judged by their visible sentence rather than hidden IDs, learner SKIP is blocked, mobile line navigation opens outside the clipped stage as an accessible bottom sheet, and the single panorama travels across eight story beats with a 1.36× crop. The historical public-beta approval cannot silently authorize the newly added visual catalog.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/components/pinocchio/PinocchioLessonModeClient.tsx
- app/components/pinocchio/lessonUiPolicy.mjs
- app/components/MimicLineList.tsx
- app/components/LessonCompletionActions.tsx
- app/book/pinocchio/[chapter]/[mode]/page.tsx
- app/dev/pinocchio-session-1/[mode]/page.tsx
- app/dev/pinocchio-chapters/pinocchio-chapters.module.css
- app/globals.css
- app/lib/pinocchioStoryPack.server.ts
- content-packs/pinocchio/v3/visuals.json
- content-packs/pinocchio/v3/{manifest.json,rights.json,QA.md,README.md}
- scripts/lib/pinocchio-v3-visual-release.mjs
- scripts/validate-pinocchio-v3-visuals.mjs
- scripts/publish-pinocchio-v3-web-assets.mjs
- tests/pinocchio-sing2-parity.test.mjs
- tests/pinocchio-visual-release-gate.test.mjs
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
The product owner explicitly approved Production public beta after the pending visual, mobile-crop, and input-reference provenance reviews were disclosed. The exact `visuals.json` digest is now bound into `release-beta.json`, and the manifest pins the updated authorization digest. `env VERCEL_ENV=production npm run build` passed with 101 pages and published 12/12 Foundation Chapters as `production-public-beta`. `npm run validate:story-pack`, `npm run validate:pinocchio-ui-parity` (9/9), `npm run validate:pinocchio-visual-release` (5/5), `npx tsc --noEmit`, and `git diff --check` passed. Browser QA at a 433px phone viewport found no horizontal overflow; all four modes measured the same 414×233 16:9 stage and 414px dock.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
The current public-beta authorization permits this exact pending visual catalog only; any catalog change invalidates the digest-bound exception. Named human editorial/learning/audio/rights/release approvals, continuity listening, per-Chapter Forced Alignment, full-master Forced Alignment, and named visual/mobile-crop/provenance review remain pending and visible as Beta blockers. The current restricted ElevenLabs key explicitly has `Forced Alignment: No Access`; enabling that one permission is required before final timing can be generated.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Commit the digest-bound beta authorization, fast-forward the current commit to GitHub `main`, wait for the existing Vercel Git integration to finish Production, and smoke-test `https://mimicenglish.vercel.app/book/pinocchio/1` plus the four Chapter modes.
<!-- HANDOFF:NEXT_ACTION:END -->
