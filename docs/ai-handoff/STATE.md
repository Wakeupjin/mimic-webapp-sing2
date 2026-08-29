# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
COMPLETE
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Replace Mimic Check memory prompt with same-segment muted scene replay while never exposing the English sentence
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Mimic Check is now scene-led rather than memory-led: the learner receives the same clip muted, can replay sound only when needed, and never sees the target English sentence or Mimic transcript.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/components/AiCoachPanel.tsx, app/placement/page.tsx, docs/ai-handoff/PROJECT_CONTEXT.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Production build passed; responsive browser QA passed; muted and sound replay behaviors were verified against the real Sing 2 media segment.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
A real microphone permission and AI response run still requires an authenticated user and was not triggered during automated browser QA.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Wait for the next user request. Begin a new objective before making unrelated changes.
<!-- HANDOFF:NEXT_ACTION:END -->
