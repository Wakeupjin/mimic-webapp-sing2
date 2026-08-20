import { supabase } from './supabaseClient';
import { timeStringToSeconds } from './utils/timeConverter';
import { getVideoSource } from './utils/videoSource';

export type LessonSummary = {
  id: number;
  lesson_number: number;
  video_id: number;
};

export type LessonRecord = LessonSummary & {
  mimic_data: any;
  guessing_data: any;
  word_data: any;
  watch_start_sec: number;
  watch_end_sec: number;
};

export function parseLessonNumber(movieId: string): number {
  const parts = movieId.split(':');
  const n = parseInt(parts[parts.length - 1] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parsePack(movieId: string): number {
  const parts = movieId.split(':');
  if (parts.length < 2) return 1;
  const pack = parseInt(parts[0], 10);
  return Number.isFinite(pack) && pack > 0 ? pack : 1;
}

/** 진도·평가용. 002:1 → 201 이라 쉬운 레슨 1과 안 섞인다. */
export function parseProgressLesson(movieId: string): number {
  const pack = parsePack(movieId);
  const lesson = parseLessonNumber(movieId);
  return pack <= 1 ? lesson : pack * 100 + lesson;
}

export function formatMovieId(pack: number, lesson: number): string {
  return `${String(pack).padStart(3, '0')}:${lesson}`;
}

/** 화면에 쓰는 회차 이름. 진도 번호(201)와 섞지 않는다. */
export function formatChapterLabel(pack: number, lesson: number): string {
  return pack >= 2 ? `HARD ${lesson}` : `CHAPTER ${lesson}`;
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

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLesson(row: Record<string, unknown>, lessonNumber: number): LessonRecord {
  return {
    id: asNumber(row.id, lessonNumber),
    lesson_number: asNumber(row.lesson_number, lessonNumber),
    video_id: asNumber(row.video_id, 1) || 1,
    mimic_data: parseJsonField(row.mimic_data),
    guessing_data: parseJsonField(row.guessing_data),
    word_data: parseJsonField(row.word_data),
    watch_start_sec: asNumber(row.watch_start_sec, 0),
    watch_end_sec: asNumber(row.watch_end_sec, 0),
  };
}

async function fetchLessonFromJson(lessonNumber: number, pack = 1) {
  const path =
    pack >= 2
      ? `/movies/sing2/hard/lesson-${lessonNumber}.json`
      : `/movies/sing2/lesson-${lessonNumber}.json`;
  const response = await fetch(path);
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

export async function fetchLessonData(
  lessonNumber: number,
  pack = 1
): Promise<LessonRecord | null> {
  if (pack >= 2) {
    const local = await fetchLessonFromJson(lessonNumber, pack);
    if (!local) {
      console.error(`Hard lesson ${pack}:${lessonNumber} not found`);
    }
    return local;
  }

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
