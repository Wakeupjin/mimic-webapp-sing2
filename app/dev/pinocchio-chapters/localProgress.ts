import { MODE_ORDER, chapterRoot } from "./lessonData";
import type { LessonMode } from "./types";
import type { ProgressRow } from "../../lib/progressGate";

const STORAGE_KEY = "mimic:pinocchio-chapters:progress:v1";
const LEGACY_STORAGE_KEY = "mimic:pinocchio-session-1:completed";
const PROGRESS_EVENT = "pinocchio-progress";

export type ChapterProgress = Record<string, LessonMode[]>;

export const LEGACY_PINOCCHIO_PROGRESS_SCOPE = "v2-core";
export const LEGACY_PINOCCHIO_LESSON_NUMBER_BASE = 300;

function storageKey(scope: string) {
  return scope === LEGACY_PINOCCHIO_PROGRESS_SCOPE
    ? STORAGE_KEY
    : `mimic:pinocchio-chapters:progress:${scope}`;
}

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

export function readProgress(scope = LEGACY_PINOCCHIO_PROGRESS_SCOPE): ChapterProgress {
  if (typeof window === "undefined") return {};
  try {
    const key = storageKey(scope);
    const saved = window.localStorage.getItem(key);
    if (saved) return sanitizeProgress(JSON.parse(saved));

    if (scope !== LEGACY_PINOCCHIO_PROGRESS_SCOPE) return {};
    const legacy = sanitizeModes(JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || "[]"));
    if (!legacy.length) return {};
    const migrated = { "1": legacy };
    window.localStorage.setItem(key, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

export function readCompleted(chapterNumber: number, scope = LEGACY_PINOCCHIO_PROGRESS_SCOPE) {
  return readProgress(scope)[String(chapterNumber)] ?? [];
}

export function mergeRemoteProgress(
  rows: ProgressRow[],
  scope = LEGACY_PINOCCHIO_PROGRESS_SCOPE,
  lessonNumberBase = LEGACY_PINOCCHIO_LESSON_NUMBER_BASE,
) {
  const progress = readProgress(scope);

  for (const row of rows) {
    const chapterNumber = row.lesson_number - lessonNumberBase;
    const mode = row.mode as LessonMode;
    if (
      !row.completed
      || chapterNumber < 1
      || chapterNumber > 12
      || !MODE_ORDER.includes(mode)
    ) {
      continue;
    }

    const completed = progress[String(chapterNumber)] ?? [];
    progress[String(chapterNumber)] = MODE_ORDER.filter(
      (item) => item === mode || completed.includes(item)
    );
  }

  const merged = sanitizeProgress(progress);
  window.localStorage.setItem(storageKey(scope), JSON.stringify(merged));
  return merged;
}

export function completeMode(
  chapterNumber: number,
  mode: LessonMode,
  scope = LEGACY_PINOCCHIO_PROGRESS_SCOPE,
) {
  if (typeof window === "undefined") return;
  const progress = readProgress(scope);
  const completed = progress[String(chapterNumber)] ?? [];
  progress[String(chapterNumber)] = MODE_ORDER.filter(
    (item) => item === mode || completed.includes(item)
  );
  window.localStorage.setItem(storageKey(scope), JSON.stringify(progress));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function resetProgress(scope = LEGACY_PINOCCHIO_PROGRESS_SCOPE) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(scope));
  if (scope === LEGACY_PINOCCHIO_PROGRESS_SCOPE) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
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
