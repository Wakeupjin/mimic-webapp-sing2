# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
gpt
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
IN PROGRESS
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Create durable cross-prompt project context and preserve the pending mobile portrait Mimicking work
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Student test account role is now configured and verified in Supabase. OpenAI API setup is paused at the Platform login screen.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/api/ai-coach/route.ts, app/components/AiCoachPanel.tsx, app/types/aiCoach.ts, app/sing2/mimicking/page.tsx, docs/ai-coach.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Supabase SQL result returned exactly one row with role student. OpenAI tab remains at /login?next=/api-keys.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
API key creation is pending user authentication. Never record the account email or API key in shared handoff documents.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
User signs in to OpenAI Platform in the open in-app browser tab; GPT then creates a project API key, saves it to .env.local without exposing it, and runs the live AI Coach test.
<!-- HANDOFF:NEXT_ACTION:END -->
