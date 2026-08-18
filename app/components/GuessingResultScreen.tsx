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
    if (correctAnswers >= 8) return '훌륭합니다!';
    if (correctAnswers >= 6) return '좋습니다!';
    return '다시 도전해보세요!';
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
            게임 완료!
          </h1>
          <p className="mb-4 text-xl sm:text-2xl" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            정답: {correctAnswers}/{totalQuestions}
          </p>
          <p className="mb-8 text-base opacity-70 sm:mb-10 sm:text-lg" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            {getMessage()}
          </p>
          <button
            type="button"
            className="cta-btn relative border-[#60D96C] text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
            style={{
              backgroundColor: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
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
