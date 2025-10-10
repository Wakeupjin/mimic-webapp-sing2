import { useState, useCallback } from 'react';

export function useVideoProgress() {
  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>, duration: number) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    const newTime = (progress / 100) * duration;
    
    setVideoProgress(progress);
    return newTime;
  }, [isDragging]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
  }, []);

  const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, duration: number) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    const newTime = (progress / 100) * duration;
    
    setVideoProgress(progress);
    return newTime;
  }, [isDragging]);

  const handleProgressMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    videoProgress,
    setVideoProgress,
    isDragging,
    setIsDragging,
    isVideoStarted,
    setIsVideoStarted,
    isVideoPaused,
    setIsVideoPaused,
    handleProgressClick,
    handleProgressMouseDown,
    handleProgressMouseMove,
    handleProgressMouseUp
  };
}
