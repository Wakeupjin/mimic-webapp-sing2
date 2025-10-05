"use client";

interface PlaybackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onPlay: (muted: boolean, slotIndex: number) => void;
  activeIndex: number | null;
  isFullscreen?: boolean;
}

export default function PlaybackControls({ onPrev, onNext, onPlay, activeIndex, isFullscreen }: PlaybackControlsProps) {
  return (
    <div className={`rounded-lg w-full mx-auto mt-1 xl:mt-3 xl:scale-120 ${isFullscreen ? 'xl:!mt-[150px]' : ''}`} style={{ paddingTop: '4px', paddingBottom: '4px', paddingLeft: '8px', paddingRight: '8px', marginTop: isFullscreen ? '90px' : undefined }}>
      {/* 10개 버튼 컨테이너 */}
      <div className="flex items-center justify-center rounded-lg w-fit mx-auto" style={{ backgroundColor: '#201E1E', opacity: 1, gap: '6px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '8px', paddingRight: '8px' }}>
        {/* 이전 버튼 - 동그라미 */}
        <div 
          className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
          onClick={onPrev} 
          style={{
            width: '50px',
            height: '50px',
            backgroundColor: '#201E1E',
            opacity: 1
          }}
          aria-label="이전 문장"
        >
          <div 
            style={{
              width: '0',
              height: '0',
              borderRight: '36px solid #666666',
              borderTop: '27px solid transparent',
              borderBottom: '27px solid transparent'
            }}
          />
        </div>
      {/* 재생 버튼 1 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 0 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 0) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 0) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(false, 0)}
        style={{
          background: activeIndex === 0 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="재생"
      >
        <div 
          style={{
            width: '0',
            height: '0',
            borderLeft: '21.6px solid black',
            borderTop: '14.4px solid transparent',
            borderBottom: '14.4px solid transparent'
          }}
        />
      </div>
      
      {/* 재생 버튼 2 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 1 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 1) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 1) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(false, 1)}
        style={{
          background: activeIndex === 1 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="재생"
      >
        <div 
          style={{
            width: '0',
            height: '0',
            borderLeft: '21.6px solid black',
            borderTop: '14.4px solid transparent',
            borderBottom: '14.4px solid transparent'
          }}
        />
      </div>
      
      {/* 재생 버튼 3 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 2 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 2) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 2) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(false, 2)}
        style={{
          background: activeIndex === 2 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="재생"
      >
        <div 
          style={{
            width: '0',
            height: '0',
            borderLeft: '21.6px solid black',
            borderTop: '14.4px solid transparent',
            borderBottom: '14.4px solid transparent'
          }}
        />
      </div>
      
      {/* 무음 버튼 1 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 3 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 3) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 3) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(true, 3)}
        style={{
          background: activeIndex === 3 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="무음 재생"
        >
        <span style={{ fontFamily: 'Jolly Lodger, cursive', fontSize: '48px', fontWeight: '300' }}>m</span>
      </div>
      
      {/* 재생 버튼 4 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 4 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 4) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 4) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(false, 4)}
        style={{
          background: activeIndex === 4 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="재생"
      >
        <div 
          style={{
            width: '0',
            height: '0',
            borderLeft: '21.6px solid black',
            borderTop: '14.4px solid transparent',
            borderBottom: '14.4px solid transparent'
          }}
        />
      </div>
      
      {/* 무음 버튼 2 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 5 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 5) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 5) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(true, 5)}
        style={{
          background: activeIndex === 5 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="무음 재생"
        >
        <span style={{ fontFamily: 'Jolly Lodger, cursive', fontSize: '48px', fontWeight: '300' }}>m</span>
      </div>
      
      {/* 재생 버튼 5 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 6 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 6) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 6) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(false, 6)}
        style={{
          background: activeIndex === 6 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="재생"
      >
        <div 
          style={{
            width: '0',
            height: '0',
            borderLeft: '21.6px solid black',
            borderTop: '14.4px solid transparent',
            borderBottom: '14.4px solid transparent'
          }}
        />
      </div>
      
      {/* 무음 버튼 3 */}
      <div 
        className={`rectangle-1 flex items-center justify-center text-black font-bold text-lg cursor-pointer transition-colors duration-500 ${
          activeIndex === 7 
            ? "bg-[#60D96C] border-2 border-black" 
            : ""
        }`}
        onMouseEnter={(e) => {
          if (activeIndex !== 7) {
            e.currentTarget.style.backgroundColor = '#2A602F';
          }
        }}
        onMouseLeave={(e) => {
          if (activeIndex !== 7) {
            e.currentTarget.style.backgroundColor = 'rgba(236, 236, 236, 0.5)';
          }
        }}
        onClick={() => onPlay(true, 7)}
        style={{
          background: activeIndex === 7 ? '#60D96C' : 'rgba(236, 236, 236, 0.5)',
          borderRadius: '10px',
          width: '56.97px',
          height: '56.97px',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        aria-label="무음 재생"
        >
        <span style={{ fontFamily: 'Jolly Lodger, cursive', fontSize: '48px', fontWeight: '300' }}>m</span>
      </div>
        {/* 다음 버튼 - 동그라미 */}
        <div 
          className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
          onClick={onNext} 
          style={{
            width: '50px',
            height: '50px',
            backgroundColor: '#201E1E',
            opacity: 1
          }}
          aria-label="다음 문장"
        >
          <div 
            style={{
              width: '0',
              height: '0',
              borderLeft: '36px solid #666666',
              borderTop: '27px solid transparent',
              borderBottom: '27px solid transparent'
            }}
          />
        </div>
      </div>
    </div>
  );
}


