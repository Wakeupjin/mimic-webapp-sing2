import { supabase } from '../supabaseClient';

export type TrackedMode = 'watching' | 'mimicking' | 'guessing' | 'word';

export function parseLessonNumber(movieId: string | null): number {
  if (!movieId) return 1;
  const part = movieId.split(':')[1];
  const n = parseInt(part || '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseTrackedMode(pathname: string): TrackedMode | null {
  const segment = pathname.split('/').filter(Boolean).pop() || '';
  if (
    segment === 'watching' ||
    segment === 'mimicking' ||
    segment === 'guessing' ||
    segment === 'word'
  ) {
    return segment;
  }
  return null;
}

export async function startLearningSession(
  lessonNumber: number,
  mode: TrackedMode
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('learning_sessions')
    .insert({
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      started_at: now,
      last_heartbeat_at: now,
      duration_seconds: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[session] start skipped:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function heartbeatLearningSession(sessionId: string, startedAtIso: string) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000)
  );
  const { error } = await supabase
    .from('learning_sessions')
    .update({
      last_heartbeat_at: new Date().toISOString(),
      duration_seconds: elapsed,
    })
    .eq('id', sessionId);

  if (error) {
    console.warn('[session] heartbeat skipped:', error.message);
  }
}

export async function endLearningSession(sessionId: string, startedAtIso: string) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000)
  );
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('learning_sessions')
    .update({
      last_heartbeat_at: now,
      ended_at: now,
      duration_seconds: elapsed,
    })
    .eq('id', sessionId);

  if (error) {
    console.warn('[session] end skipped:', error.message);
  }
}
