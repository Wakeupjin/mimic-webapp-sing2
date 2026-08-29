# Pinocchio content pack v1

This package is the content-making handoff for Chapters 1–12 of Carlo
Collodi's *The Adventures of Pinocchio*. It is intentionally separate from
application code. The main development workstream may integrate a frozen
version, but it must not silently rewrite approved scripts or assets.

## Package contract

Each compiled chapter pack contains:

- Foundation, Core, and Studio retellings that preserve the chapter's complete
  event arc at different sentence-complexity levels;
- a single line inventory shared by full listening and sentence practice;
- derived Mimic, Guess, and Word activities;
- six timestamp-ready story beats for the Living Storybook stage;
- narration direction and generation status;
- rights and provenance metadata;
- deterministic statistics and content identifiers.

Run `node scripts/build-pinocchio-content-packs.mjs` to compile the authoring
source into `chapters/chapter-XX/pack.json` and refresh `manifest.json`.

Run `node scripts/validate-pinocchio-content-packs.mjs` for the structural and
asset gate. Run `node scripts/generate-pinocchio-content-pack-audio.mjs` first
in estimate mode to see the exact ElevenLabs character budget. Generation is
locked behind an explicit paid-plan confirmation and a durable voice ID.

## Production boundary

The scripts and storyboards are production-ready content. Narration files are
not considered production-ready until they are generated on an ElevenLabs paid
plan with a durable narrator, aligned, listened through, and recorded in each
chapter's provenance manifest. Preview audio created on the free plan must not
be promoted into commercial operation.

The current Disney Little Golden Book cover is not part of this package and
must not be used. All new artwork follows `style-guide.json`.

## Current v1 status

- 12 chapter packs, each with Foundation, Core, and Studio scripts;
- 36 continuous-master narration jobs specified but intentionally not yet run;
- 144 Guess, 144 Word, and 36 retell activities;
- 72 timestamp-ready story beats;
- one original 16:9 Living Storybook stage per chapter plus a style reference.
