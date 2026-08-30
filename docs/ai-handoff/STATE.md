# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
Codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
PINOCCHIO CHAPTER 1–12 CORE — POST-MERGE BUILD PASSED, READY FOR MAIN PUSH
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Deploy the validated Pinocchio Chapter 1–12 Core course to production and verify the live learning flow
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
The latest production main first reverted PRs #35, #34, and #33, removing Story Finale UI, routes, progress integration, and the story-conversation API while preserving the concept in the product backlog. On top of that clean production state, the former Pinocchio Session 1 pilot is now a data-driven Chapter 1–12 Core course that preserves the Sing 2 Selecting → Watch → Mimic → Guess → Word interaction. All twelve Chapters have independent sequential progress, paid-plan Eleven v3 Lily British masters, exact line/Mimic timelines, original Living Storybook panoramas, 30 ms segment stops, item-level learner gates, and a final Chapter 12 Home exit.
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
- docs/product-backlog.md plus reverse reverts of the Story Finale files from PRs #33-#35
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
After merging current production main, both Pinocchio content validators, `npx tsc --noEmit`, `git diff --check`, and a clean 40-route `next build` pass. The Core media validator confirms source Chapters 1–36 in order, twelve matching canonical/public MP3-timeline-art sets, 17.63 minutes of continuous Lily narration, 192 Watch lines, 360 Mimic units, 120 Guess items, and 120 Word items. Browser QA traversed every mode in Chapters 1–12 with real Chapter 1/2/12 media and zero console errors. The production Story Finale removal remains intact with no retelling routes.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
All twelve Core masters still need a human listen-through for emotion, pronunciation, and breath quality. Foundation/Studio media remains pending. Lily expires on 2026-12-31, the sixty-minute contract needs a learner/classroom pacing pilot, and Korean-market public-domain status still requires confirmation. Existing retelling evaluation rows may remain in Supabase but are no longer read or shown.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Run the post-merge validators and production build, push the merged commit to `main`, then verify the live Chapter 1–12 route, audio, art, and Story Finale absence.
<!-- HANDOFF:NEXT_ACTION:END -->
