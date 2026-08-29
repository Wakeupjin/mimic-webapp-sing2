import { getProgress } from './progress';
import { fetchRetellProgressRows } from './storyRetellProgress';

export type LearnMode = 'watching' | 'mimicking' | 'guessing' | 'retelling' | 'word';

export const MODE_ORDER: LearnMode[] = ['watching', 'mimicking', 'guessing', 'retelling', 'word'];

export type ProgressRow = {
  lesson_number: number;
  mode: string;
  completed?: boolean | null;
  current_position?: number | null;
  updated_at?: string | null;
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
  if (lessonNumber >= 100 && lessonNumber % 100 <= 1) return true;
  return isModeCompleted(rows, lessonNumber - 1, 'word');
}

export function canAccessMode(
  rows: ProgressRow[] | null | undefined,
  lessonNumber: number,
  mode: LearnMode
) {
  if (!canAccessLesson(rows, lessonNumber)) return false;
  // 이미 시작한 기존 학습은 새 단계가 생겨도 다시 잠그지 않는다.
  if (rows?.some((row) => row.lesson_number === lessonNumber && row.mode === mode)) {
    return true;
  }
  const index = MODE_ORDER.indexOf(mode);
  if (index <= 0) return true;
  const prev = MODE_ORDER[index - 1];
  return isModeCompleted(rows, lessonNumber, prev);
}

export async function fetchOwnProgress() {
  const [progressRows, retellRows] = await Promise.all([
    getProgress().catch(() => []),
    fetchRetellProgressRows().catch(() => []),
  ]);
  const progress = progressRows as ProgressRow[];
  const retells = retellRows as ProgressRow[];
  const retoldLessons = new Set(retells.map((row) => row.lesson_number));

  // Story 도입 전 Word를 시작한 학습자는 그대로 이어 간다.
  const grandfatheredRetells = progress
    .filter((row) => row.mode === 'word' && !retoldLessons.has(row.lesson_number))
    .map((row) => ({
      lesson_number: row.lesson_number,
      mode: 'retelling',
      completed: true,
      current_position: 1,
      updated_at: row.updated_at,
    }));

  return [...progress, ...retells, ...grandfatheredRetells] as ProgressRow[];
}
