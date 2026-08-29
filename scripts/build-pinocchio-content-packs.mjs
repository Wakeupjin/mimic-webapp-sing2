import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v1");
const authoringRoot = path.join(packRoot, "authoring");
const sourceMetaPath = path.join(authoringRoot, "source.json");
const chapterSourcePaths = [
  path.join(authoringRoot, "chapters-01-04.json"),
  path.join(authoringRoot, "chapters-05-08.json"),
  path.join(authoringRoot, "chapters-09-12.json"),
];
const styleGuidePath = path.join(packRoot, "style-guide.json");

const sourceMeta = JSON.parse(await readFile(sourceMetaPath, "utf8"));
const chapterGroups = await Promise.all(
  chapterSourcePaths.map(async (sourcePath) => JSON.parse(await readFile(sourcePath, "utf8")))
);
const source = {
  ...sourceMeta,
  chapters: chapterGroups.flatMap((group) => group.chapters),
};
const styleGuide = JSON.parse(await readFile(styleGuidePath, "utf8"));

const levelOrder = ["foundation", "core", "studio"];
const levelMeta = {
  foundation: {
    label: "Foundation",
    readingBand: "A1–A2",
    goalKo: "짧고 구체적인 문장으로 사건 순서를 말한다.",
  },
  core: {
    label: "Core",
    readingBand: "A2–B1",
    goalKo: "원인과 반응을 연결해 자연스러운 리듬으로 말한다.",
  },
  studio: {
    label: "Studio",
    readingBand: "B1–B2",
    goalKo: "복문, 분위기, 서술자의 유머를 살려 읽고 설명한다.",
  },
};

function fail(message) {
  throw new Error(message);
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function wordCount(lines) {
  return lines.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function characterCount(lines) {
  return lines.join("\n").length;
}

function lineRange(total, beatIndex, beatCount) {
  const start = Math.floor((beatIndex * total) / beatCount);
  const end = Math.max(start, Math.floor(((beatIndex + 1) * total) / beatCount) - 1);
  return [start, end];
}

function buildGuess(lines, selectedIndexes) {
  return selectedIndexes.map((correctIndex, questionIndex) => {
    const offsets = [0, Math.max(1, Math.floor(lines.length / 3)), Math.max(2, Math.floor((lines.length * 2) / 3))];
    const candidates = offsets.map((offset) => (correctIndex + offset) % lines.length);
    const unique = [...new Set(candidates)];
    for (let index = 0; unique.length < 3; index += 1) {
      if (!unique.includes(index) && index !== correctIndex) unique.push(index);
    }
    const rotated = unique.slice(questionIndex % 3).concat(unique.slice(0, questionIndex % 3));
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

function buildWord(lines, selectedIndexes) {
  return selectedIndexes.map((lineIndex, questionIndex) => ({
    id: `word-${String(questionIndex + 1).padStart(2, "0")}`,
    lineIndex,
    text: lines[lineIndex],
    tokens: lines[lineIndex].match(/[A-Za-z]+(?:['’][A-Za-z]+)?|[.,!?;:—-]/g) || [],
  }));
}

if (!Array.isArray(source.chapters) || source.chapters.length !== 12) {
  fail("Authoring source must contain exactly 12 chapters.");
}

const compiled = [];
for (const [chapterIndex, chapter] of source.chapters.entries()) {
  const expectedNumber = chapterIndex + 1;
  if (chapter.number !== expectedNumber) fail(`Expected chapter ${expectedNumber}.`);
  if (!Array.isArray(chapter.beats) || chapter.beats.length !== 6) {
    fail(`Chapter ${chapter.number} must contain exactly six story beats.`);
  }

  const levels = {};
  for (const levelId of levelOrder) {
    const lines = chapter.levels?.[levelId];
    if (!Array.isArray(lines) || lines.length < 8) {
      fail(`Chapter ${chapter.number} ${levelId} must have at least eight lines.`);
    }
    if (lines.some((line) => typeof line !== "string" || !line.trim())) {
      fail(`Chapter ${chapter.number} ${levelId} contains an empty line.`);
    }
    const activityIndexes = [1, Math.floor(lines.length / 3), Math.floor((lines.length * 2) / 3), lines.length - 2];
    levels[levelId] = {
      ...levelMeta[levelId],
      lines: lines.map((text, index) => ({ id: `line-${String(index + 1).padStart(2, "0")}`, text })),
      activities: {
        mimic: lines.map((text, index) => ({ lineIndex: index, text })),
        guess: buildGuess(lines, activityIndexes),
        word: buildWord(lines, activityIndexes),
        retellPromptKo: chapter.retellPrompts[levelId],
      },
      stats: {
        lines: lines.length,
        words: wordCount(lines),
        characters: characterCount(lines),
      },
    };
  }

  const beats = chapter.beats.map((beat, beatIndex) => ({
    id: `beat-${String(beatIndex + 1).padStart(2, "0")}`,
    ...beat,
    lineRanges: Object.fromEntries(
      levelOrder.map((levelId) => [levelId, lineRange(chapter.levels[levelId].length, beatIndex, chapter.beats.length)])
    ),
  }));

  const packCore = {
    schemaVersion: "1.0.0",
    contentId: `pinocchio-v1-chapter-${String(chapter.number).padStart(2, "0")}`,
    version: "1.0.0",
    status: "content-ready-audio-pending",
    story: {
      title: "The Adventures of Pinocchio",
      chapter: chapter.number,
      slug: chapter.slug,
      titleEn: chapter.titleEn,
      titleKo: chapter.titleKo,
      synopsisKo: chapter.synopsisKo,
    },
    source: source.source,
    editorialPolicy: source.editorialPolicy,
    narration: {
      provider: "ElevenLabs",
      model: "eleven_v3",
      voiceStatus: "awaiting-durable-paid-voice-selection",
      generationStatus: "not-generated",
      outputPreference: "mp3_44100_192",
      direction: chapter.narrationDirection,
      productionRule: "Generate one continuous master per level and derive sentence timestamps from that same master.",
      expectedAssets: Object.fromEntries(
        levelOrder.map((levelId) => [
          levelId,
          {
            master: `audio/${levelId}.master.mp3`,
            timeline: `audio/${levelId}.timeline.json`,
          },
        ])
      ),
    },
    livingStorybook: {
      styleGuide: "../../style-guide.json",
      panorama: `../../assets/chapter-${String(chapter.number).padStart(2, "0")}.png`,
      artBrief: chapter.artBrief,
      beats,
    },
    levels,
  };

  const pack = { ...packCore, checksum: checksum(packCore) };
  const chapterDir = path.join(packRoot, "chapters", `chapter-${String(chapter.number).padStart(2, "0")}`);
  await mkdir(chapterDir, { recursive: true });
  await writeFile(path.join(chapterDir, "pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
  compiled.push(pack);
}

const manifestCore = {
  schemaVersion: "1.0.0",
  contentSetId: "pinocchio-v1-chapters-01-12",
  version: "1.0.0",
  status: "content-ready-audio-pending",
  source: source.source,
  styleGuide: "style-guide.json",
  imagePromptRecord: "IMAGE_PROMPTS.md",
  overviewImage: "assets/chapters-overview.jpg",
  audioGeneration: {
    script: "../../../scripts/generate-pinocchio-content-pack-audio.mjs",
    model: "eleven_v3",
    continuousMasters: 36,
    status: "awaiting-durable-paid-voice-selection",
  },
  chapters: compiled.map((pack) => ({
    number: pack.story.chapter,
    contentId: pack.contentId,
    slug: pack.story.slug,
    titleEn: pack.story.titleEn,
    titleKo: pack.story.titleKo,
    path: `chapters/chapter-${String(pack.story.chapter).padStart(2, "0")}/pack.json`,
    checksum: pack.checksum,
    stats: Object.fromEntries(levelOrder.map((levelId) => [levelId, pack.levels[levelId].stats])),
  })),
};

await writeFile(
  path.join(packRoot, "manifest.json"),
  `${JSON.stringify({ ...manifestCore, checksum: checksum(manifestCore) }, null, 2)}\n`
);

console.log(`Compiled ${compiled.length} Pinocchio chapter packs.`);
