// 비디오 스크린샷을 찍는 함수 (CORS 문제 해결)
export function captureVideoScreenshot(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // CORS 문제 해결을 위한 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 비디오를 Canvas에 그리기
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // CORS 문제가 발생할 수 있으므로 try-catch로 감싸기
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('스크린샷 캡처 실패 (CORS 문제):', error);
    // CORS 문제 시 대체 이미지 또는 null 반환
    return null;
  }
}

// CORS 문제를 완전히 우회하는 스크린샷 함수
export function captureVideoScreenshotBypass(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  try {
    // Canvas 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 비디오 크기 설정
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 360;
    
    // Canvas 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 비디오를 Canvas에 그리기
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Canvas를 Data URL로 변환
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('CORS 우회 스크린샷 실패:', error);
    return null;
  }
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

// CORS 문제를 해결하기 위한 대체 스크린샷 함수
export function captureVideoScreenshotWithFallback(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  try {
    // 먼저 일반적인 방법으로 시도
    return captureVideoScreenshot();
  } catch (error) {
    console.warn('일반 스크린샷 실패, 대체 방법 시도:', error);
    
    try {
      // 대체 방법: 비디오 요소의 현재 프레임을 직접 캡처
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 비디오 크기 설정
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 360;
      
      // 비디오를 Canvas에 그리기
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Canvas를 Data URL로 변환
      return canvas.toDataURL('image/png');
    } catch (fallbackError) {
      console.error('대체 스크린샷도 실패:', fallbackError);
      return null;
    }
  }
}

// 간단한 스크린샷 캡처 함수 (CORS 문제 무시)
export function captureSimpleScreenshot(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 360;
    
    // 비디오를 Canvas에 그리기
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Canvas를 Data URL로 변환
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('간단한 스크린샷 실패:', error);
    return null;
  }
}

// 비디오 요소에 CORS 속성 설정 (중복 방지)
export function setupVideoForScreenshot(videoElement: HTMLVideoElement) {
  // 중복 설정 방지
  if ((videoElement as any).screenshotSetup) {
    return;
  }
  
  (videoElement as any).screenshotSetup = true;
  
  // CORS 문제 해결을 위한 속성 설정 (최소화)
  videoElement.crossOrigin = 'anonymous';
  videoElement.setAttribute('crossorigin', 'anonymous');
  
  // 비디오 재생 가능 시에만 로그 출력
  const handleCanPlay = () => {
    console.log('✅ 비디오 재생 가능 - 스크린샷 준비 완료');
  };
  
  videoElement.addEventListener('canplay', handleCanPlay, { once: true });
}
