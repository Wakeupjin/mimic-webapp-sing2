"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function SelectingPage() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    // 선택된 모드에 따라 해당 페이지로 이동
    if (mode === 'mimicking') {
      window.location.href = '/sing2/lesson?mode=mimicking';
    } else if (mode === 'guessing') {
      window.location.href = '/sing2/lesson?mode=guessing';
    } else if (mode === 'watching') {
      window.location.href = '/sing2/lesson?mode=watching';
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-4">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFullscreen}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
            {isFullscreen ? (
              // 풀스크린 종료 아이콘
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="#60D96C"/>
                <g transform="scale(1.35) translate(6, 6)">
                  <path d="M7 16L2 16C1.44772 16 1 15.5523 1 15C1 14.4477 1.44772 14 2 14L7 14C8.65685 14 10 15.3431 10 17V22C10 22.5523 9.55228 23 9 23C8.44772 23 8 22.5523 8 22V17C8 16.4477 7.55228 16 7 16Z" fill="black"/>
                  <path d="M10 2C10 1.44772 9.55229 1 9 1C8.44772 1 8 1.44772 8 2L8 7C8 7.55228 7.55228 8 7 8L2 8C1.44772 8 1 8.44771 1 9C1 9.55228 1.44772 10 2 10L7 10C8.65685 10 10 8.65685 10 7L10 2Z" fill="black"/>
                  <path d="M14 22C14 22.5523 14.4477 23 15 23C15.5523 23 16 22.5523 16 22V17C16 16.4477 16.4477 16 17 16H22C22.5523 16 23 15.5523 23 15C23 14.4477 22.5523 14 22 14H17C15.3431 14 14 15.3431 14 17V22Z" fill="black"/>
                  <path d="M14 7C14 8.65686 15.3431 10 17 10L22 10C22.5523 10 23 9.55228 23 9C23 8.44772 22.5523 8 22 8L17 8C16.4477 8 16 7.55229 16 7L16 2C16 1.44772 15.5523 1 15 1C14.4477 1 14 1.44772 14 2L14 7Z" fill="black"/>
                </g>
              </svg>
            ) : (
              // 풀스크린 진입 아이콘
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="#9CA3AF"/>
                <g transform="scale(0.7) translate(10.3, 10.3)">
                  <path d="M33 6H42V15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M42 33V42H33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 42H6V33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 15V6H15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
            )}
          </button>
          <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">연습 모드를 선택하세요</h1>
        
        <div className="flex gap-8 justify-center">
          <button
            onClick={() => handleModeSelect('watching')}
            className="rounded-2xl border-8 border-gray-300 px-8 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
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
          >
            Watch
          </button>
          
          <button
            onClick={() => handleModeSelect('mimicking')}
            className="rounded-2xl border-8 border-gray-300 px-8 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
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
          >
            Mimic
          </button>
          
          <button
            onClick={() => handleModeSelect('guessing')}
            className="rounded-2xl border-8 border-gray-300 px-8 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
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
          >
            Guess
          </button>
          
          <button
            className="rounded-2xl border-8 border-gray-300 px-8 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
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
          >
            Word
          </button>
        </div>
        
        {selectedMode && (
          <p className="mt-6 text-lg text-gray-300">
            {selectedMode === 'mimicking' ? '미믹킹' : '게싱'} 모드로 이동 중...
          </p>
        )}
        </div>
      </div>
    </main>
  );
}
