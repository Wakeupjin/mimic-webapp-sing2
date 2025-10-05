export interface RawLessonItem {
  start: string; // e.g. 00:05:03,655
  end: string;   // e.g. 00:05:05,757
  text: string;
}

export interface RawLessonFile {
  id: string; // e.g. "001:1"
  video: {
    id: string;
    title: string;
    url: string;
    poster?: string;
  };
  lesson: Array<{
    watching?: {
      start: string;
      end: string;
      text?: string;
    };
    mimicking: RawLessonItem[];
  }>;
}

export function parseTimeToSeconds(time: string): number {
  // format HH:MM:SS,mmm
  const m = time.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!m) return 0;
  const [, hh, mm, ss, ms] = m;
  return parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10) + parseInt(ms, 10) / 1000;
}

export interface ParsedScene {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ParsedMovie {
  id: string;
  title: string;
  videoUrl: string;
  thumbnail?: string;
  description?: string;
  scenes: ParsedScene[];
}

export function transformRawLesson(raw: RawLessonFile): ParsedMovie {
  const mimics: RawLessonItem[] = raw.lesson.flatMap((l) => l.mimicking);
  const scenes: ParsedScene[] = mimics.map((m, idx) => ({
    id: `scene-${idx + 1}`,
    text: m.text ?? "",
    startTime: parseTimeToSeconds(m.start),
    endTime: parseTimeToSeconds(m.end),
  }));
  return {
    id: raw.video.id,
    title: raw.video.title,
    videoUrl: raw.video.url,
    thumbnail: raw.video.poster,
    description: undefined,
    scenes,
  };
}


