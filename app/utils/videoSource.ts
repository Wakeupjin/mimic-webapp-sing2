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
