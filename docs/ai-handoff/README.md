# GPT ↔ Cursor continuity harness

`docs/ai-handoff/` is the shared memory for this repository. Both GPT/Codex
and Cursor must use these files; neither agent's own chat history is assumed
to be visible to the other.

## The shared documents

- `PROJECT_CONTEXT.md` — durable product, design, engineering, and deployment
  decisions. Read this first in a new task.
- `STATE.md` — compact, current handoff snapshot. Start here.
- `CONVERSATION.md` — append-only record of user requests, decisions, work,
  and results. Read the newest entries first.

The context documents are intentionally committed to git. This lets the
handoff survive a different machine or a fresh clone as long as changes are
committed and synced.

## Normal agent workflow

```bash
# 1. Inspect the last shared checkpoint
node scripts/ai-handoff.mjs status

# 2. Claim or describe the task currently being worked
node scripts/ai-handoff.mjs begin --agent cursor --task "Implement lesson search"

# 3. Record durable progress before a response or a risky operation
node scripts/ai-handoff.mjs checkpoint \
  --agent cursor \
  --summary "Added search query parsing in app/lib/search.ts" \
  --next "Run npm run build and check the empty-result state"

# 4. Explicitly hand over when changing from GPT to Cursor or the reverse
node scripts/ai-handoff.mjs handoff \
  --from gpt \
  --to cursor \
  --summary "UI is implemented; no build has been run yet" \
  --next "Run npm run build, fix any TypeScript errors, then update STATE.md"

# Record a user request, a decision, or a test result in the permanent log
node scripts/ai-handoff.mjs log \
  --actor gpt \
  --kind decision \
  --message "Use repository files—not a private chat—as the cross-agent source of truth."
```

`--agent`, `--from`, and `--to` are free text. Use `gpt`, `cursor`, or a more
specific name such as `cursor-bugfix` when that improves clarity.

The same commands are also available through `npm run handoff -- <command>`.

## Switching immediately after a rate limit

1. In the current agent, run `checkpoint` (or `handoff` if possible).
2. Open the same repository in the other tool.
3. Tell the next agent: **“Read `docs/ai-handoff/PROJECT_CONTEXT.md`, continue
   from `docs/ai-handoff/STATE.md`, and follow `AGENTS.md`.”**
4. The next agent reads state and the recent log, then runs the one recorded
   next action. No recap should be needed.

If GPT has already stopped, Cursor can still start at step 2; the last durable
checkpoint is the safe resume point.

## Bootstrap prompt for an unattached GPT chat

Paste this only when the GPT chat does not already receive repository files:

```text
I am continuing work in the repository [REPO NAME]. Read
docs/ai-handoff/PROJECT_CONTEXT.md for durable project decisions and continue
from docs/ai-handoff/STATE.md, with recent history in
docs/ai-handoff/CONVERSATION.md. Follow AGENTS.md. Do not rely on any prior
private chat context. Before replying or stopping, save a concise checkpoint
using node scripts/ai-handoff.mjs so another agent can continue without asking
me for a recap.
```

Attach the repository or these files to that GPT chat if it cannot access the
local workspace. A normal ChatGPT conversation cannot automatically read or
write files on your computer; that attachment/access is the only necessary
bridge outside a workspace-connected Codex session.

## What belongs here

Write the actual user intent, product decisions, relevant constraints, exact
file paths, commands/tests and their outcomes, blockers, and a single next
action. Do not write API keys, passwords, customer PII, access tokens, or a
verbatim dump of unrelated chat.
