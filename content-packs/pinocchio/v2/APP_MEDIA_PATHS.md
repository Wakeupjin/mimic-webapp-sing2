# Pinocchio Chapter app media slots

The learner UI calls the twelve course meetings `CHAPTER 1` through
`CHAPTER 12`. The v2 source-pack filenames keep their existing `session-XX`
identifiers so generated content and checksums do not need to be renamed.

For chapter number `XX` (`01` through `12`), the local app loads:

- art: `public/prototype-art/pinocchio-v2/session-XX.png`
- Core master: `public/prototype-audio/pinocchio-v2/session-XX/lily-british/core.master.mp3`
- Core timeline: `public/prototype-audio/pinocchio-v2/session-XX/lily-british/core.timeline.json`

Each timeline must contain `duration`, sixteen ordered `lines`, and thirty
ordered `mimicItems`. The IDs and text should match the corresponding
`sessions/session-XX/pack.json`. Until a slot is filled, the local learner flow
uses the pack text to render a story-art placeholder and an estimated timeline;
SKIP remains available for end-to-end navigation QA.
