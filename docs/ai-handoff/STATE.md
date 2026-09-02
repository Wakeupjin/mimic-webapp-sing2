# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
Codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
COMPLETE
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Remove Pinocchio Guess from the learner flow and redesign Pinocchio Mimic as a readable, dimmed Living Storybook sentence practice while preserving movie Mimic
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Pinocchio reading-first redesign is complete on PR #40. Learner flow is Listen → Mimic → Word, book Mimic keeps the Living Storybook motion under a comfortable dim and shows the stable authored sentence, legacy Guess data is preserved but unroutable, and old/deep Guess links safely return to the correct Chapter even through authentication. Vercel Preview: https://mimic-webapp-sing2-git-codex-pinocc-8ed6ab-kangjinlees-projects.vercel.app/ . Production was not merged or deployed.
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
- app/lib/authRedirect.ts
- package.json
- tests/pinocchio-{sing2-parity,learning-behavior-parity,three-mode-reading}.test.mjs
- docs/ai-handoff/PROJECT_CONTEXT.md
- docs/ai-handoff/{STATE.md,CONVERSATION.md}
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
45 tests passed; TypeScript and diff checks passed; final 89-page production build passed; both Vercel checks passed; live unauthenticated deep-link smoke confirmed next=/book/pinocchio/7 rather than the removed Guess route.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production remains untouched. Authenticated playback and visual approval still require the refreshed Vercel Preview.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Wait for the next user request. Begin a new objective before making unrelated changes.
<!-- HANDOFF:NEXT_ACTION:END -->
