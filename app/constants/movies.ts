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

import sing2 from "@/public/movies/sing2.json" assert { type: "json" };
import type { RawLessonFile } from "./lesson";
import { transformRawLesson } from "./lesson";

const parsed = transformRawLesson(sing2 as unknown as RawLessonFile);

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

// loadMovie 함수 추가
export async function loadMovie(movieId: string) {
  // 현재는 sing2 데이터만 있으므로 바로 반환
  if (movieId === "001:1") {
    return {
      id: "001:1",
      title: parsed.title,
      thumbnail: parsed.thumbnail ?? "/window.svg",
      description: "JSON 레슨에서 로드된 샘플",
      videoUrl: parsed.videoUrl,
      scenes: parsed.scenes,
      lesson: [{
        mimicking: sing2.lesson[0].mimicking,
        guessing: sing2.lesson[0].guessing
      }]
    };
  }
  throw new Error(`Movie with id ${movieId} not found`);
}


