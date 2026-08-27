export type PlacementGradeBand = 'g1-3' | 'g4-6' | 'jh1-3';

export type PlacementLevel = 'foundation' | 'core' | 'studio-ready';

export type PlacementVoiceResult = {
  overallScore: number;
  accuracyScore: number;
  paceScore: number;
} | null;

export type PlacementResult = {
  level: PlacementLevel;
  title: string;
  summary: string;
  evidence: string[];
};

export type SavedPlacement = PlacementResult & {
  gradeBand: PlacementGradeBand;
  completedAt: string;
};

export const PLACEMENT_STORAGE_VERSION = 'v1';

export function placementStorageKey(userId: string): string {
  return `mimic-placement-${PLACEMENT_STORAGE_VERSION}:${userId}`;
}
function voiceLabel(result: PlacementVoiceResult, label: string): string {
  if (!result) return `${label}: 음성 분석 없이 진행했어요`;
  if (result.overallScore >= 85) return `${label}: 소리와 리듬을 안정적으로 재현했어요`;
  if (result.overallScore >= 70) return `${label}: 핵심 소리는 잡았고 조금 더 연습하면 좋아요`;
  return `${label}: 짧게 나눠 따라 하는 연습이 먼저 필요해요`;
}

export function evaluatePlacement({
  gradeBand,
  easyMimic,
  longMimic,
  reading,
  comprehensionCorrect,
}: {
  gradeBand: PlacementGradeBand;
  easyMimic: PlacementVoiceResult;
  longMimic: PlacementVoiceResult;
  reading: PlacementVoiceResult;
  comprehensionCorrect: boolean;
}): PlacementResult {
  const voiceResults = [easyMimic, longMimic, reading];
  const completedVoiceResults = voiceResults.filter(
    (result): result is NonNullable<PlacementVoiceResult> => result !== null
  );
  const average = completedVoiceResults.length
    ? completedVoiceResults.reduce((sum, result) => sum + result.overallScore, 0) /
      completedVoiceResults.length
    : 0;
  const readingScore = reading?.overallScore ?? 0;
  const allVoiceTasksCompleted = completedVoiceResults.length === voiceResults.length;

  const evidence = [
    voiceLabel(easyMimic, '짧은 문장'),
    voiceLabel(longMimic, '긴 문장'),
    voiceLabel(reading, '소리 내어 읽기'),
    comprehensionCorrect
      ? '장면 이해: 인물의 목적을 정확히 찾았어요'
      : '장면 이해: 핵심 맥락을 한 번 더 확인하면 좋아요',
  ];

  if (
    gradeBand === 'jh1-3' &&
    allVoiceTasksCompleted &&
    average >= 85 &&
    readingScore >= 80 &&
    comprehensionCorrect
  ) {
    return {
      level: 'studio-ready',
      title: 'Studio 준비',
      summary: '긴 문장과 장면 맥락을 안정적으로 처리했어요. 독립 리텔링을 확인하면 Studio 입반을 추천할 수 있어요.',
      evidence,
    };
  }

  if (allVoiceTasksCompleted && average >= 70 && comprehensionCorrect) {
    return {
      level: 'core',
      title: 'Core',
      summary: '일반 속도 대사를 따라 하고 장면의 핵심을 이해할 수 있어요. 지금 Sing 2 수업에 가장 잘 맞습니다.',
      evidence,
    };
  }

  return {
    level: 'foundation',
    title: 'Foundation',
    summary: '짧은 문장부터 소리와 리듬을 안정적으로 붙이는 연습으로 시작하는 게 가장 빠릅니다.',
    evidence,
  };
}
