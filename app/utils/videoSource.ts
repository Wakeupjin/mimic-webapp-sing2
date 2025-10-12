/**
 * 환경별 비디오 소스 관리
 * 개발용: 로컬 파일 사용 (Vercel Blob 사용량 절약)
 * 배포용: Bunny CDN 사용 (전 세계 빠른 로딩)
 */

export const getVideoSource = (): string => {
  if (process.env.NODE_ENV === 'development') {
    // 개발용: 로컬 파일 사용
    console.log('🔧 개발 모드: 로컬 비디오 파일 사용');
    return '/videos/sing2.mp4';
  } else {
    // 배포용: Bunny CDN 사용
    console.log('🚀 배포 모드: Bunny CDN 사용');
    return 'https://mimic-ai.b-cdn.net/sing2.mp4';
  }
};

/**
 * 시간 구간이 포함된 비디오 URL 생성 (스트리밍 최적화)
 * @param startTime 시작 시간 (초)
 * @param endTime 종료 시간 (초)
 * @returns 최적화된 비디오 URL
 */
export const getVideoSourceWithTimeRange = (startTime: number, endTime: number): string => {
  const baseUrl = getVideoSource();
  
  // 로컬 파일인 경우 시간 구간 적용 불가 (HTML5 제한)
  if (baseUrl.startsWith('/')) {
    console.log('🔧 개발 모드: 시간 구간 적용 불가 (로컬 파일)');
    return baseUrl;
  }
  
  // CDN URL인 경우 시간 구간 적용
  const optimizedUrl = `${baseUrl}#t=${startTime},${endTime}`;
  console.log(`🚀 스트리밍 최적화: ${startTime}s~${endTime}s 구간만 다운로드`);
  return optimizedUrl;
};

export const getVideoSourceInfo = () => {
  const source = getVideoSource();
  const isLocal = source.startsWith('/');
  
  return {
    source,
    isLocal,
    type: isLocal ? '로컬 파일' : 'Bunny CDN',
    description: isLocal 
      ? '개발용 로컬 파일 (Vercel Blob 사용량 0)' 
      : '배포용 Bunny CDN (Vercel Blob 대체, 전 세계 빠른 로딩)'
  };
};
