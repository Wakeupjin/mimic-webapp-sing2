import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDataPath = path.join(root, "app", "dev", "pinocchio-chapters", "lessonData.ts");
const localProgressPath = path.join(root, "app", "dev", "pinocchio-chapters", "localProgress.ts");
const chapterSelectPath = path.join(root, "app", "dev", "pinocchio-chapters", "[chapter]", "ChapterSelectClient.tsx");
const productionModeRoutePath = path.join(root, "app", "book", "pinocchio", "[chapter]", "[mode]", "page.tsx");
const canonicalGuessRoutePath = path.join(root, "app", "book", "pinocchio", "[chapter]", "guessing", "page.tsx");
const legacyListenRoutePath = path.join(root, "app", "book", "listen", "page.tsx");
const legacyMimicRoutePath = path.join(root, "app", "book", "mimicking", "page.tsx");
const legacyGuessRoutePath = path.join(root, "app", "book", "guessing", "page.tsx");
const legacyWordRoutePath = path.join(root, "app", "book", "word", "page.tsx");
const legacySelectingRoutePath = path.join(root, "app", "book", "selecting", "page.tsx");
const authRedirectPath = path.join(root, "app", "lib", "authRedirect.ts");
const homePath = path.join(root, "app", "dev", "brand-preview", "page.tsx");

async function text(filePath) {
  return readFile(filePath, "utf8");
}

function javascriptModuleUrl(source, fileName) {
  const javascript = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`;
}

async function loadProgressModules() {
  const lessonSource = await text(lessonDataPath);
  const lessonUrl = javascriptModuleUrl(lessonSource, lessonDataPath);
  const progressSource = await text(localProgressPath);
  const progressJavascript = ts.transpileModule(progressSource, {
    fileName: localProgressPath,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText.replace(/from\s+["']\.\/lessonData["']/, `from ${JSON.stringify(lessonUrl)}`);
  const progressUrl = `data:text/javascript;base64,${Buffer.from(progressJavascript).toString("base64")}`;
  return Promise.all([import(lessonUrl), import(progressUrl)]);
}

function mockBrowserStorage() {
  const values = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
    },
    dispatchEvent() {},
  };
  return {
    values,
    restore() {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

test("the learner-facing book course is Listen -> Mimic -> Word", async () => {
  const [lesson, progress] = await loadProgressModules();

  assert.deepEqual(lesson.BOOK_FLOW_MODES, ["watching", "mimicking", "word"]);
  assert.equal(lesson.MODE_LABEL.watching, "Listen");
  assert.equal(lesson.legacyBookChapter("003:7"), 7, "legacy links must preserve their Chapter number");
  assert.equal(lesson.legacyBookChapter("not-a-book-id"), 1, "invalid legacy links must fall back safely");
  assert.deepEqual(lesson.ALL_PINOCCHIO_MODES, ["watching", "mimicking", "guessing", "word"], "released Guess progress stays a known data shape");

  assert.equal(progress.canOpenMode("watching", []), true);
  assert.equal(progress.canOpenMode("mimicking", []), false);
  assert.equal(progress.canOpenMode("mimicking", ["watching"]), true);
  assert.equal(progress.canOpenMode("word", ["watching"]), false);
  assert.equal(progress.canOpenMode("word", ["watching", "mimicking"]), true);
  assert.equal(progress.canOpenMode("word", ["watching", "mimicking", "guessing"]), true, "legacy Guess completion must neither block nor unlock Word");
  assert.equal(progress.canOpenMode("guessing", ["watching", "mimicking", "guessing", "word"]), false, "Guess is not an active learner destination");
});

test("completing active modes preserves previously stored Guess progress", async () => {
  const [, progress] = await loadProgressModules();
  const browser = mockBrowserStorage();
  const scope = "foundation-v3-test";
  const key = `mimic:pinocchio-chapters:progress:${scope}`;

  try {
    browser.values.set(key, JSON.stringify({ "1": ["watching", "guessing"] }));
    progress.completeMode(1, "mimicking", scope);
    assert.deepEqual(JSON.parse(browser.values.get(key)), {
      "1": ["watching", "mimicking", "guessing"],
    });

    progress.completeMode(1, "word", scope);
    assert.deepEqual(JSON.parse(browser.values.get(key)), {
      "1": ["watching", "mimicking", "guessing", "word"],
    });
    assert.equal(progress.canOpenChapter(2, JSON.parse(browser.values.get(key))), true, "Chapter 2 still unlocks from Chapter 1 Word");
  } finally {
    browser.restore();
  }
});

test("selectors and resume links expose only the three-mode book course", async () => {
  const [selector, home] = await Promise.all([text(chapterSelectPath), text(homePath)]);

  assert.match(selector, /modes=\{BOOK_FLOW_MODES\.map\(/, "the Chapter selector must be driven by the active book flow");
  assert.match(selector, /const hereMode = mediaReady \? BOOK_FLOW_MODES\.find\(/, "the current-step marker must ignore legacy Guess rows");
  assert.match(home, /completedModes[\s\S]{0,500}BOOK_FLOW_MODES\.find\(\(candidate\)\s*=>\s*!completedModes\.has\(candidate\)\)/, "book resume must derive the first unfinished active mode from the whole Chapter");
  assert.doesNotMatch(home, /rawMode\s*===\s*["']guessing["']\s*\?\s*["']word["']/, "one newer legacy Guess row must not override completed active modes");
  assert.match(home, /latest\.lesson_number\s*>?=\s*300[\s\S]{0,400}finishedChapter[\s\S]{0,200}\+\s*\(finishedChapter\s*\?\s*1\s*:\s*0\)/, "completed legacy Word progress must resume at the following Chapter map");
});

test("legacy book URLs preserve the Chapter and enter only the canonical three-mode course", async () => {
  const [productionRoute, canonicalGuess, legacyListen, legacyMimic, legacyGuess, legacyWord, legacySelecting] = await Promise.all([
    text(productionModeRoutePath),
    text(canonicalGuessRoutePath),
    text(legacyListenRoutePath),
    text(legacyMimicRoutePath),
    text(legacyGuessRoutePath),
    text(legacyWordRoutePath),
    text(legacySelectingRoutePath),
  ]);

  assert.match(productionRoute, /BOOK_FLOW_MODES\.map\(/, "static generation must expose only active book modes");
  assert.doesNotMatch(productionRoute, /ALL_PINOCCHIO_MODES\.map\(/);
  assert.match(canonicalGuess, /redirect\(chapterRoot\(chapterNumber\)\)/, "canonical Guess deep links must leave before the client auth gate mounts");
  assert.match(legacyListen, /modeHref\(legacyBookChapter\(id\),\s*["']watching["']\)/);
  assert.match(legacyMimic, /modeHref\(legacyBookChapter\(id\),\s*["']mimicking["']\)/);
  assert.match(legacyWord, /modeHref\(legacyBookChapter\(id\),\s*["']word["']\)/);
  assert.match(legacyGuess, /chapterRoot\(legacyBookChapter\(id\)\)/, "removed Guess must return to its own Chapter map");
  assert.match(legacySelecting, /chapterRoot\(legacyBookChapter\(id\)\)/);
});

test("authentication cannot preserve a removed book Guess destination", async () => {
  const source = await text(authRedirectPath);
  const auth = await import(javascriptModuleUrl(source, authRedirectPath));

  assert.equal(auth.getSafeNextPath("/book/pinocchio/7/guessing"), "/book/pinocchio/7");
  assert.equal(auth.getSafeNextPath("/book/pinocchio/12/guessing?id=003:12"), "/book/pinocchio/12");
  assert.equal(auth.getSafeNextPath("/book/guessing?id=003:7"), "/book/pinocchio/7");
  assert.equal(auth.getSafeNextPath("/book/guessing?id=garbage"), "/book/pinocchio/1");
  assert.equal(auth.getSafeNextPath("/sing2/guessing?id=001:1"), "/sing2/guessing?id=001:1", "movie Guess remains a valid destination");
});
