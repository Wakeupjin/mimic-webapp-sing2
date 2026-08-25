"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLessonData, parseLessonNumber, parsePack, parseProgressLesson } from "../../dataService";
import VideoPlayer from "../../components/VideoPlayer";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { useGuessingGame } from "../../hooks/useGuessingGame";
import { useSoundEffects } from "../../hooks/useSoundEffects";
import { srtTimeToSeconds } from "../../utils/srt";
import { captureVideoScreenshot, captureVideoScreenshotWithFallback, captureSimpleScreenshot, captureVideoScreenshotBypass, shouldCaptureScreenshot } from "../../utils/screenshot";
import { captureVideoScreenshotCorsFree, captureVideoScreenshotCorsFreeAsync } from "../../utils/videoCors";
import { captureVideoScreenshotUltimate, setupVideoCorsOnLoad } from "../../utils/corsProxy";
import { useRequireModeAccess } from "../../lib/useRequireModeAccess";
import { getLessonMedia, lessonPath, lessonSelectHref } from "../../lib/lessonMedia";
import { playTimedSegment, unlockMediaPlayback } from "../../utils/playTimedSegment";
import { requestAppFullscreen, applyInlinePlayback } from "../../utils/device";
import Link from "next/link";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import GuessingOverlays from "../../components/GuessingOverlays";
import MimicLineList from "../../components/MimicLineList";
import LessonShell from "../../components/LessonShell";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";
import ControlTriangle from "../../components/ControlTriangle";
import PauseOverlay from "../../components/PauseOverlay";
import { saveProgress, getProgressByMode, saveLog, saveResult } from "../../lib/progress";
import { useEvaluationLog } from "../../lib/evaluation";
import {
  GUESSING_ANSWER_FEEDBACK_DURATION,
  GUESSING_NEXT_QUESTION_DELAY,
  GUESSING_AUTO_PLAY_DELAY,
  GUESSING_VIDEO_REPLAY_DELAY,
  GUESSING_VIDEO_PLAYS,
  FULLSCREEN_RESTORE_RETRY_2,
  ATTENTION_SOUND_DURATION,
  CORRECT_SOUND_NOTE_DURATION,
  WRONG_SOUND_NOTE_DURATION,
  GUESSING_OPTION_LABELS,
} from "../../constants/timings";

// Type definitions for Supabase data
interface LessonDataType {
  id: number;
  lesson_number: number;
  video_id: number;
  mimic_data: any[];
  guessing_data: any[];
  watching_data?: any;
}

interface MimicSentence {
  id: number;
  start: string;
  end: string;
  text: string;
}

function GuessingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  const media = getLessonMedia(movieId);
  
  // 모든 훅을 최상단으로 이동
  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guessingData, setGuessingData] = useState<any[]>([]);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(() => parseProgressLesson(movieId));
  
  // 커스텀 훅 사용
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const { playAttentionSound, playCorrectSound, playAgainSound } = useSoundEffects();
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

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const {
    currentIndex,
    currentQuestionIndex,
    totalQuestions,
    videoPlayCount,
    userAnswers,
    showResults,
    showIntro,
    isGuessingStarted,
    screenshot,
    screenshotTaken,
    playingAudio,
    autoPlaySequence,
    currentAutoIndex,
    userInteracted,
    showCorrect,
    showAgain,
    allOptionsPlayed,
    isGuessingComplete,
    correctCount,
    setCurrentIndex,
    setCurrentQuestionIndex,
    setTotalQuestions,
    setVideoPlayCount,
    setUserAnswers,
    setShowResults,
    setShowIntro,
    setIsGuessingStarted,
    setScreenshot,
    setScreenshotTaken,
    setPlayingAudio,
    setAutoPlaySequence,
    setCurrentAutoIndex,
    setUserInteracted,
    setShowCorrect,
    setShowAgain,
    setAllOptionsPlayed,
    setIsGuessingComplete,
    setCorrectCount,
    loadGuessingData,
    startGuessing,
    playAudio,
    startAutoPlaySequence,
    handleAnswerSelect,
    resetGuessingState
  } = useGuessingGame();

  const evalLog = useEvaluationLog(lessonNumber, 'guessing', isGuessingStarted);
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, 'guessing', movieId);
  const maxQuestionRef = useRef(0);

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [isLineListOpen, setIsLineListOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [nudgeNext, setNudgeNext] = useState(false);
  const [lockHint, setLockHint] = useState(false);
  const videoPlayCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayIndexRef = useRef(0);
  const autoPlayTriggeredRef = useRef(false);
  const onEndedFiredRef = useRef(false);
  const dataLoadedRef = useRef(false); // 데이터 로딩 중복 방지
  const stopAudioSegmentRef = useRef<(() => void) | null>(null);
  const missedThisQuestionRef = useRef(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const isPausedRef = useRef(false);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abcIndexRef = useRef(0);
  const abcRunningRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const clearStepTimeout = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  }, []);

  const showLockHint = useCallback(() => {
    setLockHint(true);
    if (lockHintTimeoutRef.current) clearTimeout(lockHintTimeoutRef.current);
    lockHintTimeoutRef.current = setTimeout(() => setLockHint(false), 1600);
  }, []);

  const pauseActualMedia = useCallback(() => {
    document.querySelectorAll("video").forEach((video) => video.pause());
    stopAudioSegmentRef.current?.();
    stopAudioSegmentRef.current = null;
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    return () => {
      stopAudioSegmentRef.current?.();
      if (lockHintTimeoutRef.current) clearTimeout(lockHintTimeoutRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    };
  }, []);

  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/guessing?id=001:1';
      return;
    }
  }, [movieId]);

  // 풀스크린 복원 useEffect
  useEffect(() => {
    const shouldMaintainFullscreen = sessionStorage.getItem('maintainFullscreen') === 'true';
    const mimickingComplete = sessionStorage.getItem('mimickingComplete') === 'true';
    
    if (shouldMaintainFullscreen && mimickingComplete) {
      setTimeout(() => {
        requestAppFullscreen().then(() => {
          sessionStorage.removeItem('maintainFullscreen');
          sessionStorage.removeItem('mimickingComplete');
        });
      }, FULLSCREEN_RESTORE_RETRY_2);
    }
  }, []);

  // 풀스크린 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      // 풀스크린 상태는 useFullscreen 훅에서 관리
    };

    const preventFullscreenExit = (e: Event) => {
      if (isFullscreen && !document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        requestAppFullscreen();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
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

  // Supabase 데이터 로드 - 중복 방지
  useEffect(() => {
    if (!movieId || dataLoadedRef.current) return;

    const loadDataFromSupabase = async () => {
      try {
        setIsLoading(true);
        dataLoadedRef.current = true; // 로딩 시작 시 바로 플래그 설정

        const contentLesson = parseLessonNumber(movieId);
        const pack = parsePack(movieId);
        const progressLesson = parseProgressLesson(movieId);
        setLessonNumber(progressLesson);

        if (isNaN(contentLesson)) {
          console.error('❌ Invalid lesson number:', movieId);
          setIsLoading(false);
          return;
        }

        const lesson = await fetchLessonData(contentLesson, pack);

        if (!lesson) {
          console.error('❌ No lesson data found');
          setIsLoading(false);
          return;
        }

        const guessingDataArray = lesson.guessing_data || [];
        setLessonData(lesson as LessonDataType);
        setVideoUrl(getLessonMedia(movieId).src);
        setGuessingData(guessingDataArray);
        setTotalQuestions(guessingDataArray.length);
        setIsLoading(false);
        
        // 저장된 진도 불러오기
        try {
          const progress = await getProgressByMode(progressLesson, 'guessing');
          if (progress) {
            setSavedProgress(progress);
            const idx = Math.max(0, Math.floor(Number(progress.current_position || 0)));
            setCurrentQuestionIndex(idx);
            setCurrentIndex(idx);
            maxQuestionRef.current = idx;
          }
        } catch (error) {
          // 게싱 진도 데이터 없음 (첫 학습)
        }
      } catch (error) {
        console.error('❌ Supabase data loading error:', error);
        setIsLoading(false);
        dataLoadedRef.current = false; // 에러 발생 시 재시도 가능하도록
      }
    };

    loadDataFromSupabase();
  }, [movieId]); // movieId만 의존성으로

  // currentQuestion 변수를 useEffect보다 위로 이동
  const currentQuestion = guessingData[currentQuestionIndex];

  // 게싱 진도 저장 useEffect
  useEffect(() => {
    if (!lessonNumber || !isGuessingStarted) return;

    const saveProgressInterval = setInterval(async () => {
      try {
        await saveProgress(
          lessonNumber,
          'guessing',
          isGuessingComplete, // 완료 상태
          currentQuestion, // 현재 문제 번호
          JSON.stringify({ 
            currentQuestion: currentQuestion,
            totalQuestions: totalQuestions,
            correctCount: correctCount,
            isComplete: isGuessingComplete,
            lastSaved: new Date().toISOString()
          })
        );
      } catch (error) {
        console.error('게싱 진도 저장 실패:', error);
      }
    }, 15000); // 15초마다 저장

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isGuessingStarted, currentQuestion, isGuessingComplete, totalQuestions, correctCount]);

  // 게싱 완료 시 최종 저장
  useEffect(() => {
    if (isGuessingComplete && lessonNumber) {
      const saveFinalProgress = async () => {
        try {
          // 진도 저장
          await saveProgress(lessonNumber, 'guessing', true, currentQuestion, JSON.stringify({
            currentQuestion: currentQuestion,
            totalQuestions: totalQuestions,
            correctCount: correctCount,
            isComplete: true,
            completed_at: new Date().toISOString()
          }));
          
          // 결과 저장
          const score = Math.round((correctCount / totalQuestions) * 100);
          await saveResult(
            lessonNumber,
            'guessing',
            score,
            correctCount,
            totalQuestions,
            Date.now() // 시간은 임시로 현재 시간 사용
          );
          
          // 로그 저장
          await saveLog(lessonNumber, 'guessing', 'guessing_completed', {
            totalQuestions: totalQuestions,
            correctCount: correctCount,
            score: score,
            completed_at: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('게싱 완료 저장 실패:', error);
        }
      };
      saveFinalProgress();
    }
  }, [isGuessingComplete, lessonNumber, currentQuestion, totalQuestions, correctCount]);


  // 영상 재생 중 중앙 시점에서 스크린샷을 찍는 함수 (비활성화)
  const captureMidpointScreenshot = useCallback(async (startTime: number, endTime: number) => {
    // 스크린샷 캡처를 비활성화하여 CORS 에러 방지
    return;
  }, []);

  // 게싱 A/B/C 소리: 미믹킹과 같은 mp4를 쓰고, seek가 끝난 뒤 재생한다.
  const playAudioDirect = useCallback((option: any, currentQuestion: any, onComplete?: () => void) => {
    const audioVideo = document.getElementById('audio-video') as HTMLMediaElement | null;
    if (!audioVideo) {
      console.error('audio-video 요소를 찾을 수 없습니다');
      if (onComplete) onComplete();
      return;
    }

    stopAudioSegmentRef.current?.();

    let startTime: number;
    let endTime: number;

    if (option.start && option.end) {
      startTime = srtTimeToSeconds(option.start);
      endTime = srtTimeToSeconds(option.end);
    } else if (currentQuestion?.video) {
      startTime = srtTimeToSeconds(currentQuestion.video.start);
      endTime = srtTimeToSeconds(currentQuestion.video.end);
    } else {
      console.error(`${option.label} 재생 시간 정보 없음`);
      if (onComplete) onComplete();
      return;
    }

    setPlayingAudio(option.label);
    stopAudioSegmentRef.current = playTimedSegment(audioVideo, startTime, endTime, () => {
      setPlayingAudio(null);
      stopAudioSegmentRef.current = null;
      onComplete?.();
    });
  }, [setPlayingAudio]);

  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    setMuted(m);
    setActiveControlIndex(slotIndex);
    playVideo();
  }, [playVideo]);

  // Play A/B/C options sequentially
  const playABCSequence = useCallback((question: any, onAllPlayed?: () => void, fromIndex = 0) => {
    abcRunningRef.current = true;
    const playNextOption = (idx: number) => {
      if (isPausedRef.current) {
        abcIndexRef.current = idx;
        return;
      }
      abcIndexRef.current = idx;
      if (idx < GUESSING_OPTION_LABELS.length && question) {
        const currentLabel = GUESSING_OPTION_LABELS[idx];
        const currentOption = question.options.find((opt: any) => opt.label === currentLabel);
        if (currentOption) {
          playAudioDirect(currentOption, question, () => {
            if (isPausedRef.current) {
              abcIndexRef.current = idx + 1;
              return;
            }
            playNextOption(idx + 1);
          });
        } else {
          playNextOption(idx + 1);
        }
      } else {
        abcRunningRef.current = false;
        if (onAllPlayed) onAllPlayed();
      }
    };
    playNextOption(fromIndex);
  }, [playAudioDirect]);

  const resetQuestionPlayback = useCallback(() => {
    stopAudioSegmentRef.current?.();
    clearStepTimeout();
    setVideoPlayCount(0);
    videoPlayCountRef.current = 0;
    setPlayingAudio(null);
    setAllOptionsPlayed(false);
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
    setScreenshot(null);
    setScreenshotTaken(false);
    setIsClipPlaying(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setNudgeNext(false);
    abcRunningRef.current = false;
    abcIndexRef.current = 0;
  }, [setVideoPlayCount, setPlayingAudio, setAllOptionsPlayed, setCurrentAutoIndex, setScreenshot, setScreenshotTaken, clearStepTimeout]);

  const goToNextQuestion = useCallback(() => {
    clearStepTimeout();
    setNudgeNext(false);
    setIsPaused(false);
    isPausedRef.current = false;
    if (currentQuestionIndex >= totalQuestions - 1) {
      setShowResults(true);
      return;
    }
    const nextIdx = currentQuestionIndex + 1;
    maxQuestionRef.current = Math.max(maxQuestionRef.current, nextIdx);
    missedThisQuestionRef.current = false;
    setCurrentQuestionIndex(nextIdx);
    setCurrentIndex(nextIdx);
    resetQuestionPlayback();
    setShowResults(false);
    setShowIntro(false);
    setUserInteracted(true);
    setIsGuessingStarted(true);
    setShowCorrect(false);
    setShowAgain(false);
    stepTimeoutRef.current = setTimeout(() => {
      playVideo();
    }, GUESSING_NEXT_QUESTION_DELAY);
  }, [
    clearStepTimeout,
    currentQuestionIndex,
    totalQuestions,
    resetQuestionPlayback,
    setShowResults,
    setCurrentQuestionIndex,
    setCurrentIndex,
    setShowIntro,
    setUserInteracted,
    setIsGuessingStarted,
    setShowCorrect,
    setShowAgain,
    playVideo,
  ]);

  const togglePause = useCallback(() => {
    if (!isGuessingStarted || showCorrect || showAgain || showResults || nudgeNext) return;

    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      // 고르는 단계면 영상/ABC를 다시 틀지 않음
      if (allOptionsPlayed) return;
      // ABC 중간이면 이어서, 무음 영상이면 현재 클립부터 다시
      if (abcRunningRef.current || videoPlayCountRef.current >= GUESSING_VIDEO_PLAYS) {
        const q = guessingData[currentQuestionIndex];
        if (q) {
          playABCSequence(q, () => setAllOptionsPlayed(true), abcIndexRef.current);
        }
      } else {
        playVideo();
      }
      return;
    }

    clearStepTimeout();
    setIsPaused(true);
    isPausedRef.current = true;
    setIsClipPlaying(false);
    pauseVideo();
    pauseActualMedia();
    setPlayingAudio(null);
  }, [
    isGuessingStarted,
    showCorrect,
    showAgain,
    showResults,
    nudgeNext,
    isPaused,
    allOptionsPlayed,
    guessingData,
    currentQuestionIndex,
    playABCSequence,
    playVideo,
    pauseVideo,
    pauseActualMedia,
    clearStepTimeout,
    setPlayingAudio,
    setAllOptionsPlayed,
  ]);

  const replayOption = useCallback((option: any) => {
    if (!allOptionsPlayed || isPaused || showCorrect || showAgain || nudgeNext) return;
    const q = guessingData[currentQuestionIndex];
    if (!q) return;
    playAudioDirect(option, q);
  }, [allOptionsPlayed, isPaused, showCorrect, showAgain, nudgeNext, guessingData, currentQuestionIndex, playAudioDirect]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const jumpToQuestion = useCallback((idx: number) => {
    clearStepTimeout();
    clearLongPress();
    missedThisQuestionRef.current = false;
    setNudgeNext(false);
    setCurrentQuestionIndex(idx);
    setCurrentIndex(idx);
    resetQuestionPlayback();
    setShowCorrect(false);
    setShowAgain(false);
    setShowIntro(false);
    setShowResults(false);
    setUserInteracted(true);
    setIsGuessingStarted(true);
    stepTimeoutRef.current = setTimeout(() => {
      playVideo();
    }, GUESSING_NEXT_QUESTION_DELAY);
  }, [
    clearStepTimeout,
    clearLongPress,
    resetQuestionPlayback,
    playVideo,
    setCurrentQuestionIndex,
    setCurrentIndex,
    setShowCorrect,
    setShowAgain,
    setShowIntro,
    setShowResults,
    setUserInteracted,
    setIsGuessingStarted,
  ]);

  const handlePrevQuestion = useCallback(() => {
    if (nudgeNext) return;
    if (currentQuestionIndex > 0) {
      jumpToQuestion(currentQuestionIndex - 1);
      return;
    }
    stopAllMedia();
    window.location.href = lessonPath(movieId, 'mimicking');
  }, [nudgeNext, currentQuestionIndex, jumpToQuestion, stopAllMedia, movieId]);

  const handleNextQuestion = useCallback(() => {
    if (nudgeNext) {
      goToNextQuestion();
      return;
    }
    if (currentQuestionIndex >= guessingData.length - 1) return;
    if (!isMaster && currentQuestionIndex >= maxQuestionRef.current) {
      showLockHint();
      return;
    }
    jumpToQuestion(currentQuestionIndex + 1);
  }, [
    nudgeNext,
    goToNextQuestion,
    currentQuestionIndex,
    guessingData.length,
    isMaster,
    jumpToQuestion,
    showLockHint,
  ]);

  const restartGuessing = useCallback(() => {
    maxQuestionRef.current = 0;
    setCorrectCount(0);
    setUserAnswers([]);
    jumpToQuestion(0);
  }, [setCorrectCount, setUserAnswers, jumpToQuestion]);

  const canSelectAnswer = allOptionsPlayed && !isPaused && !showCorrect && !showAgain && !nudgeNext && !showResults;

  // 답안 선택 처리
  const handleAnswerSelection = useCallback((selectedAnswer: string) => {
    if (!allOptionsPlayed || isPaused || nudgeNext) return;

    const currentQuestion = guessingData[currentQuestionIndex];
    const correctAnswer = currentQuestion.correctAnswer;
    const isCorrect = selectedAnswer === correctAnswer;

    evalLog.addAttempt({
      question: currentQuestionIndex + 1,
      selected: selectedAnswer,
      correct: correctAnswer,
      isCorrect,
      replayCount: videoPlayCountRef.current || videoPlayCount,
      prompt: currentQuestion?.question || currentQuestion?.options?.[0]?.text || '',
    });
    evalLog.patch({ totalQuestions });
    void evalLog.flush();

    setAllOptionsPlayed(false);
    handleAnswerSelect(selectedAnswer, correctAnswer);

    if (isCorrect) {
      if (!missedThisQuestionRef.current) {
        setCorrectCount((count) => count + 1);
      }
      setUserAnswers((prev) => [...prev, selectedAnswer]);
      playCorrectSound();

      clearStepTimeout();
      stepTimeoutRef.current = setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setNudgeNext(true);
          // 학생: 잠깐 안내 후 자동 / 원장: 화살표로 직접
          if (!isMaster) {
            stepTimeoutRef.current = setTimeout(() => {
              goToNextQuestion();
            }, 1600);
          }
        } else {
          setShowResults(true);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      missedThisQuestionRef.current = true;
      playAgainSound();

      clearStepTimeout();
      stepTimeoutRef.current = setTimeout(() => {
        resetQuestionPlayback();
        playVideo();
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  }, [
    allOptionsPlayed,
    isPaused,
    nudgeNext,
    currentQuestionIndex,
    totalQuestions,
    guessingData,
    handleAnswerSelect,
    playCorrectSound,
    playAgainSound,
    playVideo,
    resetQuestionPlayback,
    setUserAnswers,
    setCorrectCount,
    setAllOptionsPlayed,
    setShowResults,
    evalLog,
    videoPlayCount,
    isMaster,
    goToNextQuestion,
    clearStepTimeout,
  ]); 
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

  // 로딩 화면
  if (isLoading || !lessonData || guessingData.length === 0) {
    return (
      <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between group">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        </div>
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg" style={{ fontFamily: 'Encode Sans, sans-serif' }}>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  // 게싱 게임 화면
  const lineTotal = totalQuestions || guessingData.length || 10;
  const lineCurrent = String(Math.min(currentQuestionIndex + 1, lineTotal)).padStart(2, "0");
  const lineTotalLabel = String(lineTotal).padStart(2, "0");
  const remainingPlays =
    isGuessingStarted &&
    !isPaused &&
    !showCorrect &&
    !showAgain &&
    !showResults &&
    videoPlayCount < GUESSING_VIDEO_PLAYS
      ? GUESSING_VIDEO_PLAYS - videoPlayCount
      : null;
  const showListen =
    isGuessingStarted &&
    videoPlayCount >= GUESSING_VIDEO_PLAYS &&
    !allOptionsPlayed &&
    !nudgeNext &&
    !isPaused &&
    !showCorrect &&
    !showAgain &&
    !showResults;
  const showWhich =
    canSelectAnswer && !showListen;

  return (
    <LessonShell
      hideHeader
      videoHighlight={isClipPlaying || Boolean(playingAudio)}
      video={
        <div className="relative h-full w-full">
              <div className={`absolute inset-0 ${showResults ? "opacity-10" : ""}`}>
              {isGuessingStarted && currentQuestion && (
                <VideoPlayer
                  key="guessing-player"
                  src={media.src}
                  poster={media.poster}
                  startTime={srtTimeToSeconds(currentQuestion.video.start)}
                  endTime={srtTimeToSeconds(currentQuestion.video.end)}
                  muted={true}
                  showText={false}
                  text=""
                  playing={isPlaying && !isPaused}
                  playNonce={playNonce}
                  hidePauseOverlay={true}
                  activeControlIndex={3}
                  onClick={() => {
                    if (isGuessingStarted && !showCorrect && !showAgain && !nudgeNext && !showResults) {
                      togglePause();
                    }
                  }}
                  onEndedSegment={() => {
                    if (isPausedRef.current) return;
                    setIsClipPlaying(false);
                    videoPlayCountRef.current += 1;
                    const currentCount = videoPlayCountRef.current;
                    setVideoPlayCount(currentCount);

                    if (currentCount >= GUESSING_VIDEO_PLAYS) {
                      pauseVideo();
                      clearStepTimeout();
                      stepTimeoutRef.current = setTimeout(() => {
                        if (isPausedRef.current) return;
                        playABCSequence(currentQuestion, () => setAllOptionsPlayed(true));
                      }, GUESSING_AUTO_PLAY_DELAY);
                    } else {
                      clearStepTimeout();
                      stepTimeoutRef.current = setTimeout(() => {
                        if (isPausedRef.current) return;
                        playVideo();
                      }, GUESSING_VIDEO_REPLAY_DELAY);
                    }
                  }}
                  onPlay={() => {
                    setIsClipPlaying(true);
                    playAttentionSound();
                  }}
                />
              )}
              </div>

              {media.poster ? (
                <audio
                  id="audio-video"
                  src={media.src}
                  className="hidden"
                  preload="auto"
                />
              ) : (
                <video
                  id="audio-video"
                  src={media.src}
                  style={{ display: 'none' }}
                  muted={false}
                  preload="auto"
                  playsInline
                  onLoadedMetadata={(e) => applyInlinePlayback(e.currentTarget)}
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
                {isMaster && !showResults && (
                  <button type="button" className="watch-skip" onClick={goToNextQuestion}>
                    SKIP
                  </button>
                )}
              </div>

              {isLineListOpen && !showResults && (
                <MimicLineList
                  total={lineTotal}
                  currentIndex={currentQuestionIndex}
                  canOpen={(index) => isMaster || index <= maxQuestionRef.current}
                  onSelect={(index) => {
                    if (!isMaster && index > maxQuestionRef.current) {
                      showLockHint();
                      return;
                    }
                    if (isMaster) {
                      maxQuestionRef.current = Math.max(maxQuestionRef.current, index);
                    }
                    setIsLineListOpen(false);
                    jumpToQuestion(index);
                  }}
                />
              )}

              {!isGuessingStarted && currentQuestion && (
                <ClickToStartOverlay
                  onClick={() => {
                    const audioVideo = document.getElementById('audio-video') as HTMLMediaElement | null;
                    if (audioVideo) {
                      unlockMediaPlayback(audioVideo);
                    }
                    startGuessing();
                    playVideo();
                  }}
                  text="무음 장면을 보고 정답을 골라요"
                  description="장면을 본 뒤, 들리는 대사를 맞혀요."
                />
              )}

            {isPaused && !showCorrect && !showAgain && !nudgeNext && !showResults && <PauseOverlay />}

            <GuessingOverlays
              remainingPlays={remainingPlays}
              showListen={showListen}
              showWhich={showWhich}
              showCorrect={showCorrect}
              showAgain={showAgain}
            />

            {lockHint && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white sm:text-base" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                아직 잠겨 있어요. 지금 문제를 먼저 맞춰 주세요.
              </div>
            )}

            {showResults && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto flex items-start justify-center gap-[clamp(2rem,8vw,12rem)]">
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button type="button" className="select-mode" onClick={restartGuessing}>
                      Again
                    </button>
                    <p className="select-here" style={{ visibility: "hidden" }}>Let’s go</p>
                  </div>
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button
                      type="button"
                      className="select-mode is-open"
                      onClick={() => {
                        stopAllMedia();
                        if (document.fullscreenElement) {
                          sessionStorage.setItem("maintainFullscreen", "true");
                        }
                        window.location.href = lessonPath(movieId, 'word');
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
          <div className="guess-dock">
            <div className="guess-abc">
              <ControlTriangle
                direction="left"
                label="이전 문제"
                onClick={handlePrevQuestion}
              />
              {currentQuestion && currentQuestion.options
                .sort((a: any, b: any) => a.label.localeCompare(b.label))
                .map((option: any) => (
                <button
                  key={option.label}
                  type="button"
                  aria-label={canSelectAnswer ? `${option.label} 선택 (길게 누르면 다시 듣기)` : `${option.label} (아직 고를 수 없음)`}
                  className={`guess-opt ${playingAudio === option.label && !isPlaying ? "is-playing" : ""}`}
                  onPointerDown={() => {
                    if (!canSelectAnswer) return;
                    longPressFiredRef.current = false;
                    clearLongPress();
                    longPressTimerRef.current = setTimeout(() => {
                      longPressFiredRef.current = true;
                      replayOption(option);
                    }, 500);
                  }}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onClick={() => {
                    if (longPressFiredRef.current) {
                      longPressFiredRef.current = false;
                      return;
                    }
                    if (canSelectAnswer) {
                      handleAnswerSelection(option.label);
                    }
                  }}
                >
                  {option.label}
                </button>
              ))}
              <ControlTriangle
                direction="right"
                label="다음 문제"
                highlight={nudgeNext}
                onClick={handleNextQuestion}
              />
            </div>
            <button
              type="button"
              className="mimic-count"
              aria-expanded={isLineListOpen}
              aria-label="문제 목록"
              onClick={() => setIsLineListOpen((open) => !open)}
            >
              <span>{lineCurrent} / </span>
              <span className="mimic-count-total">{lineTotalLabel}</span>
              <img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
            </button>
          </div>
      }
    />
  );
}

export default function GuessingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GuessingPageContent />
    </Suspense>
  );
}
