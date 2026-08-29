import { supabase } from '../supabaseClient';
import type { StoryRetellProgressPayload } from '../types/storyRetell';

type RetellProgressRow = {
  lesson_number: number;
  mode: 'retelling';
  completed: boolean;
  current_position: number;
  updated_at?: string | null;
};

const LOCAL_PREFIX = 'mimic:story-retell-complete:';

function localKey(userId: string, lessonNumber: number) {
  return `${LOCAL_PREFIX}${userId}:${lessonNumber}`;
}

function readLocalRows(userId: string): RetellProgressRow[] {
  if (typeof window === 'undefined') return [];
  const prefix = `${LOCAL_PREFIX}${userId}:`;
  const rows: RetellProgressRow[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const lessonNumber = Number(key.slice(prefix.length));
      if (!Number.isFinite(lessonNumber) || lessonNumber < 1) continue;
      rows.push({
        lesson_number: lessonNumber,
        mode: 'retelling',
        completed: true,
        current_position: 1,
        updated_at: window.localStorage.getItem(key),
      });
    }
  } catch {
    return [];
  }

  return rows;
}

export async function fetchRetellProgressRows(): Promise<RetellProgressRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const localRows = readLocalRows(user.id);
  const { data, error } = await supabase
    .from('learning_evaluations')
    .select('lesson_number, payload, updated_at')
    .eq('student_id', user.id)
    .eq('mode', 'retelling');

  if (error) {
    console.warn('[story-retell] progress load skipped:', error.message);
    return localRows;
  }

  const serverRows = (data || [])
    .filter((row) => Boolean((row.payload as Record<string, unknown> | null)?.completed))
    .map((row) => ({
      lesson_number: row.lesson_number,
      mode: 'retelling' as const,
      completed: true,
      current_position: 1,
      updated_at: row.updated_at,
    }));
  const byLesson = new Map<number, RetellProgressRow>();
  [...localRows, ...serverRows].forEach((row) => byLesson.set(row.lesson_number, row));
  return [...byLesson.values()];
}

export async function saveStoryRetellProgress(
  lessonNumber: number,
  payload: StoryRetellProgressPayload
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // 네트워크가 흔들려도 같은 기기에서는 Word로 이어 갈 수 있게 먼저 표시한다.
  let savedLocally = false;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(localKey(user.id, lessonNumber), payload.completedAt);
      savedLocally = true;
    } catch {
      // 사생활 보호 모드처럼 저장소가 막힌 경우 서버 기록만 사용한다.
    }
  }

  const { error } = await supabase.from('learning_evaluations').upsert(
    {
      student_id: user.id,
      lesson_number: lessonNumber,
      mode: 'retelling',
      payload,
      updated_at: payload.completedAt,
    },
    { onConflict: 'student_id,lesson_number,mode' }
  );

  if (error) {
    console.warn('[story-retell] progress save skipped:', error.message);
    return savedLocally;
  }
  return true;
}
