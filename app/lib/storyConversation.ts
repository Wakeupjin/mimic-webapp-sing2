import type { LessonRecord } from '@/app/dataService';
import { srtTimeToSeconds } from '@/app/utils/timeUtils';

type StoryLine = {
  start?: unknown;
  startTime?: unknown;
  text?: unknown;
  correctAnswer?: unknown;
  options?: Array<{ label?: unknown; text?: unknown; start?: unknown }>;
};

function toSeconds(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.includes(':')) {
    const parsed = srtTimeToSeconds(value);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }
  return Number.MAX_SAFE_INTEGER;
}

function extractLine(item: StoryLine): { start: number; text: string } | null {
  const answer = String(item.correctAnswer || '');
  const correctOption = item.options?.find((option) => String(option.label || '') === answer);
  const text = String(correctOption?.text ?? item.text ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return {
    start: toSeconds(correctOption?.start ?? item.start ?? item.startTime),
    text,
  };
}

/**
 * AI가 아이의 자유 발화를 이야기 맥락 안에서 이해하도록 돕는 비공개 자료다.
 * 화면에 정답으로 노출하거나 아이의 문장을 원문과 대조하는 용도로 쓰지 않는다.
 */
export function buildStoryContext(lesson: LessonRecord): string {
  const collections = [lesson.mimic_data, lesson.guessing_data, lesson.word_data];
  const lines = collections
    .flatMap((collection) => (Array.isArray(collection) ? collection : []))
    .map((item) => extractLine((item || {}) as StoryLine))
    .filter((item): item is { start: number; text: string } => Boolean(item))
    .sort((left, right) => left.start - right.start);

  const seen = new Set<string>();
  const unique = lines.filter(({ text }) => {
    const key = text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique
    .slice(0, 36)
    .map(({ text }) => text)
    .join('\n')
    .slice(0, 5_000);
}
