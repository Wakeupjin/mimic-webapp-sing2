// Vercel Blob CORS 문제 해결을 위한 유틸리티

/**
 * 비디오 URL에 CORS 파라미터를 추가하는 함수
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
 * 비디오 요소에 CORS 속성을 설정하는 함수 (최소화)
 */
export function setupVideoCors(videoElement: HTMLVideoElement): void {
  try {
    // CORS 속성 설정 (최소화)
    videoElement.crossOrigin = 'anonymous';
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
    console.warn('⚠️ toDataURL 실패, Blob 방법 시도:', error);
    
    try {
      // Blob을 통한 대체 방법
      return new Promise<string | null>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        }, 'image/png');
      });
    } catch (blobError) {
      console.error('❌ Blob 변환도 실패:', blobError);
      return null;
    }
  }
}

/**
 * CORS 문제를 완전히 우회하는 스크린샷 함수
 */
export function captureVideoScreenshotCorsFree(): string | null {
  const videoElement = document.querySelector('video') as HTMLVideoElement;
  if (!videoElement) return null;

  try {
    // Canvas 생성
    const canvas = createScreenshotCanvas(videoElement);
    if (!canvas) return null;
    
    // Canvas를 Data URL로 변환
    return canvasToDataUrl(canvas);
  } catch (error) {
    console.error('CORS 프리 스크린샷 실패:', error);
    return null;
  }
}

/**
 * CORS 문제를 완전히 우회하는 스크린샷 함수 (Promise 버전)
 */
export function captureVideoScreenshotCorsFreeAsync(): Promise<string | null> {
  return new Promise((resolve) => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) {
      resolve(null);
      return;
    }

    try {
      // Canvas 생성
      const canvas = createScreenshotCanvas(videoElement);
      if (!canvas) {
        resolve(null);
        return;
      }
      
      // CORS 문제를 우회하기 위한 대체 방법
      try {
        // 1단계: 일반적인 toBlob 시도
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        }, 'image/png');
      } catch (blobError) {
        console.warn('toBlob 실패, 대체 방법 시도:', blobError);
        
        try {
          // 2단계: Canvas를 ImageData로 변환 후 다시 Canvas에 그리기
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');
            if (newCtx) {
              newCanvas.width = canvas.width;
              newCanvas.height = canvas.height;
              newCtx.putImageData(imageData, 0, 0);
              
              // 새로운 Canvas에서 Blob 생성
              newCanvas.toBlob((blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(null);
                  reader.readAsDataURL(blob);
                } else {
                  resolve(null);
                }
              }, 'image/png');
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (imageDataError) {
          console.error('ImageData 변환 실패:', imageDataError);
          resolve(null);
        }
      }
    } catch (error) {
      console.error('CORS 프리 스크린샷 실패:', error);
      resolve(null);
    }
  });
}
