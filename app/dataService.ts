import { supabase } from './supabaseClient';
import { timeStringToSeconds } from './utils/timeConverter';
import { getVideoSource } from './utils/videoSource';

export type LessonSummary = {
  id: number;
  lesson_number: number;
  video_id: number;
};

export function parseLessonNumber(movieId: string): number {
  const parts = movieId.split(':');
  return parseInt(parts[parts.length - 1] || '', 10);
}

type RawLessonJson = {
  watching?: { start: string; end: string };
  mimicking?: unknown[];
  guessing?: unknown[];
  word?: unknown[];
};

function parseJsonField(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value ?? [];
}

function normalizeLesson(row: Record<string, unknown>, lessonNumber: number) {
  return {
    ...row,
    id: row.id ?? lessonNumber,
    lesson_number: row.lesson_number ?? lessonNumber,
    video_id: row.video_id ?? 1,
    mimic_data: parseJsonField(row.mimic_data),
    guessing_data: parseJsonField(row.guessing_data),
    word_data: parseJsonField(row.word_data),
  };
}

async function fetchLessonFromJson(lessonNumber: number) {
  const response = await fetch(`/movies/sing2/lesson-${lessonNumber}.json`);
  if (!response.ok) {
    return null;
  }
  const raw = (await response.json()) as RawLessonJson;
  return normalizeLesson({
    watch_start_sec: raw.watching ? timeStringToSeconds(raw.watching.start) : 0,
    watch_end_sec: raw.watching ? timeStringToSeconds(raw.watching.end) : 0,
    mimic_data: raw.mimicking || [],
    guessing_data: raw.guessing || [],
    word_data: raw.word || [],
  }, lessonNumber);
}

function useLocalLessons() {
  return process.env.NEXT_PUBLIC_USE_LOCAL_LESSONS === 'true';
}

export async function fetchLessonData(lessonNumber: number) {
  if (useLocalLessons()) {
    const local = await fetchLessonFromJson(lessonNumber);
    if (!local) {
      console.error(`Lesson ${lessonNumber} not found in local JSON`);
      return null;
    }
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('lesson_number', lessonNumber)
      .maybeSingle();

    if (!error && data) {
      return normalizeLesson(data as Record<string, unknown>, lessonNumber);
    }

    if (error) {
      console.warn('Supabase lesson fetch failed, using local JSON:', error.message || error);
    }
  } catch (error) {
    console.warn('Supabase lesson fetch error, using local JSON:', error);
  }

  const local = await fetchLessonFromJson(lessonNumber);
  if (!local) {
    console.error(`Lesson ${lessonNumber} not found in Supabase or local JSON`);
    return null;
  }
  return local;
}

export async function fetchLessonSummaries(): Promise<LessonSummary[]> {
  const localFallback: LessonSummary[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    lesson_number: i + 1,
    video_id: 1,
  }));

  if (useLocalLessons()) {
    return localFallback;
  }

  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, lesson_number, video_id')
      .order('lesson_number', { ascending: true });

    if (!error && data && data.length > 0) {
      const byNumber = new Map(data.map((row) => [row.lesson_number, row]));
      return localFallback.map((row) => byNumber.get(row.lesson_number) || row);
    }
  } catch (error) {
    console.warn('Supabase lesson list error, using 1–12 fallback:', error);
  }

  return localFallback;
}

export async function resolveVideoUrl(videoId?: number | null): Promise<string> {
  if (videoId) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('video_url')
        .eq('id', videoId)
        .maybeSingle();

      if (!error && data?.video_url) {
        return data.video_url;
      }
    } catch (error) {
      console.warn('Supabase video URL error, using CDN:', error);
    }
  }

  return getVideoSource();
}
