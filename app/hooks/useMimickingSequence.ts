import { useState, useRef, useCallback } from 'react';

interface MimickingSequenceState {
  currentIndex: number;
  isMimickingComplete: boolean;
  isSequenceRunning: boolean;
  showNextCta: boolean;
  muted: boolean;
  activeControlIndex: number | null;
  autoSeqIndex: number | null;
  mimickingTimeouts: NodeJS.Timeout[];
}

interface MimickingSequenceActions {
  setCurrentIndex: (index: number) => void;
  setIsMimickingComplete: (complete: boolean) => void;
  setIsSequenceRunning: (running: boolean) => void;
  setShowNextCta: (show: boolean) => void;
  setMuted: (muted: boolean) => void;
  setActiveControlIndex: (index: number | null) => void;
  setAutoSeqIndex: (index: number | null) => void;
  executeMimickingSequence: (index: number, playVideo: () => void, currentScene?: any) => void;
  execute30thMimickingSequence: () => void;
  resetMimickingState: () => void;
  clearTimeouts: () => void;
}

export function useMimickingSequence(): MimickingSequenceState & MimickingSequenceActions {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMimickingComplete, setIsMimickingComplete] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [showNextCta, setShowNextCta] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null);
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const executeMimickingSequence = useCallback((sceneIndex: number, playVideo: () => void, currentScene?: any) => {
    if (isSequenceRunning) {
      // console.log('이미 시퀀스가 실행 중입니다.');
      return;
    }
    
    // console.log(`🎬 미믹킹 시퀀스 시작: Scene ${sceneIndex + 1}`);
    
    // 이전 시퀀스 정리
    mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeoutsRef.current = [];
    
    // 상태 초기화
    setActiveControlIndex(null);
    setShowNextCta(false);
    setAutoSeqIndex(0); // 시퀀스 시작 (0번 버튼부터)
    setMuted(false); // muted 상태도 초기화
    
    // 비디오 상태도 초기화 (playVideo 함수를 통해)
    playVideo(); // 상태 초기화를 위한 playVideo 호출
    setTimeout(() => {
      setIsSequenceRunning(true);
      setCurrentIndex(sceneIndex);
      
      // 첫 번째 버튼 활성화 및 재생 시작
      setActiveControlIndex(0);
      setMuted(false);
      playVideo();
    }, 100); // 100ms 지연으로 상태 초기화 보장
  }, [isSequenceRunning, setIsSequenceRunning, setCurrentIndex, setActiveControlIndex, setShowNextCta, setAutoSeqIndex, setMuted]);

  const execute30thMimickingSequence = useCallback(() => {
    // console.log('🎯 30번째 미믹킹 시퀀스 시작');
    setIsMimickingComplete(true);
    setShowNextCta(true);
    setIsSequenceRunning(false);
    setActiveControlIndex(null);
    setAutoSeqIndex(null);
  }, []);

  const resetMimickingState = useCallback(() => {
    setCurrentIndex(0);
    setIsMimickingComplete(false);
    setIsSequenceRunning(false);
    setShowNextCta(false);
    setMuted(false);
    setActiveControlIndex(null);
    setAutoSeqIndex(null);
    clearTimeouts();
  }, []);

  const clearTimeouts = useCallback(() => {
    mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeoutsRef.current = [];
  }, []);

  return {
    currentIndex,
    isMimickingComplete,
    isSequenceRunning,
    showNextCta,
    muted,
    activeControlIndex,
    autoSeqIndex,
    mimickingTimeouts: mimickingTimeoutsRef.current,
    setCurrentIndex,
    setIsMimickingComplete,
    setIsSequenceRunning,
    setShowNextCta,
    setMuted,
    setActiveControlIndex,
    setAutoSeqIndex,
    executeMimickingSequence,
    execute30thMimickingSequence,
    resetMimickingState,
    clearTimeouts,
  };
}
