# Shared GPT ↔ Cursor Continuity

This repository uses `docs/ai-handoff/` as the canonical, shared working
context. It is designed so GPT/Codex and Cursor can stop and resume the same
task without relying on their private chat histories.

## Required workflow for every agent

1. Before proposing or changing anything, read
   `docs/ai-handoff/PROJECT_CONTEXT.md`, `docs/ai-handoff/STATE.md`, and the
   most recent entries in `docs/ai-handoff/CONVERSATION.md`.
2. Treat `STATE.md` as the current source of truth for the active objective,
   constraints, changed files, validation, and the next action. Inspect the
   repository if it conflicts with the state document, then correct the state.
3. Record a concise entry for each meaningful user request, decision, and
   result in `CONVERSATION.md`. Do not record secrets, tokens, or private data.
4. Before ending a turn, switching tools, or after any substantial change,
   update `STATE.md` with a resumable checkpoint. Prefer
   `node scripts/ai-handoff.mjs checkpoint ...` or `handoff ...` so the
   document stays structured.
5. If the user asks to continue work begun by another agent, do not restart
   discovery or ask for context already recorded here. Execute the `Next
   action` in `STATE.md`, then refresh the checkpoint.

## Context quality bar

- State facts, not vague progress updates: include exact file paths, commands
  run, outcomes, blockers, and the very next action.
- Keep `STATE.md` short and current. Put chronology and rationale in
  `CONVERSATION.md`.
- The repository is the bridge, not a private chat history. Never assume the
  other agent has seen anything that is not written here or committed to git.

Read `docs/ai-handoff/README.md` for commands and the copy-paste bootstrap
prompt for a GPT chat that is not already attached to this workspace.

## Content Studio work

Before creating or changing any movie, story, script, narration, activity,
image, or release pack, read `content-studio/START_HERE.md` and follow
`content-studio/STORY_PACK_STANDARD.md`. The repository—not Slack, chat
history, or one person's memory—is the source of truth for content decisions.

Never publish a content pack without its rights record, versioned manifest,
automated validation, and an explicit human approval record. Preserve released
versions; create a new version instead of silently overwriting one.
