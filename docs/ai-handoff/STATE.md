# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
CHAPTER 1–12 CORE LOCAL COURSE READY — FULL FLOW AND MEDIA VALIDATED
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Review and approve the complete Sing 2-parity Pinocchio Core course across all twelve learner-facing Chapters
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Generalized the former Session 1-only pilot into one data-driven Chapter 1–12 learner flow while preserving the Sing 2 Selecting → Watch → Mimic → Guess → Word interaction. The app reads every v2 `sessions/session-01..12/pack.json`, but deliberately presents those sixty-minute curriculum meetings as `CHAPTER 1..12` in learner-facing UI and routes. Each Chapter has independent local mode completion; completing Word unlocks the next Chapter, direct locked routes return to the latest open Chapter, and legacy Session 1 progress/URLs migrate or redirect to Chapter 1. All twelve Core packs now have paid-plan Eleven v3 Lily British one-take masters, exact line/Mimic timelines, and original Living Storybook panoramas in canonical and public media slots. Learner integrity gates prevent jumping to the last exercise, segment playback stops at 30 ms precision, and Chapter 12 exits to Home with a course-complete message.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/components/ModeSelectLayout.tsx
- app/dev/pinocchio-chapters/
- app/dev/pinocchio-session-1/
- content-packs/pinocchio/v2/APP_MEDIA_PATHS.md
- content-packs/pinocchio/v2/
- public/prototype-art/pinocchio-v2/session-01..12.png
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/
- scripts/build-pinocchio-12-session-pack.mjs
- scripts/validate-pinocchio-12-session-pack.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Both content validators, `npx tsc --noEmit`, `git diff --check`, and a clean 40-route `next build` pass. The Core media validator confirms source Chapters 1–36 in order, twelve matching canonical/public MP3-timeline-art sets, 17.63 minutes of continuous Lily narration, 192 Watch lines, 360 Mimic units, 120 Guess items, and 120 Word items. Browser QA traversed every mode in Chapters 1–12, confirmed Chapter-only terminology, sequential locks, direct-route rejection, Chapter 1/2/12 real audio and art, Mimic arrow autoplay/active state, item-level forward gates, hidden Word cards after completion, Chapter 12 Home exit, responsive rendering, and zero console errors.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
All twelve Core masters still need a human listen-through for emotion, pronunciation, and breath quality. Foundation/Studio media remains pending. Lily expires on 2026-12-31, the sixty-minute contract needs a learner/classroom pacing pilot, and Korean-market public-domain status still requires confirmation. This R&D thread must not deploy production.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Have the user review the local Chapter 1–12 Core course, especially Lily's delivery and one sixty-minute classroom run. If approved, hand the versioned packs, media, routes, and acceptance criteria to the main development thread for controlled integration; do not deploy from this R&D thread.
<!-- HANDOFF:NEXT_ACTION:END -->
