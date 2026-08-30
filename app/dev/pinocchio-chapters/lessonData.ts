import type { LessonMode, PinocchioPack } from "./types";

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
    mimicAudioRoot: audioRoot,
    timelineSrc: `${audioRoot}/core.timeline.json`,
  };
}

export function sourceLineForMimic(pack: PinocchioPack, index: number) {
  return pack.levels.core.activities.mimic.items[index]?.sourceLineIndex ?? 0;
}
