interface WatchingModeButtonsProps {
  onAgain: () => void;
  onNext: () => void;
}

export default function WatchingModeButtons({ onAgain, onNext }: WatchingModeButtonsProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/80"></div>
      
      {/* Button container */}
      <div className="relative flex items-center gap-8 pointer-events-auto">
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
        
        {/* Next Button */}
        <button 
          className="relative rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
          style={{
            backgroundColor: 'white',
            fontFamily: 'Encode Sans, sans-serif',
            fontSize: '1.5rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f8f8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
          onClick={onNext}
        >
          {/* 카멜레온 이미지 오버레이 */}
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
  );
}
