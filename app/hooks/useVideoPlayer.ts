import { useState, useRef, useCallback } from 'react';

interface VideoPlayerState {
  isPlaying: boolean;
  playNonce: number;
  isVideoPaused: boolean;
  isVideoStarted: boolean;
}

interface VideoPlayerActions {
  setIsPlaying: (playing: boolean) => void;
  setPlayNonce: (nonce: number | ((prev: number) => number)) => void;
  setIsVideoPaused: (paused: boolean) => void;
  setIsVideoStarted: (started: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  resetVideo: () => void;
}

export function useVideoPlayer(): VideoPlayerState & VideoPlayerActions {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isVideoStarted, setIsVideoStarted] = useState(false);

  const playVideo = useCallback(() => {
    setIsPlaying(true);
    setPlayNonce(prev => prev + 1);
    setIsVideoPaused(false);
    setIsVideoStarted(true);
  }, []);

  const pauseVideo = useCallback(() => {
    setIsPlaying(false);
    setIsVideoPaused(true);
  }, []);

  const resetVideo = useCallback(() => {
    setIsPlaying(false);
    setPlayNonce(0);
    setIsVideoPaused(false);
    setIsVideoStarted(false);
  }, []);

  return {
    isPlaying,
    playNonce,
    isVideoPaused,
    isVideoStarted,
    setIsPlaying,
    setPlayNonce,
    setIsVideoPaused,
    setIsVideoStarted,
    playVideo,
    pauseVideo,
    resetVideo,
  };
}
