/**
 * SRT 시간을 초로 변환하는 함수
 * @param srtTime SRT 형식의 시간 문자열 (예: "00:01:43,721")
 * @returns 초 단위의 숫자
 */
export function srtTimeToSeconds(srtTime: string): number {
  const [time, ms] = srtTime.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}

/**
 * 초를 SRT 시간 형식으로 변환하는 함수
 * @param seconds 초 단위의 숫자
 * @returns SRT 형식의 시간 문자열
 */
export function secondsToSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * 두 SRT 시간 사이의 지속 시간을 계산하는 함수
 * @param startTime 시작 시간
 * @param endTime 종료 시간
 * @returns 지속 시간 (초)
 */
export function getDuration(startTime: string, endTime: string): number {
  return srtTimeToSeconds(endTime) - srtTimeToSeconds(startTime);
}
