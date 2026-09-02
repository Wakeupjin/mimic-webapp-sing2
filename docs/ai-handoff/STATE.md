# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
Codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
IN PROGRESS
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Remove Pinocchio Guess from the learner flow and redesign Pinocchio Mimic as a readable, dimmed Living Storybook sentence practice while preserving movie Mimic
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Final review is clean. Pinocchio learner UI now exposes only Listen → Mimic → Word; book Mimic shows one stable authored sentence across all eight audible/muted repetitions over a dimmed Living Storybook; the line list safely pauses playback; small-phone, iPad, reduced-motion, and screen-reader overlaps are handled. Legacy Guess rows remain stored but are ignored by learner gates and resume ordering.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/book/{guessing,listen,mimicking,selecting,word}/page.tsx
- app/book/pinocchio/[chapter]/{[mode],guessing}/page.tsx
- app/components/ModeSelectLayout.tsx
- app/components/pinocchio/PinocchioLessonModeClient.tsx
- app/dev/brand-preview/page.tsx
- app/dev/pinocchio-chapters/[chapter]/ChapterSelectClient.tsx
- app/dev/pinocchio-chapters/{lessonData.ts,localProgress.ts,pinocchio-chapters.module.css}
- app/globals.css
- package.json
- tests/pinocchio-*.test.mjs
- docs/ai-handoff/{PROJECT_CONTEXT.md,STATE.md,CONVERSATION.md}
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
44 tests passed (UI/three-mode 13, behavior 26, visual release 5); TypeScript passed; git diff --check passed; final production build passed with 89 pages, 36 active book lesson paths, and a dedicated removed-Guess redirect.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production remains untouched. Authenticated playback and responsive visual approval must happen on the Vercel Preview before merge. Dormant Guess code/fixtures remain for rollback and data compatibility but cannot be routed or rendered by learners.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Commit and push codex/pinocchio-three-mode-reading, open a PR, wait for Vercel Preview, then perform authenticated visual QA and stop before merge/Production.
<!-- HANDOFF:NEXT_ACTION:END -->
