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
advances beyond `planned`.

## Narrative and curriculum are different layers

The full Watch master is the source content. Mimic, Guess, and Word are a
selected curriculum derived from it.

- Watch target: naturally six to ten minutes per chapter when the story has the
  capacity; the pack records its own justified target.
- Mimic: thirty high-value speaking sentences selected from the exact master.
- Guess: ten retrieval or inference items grounded in the master.
- Word: ten exact master sentences rebuilt and spoken.
- Watch and Mimic use one editorial chapter master. Sentence audio is aligned
  from the master, never generated as thirty unrelated TTS calls.

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

## Lifecycle

`draft → review → approved → staged → published → archived`

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
