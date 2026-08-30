# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
IN PROGRESS
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Ship the twelve-Chapter Foundation (초급) Pinocchio Story Pack first, while preserving Core and Studio as later level releases
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Completed the Pinocchio v3 asset standard and all 36 Foundation/Core/Studio Chapter packs, including 30 unique Mimic source sentences per Chapter with nested natural-breath chunks. Generated all twelve paid Lily Foundation Chapter masters (80.76 minutes) and assembled the continuous 81.04-minute full-story master. Production `/book/pinocchio` now defaults to v3 Foundation (초급), loads its locked source/activities/timeline, publishes exactly 12/12 checksum-verified web media sets, scopes progress separately to lesson numbers 401-412, and supports explicit `PINOCCHIO_PRODUCTION_RELEASE=v2` rollback. Live home/catalog entry points now open Foundation Chapter 1 and use the new Mimic-original Pinocchio cover. The publisher emits a clearly marked QA Preview while automatically refusing Production until alignment, rights, and named approvals pass.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/dev/pinocchio-chapters/lessonData.ts
- app/dev/pinocchio-chapters/types.ts
- app/dev/pinocchio-session-1/[mode]/page.tsx
- app/book/pinocchio/[chapter]/page.tsx
- app/book/pinocchio/[chapter]/[mode]/page.tsx
- app/lib/pinocchioStoryPack.server.ts
- app/dev/brand-preview/page.tsx
- app/lib/monthCatalog.ts
- public/pinocchio-mimic-cover.png
- scripts/publish-pinocchio-v3-web-assets.mjs
- content-packs/pinocchio/v3
- content-studio/STORY_PACK_STANDARD.md
- scripts/generate-story-pack-golden-audio.mjs
- scripts/generate-pinocchio-v3-audio-batch.mjs
- scripts/assemble-story-pack-audiobook.mjs
- scripts/align-story-pack-audiobook.mjs
- scripts/validate-story-pack-authored.mjs
- scripts/validate-story-pack-audiobook.mjs
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
npm run validate:story-pack passed with 36 authored levels, 37,286 words, 1,080 Mimic parents, 360 Guess, 360 Word, and zero errors. All twelve Foundation masters are checksum-valid and fall inside the 6-10 minute Chapter acceptance window. `npm run publish:pinocchio-v3-web` published exactly 12/12 as `preview` with `releaseReady=false`. npx tsc --noEmit and the Foundation webpack build passed with 101 generated pages. An explicit `--channel=production` publisher test failed on every intended release gate. Local HTTP smoke returned 200 for Chapter 1 and 12 selectors/modes; the Chapter 1 master returned `audio/mpeg` with the expected 6.4 MB content length. git diff --check passed before checkpoint.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Named human editorial/learning/audio/rights/release approvals, continuity listening, per-Chapter Forced Alignment, and full-master Forced Alignment remain pending. The web publisher exposes only Chapters whose source, activity, audio, and millisecond timeline checksums pass, requires all twelve Chapters, and refuses the Production channel while any release gate remains open. The current restricted ElevenLabs key explicitly has `Forced Alignment: No Access`; enabling that one permission is required before final timing can be generated.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Push the Foundation branch to create a Vercel QA Preview. After explicit permission and credit approval, enable `Forced Alignment`, align all twelve Chapter masters plus the 81.04-minute full-story master, and complete named human review. Merge to Production only after the automated release gate passes; set `PINOCCHIO_PRODUCTION_RELEASE=v2` for an explicit rollback build if needed.
<!-- HANDOFF:NEXT_ACTION:END -->
