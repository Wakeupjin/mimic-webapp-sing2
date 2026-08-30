import type { LessonMode, PinocchioPack, Timeline } from "./types";

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
  return `/dev/pinocchio-chapters/${chapterNumber}`;
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

function spokenSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, words * 0.43 + 0.7);
}

export function estimatedTimeline(pack: PinocchioPack): Timeline {
  let cursor = 0;
  const lines = pack.levels.core.lines.map((line) => {
    const start = cursor;
    const end = start + spokenSeconds(line.text);
    cursor = end + 0.18;
    return { ...line, start, end };
  });

  const mimicItems = pack.levels.core.activities.mimic.items.map((item) => {
    const source = lines[item.sourceLineIndex] ?? lines[0];
    const siblings = pack.levels.core.activities.mimic.items.filter(
      (candidate) => candidate.sourceLineIndex === item.sourceLineIndex
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
    return { ...item, start, end };
  });

  return { duration: Math.max(0, cursor - 0.18), lines, mimicItems };
}
