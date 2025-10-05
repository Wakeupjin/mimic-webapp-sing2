"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MOVIES } from "../../constants/movies";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import Sidebar from "../../components/Sidebar";
import PlaybackControls from "../../components/PlaybackControls";

export default function TrainingPage() {
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용

  if (!movie) {
    return (
      <main className="min-h-screen px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">영화를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-gray-600">홈으로 돌아가 다시 선택해주세요.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          홈으로 이동
        </Link>
      </main>
    );
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null); // 0~7 진행
  const [showNextCta, setShowNextCta] = useState(true); // 임시로 true로 설정
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGuessingMode, setIsGuessingMode] = useState(false); // 게싱 모드 상태

  const currentScene = movie.scenes[currentIndex];

  // 전체화면 상태 감지 및 유지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const preventFullscreenExit = (e: Event) => {
      // 풀스크린 상태에서 ESC 키나 다른 이벤트로 인한 풀스크린 해제 방지
      if (isFullscreen && !document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        // 풀스크린 재진입
        document.documentElement.requestFullscreen();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키로 풀스크린 해제 방지
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenchange', preventFullscreenExit);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenchange', preventFullscreenExit);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // 페이지 진입 또는 문장 변경 시 자동 시퀀스 시작
  useEffect(() => {
    setShowNextCta(false);
    setAutoSeqIndex(0);
    // 첫 버튼 실행
    const isMuted = [3,5,7].includes(0); // false
    handlePlay(isMuted, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene.id]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
    setShowNextCta(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < movie.scenes.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      // 마지막 씬이면 게싱 페이지로 이동 (풀스크린 상태 유지)
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      
      // 풀스크린 상태를 sessionStorage에 저장 (페이지 새로고침에도 유지)
      sessionStorage.setItem('maintainFullscreen', 'true');
      
      // 게싱 페이지로 이동
      window.location.href = `/sing2/guessing`;
    }
    setShowNextCta(false);
  }, [currentIndex, movie.scenes.length]);

  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    setMuted(m);
    // 외부 재생 신호 전달
    setPlayNonce((n) => n + 1);
    setActiveControlIndex(slotIndex);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "Space") {
        // 스페이스는 Video 태그 클릭 토글과 동일 동작을 위해 음소거 상태 유지
        e.preventDefault();
        setMuted((m) => m);
      } else if (e.key === ">") {
        e.preventDefault();
        handlePlay(false, 0);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        handlePlay(true, 3);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePlay, handlePrev]);

  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
        <div className="flex items-center gap-3">
          <button 
            className="rounded border px-2 py-1 text-sm bg-black text-white hover:bg-[#2A602F]" 
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {isFullscreen ? "Normal screen" : "Full screen"}
          </button>
          <button 
            className="rounded border px-2 py-1 text-sm bg-black text-white hover:bg-[#2A602F]" 
            onClick={() => setIsSidebarOpen((v) => !v)}
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            Sidebar {isSidebarOpen ? "OFF" : "ON"}
          </button>
          <button 
            className="rounded border px-2 py-1 text-sm hover:bg-[#2A602F] hover:text-white" 
            onClick={() => setIsTextVisible((v) => !v)}
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            Caption {isTextVisible ? "OFF" : "ON"}
          </button>
          <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${isSidebarOpen ? 'lg:grid-cols-[1fr_200px]' : 'lg:grid-cols-1'}`}>
            <section className="flex flex-col" style={{ backgroundColor: showNextCta ? '#0a0a0a' : undefined }}>
              <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top' }}>
          <VideoPlayer
            src={movie.videoUrl}
            startTime={currentScene.startTime}
            endTime={currentScene.endTime}
            muted={muted}
            showText={isTextVisible}
            text={currentScene.text}
            playNonce={playNonce}
            hidePauseOverlay={autoSeqIndex !== null}
            activeControlIndex={activeControlIndex}
            onEndedSegment={() => {
              setActiveControlIndex(null);
              // 자동 시퀀스 중이면 다음 버튼으로 진행
              if (autoSeqIndex !== null) {
                const next = autoSeqIndex + 1;
                if (next <= 7) {
                  setTimeout(() => {
                    // 짝수 인덱스는 재생, 홀수 인덱스는 무음 패턴(> > > m > m > m)
                    const isMuted = [3,5,7].includes(next);
                    handlePlay(isMuted, next);
                    setAutoSeqIndex(next);
                  }, 1000);
                } else {
                  // 8개 완료 → 다음 씬으로 자동 진행 (30문장 등 긴 레슨 지원)
                  setAutoSeqIndex(null);
                  if (currentIndex < movie.scenes.length - 1) {
                    setTimeout(() => {
                      setCurrentIndex((idx) => Math.min(idx + 1, movie.scenes.length - 1));
                      // 다음 씬 진입 시 자동 시퀀스가 다시 시작됨(useEffect)
                    }, 800);
                  } else {
                    // 마지막 씬이면 CTA 노출
                    setShowNextCta(true);
                  }
                }
              }
            }}
          />
          
          {showNextCta && (
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
                  onClick={() => {
                    setShowNextCta(false);
                    setCurrentIndex(0); // 첫 문장으로 돌아가기
                  }}
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
                  onClick={handleNext}
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
          )}
          </div>

          <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top' }}>
            <PlaybackControls onPrev={handlePrev} onNext={handleNext} onPlay={handlePlay} activeIndex={activeControlIndex} isFullscreen={isFullscreen} />
            {showNextCta && (
              <div className="absolute inset-0 bg-black/80 rounded-lg"></div>
            )}
          </div>
        </section>

        {isSidebarOpen && (
          <div className="flex justify-center">
                <Sidebar
                  scenes={movie.scenes}
                  currentIndex={currentIndex}
                  onSelect={setCurrentIndex}
                  isOpen={isSidebarOpen}
                  onToggle={() => setIsSidebarOpen((v) => !v)}
                  showText={isTextVisible}
                  isFullscreen={isFullscreen}
                />
          </div>
        )}
      </div>
    </main>
  );
}


