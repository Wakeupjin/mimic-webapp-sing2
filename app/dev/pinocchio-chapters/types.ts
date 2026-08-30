export type LessonMode = "watching" | "mimicking" | "guessing" | "word";

export type Segment = {
  id: string;
  sentenceId?: string;
  text: string;
  start: number;
  end: number;
  sourceLineIndex?: number;
  sourceSentenceId?: string;
  startMs?: number;
  endMs?: number;
  speechStart?: number;
  speechEnd?: number;
  speechStartMs?: number;
  speechEndMs?: number;
};

export type MimicChunk = Segment & {
  chunkId: string;
  part: number;
  parts: number;
  sourceTextRange?: [number, number];
};

export type MimicTimelineItem = Segment & {
  chunks?: MimicChunk[];
};

export type MimicActivityItem = {
  id: string;
  text: string;
  sourceLineIndex?: number;
  sourceSentenceId?: string;
  sourceTextRange?: [number, number];
  chunks?: {
    chunkId: string;
    text: string;
    part: number;
    parts: number;
    sourceTextRange?: [number, number];
  }[];
};

export type MimicPracticeItem = {
  id: string;
  text: string;
  sourceLineIndex: number;
  segment: Segment;
  chunks: MimicChunk[];
};

export type Timeline = {
  duration: number;
  lines: Segment[];
  mimicItems: MimicTimelineItem[];
};

export type GuessItem = {
  id: string;
  audioLineIndex: number;
  correctAnswer: string;
  options: { label: string; lineIndex: number; text: string }[];
};

export type WordItem = {
  id: string;
  lineIndex: number;
  text: string;
  tokens: string[];
};

export type PinocchioPack = {
  contentId: string;
  course: {
    session: number;
    totalSessions: number;
    minutes: number;
  };
  story: {
    slug: string;
    sourceChapters: number[];
    titleEn: string;
    titleKo: string;
    synopsisKo: string;
  };
  livingStorybook: {
    status: string;
    expectedAsset: string;
    beats: {
      id: string;
      titleKo: string;
      summaryKo: string;
      lineRanges: { core: [number, number] };
    }[];
  };
  levels: {
    core: {
      lines: { id: string; text: string }[];
      activities: {
        mimic: {
          items: MimicActivityItem[];
        };
        guess: { items: GuessItem[] };
        word: { items: WordItem[] };
      };
    };
  };
};
