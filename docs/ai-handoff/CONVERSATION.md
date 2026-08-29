# Shared conversation & decision log

This is an append-only handoff record. Add meaningful user requests, decisions,
implementation results, test outcomes, and blockers. Keep personal data and
secrets out of this file.

---

## 2026-08-26 — user / request

Build a harness where GPT and Cursor use the same shared document and can
continue each other's work when one is rate-limited or stopped.

## 2026-08-26 — GPT / design decision

Use this repository as the canonical bridge: `STATE.md` holds the live,
resumable snapshot and this file holds the chronological decision trail. Add
instructions for Codex/GPT and Cursor plus a small dependency-free checkpoint
CLI. Native chat histories remain private to each product, so they are not
treated as shared context.

## 2026-08-26 20:15:16 — gpt / checkpoint

Implemented the repository-backed shared context harness.

**Next action:** Cursor should read STATE.md and issue a checkpoint before beginning its next task.

**Validation:** node --check scripts/ai-handoff.mjs; node scripts/ai-handoff.mjs status

**Files:**
- AGENTS.md
- .cursor/rules/ai-handoff.mdc
- docs/ai-handoff/README.md
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
- scripts/ai-handoff.mjs

**Open risks:** A standalone GPT chat must be given workspace access or these documents as attachments.

## 2026-08-26 20:15:16 — gpt → cursor / handoff

The harness is complete and its checkpoint and handoff commands have been exercised.

**Next action:** Read STATE.md, then use this harness for the next user request.

**Validation:** checkpoint and handoff both updated STATE.md and CONVERSATION.md successfully.

## 2026-08-26 20:15:16 — cursor → gpt / handoff

Round-trip handoff test passed; the shared repository documents remain the canonical cross-agent context.

**Next action:** Use node scripts/ai-handoff.mjs begin before the next unrelated task.

**Validation:** node --check succeeded; status, checkpoint, and two-direction handoff ran successfully.

## 2026-08-26 20:15:16 — gpt / completed

Built and verified the GPT ↔ Cursor shared-context harness.

**Validation:** node --check scripts/ai-handoff.mjs; status, checkpoint, GPT→Cursor, Cursor→GPT, and done commands all completed.
## 2026-08-26 20:16:07 — gpt / work started

Objective: Create a repository-backed harness so GPT/Codex and Cursor share the same working context and can resume each other's task after a rate limit or handoff.

## 2026-08-26 20:16:07 — gpt / checkpoint

Built the shared state, conversation log, agent rules, and CLI harness.

**Next action:** For the next task, start with npm run handoff -- status and then claim it with begin.

**Validation:** node --check scripts/ai-handoff.mjs; npm run handoff -- begin; checkpoint; handoff; done; status

**Files:**
- AGENTS.md
- .cursor/rules/ai-handoff.mdc
- docs/ai-handoff/README.md
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
- scripts/ai-handoff.mjs
- package.json

**Open risks:** A standalone GPT chat must be given workspace access or these documents as attachments.

## 2026-08-26 20:16:07 — gpt → cursor / handoff

GPT-to-Cursor handoff test passed using the repository documents.

**Next action:** Cursor should run npm run handoff -- status, then follow STATE.md.

## 2026-08-26 20:16:07 — cursor → gpt / handoff

Cursor-to-GPT return handoff test passed; both agents have the same durable context.

**Next action:** Mark the setup complete after confirming the current shared state.

## 2026-08-26 20:16:08 — gpt / completed

Built and verified the GPT ↔ Cursor shared-context harness.

**Validation:** node --check passed; the npm wrapper and begin, checkpoint, bidirectional handoff, done, and status commands all completed.

## 2026-08-26 20:16:36 — gpt / validation

Verified the CLI syntax and log-entry separation after the final formatting fix.


## 2026-08-26 20:16:50 — gpt / completed

Built and verified the GPT ↔ Cursor shared-context harness, including structured state, conversation logging, automatic agent rules, and the CLI wrapper.

**Validation:** node --check scripts/ai-handoff.mjs; npm handoff begin, checkpoint, GPT→Cursor, Cursor→GPT, done, status, and log commands all completed.


## 2026-08-26 22:17:25 — gpt / work started

Objective: Assess whether Mimic can credibly be positioned as an AI-native company based on the repository


## 2026-08-26 22:17:25 — user / request

Asked which concrete part of the actual Mimic project makes it an AI company, after requesting repository analysis.


## 2026-08-26 22:17:25 — gpt / decision

Repository review found a deterministic movie-learning product with progress and evaluation data collection, but no production AI runtime. Recommend positioning the future AI core as a content-to-curriculum engine plus an adaptive speaking coach; until implemented, describe Mimic as AI-ready rather than AI-native.


## 2026-08-26 22:17:25 — gpt / completed

Reviewed product docs, dependencies, curriculum generation, mimicking feedback, and evaluation logging; identified the credible AI-native wedge and current implementation gap.

**Validation:** Read-only repository inspection with rg and targeted source review; no product code changed.


## 2026-08-26 22:35:08 — gpt / work started

Objective: Define Mimic's AI-native company thesis and Kangjin's founder positioning


## 2026-08-26 22:35:08 — user / request

Decided to make Mimic an AI-native company and position himself as its founder.


## 2026-08-26 22:35:08 — gpt / completed

Defined Mimic as an AI-native speaking company whose core loop turns stories into adaptive practice and uses learner speech to personalize the next lesson; positioned Kangjin as founder.

**Validation:** Strategy and positioning decision only; no product code changed.


## 2026-08-26 22:37:58 — gpt / work started

Objective: Translate the AI-native thesis into Mimic's concrete product loop and founder execution plan


## 2026-08-26 22:37:58 — gpt / decision

Make AI Mimic Coach the first AI-native wedge: record the learner's final imitation, score transcript and delivery against the scene, return one actionable correction, and use accumulated performance to select repeats and future practice. Reuse the existing evaluation JSONB and event logging as the learner-model foundation.


## 2026-08-26 22:37:58 — gpt / completed

Mapped the AI-native strategy onto the existing Mimicking and learning_evaluations architecture and defined the founder's immediate product and pilot priorities.

**Validation:** Read-only review of current recording support, evaluation schema, and learning-event logging; no product code changed.


## 2026-08-26 22:41:13 — gpt / work started

Objective: Choose whether Mimic should split academy and personal products and define the first AI-native build


## 2026-08-26 22:41:13 — user / request

Asked what to do first and whether the existing academy classroom product should run in parallel with a separate personal version.


## 2026-08-26 22:41:13 — gpt / decision

Do not create a separate personal product yet. Keep one codebase, content catalog, auth system, and progress model. Preserve academy-led classroom flow and add a student-only AI Coach checkpoint inside Mimicking. Validate one end-to-end vertical slice on Lesson 1 with 10 sentences and a 10-student academy pilot before considering a standalone B2C surface.


## 2026-08-26 22:41:13 — gpt / completed

Recommended a single shared product foundation: academy as distribution and classroom experience, student AI Coach as personalized after-class loop. Defined a narrow Lesson 1 recording-feedback pilot as the first build.

**Validation:** Checked existing academy/student roles, progress gating, learning sessions, and evaluation storage; no product code changed.


## 2026-08-26 22:44:32 — gpt / work started

Objective: Implement the first student-only AI Mimic Coach vertical slice in Sing 2 Lesson 1


## 2026-08-26 22:50:55 — user / request

Approved implementation of the first AI-native Mimic Coach vertical slice.


## 2026-08-26 22:50:55 — gpt / work

Implemented a student-only AI Coach for Sing 2 Lesson 1 lines 1-10: browser microphone recording, authenticated server route, OpenAI transcription, structured coaching feedback, transcript and pace scoring, retry/continue UI, evaluation persistence, and fallback to existing self-assessment. Academy flow is unchanged and Mimic does not persist raw audio.


## 2026-08-26 22:50:55 — gpt / checkpoint

AI Mimic Coach vertical slice is implemented and production-build clean.

**Next action:** Configure OPENAI_API_KEY, then test microphone recording end-to-end with a student account on Sing 2 Lesson 1 lines 1-10.

**Validation:** npx tsc --noEmit passed; git diff --check passed; npm run build passed outside the sandbox. Live model call not run because OPENAI_API_KEY is not configured.

**Files:**
- app/api/ai-coach/route.ts, app/components/AiCoachPanel.tsx, app/types/aiCoach.ts, app/sing2/mimicking/page.tsx, docs/ai-coach.md

**Open risks:** Student audio is sent to the configured model provider for analysis; pilot consent and a live mobile-browser microphone test are still required.


## 2026-08-26 22:54:58 — user / request

Plans to test AI Coach with a specific existing account converted to student and requested a plain-language explanation of OPENAI_API_KEY setup. Account identifier intentionally omitted from this log.


## 2026-08-26 22:54:58 — gpt / checkpoint

Explained that the existing test account must be changed from academy to student and that OPENAI_API_KEY is a private server credential for paid API calls, separate from a ChatGPT subscription.

**Next action:** User creates a standard OpenAI API key, adds it locally without sharing it, changes the chosen Supabase profile role to student, then asks GPT to run the end-to-end test.

**Validation:** Official OpenAI documentation confirms standard API keys should be stored server-side in environment variables and never exposed in browser code.

**Files:**
- app/api/ai-coach/route.ts, app/components/AiCoachPanel.tsx, app/types/aiCoach.ts, app/sing2/mimicking/page.tsx, docs/ai-coach.md

**Open risks:** Never paste the API key into chat or commit it. The selected account role cannot be verified or changed from the local app because client updates to role are intentionally revoked.


## 2026-08-26 22:57:55 — codex / work started

Objective: Create durable cross-prompt project context and preserve the pending mobile portrait Mimicking work


## 2026-08-26 22:57:55 — user / request

Asked to summarize the project so other prompts can automatically continue with the same context.


## 2026-08-26 22:57:55 — codex / decision

Use repository AGENTS.md plus PROJECT_CONTEXT.md, STATE.md, and CONVERSATION.md as the durable bridge; keep long-lived product rules separate from the live checkpoint.


## 2026-08-26 22:57:56 — codex → next-agent / handoff

Refreshed the handoff system with durable product, design, media-timing, Supabase, responsive, and delivery rules. Production includes PR #17; the mobile portrait Mimicking layout remains local, build-verified, and undeployed.

**Next action:** Preserve unrelated dirty and AI Coach files. When the user continues the mobile task, review only the five intended Mimicking layout files, create a separate codex branch, build, preview on an authenticated phone-sized session, and deploy only on explicit request.

**Validation:** npm run build passed for the pending mobile layout; node --check scripts/ai-handoff.mjs pending final verification

**Files:**
- AGENTS.md
- docs/ai-handoff/PROJECT_CONTEXT.md
- docs/ai-handoff/README.md
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md
- scripts/ai-handoff.mjs
- package.json

**Open risks:** Mobile portrait layout has not been visually verified in an authenticated local session and is not deployed. Unrelated untracked AI Coach work must remain untouched.


## 2026-08-26 22:59:44 — gpt / work

Changed the user-designated existing Supabase profile from academy to student and verified one matching row now has the student role. Account identifier intentionally omitted from this log. OpenAI Platform remains blocked at login; no API key has been created.


## 2026-08-26 22:59:44 — gpt / checkpoint

Student test account role is now configured and verified in Supabase. OpenAI API setup is paused at the Platform login screen.

**Next action:** User signs in to OpenAI Platform in the open in-app browser tab; GPT then creates a project API key, saves it to .env.local without exposing it, and runs the live AI Coach test.

**Validation:** Supabase SQL result returned exactly one row with role student. OpenAI tab remains at /login?next=/api-keys.

**Files:**
- app/api/ai-coach/route.ts, app/components/AiCoachPanel.tsx, app/types/aiCoach.ts, app/sing2/mimicking/page.tsx, docs/ai-coach.md

**Open risks:** API key creation is pending user authentication. Never record the account email or API key in shared handoff documents.


## 2026-08-26 23:01:13 — codex / decision

Added durable PROJECT_CONTEXT.md and integrated both active workstreams without overwriting the live AI Coach checkpoint: mobile portrait Mimicking remains local and undeployed; AI Coach is build-verified with student role configured and awaits secure API key setup plus mobile microphone testing.

## 2026-08-28 23:00:44 — codex / work started

Objective: Align logged-out landing conversion with signup, add a public Sing 2 clip preview, and eliminate protected-route loading dead ends


## 2026-08-28 23:00:44 — user / request

Implement the agreed signup-first landing conversion: account-creation CTA, public short Sing 2 preview, original next-path preservation, and immediate signup redirects without opening guest learning.

## 2026-08-28 23:05:45 — codex / checkpoint

Implemented signup-first landing conversion: account-creation hero CTA with immediate pending state, a public 12-second Sing 2 LISTEN to SAY IT BACK preview, safe next-path preservation through signup/login, and shared auth gates for movie, book, and placement routes.

**Next action:** User reviews the isolated codex/signup-preview branch; only push, open a PR, or deploy after explicit approval.

**Validation:** TypeScript passed; production build passed with 25 routes; browser verified muted preview autoplay and controls, exact signup next paths, 46 ms direct protected-route redirect, and no horizontal overflow at a calibrated 389/390 CSS-pixel mobile viewport.

**Files:**
- app/dev/brand-preview/page.tsx
- app/dev/brand-preview/brand-preview.module.css
- app/components/Sing2Preview.tsx
- app/components/AuthGate.tsx
- app/components/AuthGate.module.css
- app/lib/authRedirect.ts
- app/auth/login/page.tsx
- app/auth/signup/page.tsx
- app/sing2/layout.tsx
- app/book/layout.tsx
- app/placement/layout.tsx

**Open risks:** Sing 2 rights/provenance remains unverified in the repository; this change reuses only the already deployed Bunny CDN asset and adds no new media. Work is local and not deployed.


## 2026-08-28 23:05:45 — codex / completed

Signup-first landing conversion and public Sing 2 product preview are implemented and browser-verified on an isolated branch; guest learning remains blocked and protected routes preserve their destination through signup.

**Validation:** TypeScript and production build passed; desktop and 390-width browser checks passed; movie, book, placement, and direct learning URLs all reached signup with the correct encoded next path.

## 2026-08-28 23:12:58 — codex / completed

Signup-first landing conversion and public Sing 2 product preview are implemented on top of the latest production copy; guest learning remains blocked and protected routes preserve their destination through signup.

**Validation:** After rebasing onto main/PR #29, TypeScript and production build passed; 389/390-width browser check had no overflow; preview played with mute/pause controls; direct movie URL reached signup with the exact next path in 71 ms.

## 2026-08-29 00:00:48 — codex / work started

Objective: Move the Sing 2 preview into the hero and simplify the monthly section into a clear movie-to-book path


## 2026-08-29 00:00:48 — user / request

Replace the crowded three-column monthly layout by moving the public preview under the hero CTA and showing a cleaner Sing 2 to Pinocchio course path at the existing local preview URL.

## 2026-08-29 00:13:42 — codex / checkpoint

Moved the public Sing 2 preview into the hero conversion area and simplified the monthly story into a clean two-course movie-to-book path.

**Next action:** Keep the refreshed local preview running on port 3004 for user review.

**Validation:** Next production build passes; desktop and 389 CSS px browser QA show no horizontal overflow; EN CTA wraps fully; CTA opens signup with next=/placement; browser console has no errors or warnings.

**Files:**
- app/components/Sing2Preview.tsx, app/dev/brand-preview/page.tsx, app/dev/brand-preview/brand-preview.module.css

**Open risks:** Logo still uses the pre-existing cursive fallback because Jolly Lodger is not loaded; not changed in this redesign.


## 2026-08-29 00:13:49 — codex / completed

Hero-led Sing 2 preview and simplified Sing 2-to-Pinocchio monthly layout are complete and available at http://127.0.0.1:3004/.

**Validation:** Production build passed; 1422px desktop and 389px mobile verified; body width matches viewport; EN CTA is not truncated; signup navigation is correct; no console errors or warnings.

## 2026-08-29 10:30:36 — codex / work started

Objective: Allow movie learning in mobile portrait and standardize control layout across Watch, Mimic, Guess, and Word without changing the existing MimiC visual language


## 2026-08-29 10:48:58 — user / request

Allow Sing 2 learning in mobile portrait and remove irregular control sizing, ordering, spacing, and completion actions across Watch, Mimic, Guess, and Word while preserving the established MimiC design.


## 2026-08-29 10:48:58 — codex / checkpoint

Removed the movie-only portrait rotation gate; normalized the four movie modes around one 16:9 portrait stage; standardized top actions, start overlays, Again/Next completion actions, and portrait control docks; kept book-specific portrait media behavior separate; added a development layout fixture for responsive QA.

**Next action:** Commit the isolated branch and wait for explicit approval before preview or production deployment.

**Validation:** TypeScript passed; Next.js production build passed; browser QA covered 320x568 and 390x844 phone portrait, phone landscape, 820x1180 pad portrait, pad landscape, and desktop across Watch/Mimic/Guess/Word with no document overflow or clipped controls.

**Files:**
- app/layout.tsx, app/components/RotateGate.tsx, app/components/LessonShell.tsx, app/components/ClickToStartOverlay.tsx, app/components/LessonCompletionActions.tsx, app/globals.css, app/sing2/watching/page.tsx, app/sing2/mimicking/page.tsx, app/sing2/guessing/page.tsx, app/sing2/word/page.tsx, app/dev/layout-lab/page.tsx, docs/ai-handoff/PROJECT_CONTEXT.md

**Open risks:** Authenticated production media flows were not exercised on this clean local origin; the responsive fixture mirrors production class structures, while event-handler behavior remains unchanged except removal of RotateGate.


## 2026-08-29 10:48:58 — codex / completed

Movie learning now works in portrait with consistent stage ratios and control hierarchy across all four modes; book portrait behavior remains intentionally distinct where its static cover benefits from it.

**Validation:** TypeScript and Next.js production build passed; responsive browser checks found no horizontal or vertical document overflow at tested phone, tablet, landscape, and desktop sizes.

## 2026-08-29 11:02:34 — codex / work started

Objective: Deploy the verified movie portrait controls to production through the existing GitHub and Vercel pipeline


## 2026-08-29 11:02:34 — user / request

Deploy the verified mobile portrait and standardized movie controls change to production.


## 2026-08-29 11:02:35 — codex / checkpoint

Deployment branch is clean, build-verified, and exactly one commit ahead of current origin/main with no divergence. Push was not executed because the host requires explicit approval to send the private source branch to the configured GitHub remote.

**Next action:** After explicit user approval, commit this handoff checkpoint, push codex/movie-portrait-controls to https://github.com/Wakeupjin/mimic-webapp-sing2.git, create and merge the PR, then verify the production Vercel URL.

**Validation:** origin/main fetched successfully; branch divergence is 0 behind and 1 ahead; working tree was clean before the deployment handoff update; production build already passed.

**Files:**
- docs/ai-handoff/CONVERSATION.md, docs/ai-handoff/STATE.md

**Open risks:** GitHub push requires explicit user authorization for source-code egress to the configured remote. Vercel MCP tools are not available in this session, so deployment status must be verified through the existing GitHub integration and the public production URL.

## 2026-08-29 12:10:56 — codex / work started

Objective: Replace Mimic Check memory prompt with same-segment muted scene replay while never exposing the English sentence


## 2026-08-29 12:11:02 — user / request

Implement Mimic Check as sentence-hidden same-scene muted replay, with sound replay available only when needed.

## 2026-08-29 12:18:34 — codex / checkpoint

Mimic Check now replays the exact target video segment muted on entry and again when recording starts; optional sound replay is available, while target and transcript text remain hidden for Mimic tasks.

**Next action:** Keep the branch local for user review; push or deploy only after explicit approval.

**Validation:** TypeScript and production build passed. Browser fixture confirmed muted autoplay, exact segment stop/reset, optional sound replay, no target sentence in DOM, and no horizontal overflow on phone, pad, or desktop.

**Files:**
- app/components/AiCoachPanel.tsx, app/placement/page.tsx, docs/ai-handoff/PROJECT_CONTEXT.md

**Open risks:** A real microphone permission and AI response run still requires an authenticated user and was not triggered during automated browser QA.


## 2026-08-29 12:18:34 — codex / completed

Mimic Check is now scene-led rather than memory-led: the learner receives the same clip muted, can replay sound only when needed, and never sees the target English sentence or Mimic transcript.

**Validation:** Production build passed; responsive browser QA passed; muted and sound replay behaviors were verified against the real Sing 2 media segment.

## 2026-08-29 12:20:59 — codex / work started

Objective: Diagnose and fix the placement 55-second scene failing to start on iPad after grade selection


## 2026-08-29 12:20:59 — user / request

On iPad, the 55-second placement scene does not appear or play regardless of which grade band is selected; diagnose and fix it.


## 2026-08-29 12:35:26 — codex / checkpoint

Fixed placement playback gating for iPad-class devices: preload waiting events no longer lock the start button, the 55-second scene uses an MP4 media fragment, a poster remains visible while seeking, and explicit loading/retry/timeout states replace the blank stall.

**Next action:** Keep the combined Mimic Check and iPad playback fixes local until the user explicitly requests preview or production deployment.

**Validation:** TypeScript and production build passed. In a 1024x1366 browser viewport, every grade selection reached an enabled 55-second start action; tapping it played the real Bunny CDN media at 288.5 seconds with no media error or horizontal overflow.

**Files:**
- app/placement/page.tsx

**Open risks:** The automated browser is not Mobile Safari, so one real iPad Safari smoke test remains after deployment. The source is a 950 MB full-movie MP4; a dedicated 55-second CDN clip would be the strongest long-term latency fix.


## 2026-08-29 12:35:26 — codex / completed

Placement no longer mistakes iPad preload delay for active playback: the start action stays usable, gives visible loading/retry feedback, and seeks through a segment-specific media URL.

**Validation:** Build passed; real media playback began at the intended 288.5-second scene in iPad-sized browser QA.


## 2026-08-29 12:36:29 — codex / validation

The initial iPad-sized reproduction showed preload waiting events disabling the 55-second start action before any tap. After guarding waiting/seeking behind an active play request, the start action remained enabled and real media played from 288.5 seconds; the redundant hidden full-movie video was also removed from watch/intro states.


## 2026-08-29 12:36:29 — codex / completed

Placement playback now remains actionable during iPad preload, requests only the needed media time range, avoids a duplicate hidden movie request, and exposes poster/loading/retry/timeout feedback instead of a blank stall.

**Validation:** TypeScript and production build passed after the final duplicate-media cleanup; iPad-sized browser QA played the real segment from 288.5 seconds without a media error.

## 2026-08-29 12:37:32 — codex / work started

Objective: Render Sing 2 selecting only after profile, lesson list, and progress are all ready so the first visible state never repaints


## 2026-08-29 12:37:32 — user / request

Fix the Selecting hydration flash so its final progress, locks, and current-stage marker appear correctly on the first render without changing afterward.


## 2026-08-29 12:44:36 — Codex / checkpoint

Selecting now waits for the initial account profile, lesson list, and progress together, then commits and renders the final course state once. Token refreshes do not blank an already loaded profile.

**Next action:** Commit the verified fix locally. Push or deploy only after explicit user instruction.

**Validation:** TypeScript check and Next.js production build passed. A delayed-progress browser fixture showed only the neutral loading screen before data, followed by the correct Watch-complete and Mimic-current state without an intermediate mode DOM.

**Files:**
- app/contexts/AuthContext.tsx, app/components/AuthGate.tsx, app/sing2/selecting/page.tsx

**Open risks:** The signed-in production account still needs a smoke test after a future deployment; this change has not been deployed.


## 2026-08-29 12:44:36 — Codex / completed

Removed the Selecting progress flash by gating the first visible render on complete profile, lessons, and progress data.

**Validation:** Production build passed and delayed-data browser verification passed.
## 2026-08-29 15:34:46 — Codex / work started

Objective: Replace the decorative Story Finale with a meaning-first AI retell conversation and contextual scene hints


## 2026-08-29 15:34:47 — user / request

Replace BEGIN/MIDDLE/END and the decorative Finale with a clear interactive story conversation where component roles are obvious.


## 2026-08-29 15:34:47 — user / decision

Explicitly approved sending child recorded audio to the OpenAI API for analysis. Mimic must not persist raw audio or transcripts and must disclose the transfer before recording.


## 2026-08-29 15:34:47 — Codex / checkpoint

Built a linear meaning-first Story Finale: explicit OpenAI consent, child voice transcription and semantic AI follow-up, contextual scene hints only when needed, and completion metrics without raw audio or transcript persistence.

**Next action:** Verify final build, confirm Vercel API key availability, then deploy through a reviewed PR and smoke-test production.

**Validation:** TypeScript and production build passed before final copy refinements; browser QA passed at 1280x720, 390x844, and 320x568 for consent, prompt, response, and scene-hint states.

**Files:**
- app/sing2/retelling/StoryRetellExperience.tsx, app/sing2/retelling/page.tsx, app/api/story-conversation/route.ts, app/lib/storyConversation.ts, app/types/storyConversation.ts, app/types/storyRetell.ts

**Open risks:** Live OpenAI voice-turn smoke testing depends on OPENAI_API_KEY being configured in Vercel; automated QA did not accept microphone permission.

## 2026-08-29 17:07:29 — Codex / work started

Objective: Remove Story Finale from production and move it to the product backlog


## 2026-08-29 17:07:29 — user / request

Remove the current Story Finale from the deployed service and move the concept to the backlog.
