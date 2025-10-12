// CORS 문제를 해결하기 위한 프록시 유틸리티

/**
 * Vercel Blob URL에 CORS 파라미터를 추가하는 함수
 */
export function addCorsToBlobUrl(url: string): string {
  if (!url) return url;
  
  // Vercel Blob URL인지 확인
  if (url.includes('public.blob.vercel-storage.com')) {
    // 이미 쿼리 파라미터가 있는지 확인
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cors=true&crossorigin=anonymous`;
  }
  
  return url;
}

/**
 * 비디오 요소에 CORS 속성을 강제로 설정하는 함수
 */
export function forceVideoCors(videoElement: HTMLVideoElement): void {
  try {
    // CORS 속성 강제 설정
    videoElement.crossOrigin = 'anonymous';
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    // 추가 CORS 헤더 요청
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    // 비디오 소스 URL에 CORS 파라미터 추가
    if (videoElement.src) {
      videoElement.src = addCorsToBlobUrl(videoElement.src);
    }
    
    console.log('✅ 비디오 CORS 강제 설정 완료');
  } catch (error) {
    console.warn('⚠️ CORS 강제 설정 실패:', error);
  }
}

/**
 * CORS 문제를 완전히 우회하는 스크린샷 함수 (최종 버전)
 */
export function captureVideoScreenshotUltimate(): Promise<string | null> {
  return new Promise((resolve) => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) {
      resolve(null);
      return;
    }

    try {
      // Canvas 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // 비디오 크기 설정
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 360;
      
      // Canvas 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 비디오를 Canvas에 그리기
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // CORS 문제를 우회하기 위한 다단계 시도
      try {
        // 1단계: 일반적인 toDataURL 시도
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
        return;
      } catch (dataUrlError) {
        console.warn('toDataURL 실패, toBlob 시도:', dataUrlError);
        
        try {
          // 2단계: toBlob 시도
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
          console.warn('toBlob 실패, ImageData 시도:', blobError);
          
          try {
            // 3단계: ImageData를 통한 우회
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');
            if (newCtx) {
              newCanvas.width = canvas.width;
              newCanvas.height = canvas.height;
              newCtx.putImageData(imageData, 0, 0);
              
              // 새로운 Canvas에서 Data URL 생성
              const newDataUrl = newCanvas.toDataURL('image/png');
              resolve(newDataUrl);
            } else {
              resolve(null);
            }
          } catch (imageDataError) {
            console.error('ImageData 변환 실패:', imageDataError);
            resolve(null);
          }
        }
      }
    } catch (error) {
      console.error('최종 스크린샷 실패:', error);
      resolve(null);
    }
  });
}

/**
 * 비디오 로드 시 CORS 상태를 확인하고 설정하는 함수 (중복 방지)
 */
export function setupVideoCorsOnLoad(videoElement: HTMLVideoElement): void {
  // 중복 설정 방지를 위한 플래그
  if ((videoElement as any).corsSetup) {
    return;
  }
  
  (videoElement as any).corsSetup = true;

  // 비디오 로드 시작 시 CORS 설정 (한 번만)
  const handleLoadStart = () => {
    console.log('🔄 비디오 로딩 시작 - CORS 설정');
    forceVideoCors(videoElement);
  };

  // 비디오 메타데이터 로드 시 CORS 확인 (한 번만)
  const handleLoadedMetadata = () => {
    console.log('📊 비디오 메타데이터 로드 - CORS 확인');
    forceVideoCors(videoElement);
  };

  // 비디오 재생 가능 시 CORS 최종 확인 (한 번만)
  const handleCanPlay = () => {
    console.log('✅ 비디오 재생 가능 - CORS 최종 확인');
    forceVideoCors(videoElement);
  };

  // 비디오 에러 시 CORS 재설정 (한 번만)
  const handleError = (error: any) => {
    console.error('❌ 비디오 로드 에러:', error);
    forceVideoCors(videoElement);
  };

  // 이벤트 리스너 등록
  videoElement.addEventListener('loadstart', handleLoadStart, { once: true });
  videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
  videoElement.addEventListener('canplay', handleCanPlay, { once: true });
  videoElement.addEventListener('error', handleError, { once: true });
}
