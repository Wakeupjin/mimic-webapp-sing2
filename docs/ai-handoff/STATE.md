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
Create Mimic company operating record and Pinocchio v3 Story Pack with an eight-minute Core Golden Chapter
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Recorded the AI-native company/Content Studio operating model and created Pinocchio v3 Story Pack draft. Core Chapter 1 now has a 1,028-word, 105-sentence canonical master estimated at 481.9 seconds at 128 wpm, eight beats, and exact 30 Mimic/10 Guess/10 Word selections. Added registry, manifest schema, persistent Content Studio AI rule, rights record, Story Bible, twelve-Chapter season map, production/QA records, and a generic validator.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- AGENTS.md
- .cursor/rules/content-studio.mdc
- content-studio/
- content-packs/pinocchio/v3/
- scripts/validate-story-pack.mjs
- package.json
- docs/ai-handoff/PROJECT_CONTEXT.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
npm run validate:story-pack passed (105 sentences, 1,028 words, 481.9 seconds, 8/30/10/10); npx tsc --noEmit passed; all nine new JSON files parse; git diff --check passed. Next Turbopack build was stopped after hanging in its optimization phase with no diagnostic output; no app code changed.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Commercial target-territory rights review, named editorial/learning approval, durable Lily voice ID/availability, commercial plan evidence, master audio/timestamps/visuals, human listening QA, and product preview remain pending. Existing untracked prototype voice folders are unrelated and were not modified.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
A named human editor reviews the Chapter 1 Core script and learning selections. After approval, select and record a durable ElevenLabs voice ID, generate one coherent narration master without sentence-by-sentence TTS, align timestamps, complete human listening and product QA, then approve the Golden Chapter before authoring Chapters 2-12.
<!-- HANDOFF:NEXT_ACTION:END -->
