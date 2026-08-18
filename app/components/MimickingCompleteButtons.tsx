interface MimickingCompleteButtonsProps {
  onAgain: () => void;
  onNext: () => void;
}

export default function MimickingCompleteButtons({ onAgain, onNext }: MimickingCompleteButtonsProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/80"></div>
      
      {/* Button container */}
      <div className="cta-row relative px-3 pointer-events-auto">
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
        
        {/* Next Button */}
        <div 
          className="cta-btn relative cursor-pointer border-[#60D96C] text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
          style={{
            backgroundColor: 'white',
            zIndex: 99999,
            pointerEvents: 'auto',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => {
            console.log('🎯 Next 버튼 마우스 엔터!');
            e.currentTarget.style.backgroundColor = '#f8f8f8';
          }}
          onMouseLeave={(e) => {
            console.log('🎯 Next 버튼 마우스 리브!');
            e.currentTarget.style.backgroundColor = 'white';
          }}
          onClick={(e) => {
            console.log('🎯 미믹킹 Next 버튼 클릭됨!');
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            console.log('🎯 미믹킹 Next - 게싱 모드로 전환');
            onNext();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            console.log('🎯 미믹킹 Next 버튼 마우스다운!');
            console.log('🎯 미믹킹 Next - 게싱 모드로 전환');
            onNext();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            console.log('🎯 미믹킹 Next 버튼 터치!');
            console.log('🎯 미믹킹 Next - 게싱 모드로 전환');
            onNext();
          }}
        >
          {/* 카멜레온 이미지 오버레이 */}
          <img 
            src="/Subject.png" 
            alt="카멜레온" 
            className="cta-mascot"
          />
          Next
        </div>
      </div>
    </div>
  );
}
