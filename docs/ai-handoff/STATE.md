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
Diagnose and fix the placement 55-second scene failing to start on iPad after grade selection
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Placement playback now remains actionable during iPad preload, requests only the needed media time range, avoids a duplicate hidden movie request, and exposes poster/loading/retry/timeout feedback instead of a blank stall.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/placement/page.tsx
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
TypeScript and production build passed after the final duplicate-media cleanup; iPad-sized browser QA played the real segment from 288.5 seconds without a media error.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
The automated browser is not Mobile Safari, so one real iPad Safari smoke test remains after deployment. The source is a 950 MB full-movie MP4; a dedicated 55-second CDN clip would be the strongest long-term latency fix.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Wait for the next user request. Begin a new objective before making unrelated changes.
<!-- HANDOFF:NEXT_ACTION:END -->
