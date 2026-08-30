export const MONTH_LABEL = "이번 달";
export const MONTH_LABEL_EN = "THIS MONTH";

export const MOVIE_MONTH = {
  id: "movie" as const,
  kind: "movie" as const,
  title: "SING 2",
  caption: "이번 달 영화",
  hint: "영화 장면으로 학습할까요?",
  href: "/sing2/selecting?id=001:1",
  coverSrc: "/sing2Poster.jpg",
  coverAlt: "Sing 2 영화 포스터",
  icon: "play" as const,
};

export const BOOK_MONTH = {
  id: "book" as const,
  kind: "book" as const,
  title: "Pinocchio",
  caption: "이번 달 원서",
  hint: "원서 낭독을 들어볼까요?",
  href: "/book/pinocchio/1",
  coverSrc: "/pinocchio-mimic-cover.png",
  coverAlt: "Mimic 오리지널 피노키오 커버",
  icon: "m" as const,
};

/** 홈에서 고르는 이번 달 영화 / 원서 */
export const MONTH_FEATURES = [MOVIE_MONTH, BOOK_MONTH] as const;

export const BOOK_SCENES = [
  "Scene 1",
  "Scene 2",
  "Scene 3",
  "Scene 4",
  "Scene 5",
  "Scene 6",
  "Scene 7",
  "Scene 8",
] as const;
