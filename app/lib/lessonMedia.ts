import { parseLessonNumber, parsePack } from "../dataService";
import { getVideoSource } from "../utils/videoSource";

/** 원서 Pinocchio. 영화 1 / Hard 2 와 진도가 안 섞인다. */
export const BOOK_PACK = 3;
export const BOOK_SCENE_COUNT = 8;
export const BOOK_CONTENT_SCENES = [1] as const;

export function isBookId(movieId: string) {
  return parsePack(movieId) >= BOOK_PACK;
}

export function bookSceneHasContent(scene: number) {
  return BOOK_CONTENT_SCENES.includes(scene as (typeof BOOK_CONTENT_SCENES)[number]);
}

export function getLessonMedia(movieId: string) {
  if (isBookId(movieId)) {
    const scene = parseLessonNumber(movieId);
    return {
      src: `/books/pinocchio/scene-${scene}.m4a`,
      poster: `/books/pinocchio/scene-${scene}.jpg`,
    };
  }
  return {
    src: getVideoSource(),
    poster: undefined as string | undefined,
  };
}

export function lessonSelectHref(movieId: string) {
  if (isBookId(movieId)) {
    return `/book/selecting?id=${movieId}`;
  }
  return `/sing2/selecting?id=${movieId}`;
}

export function lessonPath(
  movieId: string,
  mode: "listen" | "watching" | "mimicking" | "guessing" | "retelling" | "word"
) {
  if (isBookId(movieId)) {
    const bookMode = mode === "watching" ? "listen" : mode;
    return `/book/${bookMode}?id=${movieId}`;
  }
  const movieMode = mode === "listen" ? "watching" : mode;
  return `/sing2/${movieMode}?id=${movieId}`;
}
