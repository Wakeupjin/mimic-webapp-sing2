import { MODE_ORDER, chapterRoot } from "./lessonData";
import type { LessonMode } from "./types";

const STORAGE_KEY = "mimic:pinocchio-chapters:progress:v1";
const LEGACY_STORAGE_KEY = "mimic:pinocchio-session-1:completed";
const PROGRESS_EVENT = "pinocchio-progress";

export type ChapterProgress = Record<string, LessonMode[]>;

function sanitizeModes(value: unknown): LessonMode[] {
  if (!Array.isArray(value)) return [];
  return MODE_ORDER.filter((mode) => value.includes(mode));
}

function sanitizeProgress(value: unknown): ChapterProgress {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([chapter, modes]) => {
      const chapterNumber = Number(chapter);
      if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 12) return [];
      return [[String(chapterNumber), sanitizeModes(modes)]];
    })
  );
}

export function readProgress(): ChapterProgress {
  if (typeof window === "undefined") return {};
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return sanitizeProgress(JSON.parse(saved));

    const legacy = sanitizeModes(JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || "[]"));
    if (!legacy.length) return {};
    const migrated = { "1": legacy };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

export function readCompleted(chapterNumber: number) {
  return readProgress()[String(chapterNumber)] ?? [];
}

export function completeMode(chapterNumber: number, mode: LessonMode) {
  if (typeof window === "undefined") return;
  const progress = readProgress();
  const completed = progress[String(chapterNumber)] ?? [];
  progress[String(chapterNumber)] = MODE_ORDER.filter(
    (item) => item === mode || completed.includes(item)
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function resetProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function canOpenMode(mode: LessonMode, completed: LessonMode[]) {
  const index = MODE_ORDER.indexOf(mode);
  return index === 0 || MODE_ORDER.slice(0, index).every((item) => completed.includes(item));
}

export function canOpenChapter(chapterNumber: number, progress: ChapterProgress) {
  if (chapterNumber === 1) return true;
  return (progress[String(chapterNumber - 1)] ?? []).includes("word");
}

export function latestOpenChapter(progress: ChapterProgress) {
  let latest = 1;
  for (let chapterNumber = 2; chapterNumber <= 12; chapterNumber += 1) {
    if (!canOpenChapter(chapterNumber, progress)) break;
    latest = chapterNumber;
  }
  return latest;
}

export function safeChapterRoot(chapterNumber: number, progress: ChapterProgress) {
  return canOpenChapter(chapterNumber, progress)
    ? chapterRoot(chapterNumber)
    : chapterRoot(latestOpenChapter(progress));
}

export const PINOCCHIO_PROGRESS_EVENT = PROGRESS_EVENT;
