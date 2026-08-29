export type StoryBeat = 'opening' | 'action' | 'change' | 'ending' | 'unknown';

export type StoryHintCue = 'begin' | 'middle' | 'end' | null;

export type StoryConversationHistoryItem = {
  heardText: string;
  replyEn: string;
  storyBeat: StoryBeat;
};

export type StoryConversationResult = {
  heardText: string;
  replyEn: string;
  replyKo: string;
  storyBeat: StoryBeat;
  coveredBeats: StoryBeat[];
  needsSceneHint: boolean;
  hintCue: StoryHintCue;
  canFinish: boolean;
};
