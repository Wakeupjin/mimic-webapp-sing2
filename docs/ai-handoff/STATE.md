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
Deploy the approved MimiC introduction design to the production homepage while preserving account, placement, resume, and course-entry behavior.
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Integrated the approved online/offline space, learning-method, and educational-roots story into the production home while preserving authentication, placement, progress resume, account menu, and direct movie/book course entry. Public home preview now loads only the reviewed local 11.72-second clip. Added branded social preview metadata.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- .gitignore
- .vercelignore
- app/components/Sing2Preview.tsx
- app/dev/brand-preview/page.tsx
- app/dev/brand-preview/brand-preview.module.css
- app/layout.tsx
- public/home/mimic-space.png
- public/og.png
- public/videos/sing2-preview.mp4
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Standalone TypeScript passed; fresh Next production build passed with 101 static pages; local built server returned 200 for home, space image, OG image, and reviewed preview video; expected Korean positioning and roots copy appeared in rendered HTML.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Vercel MCP tools are unavailable in this task, so Git-linked deployment status must be verified through the repository and available Vercel CLI/API tooling without claiming MCP evidence.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Commit and push only the homepage release files, open and merge a PR to main, then verify the Vercel production aliases and public preview asset.
<!-- HANDOFF:NEXT_ACTION:END -->
