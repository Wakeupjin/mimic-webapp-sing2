"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function SelectingPage() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number>(1); // 현재 선택된 Chapter
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // 드롭다운 열림 상태
  const [canScrollDown, setCanScrollDown] = useState(false); // 스크롤 가능 상태
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 스크롤 가능 상태 체크
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
      }
    };

    if (isDropdownOpen && scrollContainerRef.current) {
      checkScrollable();
      const container = scrollContainerRef.current;
      container.addEventListener('scroll', checkScrollable);
      return () => container.removeEventListener('scroll', checkScrollable);
    }
  }, [isDropdownOpen]);

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    // 선택된 Chapter와 모드로 이동
    const movieId = `001:${selectedChapter}`;
    
    if (mode === 'mimicking') {
      window.location.href = `/sing2/mimicking?id=${movieId}`;
    } else if (mode === 'guessing') {
      window.location.href = `/sing2/guessing?id=${movieId}`;
    } else if (mode === 'watching') {
      window.location.href = `/sing2/watching?id=${movieId}`;
    } else if (mode === 'word') {
      window.location.href = `/sing2/word?id=${movieId}`;
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
      <div className="mb-8 flex items-center justify-between group">
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
                <g transform="scale(0.7) translate(10.3, 10.3)">
                  <path d="M33 6H42V15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M42 33V42H33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 42H6V33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 15V6H15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
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

      {/* Chapter 드롭다운 */}
      <div className="flex justify-center mb-8">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-bold text-xl transition-all duration-200 hover:bg-[#2a2a2a] cursor-pointer"
            style={{
              backgroundColor: '#1a1a1a',
              fontFamily: 'Encode Sans, sans-serif',
              minWidth: '200px',
              justifyContent: 'space-between'
            }}
          >
            <span>CHAPTER {selectedChapter}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            >
              <path d="M5 7.5L10 12.5L15 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 드롭다운 메뉴 */}
          {isDropdownOpen && (
            <div
              className="absolute top-full mt-2 w-full rounded-xl overflow-hidden shadow-lg"
              style={{ backgroundColor: '#1a1a1a', zIndex: 50, maxHeight: '200px' }}
            >
              <div ref={scrollContainerRef} className="overflow-auto custom-scrollbar" style={{ maxHeight: '200px' }}>
                {[...Array(12)].map((_, i) => {
                  const chapterNum = i + 1;
                  const isSelected = chapterNum === selectedChapter;
                  return (
                    <button
                      key={chapterNum}
                      onClick={() => {
                        setSelectedChapter(chapterNum);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-6 py-3 text-left text-white font-bold text-lg transition-colors duration-200 hover:bg-[#2a2a2a] border-t border-gray-800 first:border-t-0 flex items-center justify-between"
                      style={{ fontFamily: 'Encode Sans, sans-serif' }}
                    >
                      <span>CHAPTER {chapterNum}</span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 38 38" fill="none">
                          <rect width="38" height="38" rx="10" transform="matrix(-1 0 0 1 38 0)" fill="#60D96C"/>
                          <path d="M12 15.3942L18.383 25L27 11" stroke="#ECECEC" strokeWidth="5"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* 우측 끝 작은 화살표 - 스크롤 가능할 때만 표시 */}
              {canScrollDown && (
                <div className="absolute right-2 bottom-2 pointer-events-none">
                  <div className="animate-bounce">
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-gray-500"
                    >
                      <path 
                        d="M7 10L12 15L17 10" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="text-center">
        
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
            onClick={() => handleModeSelect('word')}
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
            {selectedMode === 'mimicking' ? '미믹킹' : 
             selectedMode === 'guessing' ? '게싱' : 
             selectedMode === 'watching' ? '워칭' : 
             selectedMode === 'word' ? '워드' : ''} 모드로 이동 중...
          </p>
        )}
        </div>
      </div>
    </main>
  );
}
