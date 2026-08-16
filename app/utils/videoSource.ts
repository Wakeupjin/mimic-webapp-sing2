/**
 * 비디오/오디오 소스
 * 기본: Bunny CDN (로컬 mp4는 git에 없음)
 * 로컬 파일: NEXT_PUBLIC_USE_LOCAL_VIDEO=true 일 때만
 */

const BUNNY_CDN_BASE = 'https://mimicsing2.b-cdn.net';

export const VIDEO_CDN_URL = `${BUNNY_CDN_BASE}/sing2.mp4`;
export const AUDIO_CDN_URL = `${BUNNY_CDN_BASE}/sing2_audio.mp3`;
const LOCAL_VIDEO_PATH = '/videos/sing2.mp4';

export const getVideoSource = (): string => {
  if (process.env.NEXT_PUBLIC_VIDEO_URL) {
    return process.env.NEXT_PUBLIC_VIDEO_URL;
  }

  if (process.env.NEXT_PUBLIC_USE_LOCAL_VIDEO === 'true') {
    console.log('🔧 로컬 비디오 파일 사용');
    return LOCAL_VIDEO_PATH;
  }

  console.log('🚀 Bunny CDN 비디오 사용');
  return VIDEO_CDN_URL;
};

/**
 * 시간 구간이 포함된 비디오 URL 생성 (스트리밍 최적화)
 */
export const getVideoSourceWithTimeRange = (startTime: number, _endTime?: number): string => {
  const baseUrl = getVideoSource();
  
  if (baseUrl.startsWith('/')) {
    return baseUrl;
  }

  // #t=start,end 는 구간 끝에서 브라우저가 재생을 강제 종료해서 play() AbortError가 납니다.
  // 끝 시간은 각 페이지 JS에서 pause 처리하고, 여기서는 시작 위치만 붙입니다.
  if (!isFinite(startTime) || startTime <= 0) {
    return baseUrl;
  }

  return `${baseUrl}#t=${startTime}`;
};

export const getVideoSourceInfo = () => {
  const source = getVideoSource();
  const isLocal = source.startsWith('/');
  
  return {
    source,
    isLocal,
    type: isLocal ? '로컬 파일' : 'Bunny CDN',
    description: isLocal 
      ? '개발용 로컬 파일' 
      : 'Bunny CDN'
  };
};
