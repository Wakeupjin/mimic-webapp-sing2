import { useCallback } from 'react';

export function useMediaControl() {
  const stopAllMedia = useCallback(() => {
    // 모든 비디오 정지
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });

    // 모든 오디오 정지
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    // Clear all timeouts (simplified approach)
    // Note: This is a simplified implementation
    // In production, you might want to track timeout IDs explicitly
  }, []);

  const pauseAllVideos = useCallback(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });
  }, []);

  const resumeAllVideos = useCallback(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.paused) {
        video.play().catch(console.error);
      }
    });
  }, []);

  return {
    stopAllMedia,
    pauseAllVideos,
    resumeAllVideos,
  };
}
