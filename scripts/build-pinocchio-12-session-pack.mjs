import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v2");
const authoringRoot = path.join(packRoot, "authoring");
const source = JSON.parse(await readFile(path.join(authoringRoot, "source.json"), "utf8"));
const sessionGroups = await Promise.all(
  ["sessions-01-04.json", "sessions-05-08.json", "sessions-09-12.json"].map(async (file) =>
    JSON.parse(await readFile(path.join(authoringRoot, file), "utf8"))
  )
);
const sessions = sessionGroups.flatMap((group) => group.sessions);
const levelOrder = ["foundation", "core", "studio"];
const levelMeta = {
  foundation: { label: "Foundation", readingBand: "A1–A2", goalKo: "짧고 구체적인 문장으로 사건과 결과를 순서대로 말한다." },
  core: { label: "Core", readingBand: "A2–B1", goalKo: "원인, 선택, 반응을 연결해 자연스럽게 설명한다." },
  studio: { label: "Studio", readingBand: "B1–B2", goalKo: "서술자의 어조와 도덕적 긴장을 살려 해석하고 말한다." },
};
const selectedIndexes = [0, 2, 3, 5, 7, 8, 10, 11, 13, 15];

function fail(message) {
  throw new Error(message);
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function stats(lines) {
  return {
    lines: lines.length,
    words: words(lines.join(" ")).length,
    characters: lines.join("\n").length,
    averageWordsPerLine: Number((words(lines.join(" ")).length / lines.length).toFixed(1)),
  };
}

function tokenize(text) {
  return text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?|[0-9]+|[.,!?;:—-]/g) || [];
}

function wordRanges(text) {
  return [...text.matchAll(/\S+/g)].map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

function splitLine(text) {
  const ranges = wordRanges(text);
  if (ranges.length < 4) fail(`Cannot split a Mimic line with fewer than four words: ${text}`);
  const middle = ranges.length / 2;
  const candidates = [];
  for (let splitWord = 2; splitWord <= ranges.length - 2; splitWord += 1) {
    const leftToken = text.slice(ranges[splitWord - 1].start, ranges[splitWord - 1].end);
    const rightToken = text.slice(ranges[splitWord].start, ranges[splitWord].end);
    const boundaryBonus = /[,;:—-]$/.test(leftToken) || /^(and|but|because|when|while|then|so|yet|after|before|as)$/i.test(rightToken) ? 3 : 0;
    candidates.push({ splitWord, score: boundaryBonus - Math.abs(splitWord - middle) });
  }
  const splitWord = candidates.sort((a, b) => b.score - a.score)[0].splitWord;
  const rawBoundary = ranges[splitWord].start;
  const leftEnd = text.slice(0, rawBoundary).trimEnd().length;
  const rightStart = rawBoundary + text.slice(rawBoundary).search(/\S/);
  return [
    { text: text.slice(0, leftEnd), sourceTextRange: [0, leftEnd] },
    { text: text.slice(rightStart), sourceTextRange: [rightStart, text.length] },
  ];
}

function buildMimicItems(lines, expectedCount) {
  const splitCount = expectedCount - lines.length;
  if (splitCount < 0 || splitCount > lines.length) fail(`Cannot derive ${expectedCount} Mimic units from ${lines.length} narration lines.`);
  const splitIndexes = new Set(
    lines
      .map((text, index) => ({ index, wordCount: words(text).length }))
      .sort((a, b) => b.wordCount - a.wordCount || a.index - b.index)
      .slice(0, splitCount)
      .map(({ index }) => index)
  );
  const items = [];
  for (const [sourceLineIndex, text] of lines.entries()) {
    const parts = splitIndexes.has(sourceLineIndex)
      ? splitLine(text)
      : [{ text, sourceTextRange: [0, text.length] }];
    for (const [partIndex, part] of parts.entries()) {
      items.push({
        id: `mimic-${String(items.length + 1).padStart(2, "0")}`,
        sourceLineIndex,
        part: partIndex + 1,
        parts: parts.length,
        text: part.text,
        sourceTextRange: part.sourceTextRange,
      });
    }
  }
  if (items.length !== expectedCount) fail(`Expected ${expectedCount} Mimic units, got ${items.length}.`);
  return items;
}

function buildGuess(lines) {
  return selectedIndexes.map((correctIndex, questionIndex) => {
    const indexes = [correctIndex, (correctIndex + 5) % lines.length, (correctIndex + 10) % lines.length];
    const rotation = questionIndex % 3;
    const rotated = indexes.slice(rotation).concat(indexes.slice(0, rotation));
    const options = rotated.map((lineIndex, optionIndex) => ({
      label: ["A", "B", "C"][optionIndex],
      lineIndex,
      text: lines[lineIndex],
    }));
    return {
      id: `guess-${String(questionIndex + 1).padStart(2, "0")}`,
      audioLineIndex: correctIndex,
      correctAnswer: options.find((option) => option.lineIndex === correctIndex).label,
      options,
    };
  });
}

function buildWord(lines) {
  return selectedIndexes.map((lineIndex, questionIndex) => ({
    id: `word-${String(questionIndex + 1).padStart(2, "0")}`,
    lineIndex,
    text: lines[lineIndex],
    task: "rebuild-then-speak",
    tokens: tokenize(lines[lineIndex]),
  }));
}

function lineRange(beatIndex) {
  return [beatIndex * 2, beatIndex * 2 + 1];
}

function mimicRange(items, beatIndex) {
  const [startLine, endLine] = lineRange(beatIndex);
  const indexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.sourceLineIndex >= startLine && item.sourceLineIndex <= endLine)
    .map(({ index }) => index);
  return [indexes[0], indexes.at(-1)];
}

if (sessions.length !== 12) fail("Authoring source must contain exactly 12 sessions.");
const coveredChapters = sessions.flatMap((session) => session.sourceChapters);
if (JSON.stringify(coveredChapters) !== JSON.stringify(Array.from({ length: 36 }, (_, index) => index + 1))) {
  fail("Sessions must cover original Chapters 1–36 exactly once and in order.");
}

const compiled = [];
for (const [sessionIndex, session] of sessions.entries()) {
  const number = sessionIndex + 1;
  const sessionDir = path.join(packRoot, "sessions", `session-${String(number).padStart(2, "0")}`);
  if (session.number !== number) fail(`Expected session ${number}.`);
  if (session.beats.length !== source.courseDesign.storyBeatsPerSession) fail(`Session ${number} needs eight beats.`);

  const levels = {};
  for (const levelId of levelOrder) {
    const lines = session.levels[levelId];
    if (!Array.isArray(lines) || lines.length !== source.courseDesign.narrationLinesPerLevel) {
      fail(`Session ${number} ${levelId} must contain exactly 16 lines.`);
    }
    if (new Set(lines).size !== lines.length) fail(`Session ${number} ${levelId} repeats a line.`);
    const mimicItems = buildMimicItems(lines, source.courseDesign.mimicUnitsPerLevel);
    levels[levelId] = {
      ...levelMeta[levelId],
      lines: lines.map((text, index) => ({ id: `line-${String(index + 1).padStart(2, "0")}`, text })),
      activities: {
        watch: {
          minutes: source.courseDesign.modeMinutes.watch,
          beforePromptsKo: session.watchPrompts.beforeKo,
          afterPromptsKo: session.watchPrompts.afterKo,
          protocol: [
            "predict-before-listening",
            "first-listen-without-captions",
            "answer-gist-prompts",
            "second-listen-with-captions",
          ],
        },
        mimic: {
          minutes: source.courseDesign.modeMinutes.mimic,
          protocol: ["listen", "chunk", "record", "compare", "retry"],
          source: "timestamped-segments-from-the-continuous-watch-master",
          items: mimicItems,
        },
        guess: {
          minutes: source.courseDesign.modeMinutes.guess,
          items: buildGuess(lines),
        },
        word: {
          minutes: source.courseDesign.modeMinutes.word,
          protocol: ["rebuild", "read-aloud", "use-in-retell"],
          items: buildWord(lines),
          retellPromptKo: session.retellPrompts[levelId],
        },
      },
      stats: stats(lines),
    };
  }

  const beats = session.beats.map((beat, beatIndex) => ({
    id: `beat-${String(beatIndex + 1).padStart(2, "0")}`,
    ...beat,
    lineRanges: Object.fromEntries(levelOrder.map((levelId) => [levelId, lineRange(beatIndex)])),
    mimicItemRanges: Object.fromEntries(levelOrder.map((levelId) => [levelId, mimicRange(levels[levelId].activities.mimic.items, beatIndex)])),
  }));

  const artReady = await exists(path.join(sessionDir, "assets", `session-${String(number).padStart(2, "0")}.png`));
  const generatedLevels = Object.fromEntries(await Promise.all(levelOrder.map(async (levelId) => [
    levelId,
    await exists(path.join(sessionDir, "audio", `${levelId}.master.mp3`)) && await exists(path.join(sessionDir, "audio", `${levelId}.timeline.json`)),
  ])));
  const corePilotReady = artReady && generatedLevels.core;
  const packCore = {
    schemaVersion: "2.0.0",
    contentId: `pinocchio-v2-session-${String(number).padStart(2, "0")}`,
    version: "2.0.0",
    status: corePilotReady ? "core-pilot-ready" : "text-ready-art-audio-pending",
    course: {
      title: "The Adventures of Pinocchio",
      session: number,
      totalSessions: source.courseDesign.sessions,
      minutes: source.courseDesign.minutesPerSession,
      modeMinutes: source.courseDesign.modeMinutes,
      learnerRule: source.courseDesign.learnerRule,
    },
    story: {
      slug: session.slug,
      sourceChapters: session.sourceChapters,
      titleEn: session.titleEn,
      titleKo: session.titleKo,
      guidingQuestionKo: session.guidingQuestionKo,
      synopsisKo: session.synopsisKo,
    },
    source: source.source,
    editorialPolicy: source.editorialPolicy,
    narration: {
      provider: "ElevenLabs",
      model: "eleven_v3",
      voiceStatus: corePilotReady ? "paid-pilot-voice-selected" : "awaiting-durable-paid-voice-selection",
      generationStatus: generatedLevels,
      outputPreference: "mp3_44100_192",
      direction: session.narrationDirection,
      productionRule: "Generate one continuous master per session and level; Watch and Mimic seek within that exact same master.",
      expectedAssets: Object.fromEntries(
        levelOrder.map((levelId) => [levelId, { master: `audio/${levelId}.master.mp3`, timeline: `audio/${levelId}.timeline.json` }])
      ),
    },
    livingStorybook: {
      status: artReady ? "asset-ready" : "brief-ready-asset-pending",
      expectedAsset: `assets/session-${String(number).padStart(2, "0")}.png`,
      artBrief: session.artBrief,
      beats,
    },
    levels,
  };
  const pack = { ...packCore, checksum: checksum(packCore) };
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(sessionDir, "pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
  compiled.push(pack);
}

const totals = Object.fromEntries(
  levelOrder.map((levelId) => [levelId, compiled.reduce((total, pack) => ({
    lines: total.lines + pack.levels[levelId].stats.lines,
    words: total.words + pack.levels[levelId].stats.words,
    characters: total.characters + pack.levels[levelId].stats.characters,
  }), { lines: 0, words: 0, characters: 0 })])
);
const manifestCore = {
  schemaVersion: "2.0.0",
  contentSetId: "pinocchio-v2-twelve-session-course",
  version: "2.0.0",
  status: "text-ready-art-audio-pending",
  source: source.source,
  courseDesign: source.courseDesign,
  curriculumMap: "CURRICULUM_MAP.md",
  instructorGuide: "INSTRUCTOR_GUIDE.md",
  contentQa: "CONTENT_QA.md",
  sourceChaptersCovered: coveredChapters,
  totals,
  sessions: compiled.map((pack) => ({
    number: pack.course.session,
    contentId: pack.contentId,
    slug: pack.story.slug,
    sourceChapters: pack.story.sourceChapters,
    titleEn: pack.story.titleEn,
    titleKo: pack.story.titleKo,
    path: `sessions/session-${String(pack.course.session).padStart(2, "0")}/pack.json`,
    checksum: pack.checksum,
    stats: Object.fromEntries(levelOrder.map((levelId) => [levelId, pack.levels[levelId].stats])),
  })),
};
await writeFile(path.join(packRoot, "manifest.json"), `${JSON.stringify({ ...manifestCore, checksum: checksum(manifestCore) }, null, 2)}\n`);
console.log(`Compiled ${compiled.length} Pinocchio sessions covering original Chapters 1–36.`);
