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
Render Sing 2 selecting only after profile, lesson list, and progress are all ready so the first visible state never repaints
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Removed the Selecting progress flash by gating the first visible render on complete profile, lessons, and progress data.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/contexts/AuthContext.tsx, app/components/AuthGate.tsx, app/sing2/selecting/page.tsx
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Production build passed and delayed-data browser verification passed.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
The signed-in production account still needs a smoke test after a future deployment; this change has not been deployed.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Wait for the next user request. Begin a new objective before making unrelated changes.
<!-- HANDOFF:NEXT_ACTION:END -->
