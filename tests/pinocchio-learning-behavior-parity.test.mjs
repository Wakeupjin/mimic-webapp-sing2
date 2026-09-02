import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modeClientPath = path.join(root, "app", "components", "pinocchio", "PinocchioLessonModeClient.tsx");
const timingsPath = path.join(root, "app", "constants", "timings.ts");
const soundEffectsPath = path.join(root, "app", "hooks", "useSoundEffects.ts");
const cssPath = path.join(root, "app", "globals.css");
const foundationActivities = (chapterNumber) => path.join(
  root,
  "content-packs",
  "pinocchio",
  "v3",
  "chapters",
  `chapter-${String(chapterNumber).padStart(2, "0")}`,
  "levels",
  "foundation",
  "activities.json",
);

async function text(filePath) {
  return readFile(filePath, "utf8");
}

function sourceSection(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source section: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source section boundary: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertInOrder(source, needles, message) {
  let cursor = -1;
  for (const needle of needles) {
    const next = typeof needle === "string"
      ? source.indexOf(needle, cursor + 1)
      : source.slice(cursor + 1).search(needle) + cursor + 1;
    assert.ok(next > cursor, `${message}: missing or out of order ${String(needle)}`);
    cursor = next;
  }
}

function assertSource(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

function numericExport(source, name) {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*([\\d.]+)`));
  assert.ok(match, `Missing timing constant ${name}`);
  return Number(match[1]);
}

async function executableFunction(source, name) {
  const sourceFile = ts.createSourceFile("PinocchioLessonModeClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
  assert.ok(declaration, `Missing executable function ${name}`);
  const exported = `export ${declaration.getText(sourceFile)}`;
  const javascript = ts.transpileModule(exported, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`;
  return (await import(moduleUrl))[name];
}

test("Foundation fixtures keep active Mimic/Word counters and retain authored Guess data for compatibility", async () => {
  for (let chapterNumber = 1; chapterNumber <= 12; chapterNumber += 1) {
    const activities = JSON.parse(await text(foundationActivities(chapterNumber)));
    assert.equal(activities.mimic.length, 30, `Chapter ${chapterNumber} Mimic counter drifted`);
    assert.equal(activities.word.length, 10, `Chapter ${chapterNumber} Word counter drifted`);
    assert.equal(activities.guess.length, 10, `Chapter ${chapterNumber} legacy Guess content must remain reversible`);
  }
});

test("Watch progress and Living Story line share one playback clock", async () => {
  const source = await text(modeClientPath);
  const watch = sourceSection(source, "function WatchMode()", "function MimicMode()");
  const activeSourceLine = await executableFunction(source, "activeSourceLine");
  const timeline = {
    duration: 8,
    lines: [
      { id: "S001", start: 0, end: 2 },
      { id: "S002", start: 2, end: 5 },
      { id: "S003", start: 5, end: 8 },
    ],
    mimicItems: [],
  };

  assert.equal(activeSourceLine(0, timeline), 0);
  assert.equal(activeSourceLine(1.999, timeline), 0);
  assert.equal(activeSourceLine(2, timeline), 1, "the stage must switch on the exact sentence boundary");
  assert.equal(activeSourceLine(5, timeline), 2);
  assert.equal(activeSourceLine(8, timeline), 2, "the final scene must remain selected at completion");

  assert.match(watch, /activeSourceLine\(engine\.currentTime,\s*timeline\)/, "story focus must use the playback clock");
  assert.match(watch, /engine\.currentTime\s*\/\s*Math\.max\(1,\s*engine\.duration\)/, "progress fill must use the same playback clock");
  assert.match(watch, /<StoryStage\s+activeLine=\{activeLine\}/, "the derived line must drive the visible stage");
  assert.match(watch, /watch-bar-fill[^>]+width:\s*`\$\{percent\}%`/, "the fill must follow the derived percentage");
  assert.match(watch, /watch-bar-thumb[^>]+left:\s*`\$\{percent\}%`/, "the thumb must follow the same percentage");
});

test("Watch progress displays the same current / total time feedback as Sing2", async () => {
  const source = await text(modeClientPath);
  const watch = sourceSection(source, "function WatchMode()", "function MimicMode()");
  assertSource(watch, /className=["']watch-time["']/, "Sing2 parity requires the current / total time label on the progress bar");
  assert.match(watch, /engine\.currentTime/, "the displayed current time must use the audio playback clock");
  assert.match(watch, /engine\.duration/, "the displayed total must use the loaded audio duration");
});

test("Watch blocks learner seek-ahead and replays immediately from completion", async () => {
  const source = await text(modeClientPath);
  const watch = sourceSection(source, "function WatchMode()", "function MimicMode()");
  const again = sourceSection(watch, "const again", "const skip");

  assertSource(watch, /isMaster/, "Watch seek policy must distinguish a learner from a master reviewer");
  assertSource(watch, /maxWatched|furthest|highestReached/, "learner seek must be capped at the furthest genuinely watched time");
  assertSource(watch, /if\s*\(!isMaster[\s\S]{0,240}(maxWatched|furthest|highestReached)/, "the seek handler must enforce the learner cap");
  assertSource(again, /setStarted\(true\)/, "Again must start replay rather than return to a second start overlay");
  assertSource(again, /playFull\(true\)/, "Again must restart the narration immediately");
});

test("Mimic runs the exact eight-slot audible/muted sequence with green active feedback", async () => {
  const [source, css] = await Promise.all([
    text(modeClientPath),
    text(cssPath),
  ]);
  const mimic = sourceSection(source, "function MimicMode()", "function GuessMode()");
  assert.match(source, /MIMIC_MUTED_STEPS\s*=\s*new Set\(\[3,\s*5,\s*7\]\)/);
  assertInOrder(
    mimic,
    ["setActiveSlot(slot)", "engine.playRange(chunk, MIMIC_MUTED_STEPS.has(slot)", "setActiveSlot(null)"],
    "a slot must turn green at playback start and clear at playback end",
  );
  assert.match(mimic, /slot\s*<\s*7[\s\S]+runStep\(slot\s*\+\s*1/, "all eight slots must autoplay in order");
  assert.match(mimic, /activeIndex=\{engine\.isPlaying\s*\?\s*activeSlot\s*:\s*null\}/, "the state-machine slot must drive PlaybackControls only while media is genuinely playing");
  assert.match(css, /\.ctrl-slot\.is-active\s*\{[^}]*background:\s*var\(--mimic\)/s);
  assert.match(css, /--mimic:\s*#60D96C/i, "the active control color must be the shared Mimic green");

  assertInOrder(
    mimic,
    ["setFeedbackOpen(false)", /current\s*>=\s*total\s*-\s*1/, "advance()"],
    "sentence feedback must close before the parent-sentence counter advances",
  );
  assert.match(mimic, /String\(current\s*\+\s*1\)\.padStart\(2,\s*["']0["']\)/, "the counter must remain two-digit and parent-sentence based");
});

test("Mimic shares Sing2's 1000ms inter-slot cadence", async () => {
  const [source, timingSource] = await Promise.all([text(modeClientPath), text(timingsPath)]);
  const mimic = sourceSection(source, "function MimicMode()", "function GuessMode()");
  assert.equal(numericExport(timingSource, "MIMICKING_SEQUENCE_DELAY"), 1000);
  assertSource(mimic, /MIMICKING_SEQUENCE_DELAY/, "Pinocchio must use Sing2's cadence rather than a private hard-coded delay");
  assert.doesNotMatch(mimic, /runStep\([^\n]+\),\s*800\)/, "an 800ms private cadence makes the two products feel different");
});

test("Mimic learner navigation cannot unlock or skip an unfinished sentence", async () => {
  const source = await text(modeClientPath);
  const mimic = sourceSection(source, "function MimicMode()", "function GuessMode()");
  const next = sourceSection(mimic, "const next", "const prev");

  assertSource(mimic, /isMaster/, "Mimic navigation must distinguish learner flow from master QA shortcuts");
  assertSource(next, /isMaster|nudgeNext|canAdvance/, "right-arrow navigation needs an explicit learner gate");
  assert.doesNotMatch(
    next,
    /if\s*\(!feedbackOpen\)[\s\S]{0,120}advance\(\)/,
    "feedbackOpen=false is the running state, so it must not unlock the next sentence",
  );
  assert.match(mimic, /document\.addEventListener\(["']keydown["'],\s*handleKeyDown\)/, "the same guarded transition must cover keyboard arrows");
});

test("Guess uses the shared correct and wrong sound engine", async () => {
  const [source, soundSource] = await Promise.all([text(modeClientPath), text(soundEffectsPath)]);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");

  assert.match(soundSource, /frequencies\s*=\s*\[523\.25,\s*659\.25,\s*783\.99\]/, "correct is the C5-E5-G5 chime");
  assert.match(soundSource, /frequencies\s*=\s*\[783\.99,\s*659\.25,\s*523\.25\]/, "wrong is the G5-E5-C5 response");
  assertSource(source, /useSoundEffects/, "Pinocchio must use the same sound engine as Sing2");
  assertInOrder(guess, ["playCorrectSound()", "setShowCorrect(true)"], "the correct chime and banner must start together");
  assertInOrder(guess, ["playAgainSound()", "setShowAgain(true)"], "the wrong sound and banner must start together");
});

test("Guess exposes green option playback, counters, and final completion", async () => {
  const [source, css] = await Promise.all([
    text(modeClientPath),
    text(cssPath),
  ]);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");

  assertInOrder(
    guess,
    ["setPlayingLabel(option.label)", "engine.playRange", "setPlayingLabel(null)"],
    "A/B/C playback must expose its active option for the whole clip",
  );
  assert.match(guess, /playingLabel\s*===\s*label\s*\?[\s\S]{0,80}engine\.isPlaying[\s\S]{0,80}["']is-playing["']/, "the active label must reach the option class only while media is genuinely playing");
  assert.match(css, /\.guess-opt\.is-playing\s*\{[^}]*border-color:\s*var\(--mimic\)/s);
  assert.match(guess, /setCurrent\(next\)[\s\S]+playQuestion\(next\)/, "counter update and next-question playback must be one transition");
  assert.match(guess, /current\s*>=\s*items\.length\s*-\s*1[\s\S]+finish\(\)/, "the tenth correct answer must complete instead of creating question 11");
  assert.match(guess, /markModeComplete\(chapterNumber,\s*["']guessing["']/);
  assert.match(guess, /router\.push\(modeHref\(chapterNumber,\s*["']word["']\)\)/);
  assert.match(guess, /String\(current\s*\+\s*1\)\.padStart\(2,\s*["']0["']\)/);
});

test("Guess keeps Sing2's 2000ms feedback and learner/master navigation contract", async () => {
  const [source, timingSource] = await Promise.all([text(modeClientPath), text(timingsPath)]);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");
  assert.equal(numericExport(timingSource, "GUESSING_ANSWER_FEEDBACK_DURATION"), 2000);
  assertSource(guess, /GUESSING_ANSWER_FEEDBACK_DURATION/, "Correct/Again must remain visible for 2000ms");
  assertSource(guess, /isMaster/, "master QA and learner autoplay must not share one transition path");
  assertSource(guess, /1600/, "learners must auto-advance after Sing2's additional 1600ms next nudge");
  assert.doesNotMatch(guess, /\},\s*950\)/, "950ms clips both the chime and the readable feedback state");
});

test("Guess restarts the full listening sequence after a wrong answer", async () => {
  const source = await text(modeClientPath);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");

  assertSource(guess, /playAttentionSound/, "each silent-scene playback needs the shared 200-to-400Hz attention cue");
  assertSource(guess, /GUESSING_VIDEO_PLAYS|videoPlayCount/, "Guess must preserve Sing2's three-view listening phase");
  assertSource(guess, /playAgainSound\(\)[\s\S]+playQuestion\(current\)|playAgainSound\(\)[\s\S]+restartQuestion/, "Again must replay the full current question instead of immediately re-enabling A/B/C");
});

test("Guess completion Again immediately starts question one", async () => {
  const source = await text(modeClientPath);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");
  const again = sourceSection(guess, "const again", "return (");

  assertSource(again, /setStarted\(true\)/, "Again must remain inside the active exercise");
  assertSource(again, /playQuestion\(0\)/, "Again must immediately start question one");
});

test("Word uses the shared correct and wrong sound engine", async () => {
  const source = await text(modeClientPath);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assertSource(source, /useSoundEffects/, "Pinocchio must use the same sound engine as Sing2");
  assertInOrder(word, ["playCorrectSound()", "setShowCorrect(true)"], "correct feedback must chime immediately");
  assertInOrder(word, ["playAgainSound()", "setShowAgain(true)"], "wrong feedback must sound immediately");
});

test("Word exposes green listen/listen/mimic states, counters, and completion", async () => {
  const [source, css] = await Promise.all([
    text(modeClientPath),
    text(cssPath),
  ]);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assertInOrder(word, ["setActiveSlot(slot)", "engine.playRange", "setActiveSlot(null)", "setPhase(\"arranging\")"], "Word must finish listen/listen/mimic before arranging");
  assert.match(word, /slot\s*===\s*2/, "slot 2 must be the muted learner turn");
  assert.match(word, /\[0,\s*1\]\.map\(\(slot\)[\s\S]+activeSlot\s*===\s*slot/, "both audible controls must be driven by activeSlot");
  assert.match(word, /ctrl-slot is-mimic[^`]+\$\{engine\.isPlaying\s*&&\s*activeSlot\s*===\s*2\s*\?\s*["']is-active["']/, "the muted control must be driven by activeSlot only during actual media playback");
  assert.match(css, /\.word-bar\s+\.ctrl-slot\.is-mimic:not\(\.is-active\)/, "the muted slot must visibly change when it becomes active");
  assert.match(word, /setCurrent\(next\)[\s\S]+setSelected\(\[\]\)[\s\S]+playSequence\(next\)/, "a correct answer must atomically update the counter, clear chips, and start the next item");
  assert.match(word, /current\s*>=\s*items\.length\s*-\s*1[\s\S]+finish\(\)/, "the tenth correct answer must open completion at 10/10");
  assert.match(word, /markModeComplete\(chapterNumber,\s*["']word["']/);
  assert.match(word, /chapterNumber\s*<\s*TOTAL_CHAPTERS\s*\?\s*chapterRoot\(chapterNumber\s*\+\s*1\)\s*:\s*["']\/["']/);
  assert.match(word, /String\(current\s*\+\s*1\)\.padStart\(2,\s*["']0["']\)/);
});

test("Word keeps Sing2's 2000ms feedback timing", async () => {
  const [source, timingSource] = await Promise.all([text(modeClientPath), text(timingsPath)]);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assert.equal(numericExport(timingSource, "GUESSING_ANSWER_FEEDBACK_DURATION"), 2000);
  assertSource(word, /GUESSING_ANSWER_FEEDBACK_DURATION/, "Word must keep Correct/Again visible for 2000ms");
  assert.doesNotMatch(word, /\},\s*900\)/, "900ms clips both the correct melody and the readable feedback state");
});

test("Word keeps Sing2's listen/listen/mimic cadence before arranging", async () => {
  const [source, timingSource] = await Promise.all([text(modeClientPath), text(timingsPath)]);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assert.equal(numericExport(timingSource, "MIMICKING_SEQUENCE_DELAY"), 1000);
  assertSource(word, /MIMICKING_SEQUENCE_DELAY/, "the two audible transitions must use the shared 1000ms cadence");
  assertSource(word, /1500/, "the muted learner turn must remain visible for 1500ms before arranging");
  assert.doesNotMatch(word, /playAt\(slot\s*\+\s*1\),\s*650/, "the private 650ms cadence is not Sing2 parity");
});

test("Word wrong-answer and full-replay paths clear chips and replay the whole sequence", async () => {
  const source = await text(modeClientPath);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");

  assertSource(word, /playAgainSound\(\)[\s\S]+setSelected\(\[\]\)[\s\S]+playSequence\(current\)/, "wrong feedback must clear chips and restart listen/listen/mimic");
  assertSource(word, /const (?:replayAll|handleReplayAll)[\s\S]+setSelected\(\[\]\)[\s\S]+playSequence/, "full replay must reset the partial answer before restarting");
  assertSource(word, /label=["']전체 다시 듣기["'][\s\S]{0,180}disabled=/, "full replay must stay locked outside the arranging phase");
});

test("Word completion Again returns to a deliberate question-one start state", async () => {
  const source = await text(modeClientPath);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  const again = sourceSection(word, "const again", "const selectToken");

  assertSource(again, /setCurrent\(0\)/, "Again must restore the first counter");
  assertSource(again, /setStarted\(false\)/, "Word Again intentionally returns to its start overlay");
  assertSource(again, /setPhase\(["']listening["']\)/, "the replay must restart from listening, not arranging");
  assertSource(again, /setSelected\(\[\]\)/, "the replay must not retain the completed sentence");
  assert.doesNotMatch(again, /playSequence\(0\)/, "the start overlay, not completion click, owns media autoplay consent");
});

test("Word submit chameleon visibly reacts to a completed sentence", async () => {
  const source = await text(modeClientPath);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assertSource(word, /isChameleonEating|is-eating/, "the chameleon submit control must react when it receives a completed sentence");
});

test("locked-question hints never cancel the live Guess or Word playback clock", async () => {
  const source = await text(modeClientPath);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  const guessJump = sourceSection(guess, "const jump", "const skipQuestion");
  const wordJump = sourceSection(word, "const jump", "const skipQuestion");

  assertSource(guess, /lockHintTimerRef/, "Guess lock feedback needs a timer independent of the x3/A-B-C workflow");
  assertSource(word, /lockHintTimerRef/, "Word lock feedback needs a timer independent of listen/listen/mimic");
  assertSource(guessJump, /showLockHint\(\)/, "Guess locked navigation must use the isolated hint clock");
  assertSource(wordJump, /showLockHint\(\)/, "Word locked navigation must use the isolated hint clock");
  assert.doesNotMatch(guessJump, /schedule\(\(\)\s*=>\s*setLockHint/, "Guess lock feedback must not clear the workflow timer");
  assert.doesNotMatch(wordJump, /schedule\(\(\)\s*=>\s*setLockHint/, "Word lock feedback must not clear the workflow timer");
});

test("completion freezes Guess navigation outside the stage overlay", async () => {
  const source = await text(modeClientPath);
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");
  const jump = sourceSection(guess, "const jump", "const skipQuestion");
  const advance = sourceSection(guess, "const advance", "const answer");

  assertSource(jump, /if\s*\(complete\s*\|\|/, "completed Guess must reject direct line navigation");
  assertSource(advance, /if\s*\(complete\)\s*return/, "completed Guess must reject counter advancement");
  assertSource(guess, /direction=["']left["'][^>]+disabled=\{complete\}/, "the completion overlay must also disable the dock's previous control");
});

test("exercise pauses preserve both media clips and inter-step delays", async () => {
  const source = await text(modeClientPath);
  const timer = sourceSection(source, "function usePausableTimer()", "function StoryStage");
  const mimic = sourceSection(source, "function MimicMode()", "function GuessMode()");
  const guess = sourceSection(source, "function GuessMode()", "function normalizedTokens");
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");

  assertSource(timer, /remainingRef\.current\s*=\s*Math\.max\(0,\s*dueAtRef\.current\s*-\s*Date\.now\(\)\)/, "pause must retain the unelapsed portion of a gap");
  assertSource(timer, /arm\(remainingRef\.current\)/, "resume must continue that gap rather than start the sequence over");
  for (const section of [mimic, guess, word]) {
    assertSource(section, /pause(?:Step|Workflow)Timer\(\)/, "each timed exercise must pause its workflow clock");
    assertSource(section, /resume(?:Step|Workflow)Timer\(\)/, "each timed exercise must resume its workflow clock");
  }
});

test("Word chips keep fixed positions and hide in place after selection", async () => {
  const source = await text(modeClientPath);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  assertSource(word, /const isUsed\s*=\s*selected\.includes\(token\.id\)/, "selected chips must remain addressable at their original positions");
  assertSource(word, /bank\.slice\(0,\s*mid\)/, "the left bank must keep its original stable half");
  assertSource(word, /bank\.slice\(mid\)/, "the right bank must keep its original stable half");
  assert.doesNotMatch(word, /available\.slice/, "remaining chips must not reflow into new positions");
});

test("feedback audio reuses one mobile-safe AudioContext", async () => {
  const source = await text(soundEffectsPath);
  assertSource(source, /let sharedAudioContext:\s*AudioContext\s*\|\s*null/, "feedback sounds need one reusable browser audio context");
  assertSource(source, /sharedAudioContext\.state\s*===\s*["']closed["']/, "a closed context must be recreated safely");
  assert.equal((source.match(/new AudioContextConstructor\(\)/g) ?? []).length, 1, "sounds must not allocate a new context for every correct answer");
});

test("learner-facing Listen, Mimic, and Word expose deterministic completion and replay routes", async () => {
  const source = await text(modeClientPath);
  const sections = {
    watching: sourceSection(source, "function WatchMode()", "function MimicMode()"),
    mimicking: sourceSection(source, "function MimicMode()", "function GuessMode()"),
    word: sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps"),
  };

  for (const [mode, section] of Object.entries(sections)) {
    assert.match(section, new RegExp(`markModeComplete\\(chapterNumber,\\s*["']${mode}["']`), `${mode} must persist completion`);
    assert.match(section, /setComplete\(true\)/, `${mode} must enter an explicit completion state`);
    assert.match(section, /<LessonCompletionActions/, `${mode} must render the shared Again/Next completion UI`);
    assert.match(section, /const again\s*=|onAgain=\{again\}/, `${mode} must expose a deliberate replay path`);
  }

  assert.match(sections.watching, /router\.push\(modeHref\(chapterNumber,\s*["']mimicking["']\)\)/);
  assert.match(sections.mimicking, /router\.push\(modeHref\(chapterNumber,\s*["']word["']\)\)/);
  assert.doesNotMatch(sections.mimicking, /router\.push\(modeHref\(chapterNumber,\s*["']guessing["']\)\)/);
  assert.match(sections.word, /chapterRoot\(chapterNumber\s*\+\s*1\)/);

  const renderSwitch = sourceSection(source, "let content: ReactNode = null", "return (\n    <LessonContext.Provider");
  assert.match(renderSwitch, /mode\s*===\s*["']watching["'][\s\S]+<WatchMode/);
  assert.match(renderSwitch, /mode\s*===\s*["']mimicking["'][\s\S]+<MimicMode/);
  assert.match(renderSwitch, /mode\s*===\s*["']word["'][\s\S]+<WordMode/);
  assert.doesNotMatch(renderSwitch, /mode\s*===\s*["']guessing["']|<GuessMode/, "legacy Guess implementation must not be learner-renderable");
});

test("remote current-position and completed state hydrate all three learner-facing mode counters", async () => {
  const source = await text(modeClientPath);

  assertSource(source, /current_position/, "Pinocchio must read and write the same resume position contract as Sing2");
  assertSource(source, /savedProgress|modeProgress|progressSnapshot/, "mode components need the matching remote progress row");
  assertSource(source, /completed/, "a completed mode must reopen at its final counter and explicit completion overlay");
  for (const mode of ["watching", "mimicking", "word"]) {
    assertSource(
      source,
      new RegExp(`mode\\s*===\\s*["']${mode}["'][\\s\\S]{0,500}(current_position|savedProgress|modeProgress|progressSnapshot)`),
      `${mode} must hydrate its own persisted state rather than only the chapter gate`,
    );
  }
});
