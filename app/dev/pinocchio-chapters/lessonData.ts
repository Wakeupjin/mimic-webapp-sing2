import type {
  LessonMode,
  MimicActivityItem,
  MimicChunk,
  MimicPracticeItem,
  MimicTimelineItem,
  PinocchioPack,
  Segment,
  Timeline,
} from "./types";

export const MODE_ORDER: LessonMode[] = ["watching", "mimicking", "guessing", "word"];

export const MODE_LABEL: Record<LessonMode, string> = {
  watching: "Watch",
  mimicking: "Mimic",
  guessing: "Guess",
  word: "Word",
};

export function parseChapterNumber(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d+$/.test(text)) return null;
  const chapterNumber = Number(text);
  return Number.isInteger(chapterNumber) && chapterNumber >= 1 && chapterNumber <= 12
    ? chapterNumber
    : null;
}

export function chapterRoot(chapterNumber: number) {
  return `/book/pinocchio/${chapterNumber}`;
}

export function modeHref(chapterNumber: number, mode: LessonMode) {
  return `${chapterRoot(chapterNumber)}/${mode}`;
}

function mediaStem(chapterNumber: number) {
  return `session-${String(chapterNumber).padStart(2, "0")}`;
}

export function chapterMedia(chapterNumber: number) {
  const stem = mediaStem(chapterNumber);
  const audioRoot = `/prototype-audio/pinocchio-v2/${stem}/lily-british`;
  return {
    artSrc: `/prototype-art/pinocchio-v2/${stem}.png`,
    audioSrc: `${audioRoot}/core.master.mp3`,
    timelineSrc: `${audioRoot}/core.timeline.json`,
  };
}

export function sourceLineForMimic(pack: PinocchioPack, index: number) {
  return pack.levels.core.activities.mimic.items[index]?.sourceLineIndex ?? 0;
}

function seconds(value: number | undefined, milliseconds: number | undefined, fallback: number) {
  if (Number.isInteger(milliseconds)) return milliseconds! / 1000;
  return Number.isFinite(value) ? value! : fallback;
}

function sourceLineIndexFor(
  authored: MimicActivityItem,
  timed: MimicTimelineItem | undefined,
  timeline: Timeline,
) {
  const direct = authored.sourceLineIndex ?? timed?.sourceLineIndex;
  if (Number.isInteger(direct)) return Math.max(0, direct!);
  const sentenceId = authored.sourceSentenceId ?? timed?.sourceSentenceId;
  const matched = sentenceId
    ? timeline.lines.findIndex((line) => line.id === sentenceId || line.sentenceId === sentenceId || line.sourceSentenceId === sentenceId)
    : -1;
  return Math.max(0, matched);
}

function normalizedSegment(
  raw: Partial<Segment> | undefined,
  fallback: Segment,
  id: string,
  text: string,
): Segment {
  const start = seconds(raw?.start, raw?.startMs, fallback.start);
  const end = Math.max(start + 0.01, seconds(raw?.end, raw?.endMs, fallback.end));
  return {
    ...fallback,
    ...raw,
    id,
    text,
    start,
    end,
  };
}

function estimatedChunk(
  parent: Segment,
  item: MimicActivityItem,
  chunk: NonNullable<MimicActivityItem["chunks"]>[number],
): MimicChunk {
  const [from, to] = chunk.sourceTextRange ?? [0, item.text.length];
  const parentLength = Math.max(1, item.text.length);
  const duration = Math.max(0.01, parent.end - parent.start);
  return {
    ...normalizedSegment(
      undefined,
      {
        ...parent,
        start: parent.start + duration * (from / parentLength),
        end: parent.start + duration * (to / parentLength),
      },
      chunk.chunkId,
      chunk.text,
    ),
    chunkId: chunk.chunkId,
    part: chunk.part,
    parts: chunk.parts,
    sourceTextRange: chunk.sourceTextRange,
  };
}

/**
 * Keeps the learner-facing Mimic count at one item per authored source sentence,
 * while exposing exact nested timing ranges for natural-breath practice chunks.
 * Legacy v2 flat items become a single-chunk item, so Sing2 and released book
 * lessons keep their existing behavior until a v3 pack/timeline is selected.
 */
export function mimicPracticeItems(pack: PinocchioPack, timeline: Timeline): MimicPracticeItem[] {
  return pack.levels.core.activities.mimic.items.map((authored, index) => {
    const timed = timeline.mimicItems.find((item) => item.id === authored.id)
      ?? timeline.mimicItems[index];
    const sourceLineIndex = sourceLineIndexFor(authored, timed, timeline);
    const sourceLine = timeline.lines[sourceLineIndex] ?? {
      id: authored.sourceSentenceId ?? authored.id,
      text: authored.text,
      start: 0,
      end: spokenSeconds(authored.text),
    };
    const parent = normalizedSegment(timed, sourceLine, authored.id, authored.text);
    const authoredChunks = authored.chunks ?? [];
    const chunks = authoredChunks.length
      ? authoredChunks.map((chunk) => {
          const timedChunk = timed?.chunks?.find((candidate) => candidate.chunkId === chunk.chunkId);
          if (!timedChunk) return estimatedChunk(parent, authored, chunk);
          return {
            ...normalizedSegment(timedChunk, parent, chunk.chunkId, chunk.text),
            chunkId: chunk.chunkId,
            part: chunk.part,
            parts: chunk.parts,
            sourceTextRange: chunk.sourceTextRange,
          };
        })
      : [{
          ...parent,
          chunkId: `${authored.id}-C01`,
          part: 1,
          parts: 1,
          sourceTextRange: authored.sourceTextRange,
        }];

    return {
      id: authored.id,
      text: authored.text,
      sourceLineIndex,
      segment: parent,
      chunks,
    };
  });
}

function spokenSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, words * 0.43 + 0.7);
}

export function estimatedTimeline(pack: PinocchioPack): Timeline {
  let cursor = 0;
  const lines: Segment[] = pack.levels.core.lines.map((line) => {
    const start = cursor;
    const end = start + spokenSeconds(line.text);
    cursor = end + 0.18;
    return { ...line, start, end };
  });

  const mimicItems = pack.levels.core.activities.mimic.items.map((item) => {
    const sourceLineIndex = item.sourceLineIndex
      ?? lines.findIndex((line) => line.id === item.sourceSentenceId || line.sentenceId === item.sourceSentenceId);
    const safeSourceLineIndex = Math.max(0, sourceLineIndex);
    const source = lines[safeSourceLineIndex] ?? lines[0];
    const siblings = pack.levels.core.activities.mimic.items.filter(
      (candidate) => (candidate.sourceLineIndex ?? candidate.sourceSentenceId)
        === (item.sourceLineIndex ?? item.sourceSentenceId)
    );
    const siblingIndex = Math.max(0, siblings.findIndex((candidate) => candidate.id === item.id));
    const totalWeight = siblings.reduce((sum, candidate) => sum + spokenSeconds(candidate.text), 0);
    const elapsedWeight = siblings
      .slice(0, siblingIndex)
      .reduce((sum, candidate) => sum + spokenSeconds(candidate.text), 0);
    const itemWeight = spokenSeconds(item.text);
    const sourceDuration = Math.max(0.1, source.end - source.start);
    const start = source.start + sourceDuration * (elapsedWeight / totalWeight);
    const end = source.start + sourceDuration * ((elapsedWeight + itemWeight) / totalWeight);
    const parent = { ...item, sourceLineIndex: safeSourceLineIndex, start, end };
    const chunks = (item.chunks ?? []).map((chunk) => estimatedChunk(parent, item, chunk));
    return { ...parent, chunks: chunks.length ? chunks : undefined };
  });

  return { duration: Math.max(0, cursor - 0.18), lines, mimicItems };
}
