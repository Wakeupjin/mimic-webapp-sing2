"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { WATCHING_NAVIGATION_DELAY_MS } from "../../constants/timings";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";
import {
  fetchLessonData,
  parseLessonNumber,
  parsePack,
  parseProgressLesson,
  formatChapterLabel,
} from "../../dataService";
import { saveProgress, getProgressByMode, saveLog } from "../../lib/progress";
import { useEvaluationLog } from "../../lib/evaluation";
import { useRequireModeAccess } from "../../lib/useRequireModeAccess";
import { getLessonMedia, lessonPath, lessonSelectHref } from "../../lib/lessonMedia";
import LessonShell from "../../components/LessonShell";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";

type LessonDataType = {
  watch_start_sec: number;
  watch_end_sec: number;
  lesson_number: number;
};

function getListenAudio() {
  return document.getElementById("listen-player") as HTMLAudioElement | null;
}

function ListenPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get("id") || "003:1";
  const media = getLessonMedia(movieId);

  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(() => parseProgressLesson(movieId) || 301);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const {
    isVideoPaused,
    isVideoStarted,
    setIsVideoStarted,
    setIsVideoPaused,
    pauseVideo,
  } = useVideoPlayer();

  const evalLog = useEvaluationLog(lessonNumber, "watching", isVideoStarted);
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, "watching", movieId);
  const maxWatchedRef = useRef(0);
  const watchingDoneRef = useRef(false);

  const playSafely = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    void audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!movieId) return;

    const load = async () => {
      setIsLoading(true);
      const contentLesson = parseLessonNumber(movieId);
      const pack = parsePack(movieId);
      setLessonNumber(parseProgressLesson(movieId));

      if (Number.isNaN(contentLesson) || contentLesson < 1) {
        setIsLoading(false);
        return;
      }

      const lesson = await fetchLessonData(contentLesson, pack);
      if (!lesson) {
        setIsLoading(false);
        return;
      }

      setLessonData(lesson as LessonDataType);

      try {
        const progress = await getProgressByMode(parseProgressLesson(movieId), "watching");
        if (progress) {
          setSavedProgress(progress);
          if (typeof progress.current_position === "number") {
            maxWatchedRef.current = progress.current_position;
          }
          watchingDoneRef.current = Boolean(progress.completed);
        }
      } catch {
        // first listen
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [movieId]);

  useEffect(() => {
    if (lessonData?.watch_start_sec === undefined) return;
    const audio = getListenAudio();
    if (!audio) return;
    const startTime = savedProgress?.current_position || Number(lessonData.watch_start_sec);
    if (Number.isFinite(startTime) && startTime >= 0) {
      audio.currentTime = startTime;
    }
    setVideoProgress(0);
  }, [lessonData, savedProgress]);

  useEffect(() => {
    if (!lessonNumber || lessonNumber === 0 || !isVideoStarted) return;

    const saveProgressInterval = setInterval(async () => {
      const audio = getListenAudio();
      if (audio && !audio.paused) {
        try {
          await saveProgress(lessonNumber, "watching", false, audio.currentTime, {
            videoProgress: audio.duration ? (audio.currentTime / audio.duration) * 100 : 0,
            lastSaved: new Date().toISOString(),
          });
          const start = Number(lessonData?.watch_start_sec || 0);
          const end = Number(lessonData?.watch_end_sec || 0);
          const span = Math.max(1, end - start);
          const percent = Math.min(100, Math.max(0, Math.round(((audio.currentTime - start) / span) * 100)));
          const maxPercent = Math.max(Number(evalLog.payloadRef.current.maxPercent || 0), percent);
          evalLog.patch({
            startSec: start,
            endSec: end,
            lastPositionSec: Math.round(audio.currentTime),
            maxPercent,
          });
        } catch (error) {
          console.error("진도 저장 실패:", error);
        }
      }
    }, 5000);

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isVideoStarted, lessonData, evalLog]);

  useEffect(() => {
    if (!lessonNumber || lessonNumber === 0) return;
    const audio = getListenAudio();
    if (!audio) return;

    const handlePlay = () => {
      void saveLog(lessonNumber, "watching", "audio_play", { timestamp: audio.currentTime });
      evalLog.bumpPlay("play");
    };
    const handlePause = () => {
      void saveLog(lessonNumber, "watching", "audio_pause", { timestamp: audio.currentTime });
    };
    const handleEnded = async () => {
      try {
        await saveProgress(lessonNumber, "watching", true, audio.currentTime);
        evalLog.patch({ maxPercent: 100 });
        void evalLog.flush();
        await saveLog(lessonNumber, "watching", "audio_completed", {
          duration: audio.duration,
          completed_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("완료 저장 실패:", error);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [lessonNumber, media.src, evalLog]);

  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipPlacement, setTooltipPlacement] = useState<"above" | "below">("above");
  const [showNextCta, setShowNextCta] = useState(false);

  const updateTooltipPlacement = (bar: HTMLElement) => {
    const rect = bar.getBoundingClientRect();
    const tooltipHeight = 44;
    const gap = 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    setTooltipPlacement(spaceBelow >= tooltipHeight + gap ? "below" : "above");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (showNextCta) return;
        const audio = getListenAudio();
        if (audio) {
          if (audio.paused) {
            playSafely(audio);
            setIsVideoPaused(false);
          } else {
            audio.pause();
            pauseVideo();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showNextCta, pauseVideo, setIsVideoPaused]);

  if (loading || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#60D96C] border-t-transparent"></div>
          <h1 className="text-xl font-semibold text-[#60D96C]">불러오는 중…</h1>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요해요.</h1>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">학습 내용을 불러오는 중…</h1>
      </main>
    );
  }

  if (!lessonData) {
    const scene = parseLessonNumber(movieId);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-semibold text-white">Scene {scene} 낭독을 준비하고 있어요.</p>
        <Link href={lessonSelectHref(movieId)} className="cta-btn cta-primary">
          장면으로 돌아가기
        </Link>
      </main>
    );
  }

  const startTime = lessonData.watch_start_sec;
  const endTime = lessonData.watch_end_sec;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showNextCta) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    const totalDuration = endTime - startTime;
    let newTime = startTime + (progress / 100) * totalDuration;
    if (!isMaster && !watchingDoneRef.current) {
      newTime = Math.min(newTime, maxWatchedRef.current || startTime);
    }
    newTime = Math.max(startTime, Math.min(newTime, endTime));
    const audio = getListenAudio();
    if (audio && Number.isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setVideoProgress(progress);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins.toString().padStart(2, "0")} : ${secs.toString().padStart(2, "0")}`;
  };

  const skipToEnd = () => {
    const audio = getListenAudio();
    if (!audio) return;
    audio.currentTime = endTime;
    audio.pause();
    watchingDoneRef.current = true;
    void saveProgress(lessonNumber, "watching", true, endTime);
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
          <img
            src={media.poster}
            alt=""
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
              showNextCta ? "opacity-10" : isVideoPaused ? "opacity-50" : "opacity-100"
            }`}
          />
          <audio
            id="listen-player"
            src={media.src}
            className="pointer-events-none absolute h-px w-px opacity-0"
            preload="auto"
            onLoadedData={(e) => {
              const audio = e.currentTarget;
              const startAt = savedProgress?.current_position || Number(lessonData?.watch_start_sec) || 0;
              if (Number.isFinite(startAt) && startAt >= 0) {
                audio.currentTime = startAt;
              }
            }}
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              if (!isMaster && !watchingDoneRef.current && audio.currentTime > maxWatchedRef.current + 1.5) {
                audio.currentTime = maxWatchedRef.current;
                return;
              }
              const totalDuration = endTime - startTime;
              const currentProgress = audio.currentTime - startTime;
              const progress = Math.max(0, (currentProgress / totalDuration) * 100);
              setVideoProgress(progress);
              if (audio.currentTime > maxWatchedRef.current) {
                maxWatchedRef.current = audio.currentTime;
              }
              if (audio.currentTime >= endTime) {
                if (audio.currentTime > endTime + 0.3 && !isMaster && !watchingDoneRef.current) {
                  audio.currentTime = endTime;
                }
                if (!audio.paused) {
                  audio.pause();
                }
                if (!watchingDoneRef.current) {
                  watchingDoneRef.current = true;
                  void saveProgress(lessonNumber, "watching", true, endTime);
                }
                if (!showNextCta) {
                  setShowNextCta(true);
                }
              }
            }}
          />
          {!showNextCta && (
            <button
              type="button"
              className="absolute inset-0 z-[9] cursor-pointer bg-transparent"
              aria-label={isVideoPaused || !isVideoStarted ? "재생" : "일시정지"}
              onClick={() => {
                const audio = getListenAudio();
                if (!audio) return;
                if (audio.paused) {
                  playSafely(audio);
                  setIsVideoPaused(false);
                  setIsVideoStarted(true);
                } else {
                  audio.pause();
                  pauseVideo();
                }
              }}
            />
          )}
          <Link
            href={lessonSelectHref(movieId)}
            className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4"
            aria-label="뒤로"
            onClick={stopAllMedia}
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

          {!showNextCta && !isVideoStarted && (
            <ClickToStartOverlay
              onClick={() => {
                const audio = getListenAudio();
                if (audio) {
                  playSafely(audio);
                  setIsVideoPaused(false);
                  setIsVideoStarted(true);
                }
              }}
              text={savedProgress?.current_position > startTime ? "이어서 들어볼까요?" : "원서 낭독을 들어요"}
              description={
                savedProgress?.current_position > startTime
                  ? "멈춘 부분부터 이어서 들어요."
                  : "Pinocchio Chapter 1을 처음부터 끝까지 들어요."
              }
              actionLabel={savedProgress?.current_position > startTime ? "계속하기" : "시작"}
            />
          )}

          {isVideoPaused && !showNextCta && <PauseOverlay />}

          {showNextCta && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="pointer-events-auto flex items-start justify-center gap-[clamp(2rem,8vw,12rem)]">
                <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                  <button
                    type="button"
                    className="select-mode"
                    onClick={() => {
                      const audio = getListenAudio();
                      if (audio) {
                        if (Number.isFinite(startTime) && startTime >= 0) {
                          audio.currentTime = startTime;
                        }
                        playSafely(audio);
                        setShowNextCta(false);
                        setVideoProgress(0);
                        setIsVideoPaused(false);
                        setIsVideoStarted(true);
                      }
                    }}
                  >
                    Again
                  </button>
                  <p className="select-here" style={{ visibility: "hidden" }}>Let’s go</p>
                </div>
                <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                  <button
                    type="button"
                    className="select-mode is-open"
                    onClick={() => {
                      if (document.fullscreenElement) {
                        sessionStorage.setItem("maintainFullscreen", "true");
                      }
                      sessionStorage.setItem("fromWatching", "true");
                      setTimeout(() => {
                        window.location.href = lessonPath(movieId, "mimicking");
                      }, WATCHING_NAVIGATION_DELAY_MS);
                    }}
                  >
                    <img src="/Subject.png" alt="" className="select-chameleon" />
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
            <div className="watch-bar-fill transition-all duration-300 ease-out" style={{ width: `${barPercent}%` }} />
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

export default function ListenPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListenPageContent />
    </Suspense>
  );
}
