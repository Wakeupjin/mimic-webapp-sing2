export type AiCoachFocus = 'word_accuracy' | 'pace' | 'complete';

export type AiCoachResult = {
  heardText: string;
  accuracyScore: number;
  paceScore: number;
  overallScore: number;
  feedback: string;
  focus: AiCoachFocus;
  shouldRetry: boolean;
};
