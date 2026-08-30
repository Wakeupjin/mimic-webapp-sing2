export type LessonMode = "watching" | "mimicking" | "guessing" | "word";

export type Segment = {
  id: string;
  text: string;
  start: number;
  end: number;
  sourceLineIndex?: number;
};

export type Timeline = {
  duration: number;
  lines: Segment[];
  mimicItems: Segment[];
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
          items: {
            id: string;
            text: string;
            sourceLineIndex: number;
          }[];
        };
        guess: { items: GuessItem[] };
        word: { items: WordItem[] };
      };
    };
  };
};
