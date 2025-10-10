"use client";

interface GuessingOverlaysProps {
  screenshot: string | null;
  videoPlayCount: number;
  showCorrect: boolean;
  showAgain: boolean;
}

export default function GuessingOverlays({
  screenshot,
  videoPlayCount,
  showCorrect,
  showAgain,
}: GuessingOverlaysProps) {
  return (
    <>
      {/* 정답 선택 안내 오버레이 */}
      {videoPlayCount >= 3 && !showCorrect && !showAgain && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          {/* 스크린샷 배경 */}
          {screenshot && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${screenshot})` }}
            />
          )}
          {/* 검정색 오버레이 */}
          <div className="absolute inset-0 bg-black/70" />
          {/* 정답 선택 텍스트 */}
          <div className="relative z-10 text-center text-white">
            <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              A B C 를 순차적으로<br />
              듣고 정답을 선택하세요
            </p>
          </div>
        </div>
      )}

      {/* Correct 표시 오버레이 */}
      {showCorrect && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          {/* 스크린샷 배경 */}
          {screenshot && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${screenshot})` }}
            />
          )}
          {/* 검정색 오버레이 */}
          <div className="absolute inset-0 bg-black/70" />
          {/* Correct 텍스트 */}
          <div className="relative z-10 text-center">
            <div
              className="text-6xl font-bold animate-pulse"
              style={{
                fontFamily: 'Encode Sans, sans-serif',
                color: '#60D96C',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                animation: 'fadeInOut 3s ease-in-out',
                fontWeight: '900'
              }}
            >
              Correct
            </div>
          </div>
        </div>
      )}

      {/* Again 표시 오버레이 */}
      {showAgain && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          {/* 스크린샷 배경 */}
          {screenshot && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${screenshot})` }}
            />
          )}
          {/* 검정색 오버레이 */}
          <div className="absolute inset-0 bg-black/70" />
          {/* Again 텍스트 */}
          <div className="relative z-10 text-center">
            <div
              className="text-6xl font-bold animate-pulse"
              style={{
                fontFamily: 'Encode Sans, sans-serif',
                color: '#9CA3AF',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(156, 163, 175, 0.3)',
                animation: 'fadeInOut 2s ease-in-out',
                fontWeight: '900'
              }}
            >
              Again
            </div>
          </div>
        </div>
      )}
    </>
  );
}
