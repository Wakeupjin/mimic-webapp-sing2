import { getProgress } from './progress';

export type LearnMode = 'watching' | 'mimicking' | 'guessing' | 'word';

export const MODE_ORDER: LearnMode[] = ['watching', 'mimicking', 'guessing', 'word'];

export type ProgressRow = {
  lesson_number: number;
  mode: string;
  completed?: boolean | null;
  current_position?: number | null;
};

export function isMasterRole(role?: string | null) {
  return role === 'academy';
}

export function isModeCompleted(rows: ProgressRow[] | null | undefined, lessonNumber: number, mode: LearnMode) {
  return Boolean(
    rows?.some(
      (row) => row.lesson_number === lessonNumber && row.mode === mode && row.completed
    )
  );
}

export function canAccessLesson(rows: ProgressRow[] | null | undefined, lessonNumber: number) {
  if (lessonNumber <= 1) return true;
  return isModeCompleted(rows, lessonNumber - 1, 'word');
}

export function canAccessMode(
  rows: ProgressRow[] | null | undefined,
  lessonNumber: number,
  mode: LearnMode
) {
  if (!canAccessLesson(rows, lessonNumber)) return false;
  const index = MODE_ORDER.indexOf(mode);
  if (index <= 0) return true;
  const prev = MODE_ORDER[index - 1];
  return isModeCompleted(rows, lessonNumber, prev);
}

export async function fetchOwnProgress() {
  try {
    return (await getProgress()) as ProgressRow[];
  } catch {
    return [] as ProgressRow[];
  }
}
