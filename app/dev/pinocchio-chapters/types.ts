export type LessonMode = "watching" | "mimicking" | "guessing" | "word";

export type Segment = {
  id: string;
  text: string;
  start: number;
  end: number;
  sourceLineIndex?: number;
  audio?: string;
  audioSha256?: string;
  audioBytes?: number;
  duration?: number;
  /** Aligned speech-only bounds. Playback padding is stored in start/end. */
  speechStart?: number;
  speechEnd?: number;
};

export type MimicSegment = Segment & {
  sourceLineIndex: number;
  audio: string;
  audioSha256: string;
  audioBytes: number;
  duration: number;
  speechStart: number;
  speechEnd: number;
};

export type Timeline = {
  schemaVersion?: string;
  contentId?: string;
  contentChecksum?: string;
  level?: string;
  source?: string;
  duration: number;
  mimicAudio: {
    strategy: "independent-files";
    root: "mimic/core";
    count: number;
    extension: "mp3";
  };
  lines: Segment[];
  mimicItems: MimicSegment[];
  boundarySafety: {
    playbackIsolation: "independent-files";
    naturalEof: true;
    adjacentSpeechLeakagePrevented: true;
    releaseBlockedBoundaries?: number;
  };
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
  checksum: string;
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
