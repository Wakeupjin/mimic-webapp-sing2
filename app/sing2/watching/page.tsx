"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MOVIES, loadMovie } from "../../constants/movies";
import { srtTimeToSeconds } from "../../utils/srt";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { TRANSITION_DURATION } from "../../constants/timings";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";
import AgainNextButtons from "../../components/AgainNextButtons";

export default function WatchingPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      console.log('🚫 Chapter 0은 존재하지 않습니다. Chapter 1로 리다이렉트');
      window.location.href = '/sing2/watching?id=001:1';
      return;
    }
  }, [movieId]);
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용
  
  // 동적 데이터 로딩
  const [movieData, setMovieData] = useState<any>(null);
  const [watchingData, setWatchingData] = useState<any>(null);
  
  // 커스텀 훅 사용
  // 데이터 로딩
  useEffect(() => {
    if (!movieId) return;
    
    const loadWatchingData = async () => {
      try {
        console.log('🎬 워칭 loadMovie 호출:', movieId);
        const data = await loadMovie(movieId);
        console.log('🎬 워칭 로드된 데이터:', data);
        setMovieData(data);
        const watchingInfo = data.lesson[0].watching || {};
        setWatchingData(watchingInfo);
        console.log(`📚 워칭 데이터 로드됨:`, watchingInfo);
      } catch (error) {
        console.error("워칭 데이터 로드 실패:", error);
      }
    };
    
    loadWatchingData();
  }, [movieId]);

  // watchingData가 로드된 후 비디오 시작 시간 설정
  useEffect(() => {
    if (watchingData?.start && watchingData?.end) {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        const startTime = srtTimeToSeconds(watchingData.start);
        const endTime = srtTimeToSeconds(watchingData.end);
        video.currentTime = startTime;
        
        // 진행률을 0%로 초기화 (시작 시간부터 시작하므로)
        setVideoProgress(0);
        console.log('🎬 시작 시간으로 이동:', startTime, '초, 진행률 초기화');
      }
    }
  }, [watchingData]);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const { 
    isPlaying, 
    playNonce, 
    isVideoPaused, 
    isVideoStarted, 
    setIsVideoStarted,
    playVideo, 
    pauseVideo, 
    resetVideo 
  } = useVideoPlayer();

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [showNextCta, setShowNextCta] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키로 풀스크린 해제 방지
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
      // 스페이스바로 비디오 재생/일시정지
      else if (e.code === "Space") {
        e.preventDefault();
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          if (video.paused) {
            video.play();
            // pauseVideo(); // 훅 사용
          } else {
            video.pause();
            // pauseVideo(); // 훅 사용
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 풀스크린 토글은 useFullscreen 훅에서 제공

  // 워칭 모드 진행률 바 드래그 핸들러
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    
    if (watchingData?.start && watchingData?.end) {
      const startTime = srtTimeToSeconds(watchingData.start);
      const endTime = srtTimeToSeconds(watchingData.end);
      const totalDuration = endTime - startTime;
      const newTime = startTime + (progress / 100) * totalDuration;
      
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        video.currentTime = newTime;
        setVideoProgress(progress);
      }
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleProgressClick(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  // 시간 포맷 함수 (초를 mm:ss 형식으로)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between group">
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

      <div className="flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
        <div className={`aspect-video bg-black rounded-2xl overflow-hidden border-[10px] ${isFullscreen ? 'w-[84%]' : 'w-[70%]'}`} style={{ borderColor: '#201E1E' }}>
          <div className="relative w-full h-full">
            <video
              src={movie.videoUrl}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${isVideoPaused ? 'opacity-50' : 'opacity-100'}`}
              controls={false}
              autoPlay={false}
              muted={false}
              playsInline
              preload="auto"
              onLoadedData={() => {
                console.log('워칭 모드 영상 로드 완료');
              }}
              onClick={() => {
                const video = document.querySelector('video') as HTMLVideoElement;
                if (video) {
                  if (video.paused) {
                    video.play();
                    // pauseVideo(); // 훅 사용
                  } else {
                    video.pause();
                    // pauseVideo(); // 훅 사용
                  }
                }
              }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (watchingData?.start && watchingData?.end) {
                  const startTime = srtTimeToSeconds(watchingData.start);
                  const endTime = srtTimeToSeconds(watchingData.end);
                  const totalDuration = endTime - startTime;
                  const currentProgress = video.currentTime - startTime;
                  const progress = Math.max(0, (currentProgress / totalDuration) * 100);
                  setVideoProgress(progress);
                  
                  if (video.currentTime >= endTime) {
                    video.pause();
                    setShowNextCta(true);
                  }
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                // 우클릭 메뉴 비활성화
              }}
              onPause={(e) => {
                // 워칭 모드에서는 사용자가 일시정지한 경우를 존중
                if (!showNextCta && !isVideoPaused) {
                  e.currentTarget.play();
                }
              }}
            />
            
            {/* 시작을 위한 클릭 오버레이 */}
            {!showNextCta && !isVideoStarted && (
              <ClickToStartOverlay
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.play();
                    setIsVideoStarted(true);
                  }
                }}
                text="시작을 위해 클릭해주세요"
              />
            )}

            {/* 워칭 모드 PAUSE 오버레이 */}
            {isVideoPaused && !showNextCta && (
              <PauseOverlay />
            )}

            {/* 워칭 모드 Again/Next 버튼 오버레이 */}
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
                      const video = document.querySelector('video') as HTMLVideoElement;
                      if (video) {
                        video.currentTime = 0;
                        video.play();
                        setShowNextCta(false);
                        setVideoProgress(0);
                        setIsVideoStarted(true); // 바로 재생 시작으로 설정
                      }
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
                    onClick={() => {
                      // 미믹킹 모드로 전환 (풀스크린 유지)
                      const isCurrentlyFullscreen = document.fullscreenElement !== null;
                      if (isCurrentlyFullscreen) {
                        sessionStorage.setItem('maintainFullscreen', 'true');
                      }
                      sessionStorage.setItem('fromWatching', 'true');
                      console.log('🏠 워칭에서 미믹킹으로 이동: fromWatching 플래그 설정');
                      
                      // 약간의 지연 후 이동 (sessionStorage 저장 보장)
                      setTimeout(() => {
                        window.location.href = `/sing2/mimicking?id=${movieId}`;
                      }, 100);
                    }}
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
        </div>
        
        {/* 워칭 모드 진행률 바 - 비디오 플레이어 아래 */}
        {!showNextCta && (
          <div className={`mt-4 px-4 ${isFullscreen ? 'w-[84%]' : 'w-[70%]'}`}>
            <div 
              className="relative w-full h-2 cursor-pointer"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onMouseUp={handleProgressMouseUp}
              onMouseEnter={() => {
                setShowProgressTooltip(true);
              }}
              onMouseLeave={() => {
                setShowProgressTooltip(false);
                handleProgressMouseUp();
              }}
              onMouseMove={(e) => {
                const progressBar = e.currentTarget;
                const rect = progressBar.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const progress = (mouseX / rect.width) * 100;
                setTooltipPosition(Math.max(0, Math.min(100, progress)));
                handleProgressMouseMove(e);
              }}
            >
              {/* 진행률 바 배경 */}
              <div className="absolute inset-0 bg-gray-300 rounded-full overflow-hidden"></div>
              {/* 진행률 표시 */}
              <div
                className="absolute inset-0 h-full bg-[#60D96C] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${videoProgress}%` }}
              />
              {/* 드래그 가능한 동그라미 버튼 */}
              <div 
                className="absolute top-1/2 w-3 h-3 bg-gray-500 rounded-full cursor-pointer transform -translate-y-1/2 shadow-lg hover:bg-gray-600 transition-colors duration-200"
                style={{ left: `calc(${videoProgress}% - 6px)` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDragging(true);
                }}
              />
              
              {/* 시간 정보 툴팁 - 진행률 바 하단 */}
              {showProgressTooltip && (
                <div 
                  className="absolute top-9 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-50"
                  style={{ 
                    backgroundColor: 'rgb(32, 30, 30)',
                    left: `${tooltipPosition}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {/* 포인터 삼각형 */}
                  <div 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '16px solid rgb(32, 30, 30)'
                    }}
                  ></div>
                  {formatTime((tooltipPosition / 100) * 401.5)} / {formatTime(401.5)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}