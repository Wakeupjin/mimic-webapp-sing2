# Pinocchio Story Pack v3

This directory is the draft, reproducible Story Pack for a twelve-class
Pinocchio Book Track. It does not replace the published v2 course.

## Product intent

- one complete Pinocchio arc across twelve Chapters;
- one selected level per learner: Foundation, Core, or Studio;
- each Chapter uses `Watch → Mimic → Guess → Word`;
- Watch is a real six-to-ten-minute narrative master;
- Mimic selects thirty unique, high-value source sentences from that master;
  each stays one learner-facing item, while long sentences contain nested
  practice chunks split only at natural thought and breath boundaries;
- Guess and Word are grounded in the same canonical master.

## Current gate

All thirty-six Chapter-level scripts are authored. Lily
(`pFZP5JQG7iQjIQuC4Bku`) is approved as the British narrator for this finite
twelve-Chapter, three-level Story Pack. Continuing paid batch narration remains
gated behind named human editorial and learning approval. A generated audio
file is not approved merely because its timestamps validate.

Lily is scheduled to retire from future generation on 2026-12-31, so all
approved masters and pickups must finish by the internal 2026-11-30 deadline.
Store the audio, sentence timeline, request evidence, settings, and checksums as
company assets. See `narrator-policy.json` for the immutable production decision.

## Validate

```bash
npm run validate:story-pack
```

The validator checks the pack structure, twelve-Chapter map, every authored
level's duration envelope, exact activity sourcing, and release-state claims.
