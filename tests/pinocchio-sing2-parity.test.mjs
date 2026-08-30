import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modeClientPath = path.join(root, "app", "components", "pinocchio", "PinocchioLessonModeClient.tsx");
const lessonUiPolicyPath = path.join(root, "app", "components", "pinocchio", "lessonUiPolicy.mjs");
const mimicLineListPath = path.join(root, "app", "components", "MimicLineList.tsx");
const productionModeRoutePath = path.join(root, "app", "book", "pinocchio", "[chapter]", "[mode]", "page.tsx");
const loaderPath = path.join(root, "app", "lib", "pinocchioStoryPack.server.ts");
const globalCssPath = path.join(root, "app", "globals.css");
const lessonShellPath = path.join(root, "app", "components", "LessonShell.tsx");
const playbackControlsPath = path.join(root, "app", "components", "PlaybackControls.tsx");
const packRoot = path.join(root, "content-packs", "pinocchio", "v3");

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

function balancedBlock(source, marker, { last = false } = {}) {
  const markerIndex = last ? source.lastIndexOf(marker) : source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing CSS contract: ${marker}`);
  const openIndex = source.indexOf("{", markerIndex);
  assert.notEqual(openIndex, -1, `Missing CSS block after: ${marker}`);
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  assert.fail(`Unclosed CSS block after: ${marker}`);
}

function pngDimensions(buffer, label) {
  assert.ok(buffer.length >= 24, `${label} is too small to be a PNG`);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", `${label} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

test("Pinocchio Watch/Mimic/Guess/Word use the same responsive lesson shell contract as Sing2", async () => {
  const source = await text(modeClientPath);
  const sections = {
    watch: sourceSection(source, "function WatchMode()", "function MimicMode()"),
    mimic: sourceSection(source, "function MimicMode()", "function GuessMode()"),
    guess: sourceSection(source, "function GuessMode()", "function normalizedTokens"),
    word: sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps"),
  };

  for (const [mode, section] of Object.entries(sections)) {
    assert.match(
      section,
      new RegExp(`stageClassName=["']learning-stage learning-stage-${mode} learning-content-book["']`),
      `${mode} must opt into the shared Sing2 mobile stage classes`,
    );
  }

  assert.match(sections.mimic, /className=["']lesson-dock mimic-dock["']/);
  assert.match(sections.guess, /className=["']lesson-dock guess-dock["']/);
  assert.match(sections.word, /className=["'][^"']*lesson-dock word-dock[^"']*["']/);
  assert.match(sections.mimic, /<PlaybackControls[\s\S]*?<button[^>]+className=["']mimic-count["']/);
  assert.match(sections.guess, /<div className=["']guess-abc["']>[\s\S]*?<button[^>]+className=["']mimic-count["']/);
  assert.match(sections.word, /<div className=["']word-bar["']>[\s\S]*?<button[^>]+className=["']mimic-count["']/);
});

test("Mimic shows phrase progress without revealing the English practice phrase", async () => {
  const [source, policy] = await Promise.all([
    text(modeClientPath),
    import(pathToFileURL(lessonUiPolicyPath).href),
  ]);
  const mimic = sourceSection(source, "function MimicMode()", "function GuessMode()");
  const storyStage = sourceSection(source, "function StoryStage", "function StageActions");

  const secretPhrase = "Please don't hit me!";
  const indicator = policy.mimicPhraseProgress(1, 3);
  assert.equal(indicator, "PHRASE 2 / 3", "learners still need their position inside a split sentence");
  assert.equal(indicator.includes(secretPhrase), false, "the progress indicator must never contain the answer phrase");
  assert.equal(policy.mimicPhraseProgress(0, 1), null, "a one-piece sentence needs no phrase indicator");
  assert.match(mimic, /mimicPhraseProgress\(activeChunkIndex,\s*currentPractice\.chunks\.length\)/, "Mimic must render only the tested progress label");
  assert.doesNotMatch(mimic, /caption=|chunks\[activeChunkIndex\]\?\.text/, "Mimic must not send the active English answer to the stage");
  assert.doesNotMatch(storyStage, /storyCaption|caption\s*\?/, "the shared story stage must not expose a hidden answer-caption path");
});

test("Word judges the visible token sequence when repeated words swap IDs", async () => {
  const [source, policy] = await Promise.all([
    text(modeClientPath),
    import(pathToFileURL(lessonUiPolicyPath).href),
  ]);
  const word = sourceSection(source, "function WordMode()", "export type PinocchioLessonModePageProps");
  const target = ["They", "lost", "their", "way", "and", "their", "map."];

  assert.equal(policy.isVisibleTokenSequenceCorrect(target, [0, 1, 5, 3, 4, 2, 6]), true, "swapping identical visible words must remain correct");
  assert.equal(policy.isVisibleTokenSequenceCorrect(target, [0, 1, 2, 4, 3, 5, 6]), false, "a visibly different word order must remain incorrect");
  assert.equal(policy.isVisibleTokenSequenceCorrect(target, [0, 1, 2]), false, "an incomplete sentence cannot be correct");
  assert.match(word, /const correct = isVisibleTokenSequenceCorrect\(tokens,\s*selected\)/, "Word must use visible-token correctness at submit time");
  assert.doesNotMatch(word, /selected\.every\(\(id,\s*index\)\s*=>\s*id\s*===\s*index\)/, "Word must not compare shuffled chip IDs to positions");
});

test("only masters receive a completion SKIP action", async () => {
  const [source, policy] = await Promise.all([
    text(modeClientPath),
    import(pathToFileURL(lessonUiPolicyPath).href),
  ]);
  const stageActions = sourceSection(source, "function StageActions", "function WatchMode");
  const contextType = sourceSection(source, "type LessonContextValue", "const LessonContext");
  const lessonValue = sourceSection(source, "const lesson: LessonContextValue", "let content");

  assert.equal(policy.shouldShowLessonSkip(false, true), false, "a learner must never receive SKIP");
  assert.equal(policy.shouldShowLessonSkip(false, () => {}), false, "a learner callback must not bypass the role gate");
  assert.equal(policy.shouldShowLessonSkip(true, false), false, "masters need a real action before SKIP appears");
  assert.equal(policy.shouldShowLessonSkip(true, () => {}), true, "masters keep the Sing2 QA shortcut");

  assert.match(contextType, /isMaster:\s*boolean/, "the verified role must travel through lesson context");
  assert.match(lessonValue, /\bisMaster\b/, "the lesson provider must supply the verified role");
  assert.match(stageActions, /shouldShowLessonSkip\(isMaster,\s*onSkip\)/, "StageActions must enforce the role policy at render time");
  assert.doesNotMatch(stageActions, /\{onSkip\s*\?/, "callback presence alone must not expose SKIP");
});

test("the eight panorama beats create visible travel without over-cropping", async () => {
  const [source, css, policy] = await Promise.all([
    text(modeClientPath),
    text(path.join(root, "app", "dev", "pinocchio-chapters", "pinocchio-chapters.module.css")),
    import(pathToFileURL(lessonUiPolicyPath).href),
  ]);
  const { focusX, focusY, scale } = policy.PINOCCHIO_PANORAMA;
  const views = focusX.map((x) => policy.panoramaViewport(x, focusY, scale));

  assert.equal(focusX.length, 8, "every authored story beat needs one camera focus");
  assert.ok(scale > 1.12, "the panorama must crop enough for focus movement to be visible");
  assert.ok(views[0].visibleFraction >= 0.72, "the crop must retain at least 72% of the illustration");
  assert.ok(views[0].visibleFraction <= 0.8, "the crop must be strong enough to read as camera movement");
  assert.ok(views.at(-1).left - views[0].left >= 0.2, "first-to-last travel must cover at least 20% of the panorama");
  for (let index = 1; index < views.length; index += 1) {
    assert.ok(views[index].left - views[index - 1].left >= 0.025, `beat ${index + 1} must visibly advance the camera`);
  }
  assert.ok(views[0].left < 0.02, "the first beat must retain the left edge story subject");
  assert.ok(1 - views.at(-1).right < 0.03, "the last beat must retain the right edge story subject");
  assert.ok(views[0].top < 0.08, "the camera must preserve the illustrated ceiling and faces");
  assert.ok(1 - views[0].bottom >= 0.18, "the camera must crop the panorama's empty lower band");

  assert.match(source, /PINOCCHIO_PANORAMA\.focusX\[beatIndex\]/, "StoryStage must use the tested focus sequence");
  assert.match(source, /PINOCCHIO_PANORAMA\.scale/, "StoryStage must use the tested scale");
  assert.match(css, /transform-origin:\s*var\(--focus-x,[^)]+\)\s+var\(--focus-y,[^)]+\)/, "both camera axes must drive the transform origin");
});

test("mobile line navigation escapes the 16:9 frame as a scrollable bottom sheet", async () => {
  const [css, listSource, modeSource] = await Promise.all([
    text(globalCssPath),
    text(mimicLineListPath),
    text(modeClientPath),
  ]);
  const sheet = balancedBlock(css, ".mimic-lines-sheet");
  const panel = balancedBlock(css, ".mimic-lines-sheet-panel");
  const scrollArea = balancedBlock(css, ".mimic-lines-sheet .mimic-lines");
  const heightContract = panel.match(/height:\s*min\(([\d.]+)dvh,\s*([\d.]+)rem,\s*calc\(100dvh\s*-\s*([\d.]+)rem\s*-\s*env\(safe-area-inset-bottom\)\)\)/);
  const bottomContract = sheet.match(/padding-bottom:\s*max\(([\d.]+)rem,\s*env\(safe-area-inset-bottom\)\)/);

  assert.ok(heightContract, "the sheet needs viewport, cap, and safe-area height limits");
  assert.ok(bottomContract, "the sheet needs a safe-area-aware bottom inset");
  const [, viewportPercent, capRem, reserveRem] = heightContract.map(Number);
  const bottomRem = Number(bottomContract[1]);
  const rootFont = 16;
  for (const viewport of [
    { width: 320, height: 568, safeBottom: 20 },
    { width: 390, height: 844, safeBottom: 34 },
    { width: 430, height: 932, safeBottom: 34 },
  ]) {
    const panelHeight = Math.min(
      viewport.height * viewportPercent / 100,
      capRem * rootFont,
      viewport.height - reserveRem * rootFont - viewport.safeBottom,
    );
    const bottom = Math.max(bottomRem * rootFont, viewport.safeBottom);
    const top = viewport.height - bottom - panelHeight;
    const frameHeight = viewport.width * 9 / 16;
    assert.ok(top >= 0 && top + panelHeight <= viewport.height, `${viewport.width}x${viewport.height} sheet must stay inside the visual viewport`);
    assert.ok(panelHeight > frameHeight, `${viewport.width}x${viewport.height} list must not be clipped to the 16:9 frame height`);
    assert.ok((panelHeight - 3 * rootFont) / (3.8 * rootFont) >= 4, `${viewport.width}x${viewport.height} sheet must expose at least four scrollable rows`);
  }

  assert.match(listSource, /createPortal\(/, "the mobile sheet must render outside the overflow-hidden lesson frame");
  assert.match(listSource, /matchMedia\(["']\(orientation: portrait\) and \(max-width: 540px\)["']\)/, "only phone portrait should switch to the bottom sheet");
  assert.match(listSource, /event\.key\s*!==\s*["']Escape["']/, "Escape must dismiss the sheet");
  assert.match(listSource, /role=["']dialog["'][^>]*aria-modal=["']true["']/, "the portalled sheet must expose modal semantics");
  assert.equal((modeSource.match(/\bmobileSheet\b/g) ?? []).length, 3, "Mimic, Guess, and Word must all opt into safe mobile navigation");
  assert.match(scrollArea, /overflow-y:\s*auto/, "the list body must scroll independently");
  assert.match(scrollArea, /overscroll-behavior:\s*contain/, "list scrolling must not drag the lesson behind it");
});

test("the production lesson route imports the shared client, never a dev route module", async () => {
  const source = await text(productionModeRoutePath);

  assert.match(
    source,
    /from\s+["']@\/app\/components\/pinocchio\/PinocchioLessonModeClient["']/,
    "production must import the route-neutral Pinocchio lesson client directly",
  );
  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*dev\/pinocchio-session-1[^"']*["']/,
    "production must not import a Next route from the dev prototype",
  );
});

test("all twelve v3 Chapters resolve to checked, production-size Pinocchio art", async () => {
  const [visuals, seasonMap, loaderSource] = await Promise.all([
    text(path.join(packRoot, "visuals.json")).then(JSON.parse),
    text(path.join(packRoot, "season-map.json")).then(JSON.parse),
    text(loaderPath),
  ]);

  assert.equal(visuals.storyPackId, "pinocchio-story-v3");
  assert.equal(visuals.chapters?.length, 12, "visual catalog must contain exactly twelve Chapters");
  assert.equal(new Set(visuals.chapters.map((entry) => entry.publicUrl)).size, 12, "every Chapter needs a distinct artSrc");

  for (let index = 0; index < 12; index += 1) {
    const chapterNumber = index + 1;
    const entry = visuals.chapters[index];
    const seasonChapter = seasonMap.chapters[index];
    const stem = String(chapterNumber).padStart(2, "0");
    const expectedUrl = `/prototype-art/pinocchio-v2/session-${stem}.png`;

    assert.equal(entry.number, chapterNumber, `visual Chapter ${chapterNumber} is out of order`);
    assert.equal(entry.chapterId, `chapter-${stem}`);
    assert.deepEqual(
      entry.sourceChapterGroup,
      seasonChapter.sourceChapters,
      `visual Chapter ${chapterNumber} must represent the same source-Chapter group as its story pack`,
    );
    assert.equal(entry.publicUrl, expectedUrl, `Chapter ${chapterNumber} artSrc changed unexpectedly`);

    const assetPath = path.resolve(packRoot, entry.publicAsset);
    assert.equal(
      assetPath,
      path.join(root, "public", expectedUrl.slice(1)),
      `Chapter ${chapterNumber} publicAsset and publicUrl must identify the same file`,
    );
    const image = await readFile(assetPath);
    const sourceImage = await readFile(path.resolve(packRoot, entry.sourceAsset));
    const dimensions = pngDimensions(image, entry.publicAsset);
    assert.deepEqual(dimensions, { width: 1672, height: 941 }, `Chapter ${chapterNumber} art dimensions changed`);
    assert.equal(entry.width, dimensions.width);
    assert.equal(entry.height, dimensions.height);
    assert.equal(entry.sha256, sha256(image), `Chapter ${chapterNumber} art checksum mismatch`);
    assert.deepEqual(sourceImage, image, `Chapter ${chapterNumber} source and public art diverged`);
  }

  assert.match(loaderSource, /visuals\.json/, "the production loader must read the v3 visual catalog");
  assert.match(loaderSource, /publicUrl/, "the production loader must expose the catalog publicUrl as artSrc");
  assert.doesNotMatch(loaderSource, /artSrc:\s*null/, "the production loader must not silently fall back to an empty artSrc");
});

test("mobile portrait CSS keeps media at 16:9 and puts controls before a separate counter", async () => {
  const [css, shell, playback] = await Promise.all([
    text(globalCssPath),
    text(lessonShellPath),
    text(playbackControlsPath),
  ]);
  const tabletPortrait = balancedBlock(css, "@media (orientation: portrait) and (max-width: 1024px)");
  const phonePortrait = balancedBlock(css, "@media (orientation: portrait) and (max-width: 540px)", { last: true });

  assert.match(tabletPortrait, /\.learning-stage\s+\.lesson-dock\s*\{[^}]*width:\s*100%[^}]*flex-direction:\s*column/s);
  assert.match(tabletPortrait, /\.learning-content-book\.learning-stage-watch\s+\.lesson-media/);
  assert.match(tabletPortrait, /\.learning-content-book\.learning-stage-mimic\s+\.lesson-media/);
  assert.match(tabletPortrait, /\.learning-content-book\.learning-stage-guess\s+\.lesson-media/);
  assert.match(tabletPortrait, /\.learning-content-book\.learning-stage-word\s+\.word-video/);
  assert.match(tabletPortrait, /aspect-ratio:\s*16\s*\/\s*9/);

  assert.match(
    phonePortrait,
    /\.learning-stage-mimic\s+\.mimic-dock\s*\{[^}]*--ctrl-size:\s*clamp\([^;]*100vw[^;]*\/\s*8[^;]*\)/s,
    "the eight Mimic steps must be sized from the phone viewport rather than overflow it",
  );
  assert.match(phonePortrait, /\.learning-stage-mimic\s+\.mimic-dock\s*>\s*div:first-child[\s\S]*?width:\s*100%/);
  assert.match(phonePortrait, /\.learning-stage-guess\s+\.guess-abc\s*\{[^}]*width:\s*100%/s);
  assert.match(phonePortrait, /\.learning-stage-word\s+\.word-dock\s*\{[^}]*overflow:\s*visible/s);

  assert.match(shell, /className=\{`flex flex-col overflow-hidden/);
  assert.match(shell, /lesson-primary flex min-h-0 min-w-0 flex-1 flex-col/);
  assert.match(playback, /className=["']w-full min-w-0 overflow-x-auto["']/);
  assert.match(playback, /w-max max-w-full/);
  assert.equal(
    (sourceSection(playback, "const STEPS", "export default function PlaybackControls").match(/\{\s*index:\s*\d/g) ?? []).length,
    8,
    "Mimic must keep all eight Sing2 Listen/Mimic steps",
  );
});
