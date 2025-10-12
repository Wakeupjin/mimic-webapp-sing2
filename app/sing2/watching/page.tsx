"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
// import VideoPlayer from "../../components/VideoPlayer"; // VideoPlayer 컴포넌트가 없으니 비디오 태그를 직접 사용합니다.
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { TRANSITION_DURATION, WATCHING_VIDEO_DURATION_SECONDS, WATCHING_NAVIGATION_DELAY_MS } from "../../constants/timings";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";
import AgainNextButtons from "../../components/AgainNextButtons";

// --- [SUPABASE 연결 및 타입 정의] ---
import { fetchLessonData } from '../../dataService'; // 당신의 dataService.js 경로에 맞게 수정하세요.
import { supabase } from '../../supabaseClient'; // 비디오 URL을 가져오기 위해 직접 supabase 클라이언트 사용
import { notFound } from 'next/navigation'; // 데이터 없을 때 404 처리용
import { saveProgress, getProgressByMode, saveLog } from '../../lib/progress';
import { getVideoSourceWithTimeRange } from '../../utils/videoSource';

// 데이터 타입 정의
type LessonDataType = {
  watch_start_sec: number;
  watch_end_sec: number;
  video_id: number;
  lesson_number: number;
};
// --- [/SUPABASE 연결 및 타입 정의] ---


function WatchingPageContent() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // Redirect Chapter 0 to Chapter 1
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/watching?id=001:1';
      return;
    }
  }, [movieId]);
  
  
  // --- [새로운 상태 및 데이터 로딩] ---
  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(0);

  // Supabase 데이터 로딩 useEffect
  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      // 1. Lesson ID 추출 ("001:5" -> 5)
      const lessonNumberStr = movieId.split(':')[1];
      const lessonNumber = parseInt(lessonNumberStr);
      setLessonNumber(lessonNumber);

      if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > 12) {
        setIsLoading(false);
        return; 
      }

      // 2. Lesson 데이터 (시간 정보) 가져오기
      const lesson = await fetchLessonData(lessonNumber);

      if (!lesson) {
        setIsLoading(false);
        return;
      }
      
      // 3. Video URL 가져오기 (lesson.video_id 사용)
      const { data: videoResult, error: videoError } = await supabase
        .from('videos')
        .select('video_url, title')
        .eq('id', lesson.video_id)
        .single();

      if (videoError || !videoResult) {
        console.error('Video URL fetching error:', videoError);
        setIsLoading(false);
        return;
      }

      // 4. 상태 업데이트
      setLessonData(lesson as LessonDataType); 
      setVideoUrl(videoResult.video_url); 
      setIsLoading(false);

      // 5. 저장된 진도 불러오기
      try {
        const progress = await getProgressByMode(lessonNumber, 'watching');
        if (progress) {
          setSavedProgress(progress);
          console.log('📚 저장된 진도 불러옴:', progress);
        }
      } catch (error) {
        console.log('진도 데이터 없음 (첫 학습)');
      }
    };

    loadDataFromSupabase();
  }, [movieId]);


  // 비디오 시작 시간 설정 useEffect (데이터 로드 후 실행)
  useEffect(() => {
    if (lessonData?.watch_start_sec !== undefined && lessonData?.watch_end_sec !== undefined) {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        // 저장된 진도가 있으면 그 위치에서 시작, 없으면 기본 시작 시간
        const startTime = savedProgress?.current_position || Number(lessonData.watch_start_sec);
        
        if (isFinite(startTime) && startTime >= 0) {
          video.currentTime = startTime;
          console.log('🎬 비디오 시작 시간:', startTime, savedProgress ? '(저장된 위치)' : '(기본 시작)');
        }
        
        setVideoProgress(0);
      }
    }
  }, [lessonData, savedProgress]);
  // --- [/새로운 상태 및 데이터 로딩] ---

  // Custom hooks (기존 코드 유지)
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

  // 진도 저장 useEffect (비디오 재생 중 주기적으로 저장)
  useEffect(() => {
    if (!lessonNumber || lessonNumber === 0 || !isVideoStarted) return;

    const saveProgressInterval = setInterval(async () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video && !video.paused) {
        try {
          await saveProgress(
            lessonNumber,
            'watching',
            false, // 아직 완료되지 않음
            video.currentTime, // 현재 재생 위치
            { 
              videoProgress: (video.currentTime / video.duration) * 100,
              lastSaved: new Date().toISOString()
            }
          );
          console.log('💾 진도 저장됨:', video.currentTime);
        } catch (error) {
          console.error('진도 저장 실패:', error);
        }
      }
    }, 5000); // 5초마다 저장

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isVideoStarted]);

  // 학습 로그 저장 (비디오 시작/일시정지/재생 등)
  useEffect(() => {
    if (!lessonNumber || lessonNumber === 0) return;

    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video) return;

    const handlePlay = () => {
      saveLog(lessonNumber, 'watching', 'video_play', { timestamp: video.currentTime });
    };

    const handlePause = () => {
      saveLog(lessonNumber, 'watching', 'video_pause', { timestamp: video.currentTime });
    };

    const handleEnded = async () => {
      try {
        // 완료 상태로 저장
        await saveProgress(lessonNumber, 'watching', true, video.currentTime);
        await saveLog(lessonNumber, 'watching', 'video_completed', { 
          duration: video.duration,
          completed_at: new Date().toISOString()
        });
        console.log('🎉 Watching 모드 완료!');
      } catch (error) {
        console.error('완료 저장 실패:', error);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [lessonNumber, videoUrl]);

  // 로컬 상태 (훅으로 교체되지 않은 것들 - 기존 코드 유지)
  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [showNextCta, setShowNextCta] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);

  // Keyboard event handling (기존 코드 유지)
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

  
  // --- [로딩 및 변수 정의] ---
  if (isLoading || !lessonData || !videoUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">데이터를 불러오는 중...</h1>
      </main>
    );
  }
  
  // Lesson/Video 데이터가 모두 로드되면 변수에 저장
  const startTime = lessonData.watch_start_sec;
  const endTime = lessonData.watch_end_sec;
  // --- [/로딩 및 변수 정의] ---


  // Watching mode progress bar drag handlers (기존 로직 수정)
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    
    // lessonData 사용으로 변경
    if (lessonData) {
      const totalDuration = endTime - startTime;
      const newTime = startTime + (progress / 100) * totalDuration;
      
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video && isFinite(newTime) && newTime >= 0) {
        video.currentTime = newTime;
        setVideoProgress(progress);
      }
    }
  };

  // 나머지 progress bar 핸들러는 그대로 유지
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

  // Time format function (seconds to mm:ss format) - 기존 코드 유지
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between group">
        {/* title 부분은 임시로 'SING 2'를 사용합니다. */}
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        {/* ... (나머지 헤더 버튼들 유지) */}
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
              // src={movie.videoUrl} <-- 이전 코드 제거됨
              src={lessonData ? getVideoSourceWithTimeRange(
                lessonData.watch_start_sec,
                lessonData.watch_end_sec
              ) : videoUrl} // <-- 스트리밍 최적화된 URL 사용
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
                if (lessonData) { // lessonData 사용으로 변경
                  const totalDuration = endTime - startTime; // 위에 정의된 변수 사용
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
                        if (isFinite(startTime) && startTime >= 0) {
                          video.currentTime = startTime;
                        }
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
                  {/* WATCHING_VIDEO_DURATION_SECONDS 대신 endTime - startTime 사용 */}
                  {formatTime(startTime + (tooltipPosition / 100) * (endTime - startTime))} / {formatTime(endTime - startTime)} 
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function WatchingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WatchingPageContent />
    </Suspense>
  );
}