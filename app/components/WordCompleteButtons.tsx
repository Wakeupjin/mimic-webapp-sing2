interface WordCompleteButtonsProps {
  onAgain: () => void;
  onNext: () => void;
  hasNextChapter: boolean;
}

export default function WordCompleteButtons({ onAgain, onNext, hasNextChapter }: WordCompleteButtonsProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="absolute inset-0 bg-black/80"></div>

      <div className="relative flex flex-col items-center gap-4 px-3 pointer-events-auto md:gap-8">
        <div
          className="text-center text-2xl font-bold sm:text-4xl md:text-6xl"
          style={{
            fontFamily: 'Encode Sans, sans-serif',
            color: 'var(--mimic)',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            fontWeight: '900'
          }}
        >
          Chapter Complete!
        </div>

        <div className="cta-row">
          <button type="button" className="cta-btn cta-ghost" onClick={onAgain}>
            Again
          </button>

          {hasNextChapter && (
            <button type="button" className="cta-btn cta-primary relative" onClick={onNext}>
              <img src="/Subject.png" alt="" className="cta-mascot" />
              Next
            </button>
          )}

          {!hasNextChapter && (
            <button
              type="button"
              className="cta-btn cta-primary relative"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <img src="/Subject.png" alt="" className="cta-mascot" />
              Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
