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
    <main className="min-h-screen px-4 py-4">
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

      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            게임 완료!
          </h1>
          <p className="text-2xl mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            정답: {correctAnswers}/{totalQuestions}
          </p>
          <p className="text-lg opacity-70 mb-10" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            {getMessage()}
          </p>
          <button
            type="button"
            className="relative rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
            style={{
              backgroundColor: 'white',
              fontFamily: 'Encode Sans, sans-serif',
              fontSize: '1.5rem',
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
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
              style={{ maxWidth: '80px', height: 'auto' }}
            />
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
