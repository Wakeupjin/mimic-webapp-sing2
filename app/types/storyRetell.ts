export type StoryRetellProgressPayload = {
  version: 1 | 2;
  completed: true;
  turnCount: number;
  speakingSeconds: number;
  questionCount: number;
  usedFallback: boolean;
  aiTurnCount?: number;
  hintCount?: number;
  coveredBeatCount?: number;
  completedAt: string;
};
