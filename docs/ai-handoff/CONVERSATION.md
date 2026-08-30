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

## 2026-08-29 00:56:56 — codex / work started

Objective: Build an isolated local Pinocchio three-level narration prototype


## 2026-08-29 00:56:56 — user / request

Asked to test the proposed level-adaptive Pinocchio and narration concept in a local version before adding it to the product.


## 2026-08-29 00:56:56 — codex / checkpoint

Built /dev/pinocchio-levels with Foundation, Core, and Studio scripts, level comparison, full-scene sequential listening, sentence playback, speed controls, retell prompts, original CSS artwork, and 41 local TTS preview clips.

**Next action:** User reviews the local prototype at http://127.0.0.1:3004/dev/pinocchio-levels; keep it local until the curriculum and voice direction are approved.

**Validation:** TypeScript and production build passed; desktop and mobile browser checks passed; Foundation audio and sequential line advance were verified; all 41 audio files have positive duration.

**Files:**
- app/dev/pinocchio-levels, public/prototype-audio/pinocchio-levels, scripts/generate-pinocchio-level-preview-audio.mjs

**Open risks:** Narration uses the macOS Samantha system voice as a local sample, not an approved production AI voice. Production requires an approved TTS provider, sentence QA, and retained commercial voice/source terms.


## 2026-08-29 00:56:56 — codex / completed

Completed the isolated local Pinocchio three-level narration prototype without changing or deploying the production app.

**Validation:** Build, responsive layout, sentence playback, sequential playback, and audio duration checks passed.


## 2026-08-29 12:36:12 — codex / work started

Objective: Clarify level provenance and select a production-quality narration direction


## 2026-08-29 12:36:12 — user / request

Questioned where the claimed existing Mimic levels are visible and rejected the local system TTS voice as unpleasant, asking whether the narration can be made genuinely impressive.


## 2026-08-29 12:36:12 — codex / decision

Corrected the earlier characterization: Foundation/Core/Studio-ready exists only in placement result logic and the saved account label, not as an established visible curriculum taxonomy. Recommend ElevenLabs Eleven v3 for pre-generated, QA-reviewed story narration; current OpenAI and ElevenLabs API keys are both absent, so no premium audio was generated.


## 2026-08-29 12:36:12 — codex / completed

Clarified the hidden placement-only status of the level labels and identified ElevenLabs Eleven v3 as the recommended premium narration path; local prototype audio remains unchanged.

**Validation:** Confirmed exact placement and account-menu code locations, checked local API-key availability without exposing values, and reviewed current official OpenAI and ElevenLabs TTS documentation.


## 2026-08-29 12:42:31 — user / request

Authorized the premium narration trial and asked for its expected cost before proceeding.


## 2026-08-29 12:42:31 — codex / decision

Use the ElevenLabs free allowance for the audition instead of subscribing first. At the current official Eleven v3 API rate, the 2,838-character three-level script is approximately $0.28 per complete pass; three directed Core-opening samples are approximately $0.09 including audio tags.


## 2026-08-29 12:42:31 — codex / checkpoint

Prepared a local-key-safe ElevenLabs v3 generator for three Core-opening takes and optional full 41-line generation. Actual premium audio is blocked only by the absent ELEVENLABS_API_KEY.

**Next action:** User creates a free ElevenLabs API key and stores it in ignored `.env.local`; generate and audition the three takes before replacing the local system narration.

**Validation:** Generator passes Node syntax validation, reads ignored `.env.local`, and exits cleanly without making a request when the key is absent.

**Files:**
- scripts/generate-pinocchio-elevenlabs-audio.mjs
- public/prototype-audio/pinocchio-levels/SOURCE.md


## 2026-08-29 12:45:35 — user / request

Asked for a concrete, non-technical walkthrough to create and install the ElevenLabs API key.


## 2026-08-29 12:45:35 — codex / checkpoint

Created an ignored `.env.local` containing only an empty `ELEVENLABS_API_KEY=` slot and opened it in the Codex side panel. The user only needs to create a restricted ElevenLabs key with Text to Speech access, paste it locally, save, and report completion; the secret must never be sent in chat or recorded in handoff files.


## 2026-08-29 12:50:51 — user / request

Shared the ElevenLabs restricted-key creation screen and asked which endpoint permissions and limits are actually required.


## 2026-08-29 12:50:51 — codex / decision

For the local audition, use a seven-day restricted key capped at 5,000 credits with only Text to Speech Access and Voices Read. Keep every other endpoint at No Access; the cap covers the three opening samples plus one complete 41-line pass while limiting accidental usage.


## 2026-08-29 — user / clarification

Asked for the rationale behind every API-key setting rather than only a list of values.


## 2026-08-29 — codex / decision

Revised the expiry recommendation from seven days to 30 days: the key is already endpoint-restricted and capped at 5,000 credits, while a month better fits iterative local narration work. Keep Text to Speech Access for generation and Voices Read for narrator discovery; no write, cloning, dubbing, agent, media-generation, transcription, or cleanup permissions are needed.


## 2026-08-29 12:56:23 — user / issue

Reported that the previously opened `.env.local` could not be edited after creating the ElevenLabs key.


## 2026-08-29 12:56:23 — codex / fix

The original key slot was inside the isolated `/private/tmp` worktree and was not editable in the user's active project UI. Removed that empty temporary file, created the ignored editable slot at `/Users/kangjin/Desktop/kangjin/mimic/mimic-webapp-sing2/.env.local`, and updated the generator to discover and load the main checkout env file through Git. Syntax, ignore status, and safe missing-key behavior pass.


## 2026-08-29 13:00:12 — user / progress

Reported that the ElevenLabs API key had been saved locally.


## 2026-08-29 13:00:12 — codex / blocked

Verified only the secret's presence and structural properties, then attempted the authorized sample generation. The request reached ElevenLabs but returned HTTP 401 `invalid_api_key`; the value has the expected prefix and no obvious whitespace or masked-copy artifacts, so the user needs to recreate/rotate the key and copy the full one-time secret. No key value was printed or logged, no credits were consumed, and no cloud audio was generated.


## 2026-08-29 — user / diagnosis

Revealed that the copied value came from ElevenLabs' `Copy Key ID` action rather than the one-time API-secret copy action. The posted identifier is intentionally omitted from this log.


## 2026-08-29 — codex / decision

Confirmed that the newly copied hexadecimal value is a Key ID, a management identifier that cannot authenticate API calls. The earlier locally stored value had an `sk_` prefix and was different, so this Key ID does not itself explain the prior 401; the user still needs a fresh key and must copy the one-time full `sk_...` API secret locally. No secrets or identifiers should be sent in chat.


## 2026-08-29 13:50:27 — user / clarification

Asked whether spacing in the env assignment caused the earlier authentication failure.


## 2026-08-29 13:50:27 — codex / completed

Verified without exposing the secret that the current env value has no whitespace or semicolon and has the expected prefix, then retried the authorized generation successfully. Created three 18.88–19.92-second Eleven v3 Core-opening acting takes with the same George narrator for an estimated $0.0867, added a responsive audition player to the local Pinocchio page, repaired the isolated worktree's broken dependency link after restart, and restored port 3004.

**Validation:** TypeScript and diff checks pass; all three audio assets return HTTP 200 as `audio/mpeg`; the page HTML contains all three audition labels.

**Next action:** User listens to Take 01–03 and selects or critiques the acting direction before any full-scene generation.


## 2026-08-29 14:02:55 — user / request

Asked to erase the system-TTS implementation and assets completely, preserve the successful Foundation/Core/Studio UX while replacing its narration with ElevenLabs, and explore user-selectable narrator diversity including female voices.


## 2026-08-29 14:02:55 — codex / checkpoint

Removed the macOS narration generator and all 41 M4A files, then replaced every level's playback path with 41 newly generated Eleven v3 George MP3s. Queried the permitted live voice catalog and created equal four-line auditions for George (male British), Lily (female British), and Jessica (female American). The page now treats language level and narrator as separate dimensions; George is fully active while Lily and Jessica are audition-only until one female production voice is selected.

**Validation:** No active local-TTS, Samantha, M4A, old-generator, or old-audition references remain in the prototype. TypeScript, Node syntax, and diff checks pass; all 41 George lines have positive duration; all three narrator samples and representative level files return HTTP 200 as audio/mpeg.

**Next action:** User selects Lily or Jessica and raises the restricted key cap to 8,000 so the selected female voice can be generated across all 41 lines and enabled in the narrator selector.


## 2026-08-29 14:07:59 — codex / validation

The standard webpack-backed Next production build completed successfully with 26 routes after the Turbopack build stopped producing progress and was interrupted. Restarted the verified local preview at `http://127.0.0.1:3004/dev/pinocchio-levels` in server session 24324.


## 2026-08-29 14:13:13 — user / feedback

Observed that sentence-to-sentence playback felt unnaturally urgent because the gap was too short.


## 2026-08-29 14:13:13 — codex / fix

Added level-adaptive sentence breathing gaps to sequential playback: 1.4 seconds for Foundation, 1.0 second for Core, and 0.7 seconds for Studio. The player exposes the current gap, displays a `문장 사이 숨 고르기` state, cancels a pending advance when paused, and resumes from the pending next sentence rather than replaying the completed line.

**Validation:** TypeScript and diff checks pass; refreshed Core SSR contains the 1.0-second gap label.


## 2026-08-29 14:14:11 — user / diagnosis

Correctly noticed that the narration sounded like separately generated sentence clips with inconsistent timing rather than a precisely segmented, coherent audiobook performance.


## 2026-08-29 14:14:11 — codex / architecture decision

Confirmed that all 41 current George lines were generated as independent Eleven v3 requests, which resets prosody at every sentence. Recommended replacing this with one continuous master narration per level and deriving sentence playback from timestamps or cuts of that same master; this makes full listening and sentence practice share one performance. No regeneration was started pending user approval and a key-cap increase from 5,000 to at least 8,000.


## 2026-08-29 14:33:35 — user / request

Approved the continuous-master architecture, selected Lily as the preferred narrator, asked for more human emotional acting, and requested both British and American accent versions using Lily's voice.


## 2026-08-29 14:33:35 — codex / completed

Directed Lily with restrained scene-level Eleven v3 emotion cues and generated one continuous timestamp-aligned master per available level/accent. British is complete for Foundation, Core, and Studio; American is complete for Foundation and Core. Rebuilt the local player so full listening preserves the one-take performance and sentence clicks seek into that exact master instead of loading separately generated clips. The accent selector now compares the same Lily/Core script under matching direction, and Studio automatically returns to British while the unavailable American Studio button explains its credit state.

The American Studio request was rejected before generation because the free monthly account had 501 credits remaining and needed 1,575. A final 293-character British comparison audition was then generated to make the UK/US A/B fair, leaving approximately 208 credits. No upgrade or payment was attempted.

**Validation:** `npx tsc --noEmit`, generator syntax, `git diff --check`, and a full `npx next build` pass. All five masters and timelines are valid. Browser testing confirmed American Core line 8 starts at 36.03 seconds, stops at 41.10 seconds, and whole-track resume continues from the same 69.20-second source. British/American switching, Studio fallback, asset loading, and console checks pass. Local preview remains at `http://127.0.0.1:3004/dev/pinocchio-levels` in server session 99530.

**Next action:** User auditions Lily UK/US and critiques the emotion; generate only American Studio after quota reset or upgrade.


## 2026-08-29 14:53:39 — user / issue

Reported that every audio control on the shared Vercel Preview showed `0:00` and could not be played.


## 2026-08-29 14:53:39 — codex / fix

Diagnosed the deployed MP3 URLs as 404s even though the files were committed. The cause was the repository-wide `*.mp3` rule in `.vercelignore`. Added narrow negation rules for only the active Lily British and Lily American prototype folders, committed as `16ddf98`, pushed, and waited for the replacement Vercel Preview. Also changed the misleading `배포되지 않은 로컬 실험` badge to `공개 전 검토용 프로토타입` in `daa0154`.

**Validation:** The stable branch Preview now loads the UK audition at 20.16 seconds, US audition at 21.12 seconds, and British Core master at 71.44 seconds with media readyState 4 and no errors. The deployed whole-track play button advances playback. The Preview remains team-protected; Slack is still untouched pending explicit approval to grant anyone-with-link access.

## 2026-08-29 15:17:33 — user / request

Asked whether the entire operational Pinocchio can be regenerated in the new ElevenLabs narration style, and requested a better visual approach for the book Watch/Mimic/Guess/Word modes than reusing a static cover.


## 2026-08-29 15:17:55 — codex / checkpoint

Audited the production book pipeline and designed the recommended next product slice. The operational Pinocchio is not a purchased full audiobook: only a 4:22 LibriVox/Gutenberg Chapter 1 excerpt is live, with 34 Mimic lines and 10 Guess/10 Word items; scenes 2-8 are placeholders. The local 36-chapter source is about 207k body characters and would become roughly 59 Eleven v3 masters / 4h40-5h, plus alignment and curriculum work. Recommended a chapter-1 vertical slice using a durable production voice and a shared 16:9 Living Storybook Stage: one or two original layered workshop panoramas with 6-8 timestamped focus beats reused across Watch/Mimic/Guess/Word. No production assets or behavior were changed.

**Next action:** After user approval, first compare Florence (the official Lily replacement) with one durable custom narrator on the existing Chapter 1 excerpt under a paid commercial plan; then build the Chapter 1 Lily-quality narration plus BookStoryStage vertical slice before committing to all 36 chapters.

**Validation:** Read-only repository audit, ffprobe verification of the 262.5-second production asset, exact 3,348-character/652-word Chapter 1 lesson count, full-source sizing, and current official ElevenLabs documentation/pricing review completed.

**Files:**
- app/lib/lessonMedia.ts
- app/components/VideoPlayer.tsx
- app/book/listen/page.tsx
- app/book/mimicking/page.tsx
- public/books/pinocchio/scene-1.json
- public/books/pinocchio/scene-1.m4a
- public/books/pinocchio/scene-1.jpg
- public/books/pinocchio/SOURCE.md
- scripts/build-pinocchio-public-domain-scene1.mjs
- app/dev/pinocchio-levels/pinocchio-levels.module.css

**Open risks:** Lily is a Default voice that expires on 2026-12-31, so it is unsuitable as a maintainable long-term narrator. The current Walt Disney Little Golden Book cover has no documented image rights and should be removed before broader/public/commercial use. Current free-generated preview audio is not licensed for commercial production; generate operational masters on a paid plan. Korean-market public-domain status should be confirmed. The older Vercel public-link/Slack-post action remains unapproved and untouched.

## 2026-08-29 17:13:26 — user / request

Asked for the operating workflow between this content R&D thread and the main development thread, specifically whether content should be created here and deployed from the main thread.


## 2026-08-29 17:13:26 — codex / checkpoint

Defined the two-thread operating model: this thread produces and freezes a versioned book content pack; the main development thread alone integrates that approved pack into the application, validates it, deploys a Preview, and deploys production only after explicit approval. The handoff unit is files plus manifest, rights/provenance, QA notes, and a commit/version—not chat context alone.

**Next action:** Create the Pinocchio Chapter 1 content-pack contract and its eight-beat Living Storybook storyboard in this R&D thread, then send the frozen version and acceptance criteria to the main development thread for Preview integration.

**Validation:** Workflow-only decision; no application, audio, visual, Preview, or production assets changed.

**Files:**
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md

**Open risks:** Avoid concurrent edits to production UI from both threads. This R&D thread must not deploy production; the main thread must not regenerate or silently alter approved content during integration.

## 2026-08-29 17:19:41 — user / request

Requested complete Pinocchio content packs for Chapters 1 through 12 based on the full story.

## 2026-08-29 18:28:00 — codex / checkpoint

Completed the Pinocchio v1 Chapters 1–12 content pack without changing or deploying the production application. The pack contains three complete reading levels per chapter, a shared line inventory for full listening and Mimic, derived Guess/Word/retell activities, six camera-ready story beats per chapter, original non-Disney 16:9 Living Storybook artwork, source/rights metadata, and deterministic checksums.

Added a compiler, structural/asset validator, image-generation record, and a production narration generator that creates one continuous ElevenLabs v3 master per chapter and level and derives every sentence timestamp from that same take. The generator defaults to cost estimation and refuses generation without an explicit durable voice, voice name, and paid-commercial-plan confirmation.

**Validation:** Compiler and validator pass for 12 chapters, 336 lines, 4,024 words, 24,632 script characters, 144 Guess items, 144 Word items, 36 retell prompts, 72 story beats, and 12 original 1672×941 chapter images. ElevenLabs estimate mode reports 36 continuous master requests, 27,815 billed characters including direction tags, and a 1,268-character largest request. Node syntax and whitespace checks pass.

**Files:**
- content-packs/pinocchio/v1/
- scripts/build-pinocchio-content-packs.mjs
- scripts/validate-pinocchio-content-packs.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md

**Open risks:** Audio masters are intentionally pending because the current free balance is insufficient and Lily is not a durable narrator. Generate commercial masters only after selecting a durable narrator on a paid plan and then complete a human listen-through. Confirm Korean-market public-domain status before commercial distribution. Do not integrate or deploy from this R&D thread.

## 2026-08-30 11:29:10 — user / request

Approved rebuilding the material as a true twelve-session curriculum. Reframe the complete original 36-chapter Pinocchio arc into twelve lessons rather than treating original Chapters 1–12 as the whole course. Each lesson must support Watch, Mimic, Guess, and Word for a real sixty-minute session at the learner's selected Foundation, Core, or Studio level. Keep narration generation pending until the rewritten text is approved.

## 2026-08-30 11:52:00 — codex / checkpoint

Completed the corrected Pinocchio v2 text curriculum. All original Chapters 1–36 are assigned exactly once, in order, across twelve dramatic sessions that run from the talking wood through the final transformation into a real boy. The earlier v1 remains preserved for audit but is superseded for the twelve-session course.

Every session now provides Foundation, Core, and Studio alternatives with sixteen shared Watch/Mimic lines, eight Guess items, eight Word sentence rebuilds, one final retell, two before-listening and two after-listening prompts, eight performance/story beats, narration direction, and a new-session art brief. The product timing contract is Watch 10 minutes, Mimic 25, Guess 10, and Word 15; a learner completes one level, never all three.

**Validation:** V2 compiler and validator pass with twelve sessions, full ordered coverage of original Chapters 1–36, 576 leveled lines, 6,716 words, 41,678 script characters, 288 Guess items, 288 Word items, 96 beats, and zero language-band exceptions. ElevenLabs estimate mode reports 36 continuous masters and approximately 46,136 billed characters including performance tags. Node syntax, TypeScript, and whitespace checks pass. A full Next build stopped producing output after compilation began and was canceled; no app runtime code changed. No v2 art, audio, Preview, or production deployment was created.

**Files:**
- content-packs/pinocchio/v2/
- scripts/build-pinocchio-12-session-pack.mjs
- scripts/validate-pinocchio-12-session-pack.mjs
- scripts/generate-pinocchio-content-pack-audio.mjs
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md

**Open risks:** Sixty-minute timing needs a real learner/classroom pilot even though the interaction budget is explicit. V2 art and audio remain pending. Lily is not a durable production narrator, and commercial masters require a paid plan. The full Next build remains an integration-time check after the local build process stalled without an error. Confirm Korean-market public-domain status before commercial distribution. Do not deploy from this content R&D thread.
## 2026-08-30 — user / decision

Purchased an ElevenLabs paid plan and approved proceeding with Lily for the
Session 1 Core pilot. Then challenged the sixteen-line Mimic design because the
operational Sing 2 lesson uses thirty practice lines, and approved revising the
course to the same thirty-unit practice density before generating audio.

## 2026-08-30 — codex / in progress

Reframing each level as one coherent sixteen-sentence Watch narration plus
thirty timestamped Mimic speaking units cut from that exact continuous master.
Guess and Word are being raised from eight to ten items. Session 1 Core will be
the first Lily British paid-plan vertical slice; no production deployment is
authorized from this R&D thread.

## 2026-08-30 — codex / completed

Completed the thirty-unit revision across all twelve sessions and built the
paid-plan Lily British Session 1 Core vertical slice. The course now contains
1,080 Mimic units and 360 each of Guess and Word items while preserving the
same coherent sixteen-sentence Watch narration per session and level. Session
1 Core uses one 84.16-second Eleven v3 master; sixteen caption ranges and thirty
Mimic ranges are aligned to that exact take. Generated and corrected original
non-Disney Living Storybook art, then added a local student-facing Watch,
Mimic, Guess, and Word lesson with local microphone comparison and progress.

**Validation:** The v2 validator, TypeScript, whitespace checks, and the full
27-route Next production build pass. Browser verification confirmed real audio
playback, exact last-segment stopping, thirty Mimic controls, Guess scoring,
Word answer validation, zero console errors, and no mobile/desktop horizontal
overflow.

**Next action:** User listens through the local Session 1 Core pilot and either
freezes the Lily direction/UX for main-thread handoff or gives targeted voice,
pacing, text, or interaction notes. No Preview or production deployment was
performed.

## 2026-08-30 — user / correction

Rejected the standalone combined prototype interaction and established the
deployed Sing 2 lesson as the product standard. Requested that Pinocchio keep
its own story art, text, and Lily narration while following Sing 2's Selecting,
Watch, Mimic, Guess, and Word process, screen hierarchy, controls, gating, and
completion transitions.

## 2026-08-30 — codex / completed

Rebuilt the local Session 1 Core pilot around the operational Sing 2 learning
flow. The selecting screen now uses sequential mode locks, completion checks,
and the current-stage chameleon. Watch uses the standard start/pause/progress
and Again/Next completion pattern. Mimic uses the same eight-slot
listen/listen/listen/mute/listen/mute/listen/mute sequence across thirty units
and ends with the difficult-sentence review. Guess uses the A/B/C onboarding,
three-option listening, feedback, and ten-question dock. Word uses the compact
center stage, side/mobile word cards, two-listen/one-mute sequence, sentence
assembly, chameleon submit, and ten-question completion state. Locked routes
redirect to Selecting, local completion restores without hydration errors, and
punctuation stays attached to its word cards.

**Validation:** The twelve-session pack validator, TypeScript, whitespace
checks, and the full 27-route Next production build pass. Browser QA covered
all five screens, sequential local progression, SKIP and Again/Next behavior,
30/30 and 10/10 completion counts, direct locked-route rejection, Word card
reveal after the audio sequence, desktop/mobile layouts, and zero console
errors. No Preview or production deployment was performed.

## 2026-08-30 — user / bug report

Reported that the Mimic left and right navigation arrows changed the sentence
but did not start playback or illuminate the active control in green.

## 2026-08-30 — codex / completed

Fixed Mimic navigation so both arrows stop the old segment, move to the target
sentence, and immediately restart its eight-step sequence at the first green
listen slot. The same automatic restart now applies after sentence feedback
and when selecting a sentence from the list. Feedback overlays still block
manual navigation and slot playback until a choice is made.

**Validation:** Browser QA confirmed right navigation moves to 02/30, left
navigation returns to 01/30, one control remains actively green, the underlying
audio element is playing, and no console errors are emitted.

## 2026-08-30 — user / correction

Asked whether only Session 1 had been built, restated that the complete
Pinocchio book must fit twelve one-hour meetings, and required learner-facing
terminology to change from Session to Chapter.

## 2026-08-30 — codex / checkpoint

Generalized the local Sing 2-parity pilot into one dynamic Chapter 1–12 course.
All twelve learner Chapters use their matching v2 `session-01..12/pack.json`
while the UI and routes say Chapter; the internal session filenames remain the
stable content-generation/media contract. Added independent local progress per
Chapter, sequential Watch → Mimic → Guess → Word gates, next-Chapter unlocking
after Word, direct-route rejection, legacy Session 1 progress migration and URL
redirection, deterministic public audio/art slots, timeline fallback, and a
pack-driven art placeholder. Generated paid-plan Eleven v3 Lily British Core
masters and matching timelines for Chapters 2–12, plus original non-Disney
Living Storybook panoramas for every Chapter 2–12. Added precise 30 ms segment
stops, sequential within-mode item gates, a real Chapter 12 course exit, and a
deployment include rule for all twelve Core masters.

**Validation:** Both content validators, TypeScript, whitespace checks, and the
40-route Next production build pass. Media QA confirms original source Chapters
1–36 in order, twelve byte-matched canonical/public art and audio sets, 192
Watch lines, 360 Mimic units, 120 Guess items, and 120 Word items. Browser QA
completed all four modes through learner Chapters 1–12, confirmed sequential
unlocking and locked direct-route rejection, real Chapter 1/2/12 Lily playback,
Mimic arrow autoplay/green state, hidden Word cards after completion, the final
Home CTA, mobile/desktop rendering, and zero console errors.

**Files:**
- app/components/ModeSelectLayout.tsx
- app/dev/pinocchio-chapters/
- app/dev/pinocchio-session-1/
- content-packs/pinocchio/v2/APP_MEDIA_PATHS.md
- public/prototype-audio/pinocchio-v2/session-01..12/lily-british/
- docs/ai-handoff/STATE.md
- docs/ai-handoff/CONVERSATION.md

**Open risks:** A human listen-through of all twelve Core masters remains
pending. Foundation/Studio media, long-term Lily replacement, classroom pacing,
and Korean-market rights confirmation remain separate follow-ups. No deployment
was performed.
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

## 2026-08-29 17:10:17 — Codex / checkpoint

Reverted PRs #35, #34, and #33 in reverse order, removing Story Finale UI, routes, progress integration, and the story-conversation API. The app now exactly matches pre-Story commit 8ab9d7b and the concept is documented in the product backlog with re-entry gates.

**Next action:** Commit the backlog note, push a PR, verify Vercel preview, merge, then confirm the production selector and route no longer expose Story Finale.

**Validation:** npx tsc --noEmit passed; npx next build passed with no /sing2/retelling, /book/retelling, or /api/story-conversation route; app diff against pre-Story commit 8ab9d7b is empty.

**Files:**
- docs/product-backlog.md plus reverse reverts of the Story Finale files from PRs #33-#35

**Open risks:** Existing retelling evaluation rows may remain in Supabase but are no longer read or shown; no production data was changed.

## 2026-08-30 — user / deployment request

Asked to deploy the validated Pinocchio Chapter 1–12 Core course to production.

## 2026-08-30 — codex / production deployment completed

Merged the latest production `main` into the validated Pinocchio branch,
preserving the production removal of Story Finale, then pushed merge commit
`a314945` to `main`. Vercel reported the Production deployment successful.

**Validation:** Post-merge TypeScript, both Pinocchio content validators,
whitespace checks, and the 40-route production build passed. The live route at
`https://mimic-webapp-sing2.vercel.app/dev/pinocchio-chapters/1` returns 200,
renders Chapter-only terminology and sequential mode gates, and plays the live
Chapter 1 Lily MP3. Live Chapter 1 and Chapter 12 masters return `audio/mpeg`,
Chapter 12 art returns `image/png`, and the removed Story Finale routes remain
404. Browser console errors: zero.

**Open risks:** Human listen-through, classroom pacing, Foundation/Studio
media, Lily's 2026-12-31 retirement, and Korean-market rights confirmation
remain follow-ups.

## 2026-08-30 15:25:58 — codex / work started

Objective: Create Mimic company operating record and Pinocchio v3 Story Pack with an eight-minute Core Golden Chapter

## 2026-08-30 15:55:37 — user / request

Record Mimic's company operating system so new AI agents and human content managers can start immediately, then create the Pinocchio Story Pack.


## 2026-08-30 15:55:37 — codex / decision

Preserve production Pinocchio v2 and author v3 as a separate draft. Use an eight-minute canonical Watch master, select 30 Mimic plus 10 Guess and 10 Word activities from it, and require Golden Chapter human approval before batch TTS or Chapters 2-12 production.


## 2026-08-30 15:55:37 — codex / checkpoint

Recorded the AI-native company/Content Studio operating model and created Pinocchio v3 Story Pack draft. Core Chapter 1 now has a 1,028-word, 105-sentence canonical master estimated at 481.9 seconds at 128 wpm, eight beats, and exact 30 Mimic/10 Guess/10 Word selections. Added registry, manifest schema, persistent Content Studio AI rule, rights record, Story Bible, twelve-Chapter season map, production/QA records, and a generic validator.

**Next action:** A named human editor reviews the Chapter 1 Core script and learning selections. After approval, select and record a durable ElevenLabs voice ID, generate one coherent narration master without sentence-by-sentence TTS, align timestamps, complete human listening and product QA, then approve the Golden Chapter before authoring Chapters 2-12.

**Validation:** npm run validate:story-pack passed (105 sentences, 1,028 words, 481.9 seconds, 8/30/10/10); npx tsc --noEmit passed; all nine new JSON files parse; git diff --check passed. Next Turbopack build was stopped after hanging in its optimization phase with no diagnostic output; no app code changed.

**Files:**
- AGENTS.md
- .cursor/rules/content-studio.mdc
- content-studio/
- content-packs/pinocchio/v3/
- scripts/validate-story-pack.mjs
- package.json
- docs/ai-handoff/PROJECT_CONTEXT.md

**Open risks:** Commercial target-territory rights review, named editorial/learning approval, durable Lily voice ID/availability, commercial plan evidence, master audio/timestamps/visuals, human listening QA, and product preview remain pending. Existing untracked prototype voice folders are unrelated and were not modified.

## 2026-08-30 16:03:24 — codex / work started

Objective: Produce Pinocchio v3 Core Chapter 1 Golden audiobook master, sentence alignment, and reproducible ElevenLabs media provenance


## 2026-08-30 16:31:32 — codex / checkpoint

Generated the Pinocchio v3 Core Chapter 1 Lily ElevenLabs v3 Golden master from the approved 1,031-word canonical script as two coherent acts, then decode-concatenated and re-encoded them into a single 490.32-second 44.1 kHz mono 128 kbps master. Added 105 sentence ranges, 30 Mimic ranges, eight beat ranges, durable request IDs/checksums/config fingerprint, voice snapshot, cost evidence, safe paid-request resume/overwrite guards, and technical media validation. Forced Alignment returned HTTP 401 on the restricted key, so the explicitly approved and recorded per-act ElevenLabs timestamp fallback was used without regenerating paid audio.

**Next action:** Product owner listens to the full master, especially the S054-S055 seam at 235.526 seconds, and records audio approval or exact revision notes. Do not batch Chapters 2-12 or other levels until this Golden listen-through passes.

**Validation:** npm run validate:story-pack passed with 490.32-second master, 105 lines, 30 Mimic ranges, two provider requests, matching text/audio checksums; npx tsc --noEmit passed; node --check generator passed; ffprobe confirmed MP3 44.1 kHz mono 128 kbps; loudness measured -18.45 LUFS and -1.19 dBTP; seam gap is 0.458 seconds.

**Files:**
- content-packs/pinocchio/v3/chapters/chapter-01/audio/
- content-packs/pinocchio/v3/chapters/chapter-01/levels/core/
- scripts/generate-story-pack-golden-audio.mjs
- scripts/validate-story-pack.mjs

**Open risks:** Human audio listen-through remains pending; restricted API key blocked Forced Alignment so recorded per-act timestamps are used; named editorial/learning and rights approval remain pending; Living Story Stage/product preview not yet implemented; Lily retirement requires narrator A/B before batch production.


## 2026-08-30 16:31:39 — codex / completed

Pinocchio v3 Core Chapter 1 Golden audiobook master, sentence/Mimic alignment, and reproducible ElevenLabs provenance are complete. Human listen-through is the release gate before batch production.

**Validation:** Story Pack validator, TypeScript, generator syntax, FFprobe format/duration, loudness, checksums, request-count, sentence-count, beat-count, and Mimic-range checks passed.
