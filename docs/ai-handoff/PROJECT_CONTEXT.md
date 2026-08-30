# Mimic project context

This file contains durable product and engineering decisions that new Codex or
Cursor tasks should know. It is not a task log. Read `STATE.md` for the current
checkpoint and `CONVERSATION.md` for recent decisions.

## Product in one sentence

Mimic is an AI-native content company that releases a monthly English
playground: one licensed film world and one owned story season, both learned
through Watch → Mimic → Guess → Word across a twelve-class Monthly Pack.

Film creates discovery and vividness; reusable Story Packs create owned,
levelled inventory and margin. Long stories may fill a season, while medium or
short stories are assembled as serial or anthology seasons instead of being
padded to an arbitrary ninety minutes.

## Content Studio operating model

- `content-studio/START_HERE.md` is the front door for every AI agent, employee,
  contractor, and reviewer doing content work.
- `content-studio/OPERATING_MODEL.md` records the company model, ninety-day
  sequence, first hires, ownership transition, and company metrics.
- `content-studio/STORY_PACK_STANDARD.md` defines the reusable asset contract,
  lifecycle, QA gates, and Golden Sample rule.
- `content-studio/registry.json` identifies the canonical pack and version.
- Published packs are immutable; changes require a new version and named human
  approval. Private chat and final MP3 files are not sufficient company memory.

Pinocchio v2 remains the production course. Pinocchio v3 is a separate draft
Story Pack whose Core Chapter 1 is the Golden Sample: a 1,028-word canonical
Watch master estimated at 481.9 seconds at 128 wpm, with thirty exact Mimic
selections, ten Guess items, ten Word items, and eight narrative beats.

For Story Packs, `Chapter` is the product term; do not reintroduce `Session` in
new authoring or UI. The six-to-ten-minute Watch narrative and the sixty-minute
class plan are different metrics. Generate one coherent editorial narration
master (or the fewest continuity-aware acts), then align Mimic from it; never
generate thirty unrelated sentence TTS clips.

## Production and stack

- Production: https://mimic-webapp-sing2.vercel.app
- Repository: `Wakeupjin/mimic-webapp-sing2`
- App: Next.js 15, React 19, TypeScript, Tailwind/global CSS
- Accounts, profiles, roles, progress, and learning events: Supabase
- Hosting and preview deployments: Vercel through GitHub
- Never change Supabase production data, schema, RLS, or environment variables
  unless the user explicitly requests that exact change.

## Learning flows

- Movie: Selecting → Watching → Mimicking → Guessing → Word
- Book: Selecting → Listen → Mimicking → Guessing → Word
- Progress vocabulary:
  - green check: completed
  - chameleon: current step
  - gray outline: available
  - faded control: locked
- Resume should continue at the saved line, but a completed mode must reopen in
  a deliberate replay state rather than unexpectedly autoplaying its last line.
- Onboarding timing and language should feel consistent across modes.
- Mimic and Mimic Check never reveal the target English sentence. Learners
  listen first, then use the same scene without sound as the speaking cue;
  replaying the sound is an optional recovery action rather than the default.

## Product and design rules

- Visual system: black stage, `#60D96C` green accent, white primary controls,
  rounded dark panels, bold condensed display type.
- The chameleon is a functional guide or CTA, not filler decoration. On Word it
  should invite a click and react as if it receives the completed word.
- Login, account, home, selection, and every learning mode must work naturally
  in mobile portrait. Landscape/fullscreen may improve movie immersion, but it
  is a user choice rather than a hard gate. Book Mimicking keeps its portrait
  layout because it displays a static cover rather than video.
- Always check phone, tablet, laptop, and large-screen layouts. Fixed desktop
  widths must not create horizontal clipping on phones.
- In mobile portrait Mimicking, keep all eight practice steps visible and place
  the line counter separately. Across Mimic, Guess, and Word, use the same dock
  order and spacing rule: primary controls first, progress counter below.
- Do not present review output as source code or a `.canvas.tsx` file. Show the
  rendered service, a real preview URL, screenshots, or a concise written result.

## Accounts and progress

- The account menu shows name, email, and role; only the display name and
  password are user-editable. Email and role are read-only.
- Profile access is protected by Supabase RLS.
- Account/progress changes must be tested with an actual authorized account, but
  do not expose credentials or personal data in logs or handoff documents.

## Media timing rules

- `VideoPlayer` checks a segment end every 50 ms, so source boundaries should
  carry only the intended acoustic release.
- Movie Mimicking uses `MIMICKING_SEGMENT_TAIL_SECONDS = 0.15` to protect final
  syllables that extend beyond legacy subtitle boundaries.
- Book audio uses accurate word timestamps instead of the movie tail:
  - start: final aligned start minus 0.12 s preroll (protects initial consonants)
  - end: actual final spoken word plus 0.10 s postroll
- Pinocchio scene 1 currently contains 34 Mimic lines, 10 Guess questions, and
  10 Word activities. Generated assets live in
  `public/books/pinocchio/scene-1.{json,srt,m4a}`.
- The source alignment builder is
  `scripts/build-pinocchio-public-domain-scene1.mjs`.

## AI Mimic Coach work in progress

- A separate, currently untracked vertical slice adds student recording and AI
  feedback through:
  - `app/api/ai-coach/route.ts`
  - `app/components/AiCoachPanel.tsx`
  - `app/types/aiCoach.ts`
  - `app/sing2/mimicking/page.tsx`
  - `docs/ai-coach.md`
- Its author recorded passing TypeScript, diff, and production-build checks.
- A designated test profile has been changed to the student role and verified
  in Supabase. Do not record its account identifier in shared documents.
- The live model test is waiting for the user to sign in to OpenAI Platform and
  configure `OPENAI_API_KEY`. Never paste or commit the key; store it only as a
  server-side environment variable.
- The end-to-end pilot still needs explicit recording consent and a real mobile
  microphone test. Raw learner audio should not be persisted.
- Treat this as a separate workstream from responsive layout changes. Do not
  stage or deploy AI Coach files as part of a visual-only task.

## Safe delivery workflow

1. Preserve the user's unrelated dirty files; stage only files for the task.
2. Create a `codex/*` branch rather than committing directly to `main`.
3. Run `npm run build` and task-specific validation.
4. Push the branch and create a PR targeting `main`.
5. Confirm the Vercel preview/check succeeds.
6. Merge and trigger production only when the user explicitly asks to deploy.
7. Verify the production URL or deployed asset, not only the GitHub merge.

Recent relevant releases:

- PR #15: public-domain Pinocchio narration
- PR #16: precise Pinocchio alignment and SRT
- PR #17: trim all Pinocchio sentence tails to the word-aligned postroll

## Current local checkpoint (2026-08-26)

The production site includes PR #17. A mobile portrait Mimicking layout update
has been implemented locally and passes `npm run build`, but has **not** been
committed or deployed. Its intended files are:

- `app/components/LessonShell.tsx`
- `app/components/MimicLineList.tsx`
- `app/components/VideoPlayer.tsx`
- `app/globals.css`
- `app/sing2/mimicking/page.tsx`

The working tree also contains unrelated user/agent work, including responsive
audit files and the untracked AI Coach implementation described above. Do not
stage, revert, or rewrite those files unless the user explicitly makes them the
active task.
