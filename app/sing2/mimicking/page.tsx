"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MOVIES, loadMovie } from "../../constants/movies";
import { srtTimeToSeconds } from "../../utils/srt";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import Sidebar from "../../components/Sidebar";
import PlaybackControls from "../../components/PlaybackControls";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { useMimickingSequence } from "../../hooks/useMimickingSequence";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import SceneList from "../../components/SceneList";
import {
  MIMICKING_SEQUENCE_DELAY,
  MIMICKING_NEXT_SENTENCE_DELAY,
  MIMICKING_SEQUENCE_LAST_INDEX,
  MIMICKING_ACTIVE_GREEN_INDICES,
  MIMICKING_LAST_SENTENCE_INDEX,
  MIMICKING_FULLSCREEN_SCALE,
  MIMICKING_FULLSCREEN_MARGIN_LEFT_PX,
  MIMICKING_CONTROLS_MARGIN_TOP_PX,
} from "../../constants/timings";

export default function MimickingPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/mimicking?id=001:1';
      return;
    }
  }, [movieId]);
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용
  
  // 동적 데이터 로딩
  const [movieData, setMovieData] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  
  // 커스텀 훅 사용
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const {
    isPlaying,
    playNonce,
    isVideoPaused,
    isVideoStarted,
    setIsVideoStarted,
    setPlayNonce,
    playVideo,
    pauseVideo,
    resetVideo
  } = useVideoPlayer();
  const {
    currentIndex,
    isMimickingComplete,
    isSequenceRunning,
    showNextCta,
    muted,
    activeControlIndex,
    autoSeqIndex,
    mimickingTimeouts,
    setCurrentIndex,
    setIsMimickingComplete,
    setIsSequenceRunning,
    setShowNextCta,
    setMuted,
    setActiveControlIndex,
    setAutoSeqIndex,
    executeMimickingSequence,
    execute30thMimickingSequence,
    resetMimickingState,
    clearTimeouts
  } = useMimickingSequence();

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isMimickingStarted, setIsMimickingStarted] = useState(false); // 미믹킹 시작 상태
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]); // 미믹킹 setTimeout 관리
  const autoSeqIndexRef = useRef<number | null>(null); // autoSeqIndex ref for closure fix
  const currentIndexRef = useRef<number>(0); // currentIndex ref for closure fix
  const pendingButtonIndexRef = useRef<number | null>(null); // Button waiting to turn green when video plays

  // Data loading
  useEffect(() => {
    const loadMimickingData = async () => {
      try {
        const data = await loadMovie(movieId);
        setMovieData(data);
        const mimickingScenes = data.lesson[0].mimicking || [];
        setScenes(mimickingScenes);
      } catch (error) {
        // Keep same behavior; just avoid verbose logging
      }
    };

    loadMimickingData();
  }, [movieId]);

  const currentScene = scenes[currentIndex] || movie.scenes[currentIndex];
  
  // autoSeqIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    autoSeqIndexRef.current = autoSeqIndex;
  }, [autoSeqIndex]);
  
  // currentIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // currentScene이 존재하지 않으면 안전하게 처리
  if (!currentScene) {
    return null;
  }

  // Fullscreen restore logic
  useEffect(() => {
    const shouldMaintainFullscreen = sessionStorage.getItem('maintainFullscreen') === 'true';
    const fromWatching = sessionStorage.getItem('fromWatching') === 'true';
    
    if (shouldMaintainFullscreen) {
      // Maintain fullscreen
      document.documentElement.requestFullscreen().catch((err) => {
        // no-op: keep behavior identical
      });
      sessionStorage.removeItem('maintainFullscreen');
    }
    
    if (fromWatching) {
      // Prevent auto start when coming from watching

      // Stop all video elements
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      });

      // Stop all audio elements
      const audios = document.querySelectorAll('audio');
      audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // 상태 완전 초기화
      setIsMimickingStarted(false);
      setActiveControlIndex(null);
      setAutoSeqIndex(null);
      setMuted(false);
      pauseVideo();
      resetVideo();

      sessionStorage.removeItem('fromWatching');
    }
  }, []);

  // Fullscreen state handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      // isFullscreen is handled by the hook
    };

    const preventFullscreenExit = (e: Event) => {
      // Prevent leaving fullscreen via ESC or other events
      if (isFullscreen && !document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        // Re-enter fullscreen
        document.documentElement.requestFullscreen();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent leaving fullscreen via ESC
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Navigate scenes with arrow keys
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', preventFullscreenExit);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', preventFullscreenExit);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Auto-start sequence when started (kept identical behavior)
  // useEffect(() => {
  //   if (currentIndex > 0 && isMimickingStarted) {
  //     // 두 번째 씬부터는 자동으로 시퀀스 시작 (단, 미믹킹이 시작된 후에만)
  // 미믹킹 시퀀스 실행 (자동)
  useEffect(() => {
    if (isMimickingStarted && !isSequenceRunning) {
      // Auto start sequence: set autoSeqIndex for first button (button 0)
      autoSeqIndexRef.current = 0;
      setAutoSeqIndex(0);
      setActiveControlIndex(0); // immediately highlight first button
      executeMimickingSequence(currentIndex, playVideo, currentScene);
    }
  }, [isMimickingStarted, currentIndex, executeMimickingSequence, playVideo, isSequenceRunning, currentScene]);

  // currentIndex 변경 시 상태 초기화는 훅에서 처리
  //   }
  // }, [currentIndex, isMimickingStarted]);



  const handlePrev = useCallback(() => {
    if (!isSequenceRunning) {
      setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : currentIndex);
      setShowNextCta(false);
      
      // 필요한 상태만 리셋
      setActiveControlIndex(null);
      setAutoSeqIndex(null);
      pauseVideo();
      resetVideo();
      
      // 모든 setTimeout 정리
      mimickingTimeoutsRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      mimickingTimeoutsRef.current = [];
      
      // Reset start state when returning to first scene
      if (currentIndex === 1) {
        setIsMimickingStarted(false);
      }
    }
  }, [isSequenceRunning, currentIndex]);

  const handleNext = useCallback(() => {
    if (!isSequenceRunning) {
      if (currentIndex < scenes.length - 1) {
        setPlayNonce(0); // Reset playNonce before changing scene
        setCurrentIndex(currentIndex + 1);
      } else {
        // Redirect to guessing on last scene
        const isCurrentlyFullscreen = document.fullscreenElement !== null;
        if (isCurrentlyFullscreen) {
          sessionStorage.setItem('maintainFullscreen', 'true');
        }
        sessionStorage.setItem('mimickingComplete', 'true');
        window.location.href = `/sing2/guessing?id=${movieId}`;
      }
      setShowNextCta(false);
    }
  }, [currentIndex, scenes.length, isSequenceRunning, movieId]);


  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    setMuted(m);
    setActiveControlIndex(slotIndex);
    playVideo();
  }, [playVideo]);


  return (
    <main className="min-h-screen px-4 py-2">
      <div className="mb-2 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsTextVisible((v) => !v)}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill={isTextVisible ? "#60D96C" : "#9CA3AF"}/>
              <text 
                x="24" 
                y="34" 
                textAnchor="middle" 
                fontSize="20" 
                fontWeight="bold" 
                fill={isTextVisible ? "black" : "black"}
                style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-1px' }}
              >
                CC
              </text>
            </svg>
          </button>
          <button 
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill={isSidebarOpen ? "#60D96C" : "#9CA3AF"}/>
              <path d="M16 16L42 16" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M16 29L42 29" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M16 42L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </button>
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
          <Link href="/" onClick={stopAllMedia} className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
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
          <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top', marginLeft: isFullscreen ? '130px' : '0px' }}>
            <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-[10px]`} style={{ borderColor: (activeControlIndex !== null && MIMICKING_ACTIVE_GREEN_INDICES.includes(activeControlIndex as any)) ? '#60D96C' : 'rgb(32, 30, 30)' }}>
              <VideoPlayer
                key={`mimicking-${currentIndex}`}
                src={movie.videoUrl}
                startTime={currentScene?.start ? srtTimeToSeconds(currentScene.start) : 0}
                endTime={currentScene?.end ? srtTimeToSeconds(currentScene.end) : 0}
                muted={muted}
                showText={isTextVisible}
                text={currentScene.text}
                playNonce={isMimickingStarted && playNonce > 0 ? playNonce : 0}
                playing={isMimickingStarted}
                hidePauseOverlay={autoSeqIndex !== null}
                activeControlIndex={activeControlIndex}
                onPlay={() => {
                  // Video started playing - button color was set when sequence started
                }}
                onPlayTimeout={() => {
                  // Turn button green when onPlay times out (1s)
                  const pendingIndex = pendingButtonIndexRef.current;
                  if (pendingIndex !== null) {
                    setActiveControlIndex(pendingIndex);
                    pendingButtonIndexRef.current = null; // Clear pending
                  }
                }}
                onEndedSegment={() => {
                  const currentAutoSeqIndex = autoSeqIndexRef.current;
                  setActiveControlIndex(null);

                  // 자동 시퀀스 중이면 다음 버튼으로 진행
                  if (currentAutoSeqIndex !== null) {
                    const next = currentAutoSeqIndex + 1;
                    
                    if (next <= MIMICKING_SEQUENCE_LAST_INDEX) {
                      // 다음 버튼으로 진행
                      setTimeout(() => {
                        const isMuted = MIMICKING_ACTIVE_GREEN_INDICES.includes(next as any);
                        setAutoSeqIndex(next);
                        autoSeqIndexRef.current = next; // Update ref immediately
                        setMuted(isMuted);
                        setActiveControlIndex(next); // 즉시 색상 변경
                        playVideo();
                      }, MIMICKING_SEQUENCE_DELAY);
                    } else {
                      // 8개 완료 → 시퀀스 종료
                      setAutoSeqIndex(null);
                      
                      // 다음 문장으로 자동 진행
                      const currentIdx = currentIndexRef.current;
                      if (currentIdx < MIMICKING_LAST_SENTENCE_INDEX) { // 30 sentences (0-29)
                        const nextIdx = currentIdx + 1;

                        setTimeout(() => {
                          setMuted(false); // 다음 문장 시작 전 무음 해제
                          setActiveControlIndex(null); // 활성 버튼 초기화
                          setIsSequenceRunning(false); // 이동 직전에 시퀀스 종료
                          pendingButtonIndexRef.current = null; // Clear pending button ref to prevent stale data
                          autoSeqIndexRef.current = null; // Clear auto sequence ref to prevent stale data
                          setPlayNonce(0); // Reset playNonce to 0 BEFORE changing scene (prevents old playNonce with new scene)
                          setCurrentIndex(nextIdx); // useEffect가 자동으로 시퀀스 시작
                        }, MIMICKING_NEXT_SENTENCE_DELAY);
                      } else {
                        // 30번째 문장이면 게싱 모드로 전환
                        setIsSequenceRunning(false);
                        setIsMimickingComplete(true);
                        setShowNextCta(true);
                        pauseVideo();
                      }
                    }
                  }
                }}
              />
              
              {/* 시작을 위한 클릭 오버레이 */}
              {!isMimickingStarted && currentIndex === 0 && (
                <ClickToStartOverlay
                  onClick={() => {
                    setIsMimickingStarted(true);
                    setActiveControlIndex(0);
                    setAutoSeqIndex(0);
                    setMuted(false);
                    playVideo();
                  }}
                />
              )}
            </div>
        
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
                      execute30thMimickingSequence();
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

          <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? `scale(${MIMICKING_FULLSCREEN_SCALE})` : 'scale(1)', transformOrigin: 'top', marginTop: `${MIMICKING_CONTROLS_MARGIN_TOP_PX}px`, marginLeft: isFullscreen ? `${MIMICKING_FULLSCREEN_MARGIN_LEFT_PX}px` : '0px' }}>
            {!showNextCta && (
              <PlaybackControls onPrev={handlePrev} onNext={handleNext} onPlay={handlePlay} activeIndex={activeControlIndex} isFullscreen={isFullscreen} />
            )}
            {showNextCta && (
              <div className="absolute inset-0 bg-black/80 rounded-lg"></div>
            )}
          </div>
        </section>

        {isSidebarOpen && (
          <div className="flex justify-center">
            <aside className="flex flex-col gap-2 h-full">
              <div className="bg-[#1a1a1a] rounded-lg p-4" style={{ height: 'calc(100vh - 150px)' }}>
                <h3 className="text-sm font-semibold text-[#60D96C] mb-3" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  SCENES
                </h3>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 40px)' }} ref={(el) => {
                  if (el && currentIndex >= 0 && currentIndex === 0) {
                    // 첫 번째 씬일 때만 중앙으로 스크롤
                    const buttonHeight = 48; // 버튼 높이 + gap
                    const containerHeight = el.clientHeight;
                    const scrollTop = (currentIndex * buttonHeight) - (containerHeight / 2) + (buttonHeight / 2);
                    el.scrollTop = Math.max(0, scrollTop);
                  }
                }}>
                  <SceneList
                    scenes={scenes as any}
                    currentIndex={currentIndex}
                    onSceneClick={(index) => {
                      if (index === 0 && !isMimickingStarted) {
                        // 첫 번째 씬이고 아직 시작하지 않았다면 클릭 오버레이를 통해 시작
                        return;
                      }

                      // 진행 중인 시퀀스 정리
                      clearTimeouts(); // 기존 타임아웃 정리
                      setAutoSeqIndex(null); // 자동 시퀀스 중단
                      setActiveControlIndex(null); // 활성 버튼 초기화
                      setMuted(false); // 무음 해제
                      setIsSequenceRunning(false); // 시퀀스 실행 중단
                      setPlayNonce(0); // Reset playNonce before changing scene

                      // 새 씬으로 이동 (useEffect가 자동으로 시퀀스 시작)
                      setCurrentIndex(index);
                    }}
                    isSequenceRunning={isSequenceRunning}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}