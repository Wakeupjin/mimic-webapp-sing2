"use client";

import { FullscreenIcon, HeaderCloseLink, HeaderIconButton } from "./HeaderIcons";

interface GuessingResultScreenProps {
  movieTitle: string;
  correctAnswers: number;
  totalQuestions: number;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onStopAllMedia: () => void;
  onNext: () => void;
}

export default function GuessingResultScreen({
  movieTitle,
  correctAnswers,
  totalQuestions,
  isFullscreen,
  toggleFullscreen,
  onStopAllMedia,
  onNext,
}: GuessingResultScreenProps) {
  const getMessage = () => {
    if (correctAnswers >= 8) return '아주 잘했어요!';
    if (correctAnswers >= 6) return '좋아요!';
    return '한 번 더 도전해 보세요!';
  };

  return (
    <main className="flex min-h-dvh flex-col px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
          {movieTitle.toUpperCase()}
        </h1>
        <div className="flex items-center gap-1.5">
          <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
          <HeaderCloseLink onClick={onStopAllMedia} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="px-2 text-center text-white">
          <h1 className="mb-6 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            문제 풀이 끝!
          </h1>
          <p className="mb-4 text-xl sm:text-2xl" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            정답: {correctAnswers}/{totalQuestions}
          </p>
          <p className="mb-8 text-base opacity-70 sm:mb-10 sm:text-lg" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            {getMessage()}
          </p>
          <button
            type="button"
            className="cta-btn cta-primary relative"
            onClick={onNext}
          >
            <img
              src="/Subject.png"
              alt="카멜레온"
              className="cta-mascot"
            />
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
