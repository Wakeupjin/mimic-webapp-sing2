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
PR #40 Preview smoke found and fixed the final removed-Guess deep-link race: auth redirects now canonicalize book Guess URLs to the Chapter root before signup/login can preserve them. The dedicated server redirect remains as defense in depth; Sing2 Guess is unchanged.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/lib/authRedirect.ts
- tests/pinocchio-three-mode-reading.test.mjs
- docs/ai-handoff/{STATE.md,CONVERSATION.md}
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
45 tests passed (UI/three-mode 14, behavior 26, visual release 5); TypeScript and diff check passed; final 89-page production build passed.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production remains untouched. Authenticated playback and visual approval still require the refreshed Vercel Preview.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Commit and push the auth normalization follow-up, wait for the refreshed Vercel Preview, verify the browser lands with next=/book/pinocchio/{chapter}, then perform authenticated responsive visual QA and stop before merge/Production.
<!-- HANDOFF:NEXT_ACTION:END -->
