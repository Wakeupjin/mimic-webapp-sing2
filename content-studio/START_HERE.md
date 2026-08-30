# Mimic Content Studio — Start Here

Mimic is an AI-native content company that releases one monthly English
playground: a licensed film world and an owned story season, both played through
Watch → Mimic → Guess → Word.

This directory is the operating front door for every AI agent, employee,
contractor, and reviewer. Do not start content work from a private chat or a
loose media file.

## Start a task

1. Read `OPERATING_MODEL.md` for the company and product model.
2. Read `STORY_PACK_STANDARD.md` for the content contract and release gates.
3. Open `registry.json` and select the exact pack and version.
4. Read that pack's `README.md`, `manifest.json`, rights record, Story Bible,
   season map, and latest QA report.
5. Write the task as `pack / version / chapter / level / deliverable` with
   explicit inputs, outputs, and acceptance checks.
6. Change only the declared files. Run the pack validator and record evidence.
7. A human editor must approve `published`; an AI agent cannot self-publish.

## Current Golden Pack

`pinocchio-story-v3` is the first company-standard Story Pack. Its Chapter 1
Core master is the Golden Chapter used to teach future workers what “ready”
means. Production v2 remains live while v3 is authored and reviewed.

## Definition of done

A deliverable is not done because text, audio, or art exists. It is done when:

- the source and rights basis are recorded;
- the canonical input and generated output are versioned;
- every derived activity points back to the full master narrative;
- automated checks pass;
- media provenance and cost are recorded when media exists;
- the latest QA report identifies the human approver or says approval pending;
- a new operator can reproduce or revise the result without asking its creator.

## Key files

- `OPERATING_MODEL.md` — company model, roadmap, ownership, and metrics
- `STORY_PACK_STANDARD.md` — reusable content architecture and workflow
- `registry.json` — all Story Packs and release status
- `schemas/story-pack-manifest.schema.json` — machine-readable manifest contract
- `../docs/ai-handoff/` — current cross-agent task checkpoint
