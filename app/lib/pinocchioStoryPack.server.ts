import "server-only";

import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  MimicActivityItem,
  PinocchioChapterMedia,
  PinocchioPack,
  Segment,
  StoryLevelId,
  Timeline,
} from "../dev/pinocchio-chapters/types";

export const PINOCCHIO_V3_LEVEL: StoryLevelId = "foundation";
export const PINOCCHIO_V3_LEVEL_LABEL = "초급 · Foundation";
export const PINOCCHIO_V3_PROGRESS_SCOPE = "v3-foundation";
export const PINOCCHIO_V3_LESSON_NUMBER_BASE = 400;
export const PINOCCHIO_TOTAL_CHAPTERS = 12;

export type PinocchioProductionRelease = "v2" | "v3-foundation";

type RawActivityOption = {
  id: string;
  sourceSentenceId: string;
  text: string;
};

type RawActivities = {
  level: StoryLevelId;
  mimic: MimicActivityItem[];
  guess: {
    id: string;
    options: RawActivityOption[];
    correctOptionId: string;
  }[];
  word: {
    id: string;
    sourceSentenceId: string;
    text: string;
    tokens: string[];
  }[];
};

type RawBeat = {
  beatId: string;
  title?: string;
  purpose?: string;
  sentenceStart: string;
  sentenceEnd: string;
};

type RawChapter = {
  chapterId: string;
  number: number;
  sourceChapters: number[];
  titles: { en: string; ko: string };
  continuity: { opening: string; closing: string };
  beats: RawBeat[];
  levels: Record<string, {
    master: string;
    activities: string;
    beatRanges?: RawBeat[];
  }>;
};

type RawSeasonMap = {
  chapters: {
    number: number;
    titleEn: string;
    titleKo: string;
    dramaticQuestion: string;
    endHook: string;
  }[];
};

type RawTimelineSegment = Partial<Segment> & {
  sentenceId?: string;
  chunkId?: string;
  part?: number;
  parts?: number;
  sourceTextRange?: [number, number];
};

type RawTimeline = {
  storyPackId?: string;
  chapterId?: string;
  level?: string;
  duration?: number;
  lines?: RawTimelineSegment[];
  mimicItems?: (RawTimelineSegment & { chunks?: RawTimelineSegment[] })[];
};

type WebReleaseCatalog = {
  storyPackId?: string;
  level?: string;
  channel?: string;
  releaseReady?: boolean;
  deploymentAllowed?: boolean;
  beta?: {
    active?: boolean;
    label?: string | null;
  };
  releaseGate?: {
    status?: string;
    blockers?: string[];
    authorization?: {
      releaseId?: string;
      authorizationType?: string;
      authorizedBy?: string;
      authorizedAt?: string;
      scope?: string;
      levels?: string[];
      authorizationSha256?: string;
    } | null;
  };
  chapters?: { chapter: number; audioUrl: string; timelineUrl: string }[];
};

export type PinocchioV3ChapterRelease = {
  pack: PinocchioPack;
  timeline: Timeline | null;
  media: PinocchioChapterMedia;
  mediaReady: boolean;
  mediaMessage: string;
  releaseBadge: string | null;
};

const repositoryRoot = process.cwd();
const packRoot = path.join(repositoryRoot, "content-packs", "pinocchio", "v3");
const publicRoot = path.join(repositoryRoot, "public", "books", "pinocchio", "v3", "foundation");

function chapterStem(chapterNumber: number) {
  return `chapter-${String(chapterNumber).padStart(2, "0")}`;
}

function assertChapterNumber(chapterNumber: number) {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > PINOCCHIO_TOTAL_CHAPTERS) {
    throw new Error(`Invalid Pinocchio Chapter: ${chapterNumber}`);
  }
}

function sentenceIndex(sentenceId: string) {
  const match = /^S(\d{3})$/.exec(sentenceId);
  if (!match) throw new Error(`Invalid Pinocchio sentence ID: ${sentenceId}`);
  return Number(match[1]) - 1;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function seconds(value: number | undefined, milliseconds: number | undefined) {
  if (Number.isInteger(milliseconds)) return milliseconds! / 1000;
  return Number.isFinite(value) ? value! : Number.NaN;
}

function normalizeSegment(raw: RawTimelineSegment, fallbackId: string): Segment {
  const start = seconds(raw.start, raw.startMs);
  const end = seconds(raw.end, raw.endMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !raw.text) {
    throw new Error(`Invalid published timing segment: ${fallbackId}`);
  }
  return {
    ...raw,
    id: raw.id ?? raw.sentenceId ?? raw.chunkId ?? fallbackId,
    text: raw.text,
    start,
    end,
  };
}

function normalizeTimeline(raw: RawTimeline, pack: PinocchioPack): Timeline {
  const level = pack.levels.foundation;
  if (
    raw.storyPackId !== "pinocchio-story-v3"
    || raw.chapterId !== chapterStem(pack.course.session)
    || raw.level !== PINOCCHIO_V3_LEVEL
    || !Number.isFinite(raw.duration)
    || !Array.isArray(raw.lines)
    || !Array.isArray(raw.mimicItems)
    || !level
  ) {
    throw new Error("Published Foundation timeline identity is invalid");
  }

  const lines = raw.lines.map((line, index) => normalizeSegment(line, `S${String(index + 1).padStart(3, "0")}`));
  const mimicItems = raw.mimicItems.map((item, index) => ({
    ...normalizeSegment(item, `M${String(index + 1).padStart(2, "0")}`),
    chunks: item.chunks?.map((chunk, chunkIndex) => ({
      ...normalizeSegment(chunk, `${item.id}-C${String(chunkIndex + 1).padStart(2, "0")}`),
      chunkId: chunk.chunkId ?? `${item.id}-C${String(chunkIndex + 1).padStart(2, "0")}`,
      part: Number(chunk.part),
      parts: Number(chunk.parts),
      sourceTextRange: chunk.sourceTextRange,
    })),
  }));

  if (
    lines.length !== level.lines.length
    || lines.some((line, index) => line.text !== level.lines[index].text)
    || mimicItems.length !== level.activities.mimic.items.length
    || mimicItems.some((item, index) => item.text !== level.activities.mimic.items[index].text)
  ) {
    throw new Error("Published Foundation timeline does not match its locked script and activities");
  }

  return { duration: raw.duration!, lines, mimicItems };
}

function publicMedia(chapterNumber: number): PinocchioChapterMedia & { audioPath: string; timelinePath: string } {
  const stem = chapterStem(chapterNumber);
  const directory = path.join(publicRoot, stem, "lily-british");
  const urlRoot = `/books/pinocchio/v3/foundation/${stem}/lily-british`;
  return {
    audioPath: path.join(directory, "master.mp3"),
    timelinePath: path.join(directory, "timeline.json"),
    audioSrc: `${urlRoot}/master.mp3`,
    timelineSrc: `${urlRoot}/timeline.json`,
    artSrc: null,
  };
}

async function webReleaseCatalog(): Promise<WebReleaseCatalog> {
  let catalog: WebReleaseCatalog;
  try {
    catalog = JSON.parse(await readFile(path.join(publicRoot, "release.json"), "utf8")) as WebReleaseCatalog;
  } catch {
    return {};
  }

  if (catalog.storyPackId !== "pinocchio-story-v3" || catalog.level !== PINOCCHIO_V3_LEVEL) {
    throw new Error("Published Foundation release catalog identity is invalid");
  }

  const productionEnvironment = process.env.VERCEL_ENV === "production";
  if (productionEnvironment && catalog.channel !== "production") {
    throw new Error("The Production build received a non-Production Foundation catalog");
  }

  if (catalog.channel === "production") {
    const chapters = catalog.chapters ?? [];
    const chapterNumbers = new Set(chapters.map((chapter) => chapter.chapter));
    const completeCatalog = chapters.length === PINOCCHIO_TOTAL_CHAPTERS
      && chapterNumbers.size === PINOCCHIO_TOTAL_CHAPTERS
      && Array.from({ length: PINOCCHIO_TOTAL_CHAPTERS }, (_, index) => index + 1).every((chapter) => chapterNumbers.has(chapter))
      && chapters.every((chapter) => typeof chapter.audioUrl === "string" && typeof chapter.timelineUrl === "string");
    const normalRelease = catalog.releaseReady === true
      && catalog.deploymentAllowed === true
      && catalog.releaseGate?.status === "passed";
    const authorization = catalog.releaseGate?.authorization;
    const betaRelease = catalog.releaseReady === false
      && catalog.deploymentAllowed === true
      && catalog.beta?.active === true
      && catalog.beta.label === "BETA · 검수 중"
      && catalog.releaseGate?.status === "public-beta-authorized"
      && authorization?.authorizationType === "product-owner-explicit-public-beta"
      && Array.isArray(authorization.levels)
      && authorization.levels.length === 1
      && authorization.levels[0] === PINOCCHIO_V3_LEVEL
      && typeof authorization.releaseId === "string"
      && typeof authorization.authorizedBy === "string"
      && typeof authorization.authorizedAt === "string"
      && /^sha256:[a-f0-9]{64}$/.test(authorization.authorizationSha256 ?? "")
      && Array.isArray(catalog.releaseGate.blockers)
      && catalog.releaseGate.blockers.length > 0;

    if (!completeCatalog || (!normalRelease && !betaRelease)) {
      throw new Error("Published Foundation Production catalog is incomplete or not deployment-authorized");
    }
  }

  return catalog;
}

export function productionPinocchioRelease(): PinocchioProductionRelease {
  return process.env.PINOCCHIO_PRODUCTION_RELEASE === "v2" ? "v2" : "v3-foundation";
}

function releaseBadge(catalog: WebReleaseCatalog) {
  return catalog.beta?.active === true && catalog.releaseGate?.status === "public-beta-authorized"
    ? catalog.beta.label ?? "BETA · 검수 중"
    : null;
}

export async function pinocchioV3ReleaseBadge() {
  if (productionPinocchioRelease() === "v2") return null;
  return releaseBadge(await webReleaseCatalog());
}

export async function foundationMediaAvailability() {
  const catalog = await webReleaseCatalog();
  const published = new Set(catalog.chapters?.map((chapter) => chapter.chapter) ?? []);
  return Promise.all(
    Array.from({ length: PINOCCHIO_TOTAL_CHAPTERS }, async (_, index) => {
      const chapterNumber = index + 1;
      const media = publicMedia(chapterNumber);
      return published.has(chapterNumber) && (await exists(media.audioPath)) && (await exists(media.timelinePath));
    }),
  );
}

export async function loadPinocchioV3FoundationChapter(chapterNumber: number): Promise<PinocchioV3ChapterRelease> {
  assertChapterNumber(chapterNumber);
  const stem = chapterStem(chapterNumber);
  const chapterRoot = path.join(packRoot, "chapters", stem);
  const chapter = JSON.parse(await readFile(path.join(chapterRoot, "chapter.json"), "utf8")) as RawChapter;
  const seasonMap = JSON.parse(await readFile(path.join(packRoot, "season-map.json"), "utf8")) as RawSeasonMap;
  const levelConfig = chapter.levels.foundation;
  if (chapter.number !== chapterNumber || !levelConfig) throw new Error(`${stem} Foundation source is invalid`);

  const masterText = await readFile(path.join(chapterRoot, levelConfig.master), "utf8");
  const activities = JSON.parse(await readFile(path.join(chapterRoot, levelConfig.activities), "utf8")) as RawActivities;
  if (activities.level !== PINOCCHIO_V3_LEVEL) throw new Error(`${stem} activities are not Foundation`);

  const lineTexts = masterText.trimEnd().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lines = lineTexts.map((text, index) => ({
    id: `S${String(index + 1).padStart(3, "0")}`,
    text,
  }));
  const lineIndexById = new Map(lines.map((line, index) => [line.id, index]));
  const lineIndex = (sentenceId: string) => {
    const index = lineIndexById.get(sentenceId);
    if (index === undefined) throw new Error(`${stem} references missing sentence ${sentenceId}`);
    return index;
  };

  const beatRanges = levelConfig.beatRanges ?? chapter.beats;
  const season = seasonMap.chapters.find((item) => item.number === chapterNumber);
  if (!season || beatRanges.length !== 8) throw new Error(`${stem} season metadata is incomplete`);

  const pack: PinocchioPack = {
    contentId: `pinocchio-story-v3-foundation-${stem}`,
    course: {
      session: chapterNumber,
      totalSessions: PINOCCHIO_TOTAL_CHAPTERS,
      minutes: 60,
      level: PINOCCHIO_V3_LEVEL,
      levelLabelKo: "초급",
    },
    story: {
      slug: stem,
      sourceChapters: chapter.sourceChapters,
      titleEn: chapter.titles.en,
      titleKo: chapter.titles.ko,
      synopsisKo: `${chapter.continuity.opening} ${chapter.continuity.closing}`,
    },
    livingStorybook: {
      status: "v3-visual-stage-pending",
      expectedAsset: `books/pinocchio/v3/foundation/${stem}/stage.png`,
      beats: beatRanges.map((beat) => ({
        id: beat.beatId,
        titleKo: beat.title ?? beat.beatId,
        summaryKo: beat.purpose ?? season.dramaticQuestion,
        lineRanges: {
          foundation: [sentenceIndex(beat.sentenceStart), sentenceIndex(beat.sentenceEnd)],
        },
      })),
    },
    levels: {
      foundation: {
        lines,
        activities: {
          mimic: { items: activities.mimic },
          guess: {
            items: activities.guess.map((item) => ({
              id: item.id,
              audioLineIndex: lineIndex(
                item.options.find((option) => option.id === item.correctOptionId)?.sourceSentenceId
                  ?? item.options[0]?.sourceSentenceId,
              ),
              correctAnswer: item.correctOptionId,
              options: item.options.map((option) => ({
                label: option.id,
                lineIndex: lineIndex(option.sourceSentenceId),
                text: option.text,
              })),
            })),
          },
          word: {
            items: activities.word.map((item) => ({
              id: item.id,
              lineIndex: lineIndex(item.sourceSentenceId),
              text: item.text,
              tokens: item.tokens,
            })),
          },
        },
      },
    },
  };

  const mediaPaths = publicMedia(chapterNumber);
  const catalog = await webReleaseCatalog();
  const catalogEntry = catalog.chapters?.find((entry) => entry.chapter === chapterNumber);
  const badge = releaseBadge(catalog);
  const media: PinocchioChapterMedia = {
    audioSrc: mediaPaths.audioSrc,
    timelineSrc: mediaPaths.timelineSrc,
    artSrc: (await exists(path.join(publicRoot, stem, "stage.png")))
      ? `/books/pinocchio/v3/foundation/${stem}/stage.png`
      : null,
  };

  if (!catalogEntry || !(await exists(mediaPaths.audioPath)) || !(await exists(mediaPaths.timelinePath))) {
    return {
      pack,
      timeline: null,
      media,
      mediaReady: false,
      mediaMessage: `Chapter ${chapterNumber} 초급 Lily 음원과 밀리초 타임라인을 제작 중입니다.`,
      releaseBadge: badge,
    };
  }

  try {
    const audio = await stat(mediaPaths.audioPath);
    if (audio.size < 1024) throw new Error("Published audio is empty");
    const rawTimeline = JSON.parse(await readFile(mediaPaths.timelinePath, "utf8")) as RawTimeline;
    const timeline = normalizeTimeline(rawTimeline, pack);
    return {
      pack,
      timeline,
      media,
      mediaReady: true,
      mediaMessage: badge
        ? `Chapter ${chapterNumber} 초급 Lily 공개 베타`
        : `Chapter ${chapterNumber} 초급 Lily 완성본`,
      releaseBadge: badge,
    };
  } catch (error) {
    console.error(`Pinocchio ${stem} Foundation media gate failed:`, error);
    return {
      pack,
      timeline: null,
      media,
      mediaReady: false,
      mediaMessage: `Chapter ${chapterNumber} 초급 음원 검증이 끝나지 않아 잠겨 있습니다.`,
      releaseBadge: badge,
    };
  }
}
