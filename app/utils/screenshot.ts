// 비디오 스크린샷을 찍는 함수
export function captureVideoScreenshot(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0);

  return canvas.toDataURL('image/png');
}

// 영상 재생 중 중앙 시점에서 스크린샷을 찍는 함수
export function shouldCaptureScreenshot(
  currentTime: number,
  startTime: number,
  endTime: number,
  screenshotTaken: boolean
): boolean {
  const duration = endTime - startTime;
  const midpoint = startTime + duration / 2;

  // 중앙 시점 근처에서 스크린샷 캡처
  return Math.abs(currentTime - midpoint) < 0.5 && !screenshotTaken;
}
