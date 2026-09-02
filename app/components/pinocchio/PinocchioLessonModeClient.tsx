"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import ClickToStartOverlay from "@/app/components/ClickToStartOverlay";
import ControlTriangle from "@/app/components/ControlTriangle";
import GuessingOverlays from "@/app/components/GuessingOverlays";
import { FullscreenIcon, HeaderIconButton } from "@/app/components/HeaderIcons";
import LessonCompletionActions from "@/app/components/LessonCompletionActions";
import LessonShell from "@/app/components/LessonShell";
import MimicLineList from "@/app/components/MimicLineList";
import PauseOverlay from "@/app/components/PauseOverlay";
import PlaybackControls from "@/app/components/PlaybackControls";
import { useAuth } from "@/app/contexts/AuthContext";
import { getChapterPack, TOTAL_CHAPTERS } from "@/app/dev/pinocchio-chapters/data";
import {
  chapterMedia,
  chapterRoot,
  estimatedTimeline,
  lessonLevel,
  mimicPracticeItems,
  BOOK_FLOW_MODES,
  modeHref,
  parseChapterNumber,
} from "@/app/dev/pinocchio-chapters/lessonData";
import {
  canOpenChapter,
  canOpenMode,
  completeMode,
  latestOpenChapter,
  mergeRemoteProgress,
  readCompleted,
  LEGACY_PINOCCHIO_LESSON_NUMBER_BASE,
  LEGACY_PINOCCHIO_PROGRESS_SCOPE,
} from "@/app/dev/pinocchio-chapters/localProgress";
import styles from "@/app/dev/pinocchio-chapters/pinocchio-chapters.module.css";
import type { LessonMode, PinocchioChapterMedia, PinocchioPack, Segment, Timeline, WordItem } from "@/app/dev/pinocchio-chapters/types";
import { useFullscreen } from "@/app/hooks/useFullscreen";
import { useSoundEffects } from "@/app/hooks/useSoundEffects";
import { saveProgress } from "@/app/lib/progress";
import { fetchOwnProgress, isMasterRole } from "@/app/lib/progressGate";
import {
  GUESSING_ANSWER_FEEDBACK_DURATION,
  GUESSING_AUTO_PLAY_DELAY,
  GUESSING_NEXT_QUESTION_DELAY,
  GUESSING_VIDEO_PLAYS,
  GUESSING_VIDEO_REPLAY_DELAY,
  MIMICKING_SEQUENCE_DELAY,
} from "@/app/constants/timings";
import {
  isVisibleTokenSequenceCorrect,
  mimicPhraseProgress,
  PINOCCHIO_PANORAMA,
  shouldShowLessonSkip,
} from "./lessonUiPolicy.mjs";

const MIMIC_MUTED_STEPS = new Set([3, 5, 7]);

type LessonContextValue = {
  chapterNumber: number;
  pack: PinocchioPack;
  timeline: Timeline;
  media: PinocchioChapterMedia;
  progressScope: string;
  lessonNumberBase: number;
  releaseBadge: string | null;
  isMaster: boolean;
  modeProgress: ModeProgressSnapshot | null;
};

type ModeProgressSnapshot = {
  lessonNumber: number;
  mode: LessonMode;
  completed: boolean;
  currentPosition: number;
  progressData: Record<string, unknown> | null;
};

const LessonContext = createContext<LessonContextValue | null>(null);

function parseProgressData(value: unknown) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function resumeIndex(progress: ModeProgressSnapshot | null, total: number) {
  if (total <= 0) return 0;
  if (progress?.completed) return total - 1;
  return Math.min(total - 1, Math.max(0, Math.trunc(progress?.currentPosition ?? 0)));
}

function markModeComplete(
  chapterNumber: number,
  mode: LessonMode,
  progressScope: string,
  lessonNumberBase: number,
  currentPosition = 0,
  progressData?: Record<string, unknown>,
) {
  completeMode(chapterNumber, mode, progressScope);
  void saveProgress(lessonNumberBase + chapterNumber, mode, true, currentPosition, progressData).catch((error) => {
    console.error("피노키오 진도 저장 실패:", error);
  });
}

function useLesson() {
  const lesson = useContext(LessonContext);
  if (!lesson) throw new Error("Pinocchio lesson context is missing");
  return lesson;
}

function useLessonAudio(onFullEnded?: () => void) {
  const { media, timeline } = useLesson();
  const audioSrc = media.audioSrc;
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentEndRef = useRef<number | null>(null);
  const segmentCallbackRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const boundaryTimerRef = useRef<number | null>(null);
  const fullEndedRef = useRef(onFullEnded);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(timeline.duration);
  const [mediaMissing, setMediaMissing] = useState(false);

  useEffect(() => { fullEndedRef.current = onFullEnded; }, [onFullEnded]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(timeline.duration);
    setMediaMissing(false);
  }, [audioSrc, timeline.duration]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  const clearBoundaryTimer = useCallback(() => {
    if (boundaryTimerRef.current !== null) window.clearInterval(boundaryTimerRef.current);
    boundaryTimerRef.current = null;
  }, []);

  useEffect(() => () => {
    clearFallbackTimer();
    clearBoundaryTimer();
  }, [clearBoundaryTimer, clearFallbackTimer]);

  const finishSegment = useCallback(() => {
    clearBoundaryTimer();
    const callback = segmentCallbackRef.current;
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
    if (callback) window.setTimeout(callback, 0);
  }, [clearBoundaryTimer]);

  const onTimeUpdate = useCallback((audio: HTMLAudioElement) => {
    setCurrentTime(audio.currentTime);
    if (segmentEndRef.current !== null && audio.currentTime >= segmentEndRef.current - 0.035) {
      const end = segmentEndRef.current;
      audio.pause();
      audio.currentTime = Math.min(end, audio.duration || end);
      setCurrentTime(audio.currentTime);
      finishSegment();
    }
  }, [finishSegment]);

  const playRange = useCallback((segment: Segment, muted = false, onEnded?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    clearFallbackTimer();
    clearBoundaryTimer();
    setMediaMissing(false);
    audio.pause();
    audio.muted = muted;
    audio.currentTime = segment.start;
    segmentEndRef.current = segment.end;
    segmentCallbackRef.current = onEnded || null;
    setCurrentTime(segment.start);
    void audio.play()
      .then(() => {
        boundaryTimerRef.current = window.setInterval(() => {
          const currentAudio = audioRef.current;
          const end = segmentEndRef.current;
          if (!currentAudio || end === null || currentAudio.currentTime < end - 0.025) return;
          currentAudio.pause();
          currentAudio.currentTime = Math.min(end, currentAudio.duration || end);
          setCurrentTime(currentAudio.currentTime);
          finishSegment();
        }, 30);
      })
      .catch(() => {
        clearBoundaryTimer();
        audio.pause();
        segmentEndRef.current = null;
        segmentCallbackRef.current = null;
        setIsPlaying(false);
        setMediaMissing(true);
        if (onEnded) fallbackTimerRef.current = window.setTimeout(onEnded, 260);
      });
  }, [clearBoundaryTimer, clearFallbackTimer, finishSegment]);

  const playFull = useCallback((restart = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    clearFallbackTimer();
    clearBoundaryTimer();
    setMediaMissing(false);
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
    audio.muted = false;
    if (restart || audio.currentTime >= audio.duration - .1) audio.currentTime = 0;
    void audio.play().catch(() => {
      setIsPlaying(false);
      setMediaMissing(true);
    });
  }, [clearBoundaryTimer, clearFallbackTimer]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => {
    if (!audioRef.current) return;
    void audioRef.current.play().catch(() => {
      setIsPlaying(false);
      setMediaMissing(true);
    });
  }, []);
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    clearFallbackTimer();
    clearBoundaryTimer();
    audio.pause();
    audio.muted = false;
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
  }, [clearBoundaryTimer, clearFallbackTimer]);
  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const audio = (
    <audio
      ref={audioRef}
      src={audioSrc}
      preload="auto"
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setMediaMissing(false); }}
      onError={() => setMediaMissing(true)}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
      onEnded={() => {
        setCurrentTime(audioRef.current?.duration || timeline.duration);
        setIsPlaying(false);
        if (segmentEndRef.current !== null) finishSegment();
        else fullEndedRef.current?.();
      }}
    />
  );

  return { audio, audioRef, isPlaying, currentTime, duration, mediaMissing, playRange, playFull, pause, resume, stop, seek };
}

function activeSourceLine(time: number, timeline: Timeline) {
  const index = timeline.lines.findIndex((line, lineIndex, lines) => time >= line.start && time < (lines[lineIndex + 1]?.start ?? Infinity));
  return Math.max(0, index);
}

function formatLessonTime(seconds: number) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, "0")} : ${String(remainder).padStart(2, "0")}`;
}

function usePausableTimer() {
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);
  const dueAtRef = useRef(0);
  const remainingRef = useRef(0);

  const arm = useCallback((delay: number) => {
    const safeDelay = Math.max(0, delay);
    remainingRef.current = safeDelay;
    dueAtRef.current = Date.now() + safeDelay;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      remainingRef.current = 0;
      const callback = callbackRef.current;
      callbackRef.current = null;
      callback?.();
    }, safeDelay);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    callbackRef.current = null;
    remainingRef.current = 0;
    dueAtRef.current = 0;
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    clear();
    callbackRef.current = callback;
    arm(delay);
  }, [arm, clear]);

  const pause = useCallback(() => {
    if (timerRef.current === null || !callbackRef.current) return false;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(0, dueAtRef.current - Date.now());
    return true;
  }, []);

  const resume = useCallback(() => {
    if (timerRef.current !== null || !callbackRef.current) return false;
    arm(remainingRef.current);
    return true;
  }, [arm]);

  useEffect(() => clear, [clear]);
  return { clear, schedule, pause, resume };
}

function StoryStage({ activeLine, dim = false, faded = false, reading = false, onClick, children }: {
  activeLine: number;
  dim?: boolean;
  faded?: boolean;
  reading?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}) {
  const { chapterNumber, pack, media } = useLesson();
  const [artMissing, setArtMissing] = useState(false);
  const artSrc = media.artSrc;
  useEffect(() => setArtMissing(false), [artSrc]);
  const beatIndex = Math.max(0, pack.livingStorybook.beats.findIndex((beat) => {
    const range = beat.lineRanges[pack.course.level ?? "core"];
    if (!range) return false;
    const [start, end] = range;
    return activeLine >= start && activeLine <= end;
  }));
  return (
    <div
      className={`relative h-full w-full ${dim ? styles.stageDim : ""} ${faded ? styles.stageFaded : ""} ${reading ? styles.stageReading : ""}`}
      style={{
        "--focus-x": `${PINOCCHIO_PANORAMA.focusX[beatIndex]}%`,
        "--focus-y": `${PINOCCHIO_PANORAMA.focusY}%`,
        "--stage-scale": String(PINOCCHIO_PANORAMA.scale),
      } as CSSProperties}
      onClick={onClick}
    >
      {artSrc && !artMissing ? (
        <img
          className={styles.stageArt}
          src={artSrc}
          alt={`피노키오 Chapter ${chapterNumber}: ${pack.story.titleKo} Living Storybook 장면`}
          onError={() => setArtMissing(true)}
        />
      ) : (
        <div className={styles.stageArtFallback} role="img" aria-label={`Chapter ${chapterNumber} 아트 준비 중`}>
          <span>CHAPTER {chapterNumber}</span>
          <strong>{pack.story.titleEn}</strong>
          <p>{pack.story.synopsisKo}</p>
        </div>
      )}
      <div className={styles.stageVignette} />
      {children}
    </div>
  );
}

function MimicReadingGuide({
  sentence,
  phraseProgress,
}: {
  sentence: string;
  phraseProgress: string | null;
}) {
  return (
    <div className={styles.mimicReadingGuide}>
      <p className={styles.mimicReadingEyebrow}>
        <span>문장을 보며 소리와 리듬을 따라가요</span>
        {phraseProgress ? <b>{phraseProgress.replace("PHRASE", "PART")}</b> : null}
      </p>
      <p
        className={styles.mimicReadingSentence}
        lang="en"
      >
        {sentence}
      </p>
    </div>
  );
}

function StageActions({ onSkip }: { onSkip?: () => void }) {
  const { chapterNumber, releaseBadge, isMaster } = useLesson();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <>
      <Link
        href={chapterRoot(chapterNumber)}
        className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4"
        aria-label="뒤로"
      >
        <img src="/home/back.svg" alt="" className="h-full w-full" />
      </Link>
      <div className="lesson-top-actions absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        {releaseBadge ? <span className={styles.betaBadge}>{releaseBadge}</span> : null}
        <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
          <FullscreenIcon active={isFullscreen} />
        </HeaderIconButton>
        {shouldShowLessonSkip(isMaster, onSkip) ? <button type="button" className="watch-skip" onClick={onSkip}>SKIP</button> : null}
      </div>
    </>
  );
}

function WatchMode() {
  const router = useRouter();
  const { chapterNumber, pack, timeline, progressScope, lessonNumberBase, isMaster, modeProgress } = useLesson();
  const savedWatchTime = modeProgress?.mode === "watching" && !modeProgress.completed
    ? Math.min(timeline.duration, Math.max(0, modeProgress.currentPosition))
    : 0;
  const isWatchingResume = savedWatchTime > 0.5;
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(() => Boolean(modeProgress?.completed));
  const [isDragging, setIsDragging] = useState(false);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const maxWatchedRef = useRef(modeProgress?.completed ? timeline.duration : savedWatchTime);
  const finish = useCallback(() => {
    markModeComplete(chapterNumber, "watching", progressScope, lessonNumberBase, timeline.duration, {
      audioProgress: 100,
      completedAt: new Date().toISOString(),
    });
    setComplete(true);
  }, [chapterNumber, lessonNumberBase, progressScope, timeline.duration]);
  const engine = useLessonAudio(finish);
  const activeLine = activeSourceLine(engine.currentTime, timeline);
  const percent = complete ? 100 : Math.min(100, (engine.currentTime / Math.max(1, engine.duration)) * 100);
  const displayPercent = showProgressTooltip ? tooltipPosition : percent;
  const displayTime = (displayPercent / 100) * engine.duration;

  useEffect(() => {
    maxWatchedRef.current = Math.max(maxWatchedRef.current, engine.currentTime);
  }, [engine.currentTime]);

  useEffect(() => {
    if (savedWatchTime <= 0 || complete) return;
    const audio = engine.audioRef.current;
    if (!audio) return;
    const restore = () => engine.seek(Math.min(savedWatchTime, audio.duration || timeline.duration));
    if (audio.readyState >= 1) restore();
    else audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [complete, engine.audioRef, engine.seek, savedWatchTime, timeline.duration]);

  useEffect(() => {
    if (!started || complete) return;
    const audio = engine.audioRef.current;
    if (!audio) return;
    const interval = window.setInterval(() => {
      if (audio.paused) return;
      void saveProgress(
        lessonNumberBase + chapterNumber,
        "watching",
        false,
        audio.currentTime,
        { audioProgress: (audio.currentTime / Math.max(1, audio.duration)) * 100, lastSaved: new Date().toISOString() },
      ).catch((error) => console.error("피노키오 Watch 진도 저장 실패:", error));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [chapterNumber, complete, engine.audioRef, lessonNumberBase, started]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !started || complete) return;
      event.preventDefault();
      if (engine.audioRef.current?.paused) engine.resume();
      else engine.pause();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [complete, engine, started]);

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete) return;
    if (engine.isPlaying) engine.pause(); else engine.resume();
  };

  const again = () => { engine.stop(); engine.seek(0); maxWatchedRef.current = 0; setComplete(false); setStarted(true); engine.playFull(true); };
  const skip = () => { engine.pause(); engine.seek(engine.duration); finish(); };
  const seekFromClientX = (clientX: number, bar: HTMLDivElement) => {
    if (complete) return;
    const rect = bar.getBoundingClientRect();
    const requestedPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
    const requestedTime = (requestedPercent / 100) * engine.duration;
    let nextTime = requestedTime;
    if (!isMaster) nextTime = Math.min(requestedTime, maxWatchedRef.current);
    engine.seek(nextTime);
  };

  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-watch learning-content-book"
      footer={<p className="watch-chapter">CHAPTER {chapterNumber}</p>}
      video={
        <StoryStage activeLine={activeLine} faded={complete} onClick={handleStageClick}>
          {engine.audio}
          <StageActions onSkip={complete ? undefined : skip} />
          {engine.mediaMissing && !complete ? <p className={styles.mediaNotice}>오디오를 불러오지 못했어요 · 잠시 후 다시 시도해 주세요</p> : null}
          {!started && !complete ? (
            <ClickToStartOverlay
              onClick={() => { setStarted(true); engine.playFull(false); }}
              text={isWatchingResume ? "이어서 이야기를 들을까요?" : "이야기를 듣고 장면을 따라가요"}
              description={isWatchingResume ? "저장된 지점부터 오늘의 이야기를 이어서 들어요." : `Lily의 연속 낭독과 Living Storybook으로 Chapter ${chapterNumber} · ${pack.story.titleKo}를 경험해요.`}
              actionLabel={isWatchingResume ? "계속하기" : "시작"}
            />
          ) : null}
          {started && !engine.isPlaying && !complete && engine.currentTime > 0 ? <PauseOverlay /> : null}
          {complete ? (
            <div className="lesson-completion-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <LessonCompletionActions onAgain={again} onNext={() => router.push(modeHref(chapterNumber, "mimicking"))} />
            </div>
          ) : null}
        </StoryStage>
      }
      controls={
        <div className="watch-progress-control relative z-50 w-full overflow-visible">
          <div
            className="watch-bar"
            onPointerDown={(event) => {
              setIsDragging(true);
              event.currentTarget.setPointerCapture?.(event.pointerId);
              seekFromClientX(event.clientX, event.currentTarget);
            }}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setTooltipPosition(Math.max(0, Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100)));
              if (isDragging) seekFromClientX(event.clientX, event.currentTarget);
            }}
            onPointerUp={(event) => {
              setIsDragging(false);
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={() => setIsDragging(false)}
            onPointerEnter={() => setShowProgressTooltip(true)}
            onPointerLeave={() => { setShowProgressTooltip(false); setIsDragging(false); }}
          >
            <div className="watch-bar-track" />
            <div className="watch-bar-fill transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
            <div className="watch-bar-thumb cursor-pointer" style={{ left: `${percent}%` }} />
            {(showProgressTooltip || started) ? (
              <div className="watch-time" style={{ left: `${displayPercent}%` }}>
                {formatLessonTime(displayTime)} / {formatLessonTime(engine.duration)}
              </div>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

function MimicMode() {
  const router = useRouter();
  const { chapterNumber, pack, timeline, progressScope, lessonNumberBase, isMaster, modeProgress } = useLesson();
  const level = lessonLevel(pack);
  const practiceItems = useMemo(() => mimicPracticeItems(pack, timeline), [pack, timeline]);
  const total = practiceItems.length;
  const restoredIndex = resumeIndex(modeProgress?.mode === "mimicking" ? modeProgress : null, total);
  const restoredHardLines = modeProgress?.mode === "mimicking" && Array.isArray(modeProgress.progressData?.hardLines)
    ? modeProgress.progressData.hardLines.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < total)
    : [];
  const [current, setCurrent] = useState(restoredIndex);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [lineListOpen, setLineListOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [complete, setComplete] = useState(() => Boolean(modeProgress?.completed));
  const [hardLines, setHardLines] = useState<number[]>(() => [...new Set(restoredHardLines)]);
  const [maxReached, setMaxReached] = useState(modeProgress?.completed ? Math.max(0, total - 1) : restoredIndex);
  const pausedMediaRef = useRef(false);
  const lineListPausedSequenceRef = useRef(false);
  const { clear: clearStepTimer, schedule: scheduleStep, pause: pauseStepTimer, resume: resumeStepTimer } = usePausableTimer();
  const engine = useLessonAudio();
  const currentPractice = practiceItems[current];
  const activeLine = currentPractice?.sourceLineIndex ?? 0;

  const runStep = useCallback((slot: number, lineIndex = current, chunkIndex = activeChunkIndex) => {
    if (complete) return;
    const practice = practiceItems[lineIndex];
    const chunk = practice?.chunks[chunkIndex];
    if (!practice || !chunk) return;
    clearStepTimer();
    setStarted(true);
    setPaused(false);
    setSequenceRunning(true);
    setActiveChunkIndex(chunkIndex);
    setActiveSlot(slot);
    engine.playRange(chunk, MIMIC_MUTED_STEPS.has(slot), () => {
      setActiveSlot(null);
      if (slot < 7) {
        scheduleStep(() => runStep(slot + 1, lineIndex, chunkIndex), MIMICKING_SEQUENCE_DELAY);
      } else if (chunkIndex < practice.chunks.length - 1) {
        scheduleStep(() => runStep(0, lineIndex, chunkIndex + 1), MIMICKING_SEQUENCE_DELAY);
      } else {
        setSequenceRunning(false);
        setFeedbackOpen(true);
      }
    });
  }, [activeChunkIndex, clearStepTimer, complete, current, engine, practiceItems, scheduleStep]);

  const finish = (reviewLines = hardLines) => {
    clearStepTimer();
    engine.stop();
    setSequenceRunning(false);
    setCurrent(total - 1);
    setMaxReached(total - 1);
    markModeComplete(chapterNumber, "mimicking", progressScope, lessonNumberBase, total - 1, {
      currentScene: total - 1,
      totalScenes: total,
      hardLines: reviewLines,
      completedAt: new Date().toISOString(),
    });
    setComplete(true);
    setFeedbackOpen(false);
  };
  const chooseLine = (index: number, autoplay = false, unlock = false) => {
    if (complete || index < 0 || index >= total) return;
    if (!isMaster && !unlock && index > maxReached) return;
    clearStepTimer();
    engine.stop();
    setSequenceRunning(false);
    setCurrent(index);
    setActiveChunkIndex(0);
    setActiveSlot(null);
    setFeedbackOpen(false);
    setLineListOpen(false);
    lineListPausedSequenceRef.current = false;
    setPaused(false);
    if (autoplay) runStep(0, index, 0);
  };
  const advance = () => {
    const nextIndex = current + 1;
    setMaxReached((value) => Math.max(value, nextIndex));
    chooseLine(nextIndex, true, true);
  };
  const next = () => {
    if (complete || feedbackOpen || (sequenceRunning && !isMaster)) return;
    current >= total - 1 ? finish() : advance();
  };
  const prev = () => {
    if (complete || feedbackOpen || (sequenceRunning && !isMaster) || current <= 0) return;
    chooseLine(current - 1, true);
  };
  const toggleSequencePause = useCallback(() => {
    if (paused) {
      setPaused(false);
      if (!resumeStepTimer() && pausedMediaRef.current) engine.resume();
      pausedMediaRef.current = false;
      return;
    }
    const timerPaused = pauseStepTimer();
    pausedMediaRef.current = engine.isPlaying;
    if (engine.isPlaying) engine.pause();
    if (timerPaused || pausedMediaRef.current) setPaused(true);
  }, [engine, pauseStepTimer, paused, resumeStepTimer]);
  const toggleLineList = () => {
    if (lineListOpen) {
      setLineListOpen(false);
      if (lineListPausedSequenceRef.current && paused) toggleSequencePause();
      lineListPausedSequenceRef.current = false;
      return;
    }

    const shouldPauseSequence = sequenceRunning && !paused;
    lineListPausedSequenceRef.current = shouldPauseSequence;
    if (shouldPauseSequence) toggleSequencePause();
    setLineListOpen(true);
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (lineListOpen) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!started || complete || feedbackOpen) return;
        toggleSequencePause();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [complete, current, feedbackOpen, lineListOpen, sequenceRunning, started, toggleSequencePause, total]);
  const feedback = (hard: boolean) => {
    const nextHardLines = hard
      ? (hardLines.includes(current) ? hardLines : [...hardLines, current])
      : hardLines.filter((index) => index !== current);
    setHardLines(nextHardLines);
    setFeedbackOpen(false);
    setSequenceRunning(false);
    if (current >= total - 1) finish(nextHardLines);
    else {
      const nextPosition = current + 1;
      void saveProgress(
        lessonNumberBase + chapterNumber,
        "mimicking",
        false,
        nextPosition,
        { currentScene: nextPosition, totalScenes: total, hardLines: nextHardLines, lastSaved: new Date().toISOString() },
      ).catch((error) => console.error("피노키오 Mimic 진도 저장 실패:", error));
      advance();
    }
  };
  const togglePause = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete || feedbackOpen || lineListOpen) return;
    toggleSequencePause();
  };
  const skipLine = () => {
    if (complete) return;
    if (current >= total - 1) finish();
    else advance();
  };
  const again = () => { setCurrent(0); setActiveChunkIndex(0); setMaxReached(0); setStarted(false); setActiveSlot(null); setSequenceRunning(false); setComplete(false); setFeedbackOpen(false); setPaused(false); setHardLines([]); engine.stop(); engine.seek(0); };

  const review = (
    <div className="lesson-results-card w-full max-w-2xl rounded-2xl border border-white/20 bg-[#201e1e]/95 p-5 text-center shadow-2xl sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#60D96C]">오늘의 복습</p>
      <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">어려웠던 문장 TOP 3</h2>
      {hardLines.length ? (
        <ol className="mt-4 space-y-2 text-left">
          {hardLines.slice(0, 3).map((index, rank) => (
            <li key={index} className="flex gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white sm:text-base">
              <span className="font-bold text-[#60D96C]">{rank + 1}</span>
              <span>{level.activities.mimic.items[index].text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-zinc-200 sm:text-base">어렵다고 표시한 문장이 없어요. 오늘 연습 끝!</p>
      )}
    </div>
  );

  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-mimic learning-content-book"
      video={
        <StoryStage
          activeLine={activeLine}
          reading={started && !complete}
          faded={complete}
          onClick={togglePause}
        >
          {engine.audio}
          <StageActions onSkip={complete ? undefined : skipLine} />
          {engine.mediaMissing && !complete ? <p className={styles.mediaNotice}>Chapter {chapterNumber} 오디오 준비 중 · 연습 흐름은 계속 확인할 수 있어요</p> : null}
          {lineListOpen && !complete ? (
            <MimicLineList
              id="pinocchio-mimic-line-list"
              mobileSheet
              total={total}
              currentIndex={current}
              canOpen={(index) => isMaster || index <= maxReached}
              onDismiss={toggleLineList}
              onSelect={(index) => chooseLine(index, true)}
            />
          ) : null}
          {!started && !complete ? <ClickToStartOverlay onClick={() => runStep(0)} text="문장을 보며 따라 읽어요" description="문장을 보며 먼저 듣고, 소리 없이 다시 말하면서 30개 문장을 내 목소리로 익혀요." actionLabel="시작" /> : null}
          {started && !complete && !feedbackOpen && !lineListOpen && currentPractice ? (
            <MimicReadingGuide
              key={currentPractice.id}
              sentence={currentPractice.text}
              phraseProgress={mimicPhraseProgress(activeChunkIndex, currentPractice.chunks.length)}
            />
          ) : null}
          {paused && !complete ? <PauseOverlay /> : null}
          {feedbackOpen && !complete ? (
            <div className={styles.feedbackCard}>
              <span>LINE {String(current + 1).padStart(2, "0")}</span>
              <p className={styles.feedbackSentence} lang="en">{currentPractice.text}</p>
              <strong>이 문장은 어땠나요?</strong>
              <div className={styles.feedbackActions}><button type="button" onClick={() => feedback(false)}>쉬웠어요</button><button type="button" onClick={() => feedback(true)}>어려웠어요</button></div>
            </div>
          ) : null}
          {complete ? (
            <div className="lesson-completion-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-4">
              <div className="lesson-results pointer-events-auto flex w-full max-w-4xl flex-col items-center">
                {review}
                <LessonCompletionActions onAgain={again} onNext={() => router.push(modeHref(chapterNumber, "word"))} />
              </div>
            </div>
          ) : null}
        </StoryStage>
      }
      controls={
        <div className="lesson-dock mimic-dock">
          <PlaybackControls variant="cinema" onPrev={prev} onNext={next} onPlay={(_muted, slot) => { if (!feedbackOpen) runStep(slot); }} activeIndex={engine.isPlaying ? activeSlot : null} />
          <button type="button" className="mimic-count" aria-controls="pinocchio-mimic-line-list" aria-expanded={lineListOpen} aria-haspopup="listbox" aria-label="문장 목록" onClick={toggleLineList}>
            <span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">{total}</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
          </button>
        </div>
      }
    />
  );
}

function GuessMode() {
  const router = useRouter();
  const { chapterNumber, pack, timeline, progressScope, lessonNumberBase, isMaster, modeProgress } = useLesson();
  const level = lessonLevel(pack);
  const items = level.activities.guess.items;
  const restoredIndex = resumeIndex(modeProgress?.mode === "guessing" ? modeProgress : null, items.length);
  const [current, setCurrent] = useState(restoredIndex);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playingLabel, setPlayingLabel] = useState<string | null>(null);
  const [scenePlayCount, setScenePlayCount] = useState(0);
  const [scenePlaying, setScenePlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [nudgeNext, setNudgeNext] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [complete, setComplete] = useState(() => Boolean(modeProgress?.completed));
  const [lineListOpen, setLineListOpen] = useState(false);
  const [maxReached, setMaxReached] = useState(modeProgress?.completed ? Math.max(0, items.length - 1) : restoredIndex);
  const [lockHint, setLockHint] = useState(false);
  const lockHintTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const pausedMediaRef = useRef(false);
  const pausedSceneRef = useRef(false);
  const pausedLabelRef = useRef<string | null>(null);
  const { clear: clearTimer, schedule, pause: pauseWorkflowTimer, resume: resumeWorkflowTimer } = usePausableTimer();
  const engine = useLessonAudio();
  const { playAttentionSound, playCorrectSound, playAgainSound } = useSoundEffects();
  const question = items[current];

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);
  const showLockHint = useCallback(() => {
    if (lockHintTimerRef.current !== null) window.clearTimeout(lockHintTimerRef.current);
    setLockHint(true);
    lockHintTimerRef.current = window.setTimeout(() => {
      lockHintTimerRef.current = null;
      setLockHint(false);
    }, 1600);
  }, []);
  useEffect(() => () => {
    clearTimer();
    clearLongPress();
    if (lockHintTimerRef.current !== null) window.clearTimeout(lockHintTimerRef.current);
  }, [clearLongPress, clearTimer]);

  const playOptions = useCallback((questionIndex: number, optionIndex = 0) => {
    const nextQuestion = items[questionIndex];
    const options = [...nextQuestion.options].sort((a, b) => a.label.localeCompare(b.label));
    setReady(false);
    const option = options[optionIndex];
    if (!option) {
      setPlayingLabel(null);
      setReady(true);
      return;
    }
    setPlayingLabel(option.label);
    engine.playRange(timeline.lines[option.lineIndex], false, () => {
      if (optionIndex < options.length - 1) playOptions(questionIndex, optionIndex + 1);
      else { setPlayingLabel(null); setReady(true); }
    });
  }, [engine, items, timeline.lines]);

  const playQuestion = useCallback((questionIndex: number, delay = 0) => {
    const nextQuestion = items[questionIndex];
    const prompt = timeline.lines[nextQuestion.audioLineIndex];
    clearTimer();
    engine.stop();
    setReady(false);
    setPlayingLabel(null);
    setScenePlayCount(0);
    setScenePlaying(false);
    setPaused(false);
    setNudgeNext(false);
    setShowCorrect(false);
    setShowAgain(false);
    const playScene = (completedPlays: number) => {
      setScenePlayCount(completedPlays);
      setScenePlaying(true);
      playAttentionSound();
      engine.playRange(prompt, true, () => {
        const nextCount = completedPlays + 1;
        setScenePlayCount(nextCount);
        setScenePlaying(false);
        if (nextCount < GUESSING_VIDEO_PLAYS) schedule(() => playScene(nextCount), GUESSING_VIDEO_REPLAY_DELAY);
        else schedule(() => playOptions(questionIndex), GUESSING_AUTO_PLAY_DELAY);
      });
    };
    schedule(() => playScene(0), delay);
  }, [clearTimer, engine, items, playAttentionSound, playOptions, schedule, timeline.lines]);

  const finish = () => {
    clearTimer();
    engine.stop();
    setCurrent(items.length - 1);
    setMaxReached(items.length - 1);
    markModeComplete(chapterNumber, "guessing", progressScope, lessonNumberBase, items.length - 1, {
      currentQuestion: items.length - 1,
      totalQuestions: items.length,
      completedAt: new Date().toISOString(),
    });
    setComplete(true);
    setReady(false);
    setNudgeNext(false);
    setScenePlaying(false);
    setPlayingLabel(null);
  };
  const advance = () => {
    if (complete) return;
    clearTimer();
    engine.stop();
    if (current >= items.length - 1) { finish(); return; }
    const next = current + 1;
    setReady(false);
    setPlayingLabel(null);
    setScenePlayCount(0);
    setScenePlaying(false);
    setPaused(false);
    setShowCorrect(false);
    setShowAgain(false);
    setMaxReached((value) => Math.max(value, next));
    setCurrent(next);
    setNudgeNext(false);
    void saveProgress(
      lessonNumberBase + chapterNumber,
      "guessing",
      false,
      next,
      { currentQuestion: next, totalQuestions: items.length, lastSaved: new Date().toISOString() },
    ).catch((error) => console.error("피노키오 Guess 진도 저장 실패:", error));
    schedule(() => playQuestion(next), GUESSING_NEXT_QUESTION_DELAY);
  };
  const answer = (label: string) => {
    if (!ready || complete) return;
    setReady(false);
    if (label === question.correctAnswer) {
      playCorrectSound();
      setShowCorrect(true);
      schedule(() => {
        setShowCorrect(false);
        if (current >= items.length - 1) finish();
        else {
          setNudgeNext(true);
          if (!isMaster) schedule(advance, 1600);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      playAgainSound();
      setShowAgain(true);
      schedule(() => { setShowAgain(false); playQuestion(current); }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  };
  const jump = (index: number) => {
    if (complete || index < 0 || index >= items.length) return;
    if (!isMaster && index > maxReached) {
      showLockHint();
      return;
    }
    clearTimer();
    engine.stop();
    setStarted(true);
    if (isMaster) setMaxReached((value) => Math.max(value, index));
    setCurrent(index);
    setLineListOpen(false);
    setShowCorrect(false);
    setShowAgain(false);
    setNudgeNext(false);
    playQuestion(index, GUESSING_NEXT_QUESTION_DELAY);
  };
  const skipQuestion = () => { if (complete) return; if (current >= items.length - 1) finish(); else advance(); };
  const again = () => {
    clearTimer();
    engine.stop();
    setCurrent(0);
    setMaxReached(0);
    setStarted(true);
    setReady(false);
    setComplete(false);
    setNudgeNext(false);
    playQuestion(0);
  };
  const togglePause = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete || ready || showCorrect || showAgain || nudgeNext) return;
    if (paused) {
      setPaused(false);
      const resumedTimer = resumeWorkflowTimer();
      if (!resumedTimer && pausedMediaRef.current) {
        setScenePlaying(pausedSceneRef.current);
        setPlayingLabel(pausedLabelRef.current);
        engine.resume();
      }
      pausedMediaRef.current = false;
      pausedSceneRef.current = false;
      pausedLabelRef.current = null;
      return;
    }
    const timerPaused = pauseWorkflowTimer();
    pausedMediaRef.current = engine.isPlaying;
    pausedSceneRef.current = scenePlaying;
    pausedLabelRef.current = playingLabel;
    if (engine.isPlaying) engine.pause();
    setScenePlaying(false);
    setPlayingLabel(null);
    if (timerPaused || pausedMediaRef.current) setPaused(true);
  };
  const replayOption = (label: string) => {
    if (!ready || paused || showCorrect || showAgain || nudgeNext) return;
    const option = question.options.find((candidate) => candidate.label === label);
    if (!option) return;
    setReady(false);
    setPlayingLabel(label);
    engine.playRange(timeline.lines[option.lineIndex], false, () => { setPlayingLabel(null); setReady(true); });
  };
  const remainingPlays = started && !paused && !complete && scenePlayCount < GUESSING_VIDEO_PLAYS
    ? GUESSING_VIDEO_PLAYS - scenePlayCount
    : null;
  const showListen = started && !paused && !complete && scenePlayCount >= GUESSING_VIDEO_PLAYS && !ready && !showCorrect && !showAgain && !nudgeNext;
  const showWhich = ready && !paused && !complete && !showCorrect && !showAgain;

  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-guess learning-content-book"
      videoHighlight={engine.isPlaying && (scenePlaying || Boolean(playingLabel))}
      video={
        <StoryStage activeLine={question.audioLineIndex} dim={!started || complete} faded={complete} onClick={togglePause}>
          {engine.audio}
          <StageActions onSkip={complete ? undefined : skipQuestion} />
          {engine.mediaMissing && !complete ? <p className={styles.mediaNotice}>Chapter {chapterNumber} 오디오 준비 중 · 선택 흐름은 계속 확인할 수 있어요</p> : null}
          {lineListOpen && !complete ? (
            <MimicLineList
              id="pinocchio-guess-line-list"
              label="문제 목록"
              mobileSheet
              total={items.length}
              currentIndex={current}
              canOpen={(index) => isMaster || index <= maxReached}
              onDismiss={() => setLineListOpen(false)}
              onSelect={jump}
            />
          ) : null}
          {!started && !complete ? <ClickToStartOverlay onClick={() => { setStarted(true); playQuestion(current); }} text="소리 없는 장면을 보고 대사를 골라요" description="소리 없는 장면을 세 번 본 뒤, A·B·C를 듣고 알맞은 문장을 고르세요." actionLabel="시작" /> : null}
          {paused && !complete ? <PauseOverlay /> : null}
          <GuessingOverlays remainingPlays={remainingPlays} showListen={showListen} showWhich={showWhich} showCorrect={showCorrect} showAgain={showAgain} />
          {lockHint ? <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white">아직 잠겨 있어요. 지금 문제를 먼저 맞춰 주세요.</div> : null}
          {complete ? (
            <div className="lesson-completion-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <LessonCompletionActions onAgain={again} onNext={() => router.push(modeHref(chapterNumber, "word"))} />
            </div>
          ) : null}
        </StoryStage>
      }
      controls={
        <div className="lesson-dock guess-dock">
          <div className="guess-abc">
            <ControlTriangle direction="left" label="이전 문제" disabled={complete} onClick={() => current === 0 ? router.push(modeHref(chapterNumber, "mimicking")) : jump(current - 1)} />
            {["A", "B", "C"].map((label) => (
              <button
                key={label}
                type="button"
                className={`guess-opt ${playingLabel === label ? (engine.isPlaying ? "is-playing" : "") : ""}`}
                aria-label={ready ? `${label} 선택 (길게 누르면 다시 듣기)` : `${label} (아직 고를 수 없음)`}
                disabled={!ready}
                onPointerDown={() => {
                  if (!ready) return;
                  longPressFiredRef.current = false;
                  clearLongPress();
                  longPressTimerRef.current = window.setTimeout(() => { longPressFiredRef.current = true; replayOption(label); }, 500);
                }}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                onClick={() => {
                  if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                  answer(label);
                }}
              >{label}</button>
            ))}
            <ControlTriangle
              direction="right"
              label="다음 문제"
              disabled={complete || current >= items.length - 1}
              highlight={nudgeNext}
              onClick={() => nudgeNext ? advance() : jump(current + 1)}
            />
          </div>
          <button type="button" className="mimic-count" aria-controls="pinocchio-guess-line-list" aria-expanded={lineListOpen} aria-haspopup="listbox" aria-label="문제 목록" onClick={() => setLineListOpen((open) => !open)}><span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">{items.length}</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" /></button>
        </div>
      }
    />
  );
}

function normalizedTokens(item: WordItem) {
  const tokens: string[] = [];
  for (let index = 0; index < item.tokens.length; index += 1) {
    const token = item.tokens[index];
    if (/^[-–—]$/.test(token) && tokens.length && item.tokens[index + 1]) {
      tokens[tokens.length - 1] += `${token}${item.tokens[index + 1]}`;
      index += 1;
    } else if (/^[,.;:!?]$/.test(token) && tokens.length) {
      tokens[tokens.length - 1] += token;
    } else {
      tokens.push(token);
    }
  }
  return tokens;
}

function shuffledTokens(tokens: string[], seed: number) {
  const values = tokens.map((text, id) => ({ id, text }));
  let state = seed + 19;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swap = Math.floor((state / 233280) * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function wordBank(items: WordItem[], questionIndex: number) {
  const target = normalizedTokens(items[questionIndex]);
  const distractors: string[] = [];
  const targetWords = new Set(target.map((word) => word.toLowerCase()));

  for (let offset = 1; offset < items.length && target.length + distractors.length < 10; offset += 1) {
    const candidate = items[(questionIndex + offset) % items.length];
    for (const word of normalizedTokens(candidate)) {
      const normalized = word.toLowerCase();
      if (targetWords.has(normalized) || distractors.some((item) => item.toLowerCase() === normalized)) continue;
      distractors.push(word);
      if (target.length + distractors.length >= 10) break;
    }
  }

  return shuffledTokens([...target, ...distractors], questionIndex);
}

function WordMode() {
  const router = useRouter();
  const { chapterNumber, pack, timeline, progressScope, lessonNumberBase, isMaster, modeProgress } = useLesson();
  const level = lessonLevel(pack);
  const items = level.activities.word.items;
  const restoredIndex = resumeIndex(modeProgress?.mode === "word" ? modeProgress : null, items.length);
  const [current, setCurrent] = useState(restoredIndex);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"listening" | "arranging">("listening");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [complete, setComplete] = useState(() => Boolean(modeProgress?.completed));
  const [lineListOpen, setLineListOpen] = useState(false);
  const [maxReached, setMaxReached] = useState(modeProgress?.completed ? Math.max(0, items.length - 1) : restoredIndex);
  const [paused, setPaused] = useState(false);
  const [hideAllWords, setHideAllWords] = useState(false);
  const [isChameleonEating, setIsChameleonEating] = useState(false);
  const [lockHint, setLockHint] = useState(false);
  const eatingTimerRef = useRef<number | null>(null);
  const lockHintTimerRef = useRef<number | null>(null);
  const pausedMediaRef = useRef(false);
  const { clear: clearTimer, schedule, pause: pauseWorkflowTimer, resume: resumeWorkflowTimer } = usePausableTimer();
  const engine = useLessonAudio();
  const { playCorrectSound, playAgainSound } = useSoundEffects();
  const item = items[current];
  const tokens = useMemo(() => normalizedTokens(item), [item]);
  const bank = useMemo(() => wordBank(items, current), [current, items]);
  const bankText = useMemo(() => new Map(bank.map((token) => [token.id, token.text])), [bank]);
  const mid = Math.ceil(bank.length / 2);
  const controlsLocked = phase !== "arranging" || paused || showCorrect || showAgain || complete || isChameleonEating;

  useEffect(() => () => {
    if (eatingTimerRef.current !== null) window.clearTimeout(eatingTimerRef.current);
    if (lockHintTimerRef.current !== null) window.clearTimeout(lockHintTimerRef.current);
  }, []);
  const showLockHint = useCallback(() => {
    if (lockHintTimerRef.current !== null) window.clearTimeout(lockHintTimerRef.current);
    setLockHint(true);
    lockHintTimerRef.current = window.setTimeout(() => {
      lockHintTimerRef.current = null;
      setLockHint(false);
    }, 1600);
  }, []);

  const playSequence = useCallback((questionIndex: number) => {
    const nextItem = items[questionIndex];
    const segment = timeline.lines[nextItem.lineIndex];
    clearTimer();
    engine.stop();
    setStarted(true);
    setPhase("listening");
    setPaused(false);
    setSelected([]);
    setHideAllWords(false);
    setShowCorrect(false);
    setShowAgain(false);
    const playAt = (slot: number) => {
      setActiveSlot(slot);
      engine.playRange(segment, slot === 2, () => {
        setActiveSlot(null);
        if (slot < 2) schedule(() => playAt(slot + 1), MIMICKING_SEQUENCE_DELAY);
        else schedule(() => setPhase("arranging"), 1500);
      });
    };
    playAt(0);
  }, [clearTimer, engine, items, schedule, timeline.lines]);

  const finish = () => {
    clearTimer();
    engine.stop();
    setActiveSlot(null);
    setCurrent(items.length - 1);
    setMaxReached(items.length - 1);
    markModeComplete(chapterNumber, "word", progressScope, lessonNumberBase, items.length - 1, {
      currentQuestion: items.length - 1,
      totalQuestions: items.length,
      completedAt: new Date().toISOString(),
    });
    setShowCorrect(false);
    setShowAgain(false);
    setHideAllWords(false);
    setIsChameleonEating(false);
    setComplete(true);
    setPaused(false);
  };
  const submit = () => {
    if (controlsLocked || selected.length !== tokens.length) return;
    setIsChameleonEating(true);
    if (eatingTimerRef.current !== null) window.clearTimeout(eatingTimerRef.current);
    eatingTimerRef.current = window.setTimeout(() => setIsChameleonEating(false), 720);
    setHideAllWords(true);
    clearTimer();
    const correct = isVisibleTokenSequenceCorrect(tokens, selected);
    if (correct) {
      playCorrectSound();
      setShowCorrect(true);
      schedule(() => {
        setShowCorrect(false);
        setSelected([]);
        setHideAllWords(false);
        if (current >= items.length - 1) finish();
        else {
          const next = current + 1;
          setMaxReached((value) => Math.max(value, next));
          setCurrent(next);
          setSelected([]);
          setPhase("listening");
          void saveProgress(
            lessonNumberBase + chapterNumber,
            "word",
            false,
            next,
            { currentQuestion: next, totalQuestions: items.length, lastSaved: new Date().toISOString() },
          ).catch((error) => console.error("피노키오 Word 진도 저장 실패:", error));
          schedule(() => playSequence(next), 200);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      playAgainSound();
      setShowAgain(true);
      schedule(() => {
        setShowAgain(false);
        setSelected([]);
        setHideAllWords(false);
        schedule(() => playSequence(current), 200);
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  };
  const jump = (index: number) => {
    if (complete || index < 0 || index >= items.length) return;
    if (!isMaster && index > maxReached) {
      showLockHint();
      return;
    }
    clearTimer();
    engine.stop();
    setStarted(true);
    if (isMaster) setMaxReached((value) => Math.max(value, index));
    setCurrent(index);
    setSelected([]);
    setLineListOpen(false);
    setShowCorrect(false);
    setShowAgain(false);
    setHideAllWords(false);
    setPaused(false);
    playSequence(index);
  };
  const skipQuestion = () => {
    if (complete) return;
    if (current >= items.length - 1) finish();
    else {
      const next = current + 1;
      setMaxReached((value) => Math.max(value, next));
      setCurrent(next);
      void saveProgress(
        lessonNumberBase + chapterNumber,
        "word",
        false,
        next,
        { currentQuestion: next, totalQuestions: items.length, lastSaved: new Date().toISOString() },
      ).catch((error) => console.error("피노키오 Word 진도 저장 실패:", error));
      playSequence(next);
    }
  };
  const again = () => {
    clearTimer();
    engine.stop();
    setCurrent(0);
    setMaxReached(0);
    setStarted(false);
    setPhase("listening");
    setSelected([]);
    setActiveSlot(null);
    setHideAllWords(false);
    setShowCorrect(false);
    setShowAgain(false);
    setIsChameleonEating(false);
    setLineListOpen(false);
    setPaused(false);
    setComplete(false);
  };
  const replayOnce = () => {
    if (controlsLocked) return;
    setPaused(false);
    engine.playRange(timeline.lines[item.lineIndex]);
  };
  const replayAll = () => {
    if (controlsLocked) return;
    setSelected([]);
    setHideAllWords(false);
    playSequence(current);
  };
  const togglePause = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete || showCorrect || showAgain) return;
    if (paused) {
      setPaused(false);
      if (!resumeWorkflowTimer() && pausedMediaRef.current) engine.resume();
      pausedMediaRef.current = false;
    } else {
      const timerPaused = pauseWorkflowTimer();
      pausedMediaRef.current = engine.isPlaying;
      if (engine.isPlaying) engine.pause();
      if (timerPaused || pausedMediaRef.current || phase === "arranging") setPaused(true);
    }
  };
  const selectToken = (id: number) => {
    if (controlsLocked || selected.length >= tokens.length) return;
    setSelected((values) => [...values, id]);
  };
  const renderChip = (token: { id: number; text: string }, compact = false) => {
    const isUsed = selected.includes(token.id);
    const shouldHide = isUsed || hideAllWords;
    const cannotAddMore = selected.length >= tokens.length && !isUsed;
    return (
      <button
        key={token.id}
        type="button"
        className={`word-chip ${compact ? "is-compact" : ""} ${shouldHide ? "pointer-events-none scale-75 opacity-0" : controlsLocked || cannotAddMore ? "opacity-40" : ""}`}
        style={{ transition: "opacity 0.4s ease, transform 0.4s ease" }}
        onClick={() => selectToken(token.id)}
        disabled={shouldHide || controlsLocked || cannotAddMore}
      >
        {token.text}
      </button>
    );
  };

  return (
    <LessonShell
      hideHeader
      compactStage
      stageClassName="learning-stage learning-stage-word learning-content-book"
    >
      <div className={`word-board ${phase === "arranging" && !complete ? "is-arranging" : ""}`}>
        <div className="word-chips-side">{phase === "arranging" && !complete ? bank.slice(0, mid).map((token) => renderChip(token)) : null}</div>
        <div className={`word-main-stack ${styles.wordMainStack} flex min-h-0 flex-1 flex-col items-center justify-center`}>
          <div className="flex w-full min-h-0 items-center justify-center">
            <div className={`word-video watch-frame relative aspect-video w-full max-h-full overflow-hidden ${engine.isPlaying && activeSlot === 2 ? "is-live" : ""}`}>
              <StoryStage activeLine={item.lineIndex} dim={!started || complete} faded={complete} onClick={togglePause}>
                {engine.audio}
                <StageActions onSkip={complete ? undefined : skipQuestion} />
                {engine.mediaMissing && !complete ? <p className={styles.mediaNotice}>Chapter {chapterNumber} 오디오 준비 중 · 단어 흐름은 계속 확인할 수 있어요</p> : null}
                {lineListOpen && !complete ? (
                  <MimicLineList
                    id="pinocchio-word-line-list"
                    label="문제 목록"
                    mobileSheet
                    total={items.length}
                    currentIndex={current}
                    canOpen={(index) => isMaster || index <= maxReached}
                    onDismiss={() => setLineListOpen(false)}
                    onSelect={jump}
                  />
                ) : null}
                {!started && !complete ? <ClickToStartOverlay onClick={() => { setStarted(true); playSequence(current); }} text="단어를 바르게 배열해요" description="문장을 두 번 듣고, 소리 없이 한 번 말한 뒤 단어를 올바른 순서로 놓아 보세요." actionLabel="시작" /> : null}
                {paused && !complete ? <PauseOverlay /> : null}
                {selected.length && !complete && !showCorrect && !showAgain ? <div className="word-sentence">{selected.map((id, index) => <button key={`${id}-${index}`} type="button" className="word-sentence-item" disabled={controlsLocked} onClick={() => setSelected((values) => values.filter((_, itemIndex) => itemIndex !== index))}>{bankText.get(id)}</button>)}</div> : null}
                {showCorrect ? <p className="guess-banner is-correct">Correct</p> : null}
                {showAgain ? <p className="guess-banner is-again">Again</p> : null}
                {lockHint ? <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white">아직 잠겨 있어요. 지금 문제를 먼저 맞춰 주세요.</div> : null}
                {complete ? (
                  <div className="lesson-completion-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                    <LessonCompletionActions
                      onAgain={again}
                      onNext={() => router.push(chapterNumber < TOTAL_CHAPTERS ? chapterRoot(chapterNumber + 1) : "/")}
                      nextLabel={chapterNumber < TOTAL_CHAPTERS ? "Next" : "Home"}
                      nextCaption={chapterNumber < TOTAL_CHAPTERS ? "Let's go" : "12개 Chapter 끝!"}
                    />
                  </div>
                ) : null}
              </StoryStage>
            </div>
          </div>
          <div className="word-chips-mobile">{phase === "arranging" && !complete ? bank.map((token) => renderChip(token, true)) : null}</div>
          <div className="lesson-dock word-dock relative z-20 w-full justify-center overflow-x-auto pt-1">
            <div className="word-bar">
              <ControlTriangle
                direction="left"
                label="다시 듣기"
                disabled={controlsLocked}
                onClick={replayOnce}
              />
              {[0, 1].map((slot) => <div key={slot} className={`ctrl-slot is-listen ${engine.isPlaying && activeSlot === slot ? "is-active" : ""}`} style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}><span className="ctrl-play-icon" /></div>)}
              <div className={`ctrl-slot is-mimic ${engine.isPlaying && activeSlot === 2 ? "is-active" : ""}`} style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}><span className="ctrl-mute-letter">m</span></div>
              <ControlTriangle direction="right" label="전체 다시 듣기" disabled={controlsLocked} onClick={replayAll} />
              <button type="button" onClick={() => setSelected((values) => values.slice(0, -1))} disabled={!selected.length || controlsLocked} className="flex shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a] text-xl font-bold text-white disabled:opacity-40" style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}>⌫</button>
            </div>
            <button type="button" className="mimic-count" aria-controls="pinocchio-word-line-list" aria-expanded={lineListOpen} aria-haspopup="listbox" aria-label="문제 목록" onClick={() => setLineListOpen((open) => !open)}><span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">{items.length}</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" /></button>
          </div>
          {!complete ? (
            <button
              type="button"
              className={`word-submit relative z-20 mb-1 mt-1 shrink-0 ${isChameleonEating ? "is-eating" : selected.length === tokens.length && !controlsLocked ? "is-ready hover:scale-105" : "cursor-not-allowed opacity-40"}`}
              onClick={submit}
              disabled={selected.length !== tokens.length || controlsLocked}
              aria-label="완성한 문장을 카멜레온에게 먹이기"
            >
              {isChameleonEating ? <span className="word-snack" aria-hidden="true">{selected.map((id) => bankText.get(id)).join(" ")}</span> : null}
              <img src="/Subject.png" alt="" />
            </button>
          ) : null}
        </div>
        <div className="word-chips-side">{phase === "arranging" && !complete ? bank.slice(mid).map((token) => renderChip(token)) : null}</div>
      </div>
    </LessonShell>
  );
}

export type PinocchioLessonModePageProps = {
  initialChapterNumber?: number;
  initialMode?: LessonMode;
  initialPack?: PinocchioPack;
  initialTimeline?: Timeline;
  initialMedia?: PinocchioChapterMedia;
  progressScope?: string;
  lessonNumberBase?: number;
  releaseBadge?: string | null;
};

export default function PinocchioLessonModeClient({
  initialChapterNumber,
  initialMode,
  initialPack,
  initialTimeline,
  initialMedia,
  progressScope = LEGACY_PINOCCHIO_PROGRESS_SCOPE,
  lessonNumberBase = LEGACY_PINOCCHIO_LESSON_NUMBER_BASE,
  releaseBadge = null,
}: PinocchioLessonModePageProps = {}) {
  const params = useParams<{ chapter?: string; mode: string }>();
  const router = useRouter();
  const { user, profile, loading, profileLoading } = useAuth();
  const isMaster = isMasterRole(profile?.role);
  const mode = initialMode ?? params.mode as LessonMode;
  const parsedChapter = parseChapterNumber(params.chapter);
  const chapterNumber = initialChapterNumber ?? (params.chapter === undefined ? 1 : parsedChapter);
  const pack = initialPack ?? (chapterNumber ? getChapterPack(chapterNumber) : undefined);
  const media = initialMedia ?? (chapterNumber ? chapterMedia(chapterNumber) : null);
  const fallbackTimeline = useMemo(
    () => initialTimeline ?? (pack ? estimatedTimeline(pack) : null),
    [initialTimeline, pack]
  );
  const [timeline, setTimeline] = useState<Timeline | null>(fallbackTimeline);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [modeProgress, setModeProgress] = useState<ModeProgressSnapshot | null>(null);
  const [loadedProgressKey, setLoadedProgressKey] = useState<string | null>(null);
  const progressKey = chapterNumber && BOOK_FLOW_MODES.includes(mode)
    ? `${lessonNumberBase + chapterNumber}:${mode}`
    : null;

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      setAllowed(false);
      setModeProgress(null);
      setLoadedProgressKey(null);
      router.replace("/auth/login");
      return;
    }

    let cancelled = false;
    setAllowed(null);
    setModeProgress(null);
    setLoadedProgressKey(null);
    const verifyAccess = async () => {
      if (!chapterNumber || !pack || !BOOK_FLOW_MODES.includes(mode)) {
        setAllowed(false);
        router.replace(chapterRoot(1));
        return;
      }

      const rows = await fetchOwnProgress();
      const progress = mergeRemoteProgress(rows, progressScope, lessonNumberBase);
      if (!isMaster && !canOpenChapter(chapterNumber, progress)) {
        setAllowed(false);
        router.replace(chapterRoot(latestOpenChapter(progress)));
        return;
      }

      const localCompleted = readCompleted(chapterNumber, progressScope);
      const nextAllowed = isMaster || canOpenMode(mode, localCompleted);
      const lessonNumber = lessonNumberBase + chapterNumber;
      const savedProgress = rows.find((row) => row.lesson_number === lessonNumber && row.mode === mode);
      const rawPosition = Number(savedProgress?.current_position);
      const progressSnapshot: ModeProgressSnapshot = {
        lessonNumber,
        mode,
        completed: Boolean(savedProgress?.completed || localCompleted.includes(mode)),
        currentPosition: Number.isFinite(rawPosition) ? Math.max(0, rawPosition) : 0,
        progressData: parseProgressData(savedProgress?.progress_data),
      };
      if (cancelled) return;
      setModeProgress(progressSnapshot);
      setLoadedProgressKey(`${lessonNumber}:${mode}`);
      setAllowed(nextAllowed);
      if (!nextAllowed) router.replace(chapterRoot(chapterNumber));
    };
    void verifyAccess();
    return () => { cancelled = true; };
  }, [chapterNumber, isMaster, lessonNumberBase, loading, mode, pack, profileLoading, progressScope, router, user]);

  useEffect(() => {
    if (!chapterNumber || !fallbackTimeline || !pack) return;
    if (initialTimeline) {
      setTimeline(initialTimeline);
      return;
    }
    if (!media?.timelineSrc) {
      setTimeline(fallbackTimeline);
      return;
    }
    const controller = new AbortController();
    setTimeline(fallbackTimeline);

    void fetch(media.timelineSrc, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Timeline returned ${response.status}`);
        return response.json() as Promise<Timeline>;
      })
      .then((nextTimeline) => {
        const level = lessonLevel(pack);
        const valid = Number.isFinite(nextTimeline.duration)
          && nextTimeline.lines?.length === level.lines.length
          && nextTimeline.mimicItems?.length === level.activities.mimic.items.length;
        if (valid) setTimeline(nextTimeline);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTimeline(fallbackTimeline);
      });

    return () => controller.abort();
  }, [chapterNumber, fallbackTimeline, initialTimeline, media?.timelineSrc, pack]);

  if (loading || profileLoading || !user || allowed !== true || !chapterNumber || !pack || !timeline || !media || loadedProgressKey !== progressKey) return <main className="min-h-screen bg-black" />;

  const lesson: LessonContextValue = {
    chapterNumber,
    pack,
    timeline,
    media,
    progressScope,
    lessonNumberBase,
    releaseBadge,
    isMaster,
    modeProgress,
  };

  let content: ReactNode = null;
  if (mode === "watching") content = <WatchMode />;
  else if (mode === "mimicking") content = <MimicMode />;
  else if (mode === "word") content = <WordMode />;

  return (
    <LessonContext.Provider value={lesson}>
      {content ?? (
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
          <Link href={chapterRoot(chapterNumber)}>Chapter {chapterNumber}으로 돌아가기</Link>
        </main>
      )}
    </LessonContext.Provider>
  );
}
