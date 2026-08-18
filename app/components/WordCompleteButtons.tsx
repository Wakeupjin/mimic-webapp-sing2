interface WordCompleteButtonsProps {
  onAgain: () => void;
  onNext: () => void;
  hasNextChapter: boolean;
}

export default function WordCompleteButtons({ onAgain, onNext, hasNextChapter }: WordCompleteButtonsProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/80"></div>

      {/* Completion message and buttons */}
      <div className="relative flex flex-col items-center gap-4 px-3 pointer-events-auto md:gap-8">
        {/* Completion text */}
        <div
          className="text-center text-2xl font-bold sm:text-4xl md:text-6xl"
          style={{
            fontFamily: 'Encode Sans, sans-serif',
            color: '#60D96C',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            fontWeight: '900'
          }}
        >
          Chapter Complete!
        </div>

        {/* Button container */}
        <div className="cta-row">
          {/* Again Button */}
          <button
            className="cta-btn border-gray-300 text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ backgroundColor: 'white' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
            onClick={onAgain}
          >
            Again
          </button>

          {/* Next Button (only if there's a next chapter) */}
          {hasNextChapter && (
            <div
            className="cta-btn relative cursor-pointer border-[#60D96C] text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
            style={{
              backgroundColor: 'white',
              zIndex: 99999,
              pointerEvents: 'auto',
              display: 'inline-block'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f8f8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onNext();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onNext();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onNext();
              }}
            >
              {/* Chameleon image overlay */}
              <img
                src="/Subject.png"
                alt="카멜레온"
              className="cta-mascot"
              />
              Next
            </div>
          )}

          {/* Home Button (if no next chapter) */}
          {!hasNextChapter && (
            <div
            className="cta-btn relative cursor-pointer border-[#60D96C] text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
            style={{
              backgroundColor: 'white',
              zIndex: 99999,
              pointerEvents: 'auto',
              display: 'inline-block'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f8f8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/';
              }}
            >
              <img
                src="/Subject.png"
                alt="카멜레온"
              className="cta-mascot"
              />
              Home
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
