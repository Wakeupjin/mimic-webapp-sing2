export type StoryRetellProgressPayload = {
  version: 1;
  completed: true;
  turnCount: number;
  speakingSeconds: number;
  questionCount: number;
  usedFallback: boolean;
  completedAt: string;
};
