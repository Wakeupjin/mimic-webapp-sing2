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
import { TRANSITION_DURATION, WATCHING_VIDEO_DURATION_SECONDS, WATCHING_NAVIGATION_DELAY_MS } from "../../constants/timings";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";
import AgainNextButtons from "../../components/AgainNextButtons";

export default function WatchingPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // Redirect Chapter 0 to Chapter 1
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/watching?id=001:1';
      return;
    }
  }, [movieId]);
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용
  
  // 동적 데이터 로딩
  const [movieData, setMovieData] = useState<any>(null);
  const [watchingData, setWatchingData] = useState<any>(null);
  
  // Custom hooks
  // Data loading
  useEffect(() => {
    if (!movieId) return;
    
    const loadWatchingData = async () => {
      try {
        const data = await loadMovie(movieId);
        setMovieData(data);
        const watchingInfo = data.lesson[0].watching || {};
        setWatchingData(watchingInfo);
      } catch (error) {
        // Keep same behavior; just avoid verbose logging
      }
    };
    
    loadWatchingData();
  }, [movieId]);

  // Set video start time after watchingData loads
  useEffect(() => {
    if (watchingData?.start && watchingData?.end) {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        const startTime = srtTimeToSeconds(watchingData.start);
        const endTime = srtTimeToSeconds(watchingData.end);
        video.currentTime = startTime;
        
        // Reset progress to 0% (starting from start time)
        setVideoProgress(0);
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

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent fullscreen exit via ESC
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Spacebar to play/pause video
      else if (e.code === "Space") {
        e.preventDefault();
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Fullscreen toggle is provided by useFullscreen hook

  // Watching mode progress bar drag handlers
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

  // Time format function (seconds to mm:ss format)
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
                // Video loaded successfully
              }}
              onClick={() => {
                const video = document.querySelector('video') as HTMLVideoElement;
                if (video) {
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
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
                // Disable right-click menu
              }}
              onPause={(e) => {
                // Respect user pause in watching mode
                if (!showNextCta && !isVideoPaused) {
                  e.currentTarget.play();
                }
              }}
            />
            
            {/* Click overlay to start */}
            {!showNextCta && !isVideoStarted && (
              <ClickToStartOverlay
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.play();
                    setIsVideoStarted(true);
                  }
                }}
                text="Click to start"
              />
            )}

            {/* Watching mode PAUSE overlay */}
            {isVideoPaused && !showNextCta && (
              <PauseOverlay />
            )}

            {/* Watching mode Again/Next button overlay */}
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
                        setIsVideoStarted(true); // Start playback immediately
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
                      // Switch to mimicking mode (maintain fullscreen)
                      const isCurrentlyFullscreen = document.fullscreenElement !== null;
                      if (isCurrentlyFullscreen) {
                        sessionStorage.setItem('maintainFullscreen', 'true');
                      }
                      sessionStorage.setItem('fromWatching', 'true');
                      
                      // Small delay before navigation (ensure sessionStorage is saved)
                      setTimeout(() => {
                        window.location.href = `/sing2/mimicking?id=${movieId}`;
                      }, WATCHING_NAVIGATION_DELAY_MS);
                    }}
                  >
                    {/* Chameleon image overlay */}
                    <img 
                      src="/Subject.png" 
                      alt="Chameleon" 
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
        
        {/* Watching mode progress bar - below video player */}
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
              {/* Progress bar background */}
              <div className="absolute inset-0 bg-gray-300 rounded-full overflow-hidden"></div>
              {/* Progress indicator */}
              <div
                className="absolute inset-0 h-full bg-[#60D96C] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${videoProgress}%` }}
              />
              {/* Draggable circle button */}
              <div 
                className="absolute top-1/2 w-3 h-3 bg-gray-500 rounded-full cursor-pointer transform -translate-y-1/2 shadow-lg hover:bg-gray-600 transition-colors duration-200"
                style={{ left: `calc(${videoProgress}% - 6px)` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDragging(true);
                }}
              />
              
              {/* Time info tooltip - below progress bar */}
              {showProgressTooltip && (
                <div 
                  className="absolute top-9 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-50"
                  style={{ 
                    backgroundColor: 'rgb(32, 30, 30)',
                    left: `${tooltipPosition}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {/* Pointer triangle */}
                  <div 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '16px solid rgb(32, 30, 30)'
                    }}
                  ></div>
                  {formatTime((tooltipPosition / 100) * WATCHING_VIDEO_DURATION_SECONDS)} / {formatTime(WATCHING_VIDEO_DURATION_SECONDS)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}