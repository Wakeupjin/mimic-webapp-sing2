/** 마우스 없는 폰/태블릿. 아이폰 가로는 너비가 768을 넘을 수 있어서 너비만 보면 안 됩니다. */
export function isPhoneLikeDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/** iOS가 영상을 시스템 전체화면으로 빼 가지 않게 합니다. */
export function applyInlinePlayback(video: HTMLVideoElement) {
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('x5-playsinline', 'true');
}

export function requestAppFullscreen(): Promise<void> {
  if (typeof document === 'undefined' || isPhoneLikeDevice()) {
    return Promise.resolve();
  }
  if (document.fullscreenElement) {
    return Promise.resolve();
  }
  return document.documentElement.requestFullscreen().then(() => undefined).catch(() => undefined);
}
