// 비디오 세그먼트 타입
export interface VideoSegment {
  start: string;
  end: string;
}

// 게싱 옵션 타입
export interface GuessingOption {
  label: 'A' | 'B' | 'C';
  text: string;
  start: string;
  end: string;
}

// 게싱 문제 타입
export interface GuessingQuestion {
  question: number;
  correctAnswer: 'A' | 'B' | 'C';
  options: GuessingOption[];
  video: VideoSegment;
}

// 미믹킹 세그먼트 타입
export interface MimickingSegment {
  startTime: string;
  endTime: string;
  text: string;
}

// 레슨 데이터 타입
export interface LessonData {
  watching: {
    startTime: string;
    endTime: string;
  };
  mimicking: MimickingSegment[];
  guessing: GuessingQuestion[];
}

// 영화 데이터 타입
export interface MovieData {
  id: string;
  title: string;
  videoUrl: string;
  lesson: LessonData[];
}

// 사용자 답변 타입
export type UserAnswer = 'A' | 'B' | 'C';

// 오디오 재생 상태 타입
export type AudioPlayingState = 'A' | 'B' | 'C' | null;

// 게임 모드 타입
export type GameMode = 'watching' | 'mimicking' | 'guessing';
