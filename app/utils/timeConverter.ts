// Convert "00:01:43,721" to seconds
export function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split(',');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}
