# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
READY FOR REVIEW
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
`npm run build` passed with 101 pages. `npm run validate:story-pack`, `npm run validate:pinocchio-ui-parity` (9/9), `npm run validate:pinocchio-visual-release` (5/5), `npx tsc --noEmit`, and `git diff --check` passed. Browser QA at a 433px phone viewport found no horizontal overflow; all four modes measured the same 414×233 16:9 stage and 414px dock. The mobile line sheet was independently measured at both 355×631 and 433×938 viewports. An explicit Production-channel publish failed on all intended gates, including the missing visual-catalog authorization.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Named human editorial/learning/audio/rights/release approvals, continuity listening, per-Chapter Forced Alignment, full-master Forced Alignment, and named visual/mobile-crop/provenance review remain pending. The web publisher exposes only Chapters whose source, activity, audio, visual, and millisecond timeline checksums pass, requires all twelve Chapters, and refuses the Production channel while any release gate remains open. The pre-visual `release-beta.json` cannot authorize the new catalog; a future public-beta exception needs a new manifest-pinned approval for the exact `visuals.json` digest and must explicitly acknowledge the pending visual, mobile-crop, and input-reference provenance reviews together. The current restricted ElevenLabs key explicitly has `Forced Alignment: No Access`; enabling that one permission is required before final timing can be generated.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
After the user explicitly approves uploading this branch to the configured external GitHub remote, push `codex/pinocchio-sing2-parity` and open a Vercel QA Preview for product-owner review. Do not merge or deploy to Production until the exact visual catalog receives explicit beta authorization or all normal release gates pass.
<!-- HANDOFF:NEXT_ACTION:END -->
