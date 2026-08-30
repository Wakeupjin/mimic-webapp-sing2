import rawPack from "../../../content-packs/pinocchio/v2/sessions/session-01/pack.json";
import rawTimeline from "../../../content-packs/pinocchio/v2/sessions/session-01/audio/core.timeline.json";

export type LessonMode = "watching" | "mimicking" | "guessing" | "word";
export type Segment = { id: string; text: string; start: number; end: number; sourceLineIndex?: number };
export type GuessItem = {
  id: string;
  audioLineIndex: number;
  correctAnswer: string;
  options: { label: string; lineIndex: number; text: string }[];
};
export type WordItem = { id: string; lineIndex: number; text: string; tokens: string[] };

type Pack = {
  story: { titleEn: string; titleKo: string; synopsisKo: string };
  livingStorybook: { beats: { titleKo: string; summaryKo: string; lineRanges: { core: number[] } }[] };
  levels: {
    core: {
      lines: { id: string; text: string }[];
      activities: {
        mimic: { items: { id: string; text: string; sourceLineIndex: number }[] };
        guess: { items: GuessItem[] };
        word: { items: WordItem[] };
      };
    };
  };
};

type Timeline = { duration: number; lines: Segment[]; mimicItems: Segment[] };

export const pack = rawPack as unknown as Pack;
export const level = pack.levels.core;
export const timeline = rawTimeline as unknown as Timeline;
export const AUDIO_SRC = "/prototype-audio/pinocchio-v2/session-01/lily-british/core.master.mp3";
export const ART_SRC = "/prototype-art/pinocchio-v2/session-01.png";
export const LESSON_ROOT = "/dev/pinocchio-session-1";
export const MODE_ORDER: LessonMode[] = ["watching", "mimicking", "guessing", "word"];

export const MODE_LABEL: Record<LessonMode, string> = {
  watching: "Watch",
  mimicking: "Mimic",
  guessing: "Guess",
  word: "Word",
};

export function modeHref(mode: LessonMode) {
  return `${LESSON_ROOT}/${mode}`;
}

export function sourceLineForMimic(index: number) {
  return level.activities.mimic.items[index]?.sourceLineIndex ?? 0;
}
