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
Fix Sing 2 student progress persistence and gate navigation without changing gate policy
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
PR #39 is open from codex/fix-sing2-progress-gate with the scoped Sing2 gate fix. GitHub/Vercel checks passed and the preview correctly keeps unauthenticated lesson entry behind signup.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/hooks/useGuessingGame.ts, app/lib/useRequireModeAccess.ts, app/sing2/guessing/page.tsx, app/sing2/mimicking/page.tsx, app/sing2/word/page.tsx, tests/sing2-progress-gate.test.mjs, package.json, docs/ai-handoff/STATE.md, docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Sing2 gate 14/14; Pinocchio behavior 26/26; Pinocchio UI 9/9; visual release 5/5; TypeScript pass; 101-page build pass; PR #39 Vercel deployment pass; unauthenticated preview smoke pass.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Real-student end-to-end verification remains because the automated preview browser has no student session. Production is untouched. Completion analytics remain best-effort after the durable gate write.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Use the PR #39 Vercel preview with a real student account to verify Mimic 30/30 to Guess, Guess 10/10 to unlocked Word across refresh/re-login, Guess re-entry, and Word completion to Chapter 2. Do not merge or deploy Production without explicit approval.
<!-- HANDOFF:NEXT_ACTION:END -->
