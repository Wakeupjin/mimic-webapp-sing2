/**
 * 통짜 미디어 파일에서 start~end 초만 재생한다.
 * 짧은 클립은 키프레임 시크가 끝 시각 뒤로 붙으면 소리가 나기도 전에 끝나므로,
 * 앞쪽으로 다시 맞춘 뒤 최소 재생 시간을 보장한다.
 */
const SEEK_NEAR_START = 0.35;
const EARLY_SEEK_FALLBACK = 1;
const MIN_PLAY_MS = 280;
const SEEK_TIMEOUT_MS = 2000;

export function playTimedSegment(
  media: HTMLMediaElement,
  startTime: number,
  endTime: number,
  onComplete?: () => void
): () => void {
  let cancelled = false;
  let rafId = 0;
  let playedAt = 0;

  const cleanupListeners: Array<() => void> = [];

  const stop = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    cleanupListeners.forEach((fn) => fn());
    cleanupListeners.length = 0;
    media.pause();
  };

  const finish = () => {
    if (cancelled) return;
    cancelled = true;
    cancelAnimationFrame(rafId);
    media.pause();
    onComplete?.();
  };

  const watchEnd = () => {
    if (cancelled) return;
    const elapsed = Date.now() - playedAt;
    if (media.currentTime >= endTime && elapsed >= MIN_PLAY_MS) {
      finish();
      return;
    }
    rafId = requestAnimationFrame(watchEnd);
  };

  const startPlayback = () => {
    if (cancelled) return;
    media.muted = false;
    playedAt = Date.now();
    media.play().then(() => {
      if (!cancelled) watchEnd();
    }).catch((error) => {
      console.error('구간 재생 실패:', error);
      finish();
    });
  };

  const waitForSeek = (target: number, then: () => void) => {
    if (cancelled) return;

    if (Math.abs(media.currentTime - target) < SEEK_NEAR_START) {
      then();
      return;
    }

    const onSeeked = () => {
      media.removeEventListener('seeked', onSeeked);
      then();
    };
    media.addEventListener('seeked', onSeeked);
    cleanupListeners.push(() => media.removeEventListener('seeked', onSeeked));

    const seekTimeout = window.setTimeout(() => {
      media.removeEventListener('seeked', onSeeked);
      then();
    }, SEEK_TIMEOUT_MS);
    cleanupListeners.push(() => window.clearTimeout(seekTimeout));

    try {
      media.currentTime = target;
    } catch (error) {
      console.error('시크 실패:', error);
      then();
    }
  };

  const seekThenPlay = () => {
    if (cancelled) return;

    waitForSeek(startTime, () => {
      if (cancelled) return;
      if (media.currentTime >= endTime) {
        waitForSeek(Math.max(0, startTime - EARLY_SEEK_FALLBACK), startPlayback);
        return;
      }
      startPlayback();
    });
  };

  if (media.readyState >= 1) {
    seekThenPlay();
  } else {
    const onReady = () => {
      media.removeEventListener('loadedmetadata', onReady);
      seekThenPlay();
    };
    media.addEventListener('loadedmetadata', onReady);
    cleanupListeners.push(() => media.removeEventListener('loadedmetadata', onReady));
    if (media.readyState === 0) {
      media.load();
    }
  }

  return stop;
}

export function unlockMediaPlayback(media: HTMLMediaElement) {
  const wasMuted = media.muted;
  media.muted = true;
  media.play().then(() => {
    media.pause();
    media.muted = wasMuted;
  }).catch(() => {
    media.muted = wasMuted;
  });
}
