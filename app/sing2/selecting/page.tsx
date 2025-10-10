"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useFullscreen } from '../../hooks/useFullscreen';
// 기존 상수 제거 (Supabase에서 데이터 수를 가져옴)
// import { SELECTING_CHAPTER_COUNT, SELECTING_DROPDOWN_MAX_HEIGHT_PX, SELECTING_SCROLL_THRESHOLD_PX } from '../../constants/timings'; 

// --- [SUPABASE 연결 및 타입 정의] ---
import { supabase } from '../../supabaseClient'; 

// Lesson 목록 데이터 타입 (lessons 테이블에서 가져올 정보)
type LessonSummary = {
  id: number;
  lesson_number: number;
  video_id: number; 
};
// --- [/SUPABASE 연결 및 타입 정의] ---

// 상수 (로컬 상수는 최소화하고 Supabase 데이터를 사용)
const SELECTING_DROPDOWN_MAX_HEIGHT_PX = 300; 
const SELECTING_SCROLL_THRESHOLD_PX = 5;

function SelectingPageContent() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 선택된 Lesson의 번호 (Lesson 1이 기본값)
  const [selectedLesson, setSelectedLesson] = useState<LessonSummary | null>(null); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false); 
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- [SUPABASE 데이터 로딩] ---
  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_number, video_id')
        .order('lesson_number', { ascending: true }); // 레슨 번호 순으로 정렬

      if (error) {
        console.error('Error fetching lessons:', error);
        setIsLoading(false);
        return;
      }

      const lessonList = data || [];
      setLessons(lessonList);
      
      // Lesson 목록을 가져온 후, 첫 번째 Lesson을 기본값으로 설정
      if (lessonList.length > 0) {
        setSelectedLesson(lessonList[0]);
      }
      setIsLoading(false);
    };

    fetchLessons();
  }, []);
  // --- [/SUPABASE 데이터 로딩] ---

  // Close dropdown when clicking outside
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

  // Check scrollable state
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - SELECTING_SCROLL_THRESHOLD_PX);
      }
    };

    if (isDropdownOpen && scrollContainerRef.current) {
      checkScrollable();
      const container = scrollContainerRef.current;
      // 초기 렌더링 시 스크롤 가능 여부 확인을 위해 setTimeout 사용
      setTimeout(checkScrollable, 0); 
      container.addEventListener('scroll', checkScrollable);
      return () => container.removeEventListener('scroll', checkScrollable);
    }
  }, [isDropdownOpen]);

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    
    if (!selectedLesson) return;

    // Supabase에서 가져온 video_id와 lesson_number를 사용
    const movieId = `${selectedLesson.video_id}:${selectedLesson.lesson_number}`;
    
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

  
  // --- [로딩 및 에러 화면] ---
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <h1 className="text-xl font-semibold text-[#60D96C]">Lesson 목록을 불러오는 중...</h1>
      </main>
    );
  }

  if (lessons.length === 0) {
     return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-500 mb-4">등록된 Lesson이 없습니다.</h1>
          <p className="text-gray-300 mb-2">Supabase 연결을 확인해주세요.</p>
          <p className="text-gray-400 text-sm">환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        </div>
      </main>
    );
  }
  // --- [/로딩 및 에러 화면] ---

  return (
    <main className="min-h-screen px-4 py-4" style={{ backgroundColor: '#201E1E' }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        {/* ... (Header SVG 및 Link는 기존 코드와 동일) ... */}
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

      {/* Lesson dropdown (Chapter 대신 Lesson 번호와 제목 사용) */}
      <div className="flex justify-center mb-8">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-bold text-xl transition-all duration-200 hover:bg-[#2a2a2a] cursor-pointer"
            style={{
              backgroundColor: '#1a1a1a',
              fontFamily: 'Encode Sans, sans-serif',
              minWidth: '320px', // Dropdown 너비를 넓힘
              justifyContent: 'space-between'
            }}
          >
            <div className="flex flex-col items-start truncate">
                <span className="text-sm text-gray-400">LESSON {selectedLesson?.lesson_number}</span>
                <span className="text-base truncate max-w-[250px]">{selectedLesson ? `Lesson ${selectedLesson.lesson_number}` : 'Lesson을 선택하세요'}</span>
            </div>
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

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div
              className="absolute top-full mt-2 w-full rounded-xl overflow-hidden shadow-lg"
              style={{ backgroundColor: '#1a1a1a', zIndex: 50, maxHeight: `${SELECTING_DROPDOWN_MAX_HEIGHT_PX}px` }}
            >
              <div ref={scrollContainerRef} className="overflow-auto custom-scrollbar" style={{ maxHeight: `${SELECTING_DROPDOWN_MAX_HEIGHT_PX}px` }}>
                {lessons.map((lesson) => {
                  const isSelected = lesson.id === selectedLesson?.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLesson(lesson); // Lesson 객체 전체를 선택
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-6 py-3 text-left text-white font-bold text-lg transition-colors duration-200 hover:bg-[#2a2a2a] border-t border-gray-800 first:border-t-0 flex items-center justify-between"
                      style={{ fontFamily: 'Encode Sans, sans-serif' }}
                    >
                      <div className="flex flex-col items-start truncate max-w-[250px]">
                        <span className="text-sm text-gray-400">LESSON {lesson.lesson_number}</span>
                        <span className="text-base truncate max-w-full">Lesson {lesson.lesson_number}</span>
                      </div>
                      
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
              
              {/* Small arrow at right end - only show when scrollable */}
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
            // ... (hover effects)
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
            // ... (hover effects)
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
            // ... (hover effects)
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
            // ... (hover effects)
          >
            Word
          </button>
        </div>
        
        {selectedMode && (
          <p className="mt-6 text-lg text-gray-300">
            {selectedMode === 'mimicking' ? 'Mimicking' : 
             selectedMode === 'guessing' ? 'Guessing' : 
             selectedMode === 'watching' ? 'Watching' : 
             selectedMode === 'word' ? 'Word' : ''} mode loading...
          </p>
        )}
        </div>
      </div>
    </main>
  );
}

export default function SelectingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectingPageContent />
    </Suspense>
  );
}