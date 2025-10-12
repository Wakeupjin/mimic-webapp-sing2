// CORS 문제 해결을 위한 헬퍼 함수들

/**
 * 비디오 URL에 CORS 파라미터를 추가하는 함수
 * Vercel Blob URL에 CORS 헤더를 요청하는 파라미터 추가
 */
export function addCorsToVideoUrl(videoUrl: string): string {
  if (!videoUrl) return videoUrl;
  
  // Vercel Blob URL인지 확인
  if (videoUrl.includes('public.blob.vercel-storage.com')) {
    // 이미 쿼리 파라미터가 있는지 확인
    const separator = videoUrl.includes('?') ? '&' : '?';
    return `${videoUrl}${separator}cors=true`;
  }
  
  return videoUrl;
}

/**
 * 비디오 요소에 CORS 속성을 설정하는 함수
 */
export function setupVideoCors(videoElement: HTMLVideoElement): void {
  try {
    // CORS 속성 설정
    videoElement.crossOrigin = 'anonymous';
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    // 추가 CORS 헤더 요청
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    console.log('✅ 비디오 CORS 설정 완료');
  } catch (error) {
    console.warn('⚠️ CORS 설정 실패:', error);
  }
}

/**
 * 비디오 로드 시 CORS 상태를 확인하는 함수
 */
export function checkVideoCorsStatus(videoElement: HTMLVideoElement): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ CORS 상태 확인 타임아웃');
      resolve(false);
    }, 5000);

    videoElement.addEventListener('loadstart', () => {
      console.log('🔄 비디오 로딩 시작');
    });

    videoElement.addEventListener('canplay', () => {
      clearTimeout(timeout);
      console.log('✅ 비디오 재생 가능 - CORS 설정 확인됨');
      resolve(true);
    });

    videoElement.addEventListener('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ 비디오 로드 에러:', error);
      resolve(false);
    });
  });
}

/**
 * Canvas에서 CORS 문제를 우회하는 대체 방법
 */
export function createScreenshotCanvas(videoElement: HTMLVideoElement): HTMLCanvasElement | null {
  try {
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
    
    return canvas;
  } catch (error) {
    console.error('❌ Canvas 생성 실패:', error);
    return null;
  }
}

/**
 * Canvas를 안전하게 Data URL로 변환하는 함수
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    // 일반적인 방법으로 시도
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('⚠️ toDataURL 실패:', error);
    return null;
  }
}
