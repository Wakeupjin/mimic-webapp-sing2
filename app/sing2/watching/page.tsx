"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
// import VideoPlayer from "../../components/VideoPlayer"; // VideoPlayer 컴포넌트가 없으니 비디오 태그를 직접 사용합니다.
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { TRANSITION_DURATION, WATCHING_VIDEO_DURATION_SECONDS, WATCHING_NAVIGATION_DELAY_MS } from "../../constants/timings";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";

// --- [SUPABASE 연결 및 타입 정의] ---
import { fetchLessonData, parseLessonNumber, parsePack, parseProgressLesson, formatChapterLabel, resolveVideoUrl } from '../../dataService';
import { notFound } from 'next/navigation'; // 데이터 없을 때 404 처리용
import { saveProgress, getProgressByMode, saveLog } from '../../lib/progress';
import { useEvaluationLog } from '../../lib/evaluation';
import { useRequireModeAccess } from '../../lib/useRequireModeAccess';
import { getVideoSource } from '../../utils/videoSource';
import { applyInlinePlayback } from '../../utils/device';
import LessonShell from '../../components/LessonShell';
import { FullscreenIcon, HeaderIconButton } from '../../components/HeaderIcons';

// 데이터 타입 정의
type LessonDataType = {
  watch_start_sec: number;
  watch_end_sec: number;
  video_id: number;
  lesson_number: number;
};
// --- [/SUPABASE 연결 및 타입 정의] ---


function WatchingPageContent() {
  // 모든 훅을 최상단에 배치 (조건부 호출 방지)
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';

  // 상태 관리
  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(() => parseProgressLesson(movieId) || 1);

  // 커스텀 훅들
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const {
    isPlaying,
    playNonce,
    isVideoPaused,
    isVideoStarted,
    setIsVideoStarted,
    setIsVideoPaused,
    playVideo,
    pauseVideo,
    resetVideo
  } = useVideoPlayer();

  const evalLog = useEvaluationLog(lessonNumber, 'watching', isVideoStarted);
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, 'watching');
  const maxWatchedRef = useRef(0);
  const watchingDoneRef = useRef(false);

  const playSafely = (video: HTMLVideoElement | null) => {
    if (!video) return;
    void video.play().catch(() => {});
  };

  // 인증 체크 - useEffect로 처리
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Redirect Chapter 0 to Chapter 1
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/watching?id=001:1';
      return;
    }
  }, [movieId]);

  // Supabase 데이터 로딩 useEffect
  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      // 1. Lesson ID 추출 ("001:5" -> 5)
      const contentLesson = parseLessonNumber(movieId);
      const pack = parsePack(movieId);
      setLessonNumber(parseProgressLesson(movieId));

      if (isNaN(contentLesson) || contentLesson < 1 || (pack <= 1 && contentLesson > 12)) {
        setIsLoading(false);
        return; 
      }

      const lesson = await fetchLessonData(contentLesson, pack);

      if (!lesson) {
        setIsLoading(false);
        return;
      }

      const videoUrl = await resolveVideoUrl(lesson.video_id);
      setLessonData(lesson as LessonDataType); 
      setVideoUrl(videoUrl); 
      setIsLoading(false);

      // 5. 저장된 진도 불러오기
      try {
        const progress = await getProgressByMode(lessonNumber, 'watching');
        if (progress) {
          setSavedProgress(progress);
          if (typeof progress.current_position === 'number') {
            maxWatchedRef.current = progress.current_position;
          }
          watchingDoneRef.current = Boolean(progress.completed);
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
          const start = Number(lessonData?.watch_start_sec || 0);
          const end = Number(lessonData?.watch_end_sec || 0);
          const span = Math.max(1, end - start);
          const percent = Math.min(
            100,
            Math.max(0, Math.round(((video.currentTime - start) / span) * 100))
          );
          const maxPercent = Math.max(
            Number(evalLog.payloadRef.current.maxPercent || 0),
            percent
          );
          evalLog.patch({
            startSec: start,
            endSec: end,
            lastPositionSec: Math.round(video.currentTime),
            maxPercent,
          });
          console.log('💾 진도 저장됨:', video.currentTime);
        } catch (error) {
          console.error('진도 저장 실패:', error);
        }
      }
    }, 5000); // 5초마다 저장

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isVideoStarted, lessonData, evalLog]);

  // 학습 로그 저장 (비디오 시작/일시정지/재생 등)
  useEffect(() => {
    if (!lessonNumber || lessonNumber === 0) return;

    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video) return;

    const handlePlay = () => {
      saveLog(lessonNumber, 'watching', 'video_play', { timestamp: video.currentTime });
      evalLog.bumpPlay('play');
    };

    const handlePause = () => {
      saveLog(lessonNumber, 'watching', 'video_pause', { timestamp: video.currentTime });
    };

    const handleEnded = async () => {
      try {
        // 완료 상태로 저장
        await saveProgress(lessonNumber, 'watching', true, video.currentTime);
        evalLog.patch({ maxPercent: 100 });
        void evalLog.flush();
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
  }, [lessonNumber, videoUrl, evalLog]);

  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipPlacement, setTooltipPlacement] = useState<"above" | "below">("above");
  const [showNextCta, setShowNextCta] = useState(false);

  // 진행 바 아래 공간이 부족하면(맥북처럼) 위로, 여유 있으면 아래로
  const updateTooltipPlacement = (bar: HTMLElement) => {
    const rect = bar.getBoundingClientRect();
    const tooltipHeight = 44;
    const gap = 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    setTooltipPlacement(spaceBelow >= tooltipHeight + gap ? "below" : "above");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (showNextCta) return;
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          if (video.paused) {
            playSafely(video);
            setIsVideoPaused(false);
          } else {
            video.pause();
            pauseVideo();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showNextCta]);

  if (loading || checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-[#60D96C]">로딩 중...</h1>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요합니다...</h1>
        </div>
      </main>
    );
  }

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
    if (showNextCta) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    
    // lessonData 사용으로 변경
    if (lessonData) {
      const totalDuration = endTime - startTime;
      let newTime = startTime + (progress / 100) * totalDuration;
      if (!isMaster && !watchingDoneRef.current) {
        newTime = Math.min(newTime, maxWatchedRef.current || startTime);
      }
      newTime = Math.max(startTime, Math.min(newTime, endTime));
      
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  const skipToEnd = () => {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) return;
    video.currentTime = endTime;
    video.pause();
    watchingDoneRef.current = true;
    void saveProgress(lessonNumber, 'watching', true, endTime);
    setVideoProgress(100);
    setShowNextCta(true);
  };

  const clipDuration = Math.max(0, endTime - startTime);
  const currentClipTime = (videoProgress / 100) * clipDuration;
  const barPercent = showNextCta ? 100 : videoProgress;

  return (
    <LessonShell
      hideHeader
      footer={<p className="watch-chapter">{formatChapterLabel(parsePack(movieId), parseLessonNumber(movieId))}</p>}
      video={
          <div className="relative h-full w-full">
            <video
              src={getVideoSource()}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 cursor-pointer ${
                showNextCta ? 'opacity-10' : isVideoPaused ? 'opacity-50' : 'opacity-100'
              }`}
              controls={false}
              autoPlay={false}
              muted={false}
              playsInline
              preload="auto"
              onLoadedData={(e) => {
                const video = e.currentTarget;
                applyInlinePlayback(video);
                const startAt = savedProgress?.current_position || Number(lessonData?.watch_start_sec) || 0;
                if (isFinite(startAt) && startAt >= 0) {
                  video.currentTime = startAt;
                }
              }}
              onClick={() => {
                const video = document.querySelector('video') as HTMLVideoElement;
                if (!video || showNextCta) return;
                if (video.paused) {
                  playSafely(video);
                  setIsVideoPaused(false);
                  setIsVideoStarted(true);
                } else {
                  video.pause();
                  pauseVideo();
                }
              }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (lessonData) {
                  if (!isMaster && !watchingDoneRef.current && video.currentTime > maxWatchedRef.current + 1.5) {
                    video.currentTime = maxWatchedRef.current;
                    return;
                  }
                  const totalDuration = endTime - startTime;
                  const currentProgress = video.currentTime - startTime;
                  const progress = Math.max(0, (currentProgress / totalDuration) * 100);
                  setVideoProgress(progress);
                  
                  if (video.currentTime > maxWatchedRef.current) {
                    maxWatchedRef.current = video.currentTime;
                  }
                  if (video.currentTime >= endTime) {
                    if (video.currentTime > endTime + 0.3 && !isMaster && !watchingDoneRef.current) {
                      video.currentTime = endTime;
                    }
                    if (!video.paused) {
                      video.pause();
                    }
                    if (!watchingDoneRef.current) {
                      watchingDoneRef.current = true;
                      void saveProgress(lessonNumber, 'watching', true, endTime);
                    }
                    if (!showNextCta) {
                      setShowNextCta(true);
                    }
                  }
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            />
            <Link
              href={`/sing2/selecting?id=${movieId}`}
              className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4"
              aria-label="뒤로"
            >
              <img src="/home/back.svg" alt="" className="h-full w-full" />
            </Link>
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
              <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
                <FullscreenIcon active={isFullscreen} />
              </HeaderIconButton>
              {isMaster && (
                <button type="button" className="watch-skip" onClick={skipToEnd}>
                  SKIP
                </button>
              )}
            </div>
            
            {/* Click overlay to start */}
            {!showNextCta && !isVideoStarted && (
              <ClickToStartOverlay
                onClick={() => {
                  const video = document.querySelector('video');
                  if (video) {
                    playSafely(video);
                    setIsVideoPaused(false);
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
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto flex items-start justify-center gap-[clamp(2rem,8vw,12rem)]">
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button
                      type="button"
                      className="select-mode"
                      onClick={() => {
                        const video = document.querySelector('video') as HTMLVideoElement;
                        if (video) {
                          if (isFinite(startTime) && startTime >= 0) {
                            video.currentTime = startTime;
                          }
                          playSafely(video);
                          setShowNextCta(false);
                          setVideoProgress(0);
                          setIsVideoPaused(false);
                          setIsVideoStarted(true);
                        }
                      }}
                    >
                      Again
                    </button>
                    <p className="select-here" style={{ visibility: 'hidden' }}>Let’s go</p>
                  </div>
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button
                      type="button"
                      className="select-mode is-open"
                      onClick={() => {
                        const isCurrentlyFullscreen = document.fullscreenElement !== null;
                        if (isCurrentlyFullscreen) {
                          sessionStorage.setItem('maintainFullscreen', 'true');
                        }
                        sessionStorage.setItem('fromWatching', 'true');
                        setTimeout(() => {
                          window.location.href = `/sing2/mimicking?id=${movieId}`;
                        }, WATCHING_NAVIGATION_DELAY_MS);
                      }}
                    >
                      <img src="/home/chameleon.png" alt="" className="select-chameleon" />
                      Next
                    </button>
                    <p className="cta-go">Let’s go</p>
                  </div>
                </div>
              </div>
            )}
          </div>
      }
      controls={
          <div className="relative z-50 w-full overflow-visible">
            <div 
              className="watch-bar"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onMouseUp={handleProgressMouseUp}
              onMouseEnter={(e) => {
                updateTooltipPlacement(e.currentTarget);
                setShowProgressTooltip(true);
              }}
              onMouseLeave={() => {
                setShowProgressTooltip(false);
                handleProgressMouseUp();
              }}
              onMouseMove={(e) => {
                const progressBar = e.currentTarget;
                updateTooltipPlacement(progressBar);
                const rect = progressBar.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const progress = (mouseX / rect.width) * 100;
                setTooltipPosition(Math.max(0, Math.min(100, progress)));
                handleProgressMouseMove(e);
              }}
            >
              <div className="watch-bar-track"></div>
              <div
                className="watch-bar-fill transition-all duration-300 ease-out"
                style={{ width: `${barPercent}%` }}
              />
              <div 
                className="watch-bar-thumb cursor-pointer"
                style={{ left: `${barPercent}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDragging(true);
                }}
              />
              {(showProgressTooltip || isVideoStarted) && (
                <div 
                  className="watch-time"
                  style={{ left: `${showProgressTooltip ? tooltipPosition : barPercent}%` }}
                >
                  {formatTime(showProgressTooltip ? (tooltipPosition / 100) * clipDuration : currentClipTime)} / {formatTime(clipDuration)}
                </div>
              )}
            </div>
          </div>
      }
    />
  );
}

export default function WatchingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WatchingPageContent />
    </Suspense>
  );
}