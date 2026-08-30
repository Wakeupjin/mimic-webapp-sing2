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
Close the remaining behavioral and microinteraction gaps between Pinocchio Foundation and the canonical Sing2 Watch/Mimic/Guess/Word experience, then validate and deploy the exact parity release to Production
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Implemented the full Pinocchio Foundation behavior pass against Sing2: Watch time/seek/resume, Mimic's eight-slot cadence and guarded navigation, Guess's x3/ABC/sound/feedback/auto-next state machine, Word's listen-listen-mimic cadence, fixed chip positions, sound feedback and chameleon reaction, plus per-mode progress hydration. Added pause-safe workflow timers, isolated lock-hint clocks, completed-state guards, and a shared mobile-safe AudioContext.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/components/pinocchio/PinocchioLessonModeClient.tsx
- app/globals.css
- app/hooks/useSoundEffects.ts
- app/lib/progressGate.ts
- package.json
- tests/pinocchio-learning-behavior-parity.test.mjs
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
`npm run validate:pinocchio-behavior-parity` passes 26/26; `npm run validate:pinocchio-ui-parity` passes 9/9; `npm run validate:pinocchio-visual-release` passes 5/5; `npx tsc --noEmit` passes; the final 101-page Production build passes after the pause/audio hardening.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Local browser QA is authentication-blocked on the separate localhost origin. After the final build, deploy the exact commit through the linked GitHub main → Vercel Production path and verify the signed-in Production routes directly. Keep Pinocchio's explicit completion persistence rather than copying Sing2's known final Guess/Word persistence defects.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Run the final Production build and diff check, commit the scoped behavior release, push the exact commit to GitHub main, wait for Vercel Production success, then verify Watch/Mimic/Guess/Word on the signed-in live site.
<!-- HANDOFF:NEXT_ACTION:END -->
