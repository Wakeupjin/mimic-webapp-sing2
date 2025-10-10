export interface Scene {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number;
}

export interface Movie {
  id: string;
  title: string;
  thumbnail: string; // path under public/
  description: string;
  videoUrl: string; // path or URL to mp4
  scenes: Scene[];
}

// ============================================================
// 새로운 파일 구조:
// - sing2.json: 영화 기본 정보만 (id, title, url, poster, totalLessons)
// - sing2/lesson-{n}.json: 각 회차별 데이터 (watching, mimicking, guessing)
// ============================================================
import sing2Info from "@/public/movies/sing2.json" assert { type: "json" };
import type { RawLessonFile } from "./lesson";
import { transformRawLesson } from "./lesson";

// 임시로 1회차 데이터를 로드하여 MOVIES 배열 구성
import lesson1 from "@/public/movies/sing2/lesson-1.json" assert { type: "json" };

const tempRawLesson: RawLessonFile = {
  id: "001:1",
  video: {
    id: sing2Info.id,
    title: sing2Info.title,
    url: sing2Info.url,
    poster: sing2Info.poster
  },
  lesson: [lesson1 as any]
};

const parsed = transformRawLesson(tempRawLesson);

export const MOVIES: Movie[] = [
  {
    id: "movie-1",
    title: parsed.title,
    thumbnail: parsed.thumbnail ?? "/window.svg",
    description: "JSON 레슨에서 로드된 샘플",
    videoUrl: parsed.videoUrl,
    scenes: parsed.scenes,
  }
];

// ============================================================
// loadMovie 함수: 동적으로 회차 파일 로드
// ============================================================
// movieId 형식: "영화ID:회차번호" (예: "001:1", "001:2")
export async function loadMovie(movieId: string) {
  console.log('🔍 loadMovie 호출됨:', movieId);
  const [movieCode, lessonNum] = movieId.split(":");
  console.log('🔍 파싱된 코드:', movieCode, '레슨 번호:', lessonNum);
  
         if (movieCode === "001") {
           // sing2 영화
           const lessonNumber = parseInt(lessonNum, 10);
           console.log('🔍 레슨 번호 파싱:', lessonNumber);
           
           try {
             // 회차별 파일을 동적으로 fetch
             const url = `/movies/sing2/lesson-${lessonNumber}.json`;
             console.log('🔍 요청 URL:', url);
             const response = await fetch(url);
             console.log('🔍 응답 상태:', response.status, response.ok);
             
             if (!response.ok) {
               throw new Error(`Failed to load lesson ${lessonNumber}`);
             }
             
             const lessonData = await response.json();
             console.log('🔍 로드된 레슨 데이터:', lessonData);
             
             return {
               id: movieId,
               title: sing2Info.title,
               thumbnail: sing2Info.poster,
               description: `Sing2 - Chapter ${lessonNumber}`,
               videoUrl: sing2Info.url,
               lesson: [lessonData]
             };
           } catch (error) {
             console.error(`Error loading lesson ${lessonNumber}:`, error);
             throw error;
           }
         }
  
  throw new Error(`Movie with id ${movieId} not found`);
}


