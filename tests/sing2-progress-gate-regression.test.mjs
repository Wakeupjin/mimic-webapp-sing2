import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guessingPath = path.join(root, "app", "sing2", "guessing", "page.tsx");
const mimickingPath = path.join(root, "app", "sing2", "mimicking", "page.tsx");
const wordPath = path.join(root, "app", "sing2", "word", "page.tsx");
const accessHookPath = path.join(root, "app", "lib", "useRequireModeAccess.ts");

async function text(filePath) {
  return readFile(filePath, "utf8");
}

function namedFunctionSource(source, fileName, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declaration = new RegExp(`function\\s+${escapedName}\\s*\\(`).exec(source);
  const variable = new RegExp(`(?:const|let)\\s+${escapedName}\\s*=`).exec(source);
  const match = declaration || variable;
  assert.ok(match, `Missing function ${name} in ${fileName}`);

  const arrowIndex = variable ? source.indexOf("=>", match.index + match[0].length) : -1;
  let bodySearchStart = arrowIndex;
  if (declaration) {
    const parametersStart = source.indexOf("(", match.index);
    let parameterDepth = 0;
    for (let index = parametersStart; index < source.length; index += 1) {
      if (source[index] === "(") parameterDepth += 1;
      if (source[index] === ")") {
        parameterDepth -= 1;
        if (parameterDepth === 0) {
          bodySearchStart = index + 1;
          break;
        }
      }
    }
  }
  const bodyStart = source.indexOf("{", bodySearchStart);
  assert.notEqual(bodyStart, -1, `Missing body for function ${name} in ${fileName}`);

  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }

  assert.fail(`Unterminated function ${name} in ${fileName}`);
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
    const remainder = source.slice(cursor + 1);
    const relativeIndex = typeof needle === "string" ? remainder.indexOf(needle) : remainder.search(needle);
    assert.notEqual(relativeIndex, -1, `${message}: missing ${String(needle)}`);
    cursor += relativeIndex + 1;
  }
}

test("a fresh Guess completion is durable before its overlay can expose Next", async () => {
  const source = await text(guessingPath);
  const complete = namedFunctionSource(source, "guessing/page.tsx", "completeGuessing");
  const answer = namedFunctionSource(source, "guessing/page.tsx", "handleAnswerSelection");

  assert.match(complete, /^async\b|async\s*\(/, "Guess completion must be an awaited transaction");
  assertInOrder(
    complete,
    [
      /setCompletionSaveState\(["']saving["']\)/,
      /await\s+saveProgress\([\s\S]*?["']guessing["'][\s\S]*?true/,
      /setIsGuessingComplete\(true\)/,
      /setShowResults\(true\)/,
    ],
    "Guess must persist completion before exposing the completion overlay",
  );
  assert.doesNotMatch(
    complete,
    /saveProgress\([\s\S]*?["']guessing["'][\s\S]*?true\s*,\s*currentQuestion\s*,/,
    "Guess current_position must stay numeric instead of sending the question object",
  );
  assert.match(complete, /true,\s*finalQuestionIndex,/, "Guess must persist a numeric final question index");
  assert.match(answer, /completeGuessing\(/, "the final correct answer must use the durable completion path");
  assert.match(answer, /setIsLineListOpen\(false\)/, "final feedback must close navigation that could cancel completion");
  assertInOrder(
    answer,
    [
      /completeGuessing\(finalCorrectCount,\s*false\)/,
      /finalCompletionPromise\?\.then\(\(saved\)/,
      /if\s*\(saved\)\s*setShowResults\(true\)/,
    ],
    "the final feedback must start persistence immediately and reveal results only after it succeeds",
  );

  const completionOverlay = sourceSection(source, "{showResults &&", "controls={");
  assert.match(
    completionOverlay,
    /isBookLesson[\s\S]*?lessonPath\(movieId,\s*["']word["']\)[\s\S]*?:\s*lessonSelectHref\(movieId\)/,
    "Guess Next must return to the course map so the learner sees Guess complete and Word unlocked",
  );
});

test("a fresh Word completion is durable before Chapter 2 can be opened", async () => {
  const source = await text(wordPath);
  const complete = namedFunctionSource(source, "word/page.tsx", "completeWordLesson");
  const submit = namedFunctionSource(source, "word/page.tsx", "handleSubmit");

  assert.match(complete, /^async\b|async\s*\(/, "Word completion must be an awaited transaction");
  assertInOrder(
    complete,
    [
      /setCompletionSaveState\(["']saving["']\)/,
      /await\s+saveProgress\([\s\S]*?["']word["'][\s\S]*?true[\s\S]*?totalQuestions/,
      /setShowCompletion\(true\)/,
    ],
    "Word must persist completion before exposing the next-Chapter CTA",
  );
  assert.match(submit, /completeWordLesson\(/, "the final correct sentence must use the durable completion path");
  assert.match(submit, /setIsLineListOpen\(false\)/, "Word feedback must close navigation that could cancel completion");
  assertInOrder(
    submit,
    [
      /completeWordLesson\(false\)/,
      /finalCompletionPromise\?\.then\(\(saved\)/,
      /if\s*\(saved\)\s*setShowCompletion\(true\)/,
    ],
    "the final Word feedback must start persistence immediately and reveal completion only after it succeeds",
  );

  const failedCompletion = sourceSection(source, "completionSaveState !== 'idle'", "{lockHint &&");
  assert.match(failedCompletion, /onClick=\{\(\)\s*=>\s*void completeWordLesson\(\)\}/, "a failed completion write needs a real retry action");
  assert.match(failedCompletion, /다시 시도/, "the retry action must be understandable to the learner");
});

test("Mimic completion exposes an unblocked CTA only after persistence", async () => {
  const source = await text(mimickingPath);
  const complete = namedFunctionSource(source, "mimicking/page.tsx", "completeMimicking");
  const feedback = namedFunctionSource(source, "mimicking/page.tsx", "handleSentenceFeedback");
  const completionNext = namedFunctionSource(source, "mimicking/page.tsx", "handleCompletionNext");

  assertInOrder(
    complete,
    [
      /setCompletionSaveState\(["']saving["']\)/,
      /await\s+saveProgress\([\s\S]*?["']mimicking["'][\s\S]*?true,\s*finalSceneIndex/,
      /setIsMimickingComplete\(true\)/,
      /setShowNextCta\(true\)/,
    ],
    "Mimic must persist its final feedback before exposing the completion CTA",
  );
  assert.match(feedback, /completeMimicking\(nextFeedback\)/, "final feedback must use the durable completion path");
  assert.doesNotMatch(feedback, /setShowNextCta\(true\)/, "final feedback must not open the CTA directly");
  assert.match(source, /onClick=\{retryMimickingCompletion\}[\s\S]*?다시 시도/, "a failed Mimic completion write needs a retry action");

  assert.match(completionNext, /showNextCta/, "the completion route must require the visible completion CTA");
  assert.match(completionNext, /isMimickingComplete/, "the completion route must require a completed Mimic lesson");
  assert.match(completionNext, /lessonPath\(movieId,\s*["']guessing["']\)/, "the CTA must open Guess");
  assert.doesNotMatch(
    completionNext,
    /maxSentenceRef|nudgeNext|isSequenceRunning|isFeedbackOpen/,
    "finished learners must not be sent back through active-sentence gates",
  );
  assert.match(source, /<LessonCompletionActions[\s\S]*?onNext=\{handleCompletionNext\}/, "the visible completion CTA must use the dedicated route");
});

test("a directly opened locked Word step explains the Guess prerequisite", async () => {
  const [source, hookSource] = await Promise.all([text(wordPath), text(accessHookPath)]);
  const accessHook = namedFunctionSource(hookSource, "useRequireModeAccess.ts", "useRequireModeAccess");

  assert.match(accessHook, /redirectOnDenied/, "the access hook needs an opt-out from silent redirects");
  assert.match(
    accessHook,
    /useState\(true\)/,
    "a guarded page must stay neutral until the first progress check finishes",
  );
  assertInOrder(
    accessHook,
    [/const waitForProfile/, /setChecking\(true\)/, /window\.setTimeout\(run, waitForProfile\)/],
    "the optional profile wait must not expose locked content",
  );
  assert.match(accessHook, /setAccessDenied\(true\)/, "the access hook must expose the denied state");
  assert.match(accessHook, /return\s*\{[\s\S]*?accessDenied/, "callers must receive the denied state");
  assert.match(
    source,
    /useRequireModeAccess\([\s\S]*?["']word["'][\s\S]*?redirectOnDenied:\s*false/,
    "Word must keep the learner on-page so it can explain the lock",
  );

  const denied = sourceSection(
    source,
    "if (accessDenied)",
    "if (isLoading || !supabaseLessonData || !videoUrl || !lessonData)",
  );
  assert.match(denied, /Guess/, "the lock explanation must name the prerequisite step");
  assert.match(denied, /완료/, "the lock explanation must say what the learner needs to do");
  assert.match(denied, /lessonSelectHref\(movieId\)/, "the explanation must offer a safe route back to the lesson selector");
});

test("Guess data-load failure replaces the spinner with an actionable retry", async () => {
  const source = await text(guessingPath);
  const retry = namedFunctionSource(source, "guessing/page.tsx", "retryLoad");
  const load = namedFunctionSource(source, "guessing/page.tsx", "loadDataFromSupabase");

  assert.match(source, /const \[loadError,\s*setLoadError\]/, "Guess must distinguish failure from loading");
  assert.match(load, /if\s*\(isNaN\(contentLesson\)\)[\s\S]*?throw new Error/, "an invalid lesson must leave loading state");
  assert.match(load, /if\s*\(!lesson\)[\s\S]*?throw new Error/, "missing lesson data must leave loading state");
  assert.match(load, /guessingDataArray\.length\s*===\s*0[\s\S]*?throw new Error/, "empty Guess data must leave loading state");
  assert.match(
    load,
    /catch\s*\(error\)[\s\S]*?setLoadError\([\s\S]*?setIsLoading\(false\)/,
    "a failed load must become an explicit error instead of an endless spinner",
  );
  assert.match(retry, /setLoadAttempt\([\s\S]*?\+\s*1/, "retry must start a new load attempt");
  assert.match(source, /\},\s*\[movieId,\s*loadAttempt\]\)/, "a retry attempt must rerun the data loader");

  const errorIndex = source.indexOf("if (loadError)");
  const spinnerIndex = source.indexOf("if (isLoading)");
  assert.ok(errorIndex >= 0 && spinnerIndex > errorIndex, "the error screen must win over the generic spinner");

  const errorUi = source.slice(errorIndex, spinnerIndex);
  assert.match(errorUi, /onClick=\{retryLoad\}/, "the failure screen must wire the retry action");
  assert.match(errorUi, /다시 시도/, "the retry control must have a learner-facing label");
});
