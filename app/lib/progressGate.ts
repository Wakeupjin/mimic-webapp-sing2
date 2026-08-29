import { getProgress } from './progress';
import { fetchRetellProgressRows } from './storyRetellProgress';

export type LearnMode = 'watching' | 'mimicking' | 'guessing' | 'retelling' | 'word';

export type CoreLearnMode = Exclude<LearnMode, 'retelling'>;

export const MODE_ORDER: CoreLearnMode[] = ['watching', 'mimicking', 'guessing', 'word'];

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
  // Story는 코어 모드가 아니라 Word를 마친 뒤 여는 챕터 피날레다.
  if (mode === 'retelling') {
    return isModeCompleted(rows, lessonNumber, 'word');
  }
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
  return [...progress, ...retells] as ProgressRow[];
}
