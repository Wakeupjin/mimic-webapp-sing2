# Shared work state

> **Read this first.** This is the current, compact context shared by GPT and
> Cursor. Use `CONVERSATION.md` for the decision trail.

## Active operator

<!-- HANDOFF:ACTIVE_OPERATOR:START -->
Codex
<!-- HANDOFF:ACTIVE_OPERATOR:END -->

## Status

<!-- HANDOFF:STATUS:START -->
PINOCCHIO CHAPTER 1–12 MIMIC BOUNDARY SAFETY — PREVIEW READY, PRODUCTION BLOCKED FOR HUMAN QA
<!-- HANDOFF:STATUS:END -->

## Current objective

<!-- HANDOFF:OBJECTIVE:START -->
Human-listen the 28 coarticulated Mimic boundaries and all twelve chapter masters, then release only after explicit production approval
<!-- HANDOFF:OBJECTIVE:END -->

## Last durable progress

<!-- HANDOFF:PROGRESS:START -->
Starting from production main `fcd89bf`, all twelve Pinocchio Core chapters were rebuilt so Mimic no longer seeks and stops inside a shared master. The same one-take ElevenLabs performance now produces 360 independent, sample-accurate Mimic MP3s with short edge fades and natural file EOF, while Watch, Guess, and Word keep the continuous chapter master. Runtime validation fails closed on stale or incomplete timelines, verifies every Mimic asset contract, and uses the independent file for both heard and muted repetitions. A deterministic release receipt binds the public pack, timelines, provenance, masters, assets, boundaries, and human approvals; Vercel preview validates it with Node only, while production is blocked until the receipt is PASS.
<!-- HANDOFF:PROGRESS:END -->

## Files changed or relevant

<!-- HANDOFF:FILES:START -->
- app/dev/pinocchio-chapters/lessonData.ts
- app/dev/pinocchio-chapters/types.ts
- app/dev/pinocchio-chapters/timelineValidation.ts
- app/dev/pinocchio-chapters/pinocchio-chapters.module.css
- app/dev/pinocchio-session-1/[mode]/page.tsx
- content-packs/pinocchio/v2/sessions/session-01..12/audio/core.timeline.json
- content-packs/pinocchio/v2/sessions/session-01..12/audio/provenance.json
- content-packs/pinocchio/v2/sessions/session-01..12/audio/mimic/core/*.mp3
- content-packs/pinocchio/v2/release-receipt.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/core.timeline.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/provenance.json
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/mimic/core/*.mp3
- public/prototype-audio/pinocchio-v2/release-receipt.json
- scripts/rebuild-pinocchio-v2-boundaries.mjs
- scripts/validate-pinocchio-core-chapters.mjs
- scripts/validate-pinocchio-deploy-receipt.mjs
- scripts/build-with-pinocchio-gate.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- package.json
- vercel.json
- .vercelignore
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
<!-- HANDOFF:FILES:END -->

## Validation

<!-- HANDOFF:VALIDATION:START -->
Boundary rebuild check, full ffmpeg-backed preview validation, Node-only deploy-receipt validation, TypeScript, whitespace checks, and a 53-route Next production preview build pass. The validators confirm 12 chapters, 192 Watch lines, 360 independent Mimic assets, 120 Guess items, 120 Word items, 25,942,390 Mimic audio bytes, exact canonical/public parity, 320 automatically safe boundaries, and 28 coarticulated boundaries requiring human listening. Chapter 1 Mimic 01 ends at its natural 1.208-second EOF; the next speech starts outside that file. Strict production validation and `VERCEL_ENV=production npm run build` intentionally fail before Next because the release receipt is BLOCKED. Receipt payload SHA-256: `8c6a9f00acbb0ef42aec66648822cc30b35f6d76d3c89df11f30d8ad37f516c4`.
<!-- HANDOFF:VALIDATION:END -->

## Open decisions / risks

<!-- HANDOFF:RISKS:START -->
Production remains deliberately blocked: 28 boundaries with no measurable quiet gap need a bound human-listen approval, and all twelve chapters need a bound full-master listen-through with `qaStatus: human-listen-pass`. Independent files eliminate adjacent-item leakage, but a person must still confirm that neither side loses a phoneme at each coarticulated cut. No production deployment has been made from this branch. Foundation/Studio media remains pending, Lily expires on 2026-12-31, and Korean-market rights confirmation remains separate.
<!-- HANDOFF:RISKS:END -->

## Next action

<!-- HANDOFF:NEXT_ACTION:START -->
Review and bind approvals for the 28 flagged boundaries, listen through all twelve masters, regenerate a PASS receipt, rerun strict production validation, then request explicit production deployment approval.
<!-- HANDOFF:NEXT_ACTION:END -->
