import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const progressPath = path.join(root, "app", "lib", "progress.ts");
const progressGatePath = path.join(root, "app", "lib", "progressGate.ts");
const requireModeAccessPath = path.join(root, "app", "lib", "useRequireModeAccess.ts");
const guessingGamePath = path.join(root, "app", "hooks", "useGuessingGame.ts");
const guessingPath = path.join(root, "app", "sing2", "guessing", "page.tsx");
const mimickingPath = path.join(root, "app", "sing2", "mimicking", "page.tsx");
const wordPath = path.join(root, "app", "sing2", "word", "page.tsx");

async function text(filePath) {
  return readFile(filePath, "utf8");
}

function sourceBlock(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing source block: ${marker}`);
  const openIndex = source.indexOf("{", markerIndex + marker.length);
  assert.notEqual(openIndex, -1, `Missing opening brace after: ${marker}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(markerIndex, index + 1);
  }
  assert.fail(`Unclosed source block: ${marker}`);
}

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source section: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source section boundary: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertInOrder(source, needles, message) {
  let cursor = -1;
  for (const needle of needles) {
    const tail = source.slice(cursor + 1);
    const offset = typeof needle === "string" ? tail.indexOf(needle) : tail.search(needle);
    assert.notEqual(offset, -1, `${message}: missing ${String(needle)}`);
    cursor += offset + 1;
  }
}

function executableSaveProgress(source, supabase) {
  const javascript = sourceBlock(source, "export async function saveProgress")
    .replace(/^export\s+/, "")
    .replace(/lessonNumber:\s*number/g, "lessonNumber")
    .replace(
      /mode:\s*["']watching["']\s*\|\s*["']mimicking["']\s*\|\s*["']guessing["']\s*\|\s*["']word["']/g,
      "mode",
    )
    .replace(/completed:\s*boolean/g, "completed")
    .replace(/currentPosition\?:\s*number/g, "currentPosition")
    .replace(/progressData\?:\s*any/g, "progressData");
  return Function("supabase", `"use strict"; ${javascript}; return saveProgress;`)(supabase);
}

function executableProgressGate(source) {
  const modeOrder = source.match(/export const MODE_ORDER:\s*LearnMode\[\]\s*=\s*(\[[^;]+\]);/);
  assert.ok(modeOrder, "Missing MODE_ORDER executable contract");
  const javascript = [
    `const MODE_ORDER = ${modeOrder[1]};`,
    sourceBlock(source, "export function isModeCompleted"),
    sourceBlock(source, "export function canAccessLesson"),
    sourceBlock(source, "export function canAccessMode"),
  ]
    .join("\n")
    .replace(/^export\s+/gm, "")
    .replace(/rows:\s*ProgressRow\[\]\s*\|\s*null\s*\|\s*undefined/g, "rows")
    .replace(/lessonNumber:\s*number/g, "lessonNumber")
    .replace(/mode:\s*LearnMode/g, "mode");
  return Function(
    `"use strict"; ${javascript}; return { isModeCompleted, canAccessLesson, canAccessMode };`,
  )();
}

function executableGuessingCorrectCount(source) {
  const javascript = sourceBlock(source, "function parseGuessingCorrectCount")
    .replace(/progressData:\s*unknown/g, "progressData")
    .replace(/totalQuestions:\s*number/g, "totalQuestions")
    .replace(/\(parsed\s+as\s+\{\s*correctCount\?:\s*unknown\s*\}\)/g, "parsed");
  return Function(`"use strict"; ${javascript}; return parseGuessingCorrectCount;`)();
}

test("completed progress uses the real conflict-safe Supabase write path", async () => {
  const source = await text(progressPath);
  const writes = [];
  const fakeSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: "student-1" } } }),
    },
    from(table) {
      assert.equal(table, "learning_progress");
      return {
        upsert: async (payload, options) => {
          writes.push({ payload, options });
          return { error: null };
        },
      };
    },
  };
  const saveProgress = executableSaveProgress(source, fakeSupabase);
  await saveProgress(7, "guessing", true, 9, { isComplete: true });
  await saveProgress(7, "word", true, 10, { isComplete: true });

  assert.equal(writes.length, 2, "Guess and Word completion must both reach an upsert");
  assert.deepEqual(
    writes.map(({ payload }) => ({
      student_id: payload.student_id,
      lesson_number: payload.lesson_number,
      mode: payload.mode,
      completed: payload.completed,
      current_position: payload.current_position,
    })),
    [
      { student_id: "student-1", lesson_number: 7, mode: "guessing", completed: true, current_position: 9 },
      { student_id: "student-1", lesson_number: 7, mode: "word", completed: true, current_position: 10 },
    ],
  );
  for (const write of writes) {
    assert.ok(write.payload.completed_at, `${write.payload.mode} needs a durable completion timestamp`);
    assert.equal(write.options.onConflict, "student_id,lesson_number,mode");
  }
});

test("a newly completed Guess writes progress before opening its completion UI", async () => {
  const source = await text(guessingPath);
  const completeGuessing = sourceBlock(source, "const completeGuessing");
  const answerSelection = sourceBlock(source, "const handleAnswerSelection");

  assertInOrder(
    completeGuessing,
    [
      /const\s+finalQuestionIndex\s*=\s*Math\.max\(0,\s*totalQuestions\s*-\s*1\)/,
      /await\s+saveProgress\(/,
      /["']guessing["']\s*,\s*true\s*,\s*finalQuestionIndex/,
      "setIsGuessingComplete(true)",
      "setShowResults(true)",
    ],
    "Guess must persist the completed row before presenting success",
  );
  assert.match(
    answerSelection,
    /currentQuestionIndex\s*<\s*totalQuestions\s*-\s*1[\s\S]*?else\s*\{[\s\S]*?completeGuessing\(finalCorrectCount\)/,
    "the final correct answer must enter the durable completion callback",
  );
  assert.doesNotMatch(
    answerSelection,
    /else\s*\{\s*setShowResults\(true\)/,
    "the final answer must not bypass persistence by opening results directly",
  );
});

test("a newly completed Word writes progress before opening its completion UI", async () => {
  const source = await text(wordPath);
  const persistCompletion = sourceBlock(source, "const persistWordCompletion");
  const submit = sourceBlock(source, "const handleSubmit");

  assertInOrder(
    persistCompletion,
    [
      /await\s+saveProgress\(/,
      /["']word["']\s*,\s*true\s*,\s*totalQuestions/,
      "setShowCompletion(true)",
    ],
    "Word must persist the completed row before presenting success",
  );
  assert.match(
    submit,
    /currentQuestionNumber\s*>=\s*totalQuestions[\s\S]*?persistWordCompletion\(\)/,
    "the final correct sentence must enter the durable completion callback",
  );
  assert.doesNotMatch(
    submit,
    /currentQuestionNumber\s*>=\s*totalQuestions\)\s*\{\s*setShowCompletion\(true\)/,
    "the final sentence must not bypass persistence by opening completion directly",
  );
});

test("Guess completion unlocks Word through the same persisted progress contract", async () => {
  const source = await text(progressGatePath);
  const gate = executableProgressGate(source);
  const lessonNumber = 7;
  const prerequisites = [
    { lesson_number: lessonNumber - 1, mode: "word", completed: true },
    { lesson_number: lessonNumber, mode: "watching", completed: true },
    { lesson_number: lessonNumber, mode: "mimicking", completed: true },
  ];

  assert.equal(gate.canAccessMode(prerequisites, lessonNumber, "word"), false);
  assert.equal(
    gate.canAccessMode(
      [...prerequisites, { lesson_number: lessonNumber, mode: "guessing", completed: false }],
      lessonNumber,
      "word",
    ),
    false,
    "an autosaved Guess row must not unlock Word",
  );
  assert.equal(
    gate.canAccessMode(
      [...prerequisites, { lesson_number: lessonNumber, mode: "guessing", completed: true }],
      lessonNumber,
      "word",
    ),
    true,
    "the durable Guess completion row must unlock Word",
  );
});

test("a durable Word completion unlocks the next Chapter without weakening the gate", async () => {
  const source = await text(progressGatePath);
  const gate = executableProgressGate(source);

  assert.equal(
    gate.canAccessLesson(
      [{ lesson_number: 1, mode: "word", completed: false }],
      2,
    ),
    false,
    "an autosaved Word row must not unlock Chapter 2",
  );
  assert.equal(
    gate.canAccessLesson(
      [{ lesson_number: 1, mode: "word", completed: true }],
      2,
    ),
    true,
    "the persisted Chapter 1 Word completion must unlock Chapter 2 Watch",
  );
});

test("Mimic completion Next bypasses line navigation and goes directly to Guess", async () => {
  const source = await text(mimickingPath);
  const persistCompletion = sourceBlock(source, "const persistMimickingCompletion");
  const completionNext = sourceBlock(source, "const handleCompletionNext");

  assertInOrder(
    persistCompletion,
    [
      /await\s+saveProgress\(/,
      /["']mimicking["']\s*,\s*true/,
    ],
    "Mimic completion must use the durable completed writer",
  );
  assertInOrder(
    completionNext,
    [
      /await\s+persistMimickingCompletion\(\)/,
      /lessonPath\(movieId,\s*["']guessing["']\)/,
    ],
    "Mimic Next must make the completed row visible before the Guess route guard runs",
  );
  assert.match(
    source,
    /<LessonCompletionActions[\s\S]{0,900}?onNext=\{handleCompletionNext\}/,
    "the completion overlay must use its dedicated route action",
  );
  assert.doesNotMatch(
    source,
    /<LessonCompletionActions(?:(?!\/>)[\s\S])*?onNext=\{handleNext\}(?:(?!\/>)[\s\S])*?\/>/,
    "the completion CTA must not reuse the learner-locked next-line handler",
  );
});

test("a locked Word route explains the Guess prerequisite and offers that next action", async () => {
  const [accessSource, wordSource] = await Promise.all([
    text(requireModeAccessPath),
    text(wordPath),
  ]);

  assert.match(accessSource, /redirectOnDenied/,
    "the access gate needs an opt-out from silent redirect so Word can explain the lock");
  assert.match(accessSource, /denied/,
    "the access gate must expose its denied state to the Word page");
  assert.match(
    wordSource,
    /useRequireModeAccess\([\s\S]{0,240}?redirectOnDenied\s*:\s*false/,
    "Word must opt into the explanatory denied state",
  );
  assert.match(wordSource, /Guess를 먼저 완료해 주세요\./);
  assert.match(wordSource, /lessonPath\(movieId,\s*["']guessing["']\)/,
    "the lock explanation must offer Guess as the recovery path");
});

test("Guess load failure leaves the loading state and exposes a working retry", async () => {
  const source = await text(guessingPath);
  const loader = sourceBlock(source, "const loadDataFromSupabase");
  const retry = sourceBlock(source, "const retryDataLoad");

  assert.match(source, /const \[loadError,\s*setLoadError\]/,
    "Guess needs an explicit load-error state instead of an endless loading screen");
  assert.match(loader, /setLoadError\(/,
    "the data-load failure must enter the error state");
  assertInOrder(
    retry,
    ["setLoadError(null)", "setIsLoading(true)", /setLoadAttempt\(/],
    "retry must clear the error and trigger a fresh load attempt",
  );
  assert.match(source, /\[[^\]]*loadAttempt[^\]]*\]/,
    "the loader effect must observe the retry attempt counter");
  const errorBranchIndex = source.search(/if\s*\([^)]*loadError/);
  const loadingBranchIndex = source.indexOf("if (isLoading)", errorBranchIndex + 1);
  assert.ok(errorBranchIndex >= 0,
    "Guess must render an explicit load-error branch");
  assert.ok(loadingBranchIndex > errorBranchIndex,
    "the error branch must render before the generic loading branch");
  assert.match(source, />\s*다시 시도\s*</,
    "the learner needs a visible retry action");
  assert.match(
    source,
    /onClick=\{accessError\s*\?\s*retryAccess\s*:\s*retryDataLoad\}/,
    "without an access error, the shared retry action must invoke the reusable data loader",
  );
});

test("Guess access-read failure is fail-closed in the same retryable error view", async () => {
  const [source, accessSource] = await Promise.all([
    text(guessingPath),
    text(requireModeAccessPath),
  ]);
  const accessEffect = sourceBetween(accessSource, "useEffect(() => {", "  return {");

  assert.match(
    source,
    /\{[\s\S]{0,180}?accessError,[\s\S]{0,80}?retryAccess,[\s\S]{0,180}?\}\s*=\s*useRequireModeAccess\([\s\S]{0,220}?reportAccessError\s*:\s*true/,
    "Guess must opt into surfaced access-read errors and receive its retry action",
  );
  assert.match(
    accessEffect,
    /if\s*\(!reportAccessError\)[\s\S]{0,140}?router\.replace\([\s\S]*?setAccessError\(["']학습 진도를 확인하지 못했어요\.["']\)/,
    "the access hook must report the read failure instead of silently allowing the lesson",
  );

  const errorBranchIndex = source.search(/if\s*\(accessError\s*\|\|\s*loadError/);
  const loadingBranchIndex = source.indexOf("if (isLoading)", errorBranchIndex + 1);
  assert.ok(errorBranchIndex >= 0 && loadingBranchIndex > errorBranchIndex,
    "access errors must enter the shared error return before any lesson UI can render");
  assert.match(source, /\{accessError\s*\|\|\s*loadError\s*\|\|/,
    "the shared error card must surface the access-read message");
  assert.match(source, /onClick=\{accessError\s*\?\s*retryAccess\s*:\s*retryDataLoad\}/,
    "the shared retry button must rerun the failed access read, not only lesson data loading");
});

test("Guess resume restores both cursor and score, and Start preserves that cursor", async () => {
  const [source, gameSource] = await Promise.all([
    text(guessingPath),
    text(guessingGamePath),
  ]);
  const loader = sourceBlock(source, "const loadDataFromSupabase");
  const startGuessing = sourceBlock(gameSource, "const startGuessing");
  const parseCorrectCount = executableGuessingCorrectCount(source);

  assert.equal(parseCorrectCount({ correctCount: 4 }, 10), 4);
  assert.equal(parseCorrectCount(JSON.stringify({ correctCount: 6 }), 10), 6);
  assert.equal(parseCorrectCount(JSON.stringify(JSON.stringify({ correctCount: 8 })), 10), 8);
  assert.equal(parseCorrectCount({ correctCount: -3 }, 10), 0, "a corrupt negative score must clamp to zero");
  assert.equal(parseCorrectCount({ correctCount: 30 }, 10), 10, "a corrupt high score must clamp to the question count");

  assertInOrder(
    loader,
    [
      /const\s+restoredCorrectCount\s*=\s*parseGuessingCorrectCount\(/,
      /const\s+idx\s*=/,
      "setCurrentQuestionIndex(idx)",
      "setCurrentIndex(idx)",
      "setCorrectCount(restoredCorrectCount)",
      "completionCorrectCountRef.current = restoredCorrectCount",
    ],
    "Guess hydration must restore the cursor and score from the same saved row",
  );
  assert.match(startGuessing, /startIndex\s*=\s*0/,
    "a fresh Guess run still needs a question-one default");
  assert.match(startGuessing, /setCurrentQuestionIndex\(startIndex\)/);
  assert.match(startGuessing, /setCurrentIndex\(startIndex\)/);
  assert.doesNotMatch(startGuessing, /setCurrent(?:Question)?Index\(0\)/,
    "Start must not overwrite a hydrated resume cursor with question one");
  assert.match(source, /startGuessing\(currentQuestionIndex\)/,
    "the resume overlay must pass the hydrated cursor into Start");
});

test("Mimic completion overlays cannot escape through Prev, Next, or line selection", async () => {
  const source = await text(mimickingPath);
  const prev = sourceBlock(source, "const handlePrev");
  const next = sourceBlock(source, "const handleNext");
  const select = sourceBlock(source, "const handleSceneSelect");

  for (const [label, handler] of [["Prev", prev], ["Next", next], ["line select", select]]) {
    assert.match(
      handler,
      /if\s*\(showNextCta\)\s*\{?\s*return/,
      `${label} must reject input while any completion overlay is open`,
    );
  }

  assert.match(source, /showNextCta\s*&&\s*\(/,
    "saving, error, and saved completion states must share one blocking overlay");
  assert.match(source, /completionSaveState\s*===\s*["']saved["']/);
  assert.match(source, /completionSaveState\s*===\s*["']error["']/);
  assert.match(source, /마지막 진도를 저장하고 있어요/,
    "the remaining completion branch must visibly represent saving");
  assert.match(source, /isLineListOpen\s*&&\s*!showNextCta/,
    "the line sheet must be removed while completion is open");
  assert.match(source, /className=["']mimic-count["'][\s\S]{0,180}?disabled=\{showNextCta\}/,
    "the line-list trigger must also be disabled for the whole completion lifecycle");
});

test("Word autosave stops as soon as completion persistence starts", async () => {
  const source = await text(wordPath);
  const autosave = sourceBetween(
    source,
    "useEffect(() => {\n    if (\n      !lessonNumber ||",
    "  const generateQuestion",
  );

  assert.match(
    autosave,
    /showCompletion\s*\|\|\s*completionSaveState\s*!==\s*["']idle["'][\s\S]{0,60}?\)\s*return/,
    "the interval must be torn down for saving, error, and saved completion states",
  );
  assert.match(
    autosave,
    /completionSaveStateRef\.current\s*!==\s*["']idle["']\)\s*return/,
    "an already queued interval tick must re-check the completion state before writing",
  );
});

test("access read errors retry, while previous-lesson and previous-mode locks explain different work", async () => {
  const [accessSource, wordSource] = await Promise.all([
    text(requireModeAccessPath),
    text(wordPath),
  ]);
  const retry = sourceBlock(accessSource, "const retryAccess");
  const accessEffect = sourceBetween(accessSource, "useEffect(() => {", "  return {");

  assertInOrder(
    retry,
    ["setAccessError(null)", "setChecking(true)", /setAccessAttempt\(/],
    "access retry must leave the error view and trigger a fresh progress read",
  );
  assert.match(accessEffect, /accessAttempt/,
    "the progress-read effect must observe the retry counter");
  assert.match(accessEffect, /\.catch\([\s\S]*?setAccessError\(["']학습 진도를 확인하지 못했어요\.["']\)/,
    "a progress-read failure must be distinguishable from an ordinary lock");
  assert.match(
    accessEffect,
    /canAccessLesson\(progressRows,\s*lessonNumber\)[\s\S]{0,100}?["']previous-mode["'][\s\S]{0,100}?["']previous-lesson["']/,
    "the access gate must identify whether the Chapter or only the mode prerequisite is missing",
  );

  const errorIndex = wordSource.indexOf("if (accessError)");
  const deniedIndex = wordSource.indexOf("if (denied)");
  assert.ok(errorIndex >= 0 && deniedIndex > errorIndex,
    "Word must render a read error with retry before considering denied-state copy");
  assert.match(wordSource, /onClick=\{retryAccess\}/);
  assert.match(wordSource, /deniedReason\s*===\s*["']previous-lesson["']/);
  assert.match(wordSource, /unitLabel\s*=\s*isBookId\(movieId\)\s*\?\s*["']Scene["']\s*:\s*["']Chapter["']/,
    "the lock explanation must use the learner's real Scene or Chapter unit");
  assert.match(wordSource, /`이전 \$\{unitObjectLabel\} 먼저 완료해 주세요\.`/);
  assert.match(wordSource, /`이전 \$\{unitLabel\}의 Word까지 끝내면 이 \$\{unitSubjectLabel\} 열려요\.`/);
  assert.match(wordSource, /Guess를 먼저 완료해 주세요\./);
  assert.match(wordSource, /`Word는 같은 \$\{unitLabel\}의 Guess를 끝내면 열려요\.`/);
});

test("Again clears completion dedupe state, and Word rebuilds question one", async () => {
  const [guessSource, mimicSource, wordSource] = await Promise.all([
    text(guessingPath),
    text(mimickingPath),
    text(wordPath),
  ]);
  const guessAgain = sourceBlock(guessSource, "const restartGuessing");
  const mimicAgain = sourceBetween(
    mimicSource,
    "onAgain={() => {",
    "                      onNext={handleCompletionNext}",
  );
  const wordAgain = sourceBlock(wordSource, "const handleAgain");
  const wordQuestionRegeneration = sourceBetween(
    wordSource,
    "useEffect(() => {\n    if (lessonData && lessonData.word && !currentQuestion)",
    "  useEffect(() => {\n    if (lessonData && lessonData.word && currentQuestionNumber > 1)",
  );

  assertInOrder(
    guessAgain,
    [
      "completionSaveInFlightRef.current = false",
      "completionSavedRef.current = false",
      "completionCorrectCountRef.current = 0",
      "setCompletionSaveError(null)",
      "setIsGuessingComplete(false)",
      "setCorrectCount(0)",
      "jumpToQuestion(0)",
    ],
    "Guess Again must create a genuinely new completion attempt",
  );
  assertInOrder(
    mimicAgain,
    [
      /completionSaveStateRef\.current\s*=\s*["']idle["']/,
      "completionSavePromiseRef.current = null",
      /setCompletionSaveState\(["']idle["']\)/,
      "resetMimickingState()",
    ],
    "Mimic Again must clear both the saved state and deduped promise",
  );
  assertInOrder(
    wordAgain,
    [
      /completionSaveStateRef\.current\s*=\s*["']idle["']/,
      /setCompletionSaveState\(["']idle["']\)/,
      "setShowCompletion(false)",
      "setCurrentQuestion(null)",
      "setCurrentQuestionNumber(1)",
    ],
    "Word Again must clear completion dedupe and invalidate the old final question",
  );
  assert.match(wordQuestionRegeneration, /!currentQuestion[\s\S]*?generateQuestion\(\)/,
    "invalidating the old question must regenerate question one on the next render");
  assert.match(wordSource, /lessonData\.word\[currentQuestionNumber\s*-\s*1\]/,
    "question generation must use the reset one-based cursor");
});
