# Pinocchio twelve-session course v2

This is the corrected course pack: the complete original 36-chapter story is
reframed as twelve sixty-minute lessons. Original Chapters 1–12 are no longer
mistaken for the whole course.

## Learner experience

Each learner selects Foundation, Core, or Studio and completes one sixty-minute
sequence:

- Watch — 10 minutes: predict, listen once without captions, answer for gist,
  then listen again with captions;
- Mimic — 25 minutes: sixteen lines using listen, chunk, record, compare, and
  retry;
- Guess — 10 minutes: eight retrieval questions from the same master;
- Word — 15 minutes: eight sentence rebuilds, read-aloud, and a final retell.

The three levels are alternatives. They must never be added together to claim
three times the lesson duration.

## Package status

The text curriculum is ready. Every session includes complete leveled scripts,
learning prompts, retell prompts, eight story beats, narration direction, and
an art brief. New session artwork and ElevenLabs masters are intentionally
pending until the text receives product approval.

Run:

`node scripts/build-pinocchio-12-session-pack.mjs`

`node scripts/validate-pinocchio-12-session-pack.mjs`

The compiled contract is `manifest.json`; individual lesson contracts are in
`sessions/session-XX/pack.json`.

Narration estimate only:

`node scripts/generate-pinocchio-content-pack-audio.mjs --mode=estimate --version=v2`

The current text requires 36 continuous masters and approximately 46,000
ElevenLabs characters including performance tags. Do not generate them before
the text and durable narrator are approved.
