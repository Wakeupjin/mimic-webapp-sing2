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
Complete Pinocchio v3 as twelve-Chapter Foundation, Core, and Studio Story Packs, then generate the final Lily British narration set before voice retirement
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Completed the Pinocchio v3 asset standard and all 36 Foundation/Core/Studio Chapter packs, including 30 unique Mimic source sentences per Chapter with nested natural-breath chunks. Refreshed cached Core Chapters 1-3 millisecond timelines with no new TTS calls. Added multi-act-safe generation, resumable artifact hashes, one-master assembly, release-only full-master Forced Alignment, full-audiobook validation, and a legacy-compatible local Mimic adapter that practices nested chunks with keyboard autoplay and active-state feedback.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/dev/pinocchio-chapters/lessonData.ts
- app/dev/pinocchio-chapters/types.ts
- app/dev/pinocchio-session-1/[mode]/page.tsx
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
npm run validate:story-pack passed with 36 authored levels, 37,286 words, 1,080 Mimic parents, 360 Guess, 360 Word, and zero errors. npx tsc --noEmit passed. v3 Chapter 1 adapter smoke: 30 parents with exact nested chunk playback; v2 smoke: 30 parent/single-chunk regression pass. git diff --check passed before checkpoint.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production book routes still load v2 data/media and need explicit v3 loader wiring. Named human editorial/learning approvals, rights approval, and continuity listening remain pending. Current restricted ElevenLabs key cannot access subscription usage or Forced Alignment. Remaining audio estimate is 210,451 billed characters; full batch must not start without a credit cap.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Connect the production /book/pinocchio loader to the v3 Chapter/level pack and published media URLs. After named human editorial/learning approval and an explicit credit cap, generate the remaining Lily audio, assemble one master per level, enable Forced Alignment access, align the final masters, then run rights/listen/product release QA.
<!-- HANDOFF:NEXT_ACTION:END -->
