import type { LessonRecord } from '../dataService';
import { srtTimeToSeconds } from '../utils/timeUtils';

export type StoryRecallCue = {
  id: string;
  label: 'BEGIN' | 'MIDDLE' | 'END';
  start: number;
  end: number;
};

type TimedItem = {
  start?: unknown;
  end?: unknown;
  video?: { start?: unknown; end?: unknown };
  correctAnswer?: unknown;
  options?: Array<{ label?: unknown; start?: unknown; end?: unknown }>;
};

function toSeconds(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.includes(':')) return null;
  const parsed = srtTimeToSeconds(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function candidateFrom(item: TimedItem) {
  const direct = item.video || item;
  let start = toSeconds(direct.start);
  let end = toSeconds(direct.end);

  if ((start == null || end == null) && Array.isArray(item.options)) {
    const answer = String(item.correctAnswer || '');
    const option = item.options.find((entry) => String(entry.label || '') === answer);
    start = toSeconds(option?.start);
    end = toSeconds(option?.end);
  }

  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function normalizeCandidates(items: unknown[]) {
  const sorted = items
    .map((item) => candidateFrom((item || {}) as TimedItem))
    .filter((item): item is { start: number; end: number } => Boolean(item))
    .sort((a, b) => a.start - b.start);

  return sorted.filter((item, index) => {
    const previous = sorted[index - 1];
    return !previous || Math.abs(item.start - previous.start) > 0.75;
  });
}

/**
 * Story Finale는 임의의 챕터 시작점이 아니라 학습자가 실제 연습한
 * 문장들의 처음·가운데·끝을 회상 단서로 쓴다. 이 세 장면은 말하기
 * 횟수 제한이 아니라 이야기 순서를 떠올리기 위한 선택형 도움이다.
 */
export function buildStoryRecallCues(lesson: LessonRecord): StoryRecallCue[] {
  const practiced = normalizeCandidates([
    ...(Array.isArray(lesson.word_data) ? lesson.word_data : []),
    ...(Array.isArray(lesson.guessing_data) ? lesson.guessing_data : []),
  ]);
  const candidates = practiced.length > 0
    ? practiced
    : normalizeCandidates(Array.isArray(lesson.mimic_data) ? lesson.mimic_data : []);

  if (candidates.length === 0) return [];

  const anchors: Array<{ position: number; label: StoryRecallCue['label'] }> = [
    { position: 0, label: 'BEGIN' },
    { position: Math.floor((candidates.length - 1) / 2), label: 'MIDDLE' },
    { position: candidates.length - 1, label: 'END' },
  ];
  const lessonStart = Number(lesson.watch_start_sec);
  const lessonEnd = Number(lesson.watch_end_sec);
  const startBoundary = Number.isFinite(lessonStart) ? Math.max(0, lessonStart) : 0;

  return anchors
    .filter((anchor, index) => anchors.findIndex((item) => item.position === anchor.position) === index)
    .map(({ position, label }) => {
      const candidate = candidates[position];
      const start = Math.max(startBoundary, candidate.start - 1.5);
      const naturalEnd = start + Math.min(7, Math.max(5, candidate.end - candidate.start + 4));
      const boundedEnd = Number.isFinite(lessonEnd) && lessonEnd > start
        ? Math.min(Math.max(candidate.end, naturalEnd), lessonEnd)
        : Math.max(candidate.end, naturalEnd);
      return {
        id: `${Math.round(candidate.start * 1000)}`,
        label,
        start,
        end: Math.max(start + 0.5, boundedEnd),
      };
    });
}
