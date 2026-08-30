import { MODE_ORDER, type LessonMode } from "./lessonData";

const STORAGE_KEY = "mimic:pinocchio-session-1:completed";

export function readCompleted(): LessonMode[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as LessonMode[];
    return MODE_ORDER.filter((mode) => value.includes(mode));
  } catch {
    return [];
  }
}

export function completeMode(mode: LessonMode) {
  if (typeof window === "undefined") return;
  const completed = readCompleted();
  if (!completed.includes(mode)) completed.push(mode);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(MODE_ORDER.filter((item) => completed.includes(item))));
  window.dispatchEvent(new Event("pinocchio-progress"));
}

export function resetProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("pinocchio-progress"));
}

export function canOpenMode(mode: LessonMode, completed: LessonMode[]) {
  const index = MODE_ORDER.indexOf(mode);
  return index === 0 || MODE_ORDER.slice(0, index).every((item) => completed.includes(item));
}
