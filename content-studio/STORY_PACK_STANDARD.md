# Story Pack Standard v1

## The asset unit

A Story Pack is the smallest company asset that another operator can discover,
reproduce, review, release, measure, and revise. A final MP3 or JSON file alone
is not a Story Pack.

One Story Pack may be:

- `longform` — one story across a full twelve-class season;
- `serial` — one medium story across several classes inside a season;
- `anthology` — several short stories bundled into one season.

The user always receives a coherent Monthly Pack. Story length is never padded
to satisfy an arbitrary ninety-minute target.

For a longform Story Pack, each language level also produces one continuous
student-facing audiobook master and one canonical transcript covering the
entire season. A provider's request ceiling may require coherent Chapter or act
requests; the final asset is still one master, and sentence-by-sentence TTS is
never an acceptable substitute.

## Required architecture

```text
story-pack/
├── README.md
├── manifest.json
├── rights.json
├── story-bible.md
├── season-map.json
├── chapters/chapter-XX/
│   ├── chapter.json
│   └── levels/core/
│       ├── master.txt
│       ├── activities.json
│       ├── production.json
│       └── qa.json
└── QA.md
```

Foundation and Studio use the same level directory contract when their status
advances beyond `planned`. When a level has a different sentence count from the
canonical level, its `chapter.json` level entry supplies eight `beatRanges`;
conceptual beat titles and outcomes remain shared.

## Narrative and curriculum are different layers

The full Watch master is the source content. Mimic, Guess, and Word are a
selected curriculum derived from it.

- Watch target: naturally six to ten minutes per chapter when the story has the
  capacity; the pack records its own justified target.
- Mimic: thirty high-value, unique source sentences selected from the master.
  Each remains one learner-facing item; a long sentence carries nested practice
  chunks divided at natural thought and breath boundaries.
- Guess: ten retrieval or inference items grounded in the master.
- Word: ten exact master sentences rebuilt and spoken.
- Watch and Mimic use one editorial chapter master. Sentence audio is aligned
  from the master, never generated as thirty unrelated TTS calls.
- Every sentence, Mimic item, and nested practice chunk records integer
  millisecond speech bounds. Chunks retain their source sentence ID and exact character range,
  so the learner hears the original continuous performance without timing drift.
- Exact ranges prove technical correctness, not speakability. A separate
  learning-editor review must reject splits between a determiner and noun,
  subject and predicate, preposition and object, auxiliary and main verb, or any
  other boundary that a human narrator would not naturally breathe at.
- Transcript lock comes before paid narration. Any text change invalidates the
  affected narration request, alignment, checksums, and downstream full-story
  master until they are regenerated from the revised canonical text.

For an eight-minute v3 chapter that exceeds a provider request limit, preserve
one editorial master while generating in the fewest coherent acts or through a
long-form tool. Record every seam and require a human continuity listen-through.

## Difficulty variants

Foundation, Core, and Studio preserve the same plot beats and outcomes but use
different language. They are alternatives, not cumulative class time.

- Foundation — concrete, high-frequency, speakable, slower delivery
- Core — natural cause/reaction language and everyday narrative rhythm
- Studio — richer description, voice, tension, and complex connections

Visual beats and canon are reused; scripts, narration, and selected activities
are versioned by level.

### Mimic activity contract (`activities.json` 1.1)

```json
{
  "id": "M01",
  "sourceSentenceId": "S014",
  "text": "The complete selected source sentence stays here.",
  "sourceTextRange": [0, 49],
  "chunks": [
    {
      "chunkId": "M01-C01",
      "text": "The complete selected source sentence",
      "sourceTextRange": [0, 37],
      "part": 1,
      "parts": 2
    },
    {
      "chunkId": "M01-C02",
      "text": "stays here.",
      "sourceTextRange": [38, 49],
      "part": 2,
      "parts": 2
    }
  ]
}
```

The example is structural, not production copy. A Chapter contains thirty
unique source sentences. Nested chunks are the playback/practice cuts and do
not inflate that count.

Timelines expose two bounds: `speechStartMs/speechEndMs` are the exact aligned
spoken characters; `startMs/endMs` may add a small playback handle so consonants
are not clipped. Scoring and text highlighting use the speech bounds. Listening
controls may use the padded playback bounds.

## Lifecycle

`draft → editorial-lock → narrated → aligned → approved → staged → published → archived`

- `editorial-lock` requires independent narrative and learning-activity review;
  automated exact-range checks alone cannot authorize paid generation.
- `approved` requires rights, editorial, learning, media, and technical QA.
- `published` requires a named human approval record and deploy evidence.
- Published files are immutable. Corrections create a new pack version.

## Work contract

Every task states:

- pack, version, chapter, level, and deliverable;
- canonical inputs and files allowed to change;
- expected output path and schema;
- measurable acceptance checks;
- reviewer and unresolved risks;
- validation evidence and next action.

## QA gates

### Rights

Record the original work, edition or translation, territory, rights basis,
evidence URL/file, license conditions, and review status separately for text,
art, audio, music, fonts, and film.

### Editorial and learning

Verify canon continuity, level fit, natural duration, exact activity sourcing,
answer correctness, safe treatment, and consistency with adjacent chapters.

### Media

Record provider, model, voice ID/name, settings, direction, generation date,
commercial-plan status, request or job IDs, files, checksums, cost, seams, and
human listening approval.

### Product and release

Validate schemas, required files, asset availability, login, progress,
responsive UI, audio playback, rollback, release version, and analytics tags.

## Golden Sample rule

The first approved chapter of a new format becomes the Golden Sample. Batch
production begins only after its narrative, voice, pacing, activities, visual
beats, QA, and cost envelope are accepted.
