# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
V2 TEXT CURRICULUM READY — ART/AUDIO PENDING
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Review and freeze the complete-story Pinocchio twelve-session v2 text curriculum
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Corrected the course scope by reframing all original Chapters 1–36 into twelve dramatic sessions ending with Pinocchio becoming a real boy. Each Foundation/Core/Studio option now has sixteen shared Watch/Mimic lines, eight Guess items, eight Word rebuilds, one retell prompt, and a 10/25/10/15-minute mode contract. Added 96 story beats, complete curriculum and instructor guides, narration/art briefs, a v2 compiler and validator, and v2 support in the paid-plan-guarded ElevenLabs generator. No v2 art or audio was generated.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- content-packs/pinocchio/v2/
- scripts/build-pinocchio-12-session-pack.mjs
- scripts/validate-pinocchio-12-session-pack.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
V2 compiler and validator pass: 12 sessions, original Chapters 1–36 exactly once and in order, 576 leveled lines, 6,716 words, 288 Guess items, 288 Word items, 96 story beats, sixty minutes per selected level, and zero language-band exceptions. ElevenLabs estimate mode reports 36 continuous masters, 46,136 billed characters including performance tags, and a 1,866-character largest request. Node syntax, TypeScript, and whitespace checks pass. A full Next build produced no output after compilation began and was canceled; no app runtime code changed in this text-only package.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
The sixty-minute duration is now an explicit interaction contract but still needs a real learner/classroom pacing pilot. V2 Living Storybook images and narration are pending; v1 chapter images must not be relabeled as v2 session art. Operational audio still requires a durable narrator and paid commercial plan; Lily expires on 2026-12-31. The full Next build stalled without an error and remains an integration-time check. Confirm Korean-market public-domain status before commercial distribution. This R&D thread must not deploy production.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Have the user review the twelve-session curriculum map and sample language. After text approval, create twelve new session illustrations, select a durable paid narrator, generate/listen through the 36 masters, run a pacing pilot, and only then hand a frozen version to the main development thread.
<!-- HANDOFF:NEXT_ACTION:END -->
