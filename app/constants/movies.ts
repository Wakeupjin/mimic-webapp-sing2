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

import sample from "@/public/lessons/sample.json" assert { type: "json" };
import type { RawLessonFile } from "./lesson";
import { transformRawLesson } from "./lesson";

const parsed = transformRawLesson(sample as unknown as RawLessonFile);

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


