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
      <div className="relative flex flex-col items-center gap-8 pointer-events-auto">
        {/* Completion text */}
        <div
          className="text-6xl font-bold"
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
        <div className="flex items-center gap-8">
          {/* Again Button */}
          <button
            className="rounded-2xl border-8 border-gray-300 px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ backgroundColor: 'white', fontFamily: 'Encode Sans, sans-serif', fontSize: '1.5rem' }}
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
              className="relative rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50] cursor-pointer"
              style={{
                backgroundColor: 'white',
                fontFamily: 'Encode Sans, sans-serif',
                fontSize: '1.5rem',
                position: 'relative',
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
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
                style={{ maxWidth: '80px', height: 'auto' }}
              />
              Next
            </div>
          )}

          {/* Home Button (if no next chapter) */}
          {!hasNextChapter && (
            <div
              className="relative rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50] cursor-pointer"
              style={{
                backgroundColor: 'white',
                fontFamily: 'Encode Sans, sans-serif',
                fontSize: '1.5rem',
                position: 'relative',
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
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
                style={{ maxWidth: '80px', height: 'auto' }}
              />
              Home
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
