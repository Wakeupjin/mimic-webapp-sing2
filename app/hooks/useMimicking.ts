import { useState, useRef, useCallback } from 'react';

export function useMimicking() {
  const [isMimickingComplete, setIsMimickingComplete] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null);
  const [showNextCta, setShowNextCta] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllMimickingTimeouts = useCallback(() => {
    mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeoutsRef.current = [];
  }, []);

  const resetMimickingState = useCallback(() => {
    setIsMimickingComplete(false);
    setShowNextCta(false);
    setCurrentIndex(0);
    setIsSequenceRunning(false);
    setActiveControlIndex(null);
    setMuted(false);
    setPlayNonce(0);
    setAutoSeqIndex(null);
    setIsPlaying(false);
    clearAllMimickingTimeouts();
  }, [clearAllMimickingTimeouts]);

  const completeMimicking = useCallback(() => {
    setIsMimickingComplete(true);
    setShowNextCta(true);
    
    // 비디오 일시정지
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.pause();
    }
  }, []);

  return {
    // 상태
    isMimickingComplete,
    setIsMimickingComplete,
    isSequenceRunning,
    setIsSequenceRunning,
    currentIndex,
    setCurrentIndex,
    activeControlIndex,
    setActiveControlIndex,
    muted,
    setMuted,
    playNonce,
    setPlayNonce,
    autoSeqIndex,
    setAutoSeqIndex,
    showNextCta,
    setShowNextCta,
    isPlaying,
    setIsPlaying,
    
    // refs
    mimickingTimeoutsRef,
    
    // 함수
    clearAllMimickingTimeouts,
    resetMimickingState,
    completeMimicking
  };
}
