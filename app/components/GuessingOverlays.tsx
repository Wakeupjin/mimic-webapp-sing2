"use client";

interface GuessingOverlaysProps {
  screenshot: string | null;
  videoPlayCount: number;
  showCorrect: boolean;
  showAgain: boolean;
  listeningAbc?: boolean;
}

export default function GuessingOverlays({
  screenshot,
  videoPlayCount,
  showCorrect,
  showAgain,
  listeningAbc = false,
}: GuessingOverlaysProps) {
  return (
    <>
      {listeningAbc && videoPlayCount >= 3 && !showCorrect && !showAgain && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3">
          <p
            className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white sm:text-sm"
            style={{ fontFamily: "Encode Sans, sans-serif" }}
          >
            A · B · C 듣는 중
          </p>
        </div>
      )}

      {showCorrect && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          {screenshot && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${screenshot})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/70" />
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

      {showAgain && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          {screenshot && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${screenshot})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/70" />
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
