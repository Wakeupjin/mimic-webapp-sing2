# Content QA gate

A chapter is `content-ready` only when all checks below pass.

## Story fidelity

- Every major event and consequence in the source chapter appears in all three
  levels.
- Simplification does not reverse motivation, responsibility, or sequence.
- Foundation uses concrete clauses and generally 6–11 words per line.
- Core uses connected sentences and generally 10–18 words per line.
- Studio keeps the narrator's wit, suspense, and moral tension without copying
  long passages unnecessarily.

## Learning design

- Full listening and Mimic use the exact same ordered lines.
- Guess choices come only from the current chapter and have one exact answer.
- Word activities use complete, speakable sentences rather than isolated
  vocabulary lists.
- Each chapter ends with a retell prompt tied to cause and consequence.

## Living Storybook

- Six story beats cover the full chapter without requiring a new image for
  every sentence.
- One coherent stage represents the chapter; recurring characters are not
  duplicated to fake a timeline inside one image.
- Camera focus changes are motivated by the active character or object.
- Artwork is original, 16:9, readable behind controls, and contains no text.
- Character design matches `style-guide.json` and does not resemble Disney's
  Pinocchio adaptation.

## Narration

- One continuous master is generated per level and chapter segment.
- Sentence timestamps are derived from that master, never from independent
  sentence generations.
- No clipped initial consonants or final syllables; use the project's book
  preroll/postroll policy.
- Commercial masters are generated only during a paid ElevenLabs subscription.
- Voice, model, seed, request IDs, generation date, and QA reviewer are stored.

## Release decision

- `content-ready-audio-pending` means scripts, activities, story beats, and art
  pass this gate, but no commercial narration master is attached yet.
- `production-ready` may be assigned only after all 36 masters (12 chapters ×
  3 levels) and their same-take timelines pass a complete listen-through.
