# Product backlog

## Story Finale / 자유 이야기 다시 말하기

- **Status:** Backlog
- **Removed from production:** 2026-08-29
- **Current production flow:** Watch/Listen → Mimic → Guess → Word

### Why it was removed

The deployed Finale did not make its learning value or component roles obvious enough. Labels such as “기억 깨우기” and BEGIN/MIDDLE/END described an internal concept rather than a task a child could understand. The later AI conversation improved the interaction model, but it had not yet earned a permanent place beside the four core modes through real learner testing.

### Re-entry criteria

1. A child can understand what to do without an adult explanation.
2. The activity has one clear role: meaning-first story conversation, not sentence reconstruction or grammar scoring.
3. Scene cues appear only when the learner is stuck and never expose a prebuilt answer path.
4. A real mobile test confirms microphone consent, response quality, latency, and failure recovery.
5. Parent-facing evidence is useful without turning the activity into another correct-answer exercise.
6. The exact placement in the core learning journey is validated before production deployment.

The previous implementation remains recoverable from repository history in PRs #33, #34, and #35.
