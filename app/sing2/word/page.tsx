'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import VideoPlayer from '@/app/components/VideoPlayer';
import ClickToStartOverlay from '@/app/components/ClickToStartOverlay';
import PauseOverlay from '@/app/components/PauseOverlay';
import MimicLineList from '@/app/components/MimicLineList';
import Link from 'next/link';
import { useFullscreen } from '@/app/hooks/useFullscreen';
import { useSoundEffects } from '@/app/hooks/useSoundEffects';
import { fetchLessonData, parseLessonNumber, parsePack, parseProgressLesson, formatMovieId } from '@/app/dataService';
import { srtTimeToSeconds } from '@/app/utils/timeUtils';
import { saveProgress, getProgressByMode, saveLog, saveResult } from '@/app/lib/progress';
import { useEvaluationLog } from '@/app/lib/evaluation';
import { useRequireModeAccess } from '@/app/lib/useRequireModeAccess';
import { getLessonMedia, lessonSelectHref, BOOK_SCENE_COUNT, isBookId } from '@/app/lib/lessonMedia';
import LessonShell from '@/app/components/LessonShell';
import { FullscreenIcon, HeaderIconButton } from '@/app/components/HeaderIcons';
import ControlTriangle from '@/app/components/ControlTriangle';

interface WordQuestion {
  question: number;
  start: string;
  end: string;
  text: string;
}

interface LessonData {
  word: WordQuestion[];
}

interface CurrentQuestion {
  videoPath: string;
  startTime: number;
  endTime: number;
  correctWords: string[];
  shuffledWords: string[];
}

interface LessonDataType {
  id: number;
  lesson_number: number;
  video_id: number;
  word_data: any[];
  watching_data?: any;
}

function WordPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  const media = getLessonMedia(movieId);

  const [supabaseLessonData, setSupabaseLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lessonNumber, setLessonNumber] = useState<number>(() => parseProgressLesson(movieId));
  const [playCount, setPlayCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'playing' | 'guessing'>('playing');
  const [playNonce, setPlayNonce] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [hideAllWords, setHideAllWords] = useState(false);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isReplayingClip, setIsReplayingClip] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);

  const playCountRef = useRef(0);
  const isPausedRef = useRef(false);
  const isReplayingClipRef = useRef(false);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gamePhaseRef = useRef(gamePhase);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { playCorrectSound, playAgainSound } = useSoundEffects();
  const totalQuestions = 10;
  const evalLog = useEvaluationLog(lessonNumber, 'word', isStarted);
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, 'word', movieId);
  const maxQuestionRef = useRef(1);
  const lockHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLineListOpen, setIsLineListOpen] = useState(false);
  const [lockHint, setLockHint] = useState(false);
  const [isChameleonEating, setIsChameleonEating] = useState(false);

  const currentChapter = parseInt(movieId.split(':')[1] || '1', 10);
  const pack = parsePack(movieId);

  const clearStepTimeout = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  }, []);

  const scheduleStep = useCallback((fn: () => void, delay: number) => {
    clearStepTimeout();
    stepTimeoutRef.current = setTimeout(() => {
      stepTimeoutRef.current = null;
      if (isPausedRef.current) return;
      fn();
    }, delay);
  }, [clearStepTimeout]);

  const showLockHint = useCallback(() => {
    setLockHint(true);
    if (lockHintTimeoutRef.current) clearTimeout(lockHintTimeoutRef.current);
    lockHintTimeoutRef.current = setTimeout(() => setLockHint(false), 1600);
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    isReplayingClipRef.current = isReplayingClip;
  }, [isReplayingClip]);

  useEffect(() => {
    return () => {
      clearStepTimeout();
      if (lockHintTimeoutRef.current) clearTimeout(lockHintTimeoutRef.current);
    };
  }, [clearStepTimeout]);

  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      const contentLesson = parseLessonNumber(movieId);
      const packName = parsePack(movieId);
      const progressLesson = parseProgressLesson(movieId);
      setLessonNumber(progressLesson);

      if (isNaN(contentLesson)) {
        setIsLoading(false);
        return;
      }

      try {
        const lesson = await fetchLessonData(contentLesson, packName);

        if (!lesson) {
          setIsLoading(false);
          return;
        }

        setSupabaseLessonData(lesson as LessonDataType);
        setVideoUrl(getLessonMedia(movieId).src);
        setLessonData({ word: lesson.word_data || [] });
        setIsLoading(false);

        try {
          const progress = await getProgressByMode(progressLesson, 'word');
          if (progress) {
            const q = Math.max(1, Math.floor(Number(progress.current_position || 1)));
            if (q <= totalQuestions) {
              setCurrentQuestionNumber(q);
            }
          }
        } catch {
          // 첫 학습
        }
      } catch (error) {
        console.error('Supabase data loading error:', error);
        setIsLoading(false);
      }
    };

    loadDataFromSupabase();
  }, [movieId]);

  useEffect(() => {
    if (!lessonNumber || !isStarted) return;

    const saveProgressInterval = setInterval(async () => {
      try {
        await saveProgress(
          lessonNumber,
          'word',
          currentQuestionNumber > totalQuestions,
          currentQuestionNumber,
          {
            currentQuestion: currentQuestionNumber,
            totalQuestions,
            selectedWords,
            isComplete: currentQuestionNumber > totalQuestions,
            lastSaved: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error('워드 진도 저장 실패:', error);
      }
    }, 20000);

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isStarted, currentQuestionNumber, totalQuestions, selectedWords]);

  useEffect(() => {
    if (currentQuestionNumber > totalQuestions && lessonNumber) {
      const saveFinalProgress = async () => {
        try {
          await saveProgress(lessonNumber, 'word', true, currentQuestionNumber, {
            currentQuestion: currentQuestionNumber,
            totalQuestions,
            isComplete: true,
            completed_at: new Date().toISOString(),
          });

          await saveResult(
            lessonNumber,
            'word',
            100,
            totalQuestions,
            totalQuestions,
            Date.now()
          );

          await saveLog(lessonNumber, 'word', 'word_completed', {
            totalQuestions,
            completed_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error('워드 완료 저장 실패:', error);
        }
      };
      saveFinalProgress();
    }
  }, [currentQuestionNumber, totalQuestions, lessonNumber]);

  const generateQuestion = useCallback(() => {
    if (!lessonData || !lessonData.word) return;
    if (currentQuestionNumber > totalQuestions) return;

    const wordQuestion = lessonData.word[currentQuestionNumber - 1];
    if (!wordQuestion) return;

    const rawWords = wordQuestion.text.split(' ');
    const words = rawWords.filter((word) => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      return cleanWord.length > 0;
    });

    let allWords = [...words];
    if (words.length < 10) {
      const otherWords: string[] = [];
      lessonData.word.forEach((wq, idx) => {
        if (idx !== currentQuestionNumber - 1) {
          const lineWords = wq.text.split(' ').filter((word) => {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            return cleanWord.length > 0;
          });
          otherWords.push(...lineWords);
        }
      });

      const neededWords = 10 - words.length;
      const shuffledOtherWords = [...otherWords].sort(() => Math.random() - 0.5);
      const uniqueDistractors: string[] = [];
      for (const word of shuffledOtherWords) {
        if (
          !words.some((w) => w.toLowerCase() === word.toLowerCase()) &&
          !uniqueDistractors.some((w) => w.toLowerCase() === word.toLowerCase())
        ) {
          uniqueDistractors.push(word);
          if (uniqueDistractors.length >= neededWords) break;
        }
      }

      allWords = [...words, ...uniqueDistractors];
    }

    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const startTime = srtTimeToSeconds(wordQuestion.start);
    const endTime = srtTimeToSeconds(wordQuestion.end);

    setCurrentQuestion({
      videoPath: videoUrl || '',
      startTime,
      endTime,
      correctWords: words,
      shuffledWords: shuffled,
    });
  }, [lessonData, currentQuestionNumber, totalQuestions, videoUrl]);

  useEffect(() => {
    if (lessonData && lessonData.word && !currentQuestion) {
      generateQuestion();
    }
  }, [lessonData, currentQuestion, generateQuestion]);

  useEffect(() => {
    if (lessonData && lessonData.word && currentQuestionNumber > 1) {
      generateQuestion();
    }
  }, [currentQuestionNumber, lessonData, generateQuestion]);

  const startListeningSequence = useCallback(() => {
    clearStepTimeout();
    setIsPaused(false);
    isPausedRef.current = false;
    setIsReplayingClip(false);
    isReplayingClipRef.current = false;
    playCountRef.current = 0;
    setPlayCount(0);
    setIsMuted(false);
    setGamePhase('playing');
    // playNonce를 0으로 내리면 VideoPlayer가 이후 재생을 무시함 → 항상 증가만
    scheduleStep(() => setPlayNonce((prev) => prev + 1), 200);
  }, [clearStepTimeout, scheduleStep]);

  const handleStart = () => {
    setShowStartOverlay(false);
    setIsStarted(true);
    startListeningSequence();
  };

  const handleVideoEnd = () => {
    if (isPausedRef.current) return;

    if (isReplayingClipRef.current) {
      setIsReplayingClip(false);
      isReplayingClipRef.current = false;
      return;
    }

    if (gamePhaseRef.current !== 'playing') return;

    const currentCount = playCountRef.current;
    playCountRef.current = currentCount + 1;

    if (currentCount === 0) {
      scheduleStep(() => {
        setIsMuted(false);
        setPlayNonce((prev) => prev + 1);
      }, 1000);
    } else if (currentCount === 1) {
      scheduleStep(() => {
        setIsMuted(true);
        setPlayNonce((prev) => prev + 1);
      }, 1000);
    } else if (currentCount === 2) {
      scheduleStep(() => {
        setPlayCount(3);
        setIsMuted(false);
        setGamePhase('guessing');
      }, 1500);
    }
  };

  const togglePause = useCallback(() => {
    if (!isStarted || showStartOverlay || showCorrect || showAgain || showCompletion) return;

    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      if (gamePhase === 'playing') {
        setPlayNonce((prev) => prev + 1);
      } else if (isReplayingClipRef.current) {
        setReplayNonce((prev) => prev + 1);
      }
      return;
    }

    clearStepTimeout();
    setIsPaused(true);
    isPausedRef.current = true;
    document.querySelectorAll('video').forEach((video) => video.pause());
  }, [
    isStarted,
    showStartOverlay,
    showCorrect,
    showAgain,
    showCompletion,
    isPaused,
    gamePhase,
    clearStepTimeout,
  ]);

  const handleWordClick = (word: string, index: number) => {
    if (gamePhase !== 'guessing' || isPaused || showCorrect || showAgain) return;
    if (usedWords.includes(index.toString())) return;
    if (
      currentQuestion &&
      selectedWords.length >= currentQuestion.correctWords.length
    ) {
      return;
    }
    setSelectedWords((prev) => [...prev, word]);
    setUsedWords((prev) => [...prev, index.toString()]);
  };

  const handleRemoveAt = (slotIndex: number) => {
    if (gamePhase !== 'guessing' || showCorrect || showAgain) return;
    setSelectedWords((prev) => prev.filter((_, i) => i !== slotIndex));
    setUsedWords((prev) => prev.filter((_, i) => i !== slotIndex));
  };

  const handleDeleteLast = () => {
    if (selectedWords.length === 0 || gamePhase !== 'guessing') return;
    handleRemoveAt(selectedWords.length - 1);
  };

  /** 고르는 단계에서 클립 한 번만 다시 듣기 */
  const handleReplayOnce = () => {
    if (gamePhase !== 'guessing' || isPaused || showCorrect || showAgain) return;
    setIsMuted(false);
    setIsReplayingClip(true);
    isReplayingClipRef.current = true;
    setReplayNonce((prev) => prev + 1);
  };

  /** 고르는 단계에서 영상 3번 시퀀스부터 다시 */
  const handleReplayAll = () => {
    if (gamePhase !== 'guessing' || isPaused || showCorrect || showAgain) return;
    setSelectedWords([]);
    setUsedWords([]);
    setHideAllWords(false);
    startListeningSequence();
  };

  const handleAgain = () => {
    clearStepTimeout();
    maxQuestionRef.current = 1;
    setIsLineListOpen(false);
    setShowCompletion(false);
    setCurrentQuestionNumber(1);
    playCountRef.current = 0;
    setPlayCount(0);
    setIsMuted(false);
    setGamePhase('playing');
    setSelectedWords([]);
    setUsedWords([]);
    setHideAllWords(false);
    setShowStartOverlay(true);
    setIsStarted(false);
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const handleNext = () => {
    const nextChapter = currentChapter + 1;
    if (isBookId(movieId)) {
      if (nextChapter <= BOOK_SCENE_COUNT) {
        window.location.href = lessonSelectHref(formatMovieId(pack, nextChapter));
        return;
      }
      window.location.href = '/';
      return;
    }
    if (pack <= 1 && nextChapter <= 12) {
      window.location.href = `/sing2/selecting?id=${formatMovieId(pack, nextChapter)}`;
      return;
    }
    window.location.href = '/';
  };

  const goToQuestion = (n: number) => {
    if (n < 1 || n > totalQuestions) return;
    if (!isMaster && n > maxQuestionRef.current) {
      showLockHint();
      return;
    }
    if (isMaster) {
      maxQuestionRef.current = Math.max(maxQuestionRef.current, n);
    }
    clearStepTimeout();
    setIsLineListOpen(false);
    setShowCompletion(false);
    setShowCorrect(false);
    setShowAgain(false);
    setSelectedWords([]);
    setUsedWords([]);
    setHideAllWords(false);
    setCurrentQuestionNumber(n);
    setIsStarted(true);
    setShowStartOverlay(false);
    startListeningSequence();
  };

  const skipQuestion = () => {
    if (showCompletion) return;
    if (currentQuestionNumber >= totalQuestions) {
      setShowCompletion(true);
      return;
    }
    goToQuestion(currentQuestionNumber + 1);
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;
    if (selectedWords.length !== currentQuestion.correctWords.length) return;
    if (showCorrect || showAgain || isPaused || isChameleonEating) return;

    setIsChameleonEating(true);
    window.setTimeout(() => setIsChameleonEating(false), 720);

    const isCorrect =
      JSON.stringify(selectedWords) === JSON.stringify(currentQuestion.correctWords);

    evalLog.addAttempt({
      question: currentQuestionNumber,
      submitted: [...selectedWords],
      correct: [...currentQuestion.correctWords],
      isCorrect,
      replayCount: playCountRef.current,
    });
    evalLog.patch({ totalQuestions });
    void evalLog.flush();

    setHideAllWords(true);
    clearStepTimeout();

    if (isCorrect) {
      playCorrectSound();
      setShowCorrect(true);

      scheduleStep(() => {
        setShowCorrect(false);
        setSelectedWords([]);
        setUsedWords([]);
        setHideAllWords(false);

        if (currentQuestionNumber >= totalQuestions) {
          setShowCompletion(true);
        } else {
          playCountRef.current = 0;
          setPlayCount(0);
          setIsMuted(false);
          setGamePhase('playing');
          const nextNum = currentQuestionNumber + 1;
          maxQuestionRef.current = Math.max(maxQuestionRef.current, nextNum);
          setCurrentQuestionNumber(nextNum);
          scheduleStep(() => setPlayNonce((prev) => prev + 1), 200);
        }
      }, 2000);
    } else {
      playAgainSound();
      setShowAgain(true);

      scheduleStep(() => {
        setShowAgain(false);
        setSelectedWords([]);
        setUsedWords([]);
        setHideAllWords(false);
        startListeningSequence();
      }, 2000);
    }
  };

  const neededCount = currentQuestion?.correctWords.length ?? 0;
  const slotsFull = neededCount > 0 && selectedWords.length >= neededCount;
  const canArrange =
    gamePhase === 'guessing' && !isPaused && !showCorrect && !showAgain && !showCompletion;
  const canSubmit =
    canArrange && neededCount > 0 && selectedWords.length === neededCount;
  const controlsLocked = gamePhase === 'playing' || !canArrange;

  const renderWordChip = (word: string, index: number, compact = false) => {
    const isUsed = usedWords.includes(index.toString());
    const shouldHide = isUsed || hideAllWords;
    const cannotAddMore = slotsFull && !isUsed;
    return (
      <button
        key={index}
        type="button"
        onClick={() => handleWordClick(word, index)}
        className={`word-chip ${compact ? 'is-compact' : ''} ${
          shouldHide ? 'pointer-events-none scale-75 opacity-0' : !canArrange || cannotAddMore ? 'opacity-40' : ''
        }`}
        style={{ transition: 'opacity 0.4s ease, transform 0.4s ease' }}
        disabled={shouldHide || !canArrange || cannotAddMore}
      >
        {word}
      </button>
    );
  };

  const shuffled = currentQuestion?.shuffledWords ?? [];
  const mid = Math.ceil(shuffled.length / 2);
  const leftWords = shuffled.slice(0, mid);
  const rightWords = shuffled.slice(mid);

  if (loading || checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  if (isLoading || !supabaseLessonData || !videoUrl || !lessonData) {
    return (
      <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between group">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            SING 2
          </h1>
        </div>
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              Loading...
            </p>
          </div>
        </div>
      </main>
    );
  }

  const slotActive = (index: number) =>
    playCount === index && gamePhase === 'playing' && isStarted && !isPaused;
  const videoHighlight = slotActive(2);
  const lineCurrent = String(currentQuestionNumber).padStart(2, '0');
  const lineTotalLabel = String(totalQuestions).padStart(2, '0');
  const showSentence =
    gamePhase === 'guessing' &&
    selectedWords.length > 0 &&
    !showCorrect &&
    !showAgain &&
    !showCompletion;

  return (
    <LessonShell hideHeader compactStage>
      <div className="word-board">
        <div className="word-chips-side">
          {gamePhase === 'guessing' && leftWords.map((word, i) => renderWordChip(word, i))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center">
          <div className="flex w-full min-h-0 flex-1 items-center justify-center">
            <div
              className={`word-video watch-frame relative aspect-video w-full max-h-full overflow-hidden ${
                videoHighlight ? 'is-live' : ''
              }`}
            >
              <div className="absolute inset-0">
                {currentQuestion && (
                  <VideoPlayer
                    key="word-player"
                    src={media.src}
                    poster={media.poster}
                    startTime={currentQuestion.startTime}
                    endTime={currentQuestion.endTime}
                    onEndedSegment={handleVideoEnd}
                    onPlay={() => {
                      const currentCount = playCountRef.current;
                      setPlayCount(currentCount);
                    }}
                    onClick={() => {
                      if (isStarted && !showStartOverlay && !showCompletion) {
                        togglePause();
                      }
                    }}
                    muted={isMuted}
                    showText={false}
                    text=""
                    playNonce={
                      gamePhase === 'playing' && isStarted
                        ? playNonce
                        : isReplayingClip
                          ? replayNonce
                          : 0
                    }
                    playing={
                      !isPaused &&
                      ((gamePhase === 'playing' && isStarted) || isReplayingClip)
                    }
                    hidePauseOverlay={true}
                    disableOnReadySeek={true}
                  />
                )}
              </div>

              <Link
                href={lessonSelectHref(movieId)}
                className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4"
                aria-label="뒤로"
              >
                <img src="/home/back.svg" alt="" className="h-full w-full" />
              </Link>
              <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
                <HeaderIconButton label={isFullscreen ? '전체화면 종료' : '전체화면'} onClick={toggleFullscreen}>
                  <FullscreenIcon active={isFullscreen} />
                </HeaderIconButton>
                {isMaster && !showCompletion && (
                  <button type="button" className="watch-skip" onClick={skipQuestion}>
                    SKIP
                  </button>
                )}
              </div>

              {isLineListOpen && !showCompletion && (
                <MimicLineList
                  total={totalQuestions}
                  currentIndex={currentQuestionNumber - 1}
                  canOpen={(index) => isMaster || index < maxQuestionRef.current}
                  onSelect={(index) => goToQuestion(index + 1)}
                />
              )}

              {showStartOverlay && (
                <ClickToStartOverlay
                  onClick={handleStart}
                  text="단어를 순서대로 맞춰요"
                  description="들리는 문장을 떠올리며 단어를 올바른 순서로 배열해요."
                />
              )}

              {isPaused && !showCorrect && !showAgain && !showCompletion && <PauseOverlay />}

              {showSentence && (
                <div className="word-sentence">
                  {selectedWords.map((word, index) => (
                    <button
                      key={`${word}-${index}`}
                      type="button"
                      className="word-sentence-item"
                      onClick={() => handleRemoveAt(index)}
                      disabled={!canArrange}
                      aria-label={`${word} 제거`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}

              {showCorrect && <p className="guess-banner is-correct">Correct</p>}
              {showAgain && <p className="guess-banner is-again">Again</p>}

              {lockHint && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm font-semibold text-white sm:text-base" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  아직 잠겨 있어요. 지금 문제를 먼저 맞춰 주세요.
                </div>
              )}

              {showCompletion && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto flex items-start justify-center gap-[clamp(2rem,8vw,12rem)]">
                    <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                      <button type="button" className="select-mode" onClick={handleAgain}>
                        Again
                      </button>
                      <p className="select-here" style={{ visibility: 'hidden' }}>Let’s go</p>
                    </div>
                    <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                      <button type="button" className="select-mode is-open" onClick={handleNext}>
                        <img src="/home/chameleon.png" alt="" className="select-chameleon" />
                        Next
                      </button>
                      <p className="cta-go">Let’s go</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="word-chips-mobile">
            {gamePhase === 'guessing' &&
              shuffled.map((word, index) => renderWordChip(word, index, true))}
          </div>

          <div className="word-dock relative z-20 mt-2 w-full justify-center overflow-x-auto pt-1">
            <div className="word-bar">
              <ControlTriangle
                direction="left"
                label="다시 듣기"
                disabled={controlsLocked}
                onClick={handleReplayOnce}
              />
              <div className={`ctrl-slot is-listen ${slotActive(0) ? 'is-active' : ''}`} style={{ width: 'var(--ctrl-size)', height: 'var(--ctrl-size)' }} aria-hidden>
                <span className="ctrl-play-icon" />
              </div>
              <div className={`ctrl-slot is-listen ${slotActive(1) ? 'is-active' : ''}`} style={{ width: 'var(--ctrl-size)', height: 'var(--ctrl-size)' }} aria-hidden>
                <span className="ctrl-play-icon" />
              </div>
              <div className={`ctrl-slot is-mimic ${slotActive(2) ? 'is-active' : ''}`} style={{ width: 'var(--ctrl-size)', height: 'var(--ctrl-size)' }} aria-hidden>
                <span className="ctrl-mute-letter">m</span>
              </div>
              <ControlTriangle
                direction="right"
                label="전체 다시 듣기"
                disabled={controlsLocked}
                onClick={handleReplayAll}
              />
              <button
                type="button"
                onClick={handleDeleteLast}
                disabled={selectedWords.length === 0 || !canArrange}
                className="flex shrink-0 items-center justify-center rounded-lg text-base font-bold text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xl"
                style={{
                  width: 'var(--ctrl-size)',
                  height: 'var(--ctrl-size)',
                  backgroundColor: '#2a2a2a',
                }}
                aria-label="마지막 단어 삭제"
              >
                ⌫
              </button>
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

          {!showCompletion && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isChameleonEating}
              className={`word-submit relative z-20 mb-1 mt-1 shrink-0 ${
                isChameleonEating
                  ? 'is-eating'
                  : canSubmit
                    ? 'is-ready hover:scale-105'
                    : 'cursor-not-allowed opacity-40'
              }`}
              aria-label="완성한 문장 먹이기"
            >
              {isChameleonEating && (
                <span className="word-snack" aria-hidden="true">
                  {selectedWords.join(' ')}
                </span>
              )}
              <img src="/home/chameleon.png" alt="" />
            </button>
          )}

          <style jsx global>{`
            .word-submit.is-ready {
              animation: word-chameleon-nudge 1.15s ease-in-out infinite;
              filter: drop-shadow(0 0 0.9rem rgba(96, 217, 108, 0.4));
            }

            .word-submit.is-eating {
              animation: word-chameleon-eat 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
            }

            .word-snack {
              position: absolute;
              left: 50%;
              bottom: 72%;
              z-index: 2;
              max-width: min(20rem, 72vw);
              overflow: hidden;
              padding: 0.35rem 0.7rem;
              border-radius: 999px;
              background: #fff;
              color: #171717;
              font-family: "Encode Sans", sans-serif;
              font-size: clamp(0.72rem, 1.5vw, 1rem);
              font-weight: 800;
              line-height: 1;
              text-overflow: ellipsis;
              white-space: nowrap;
              box-shadow: 0 0.4rem 1.1rem rgba(0, 0, 0, 0.28);
              animation: word-snack-to-mouth 620ms cubic-bezier(0.4, 0, 0.2, 1) both;
            }

            @keyframes word-chameleon-nudge {
              0%, 100% { transform: translateX(-9%); }
              50% { transform: translateX(9%); }
            }

            @keyframes word-chameleon-eat {
              0% { transform: translateX(0) scale(1); }
              32% { transform: translateY(-8%) scale(1.13, 0.9); }
              58% { transform: translateY(2%) scale(0.91, 1.12); }
              78% { transform: translateY(0) scale(1.07, 0.95); }
              100% { transform: translateY(0) scale(1); }
            }

            @keyframes word-snack-to-mouth {
              0% { opacity: 1; transform: translate(-50%, -105%) scale(1); }
              68% { opacity: 1; transform: translate(-50%, 5%) scale(0.48); }
              100% { opacity: 0; transform: translate(-50%, 42%) scale(0.08); }
            }

            @media (prefers-reduced-motion: reduce) {
              .word-submit.is-ready,
              .word-submit.is-eating,
              .word-snack {
                animation: none;
              }
            }
          `}</style>
        </div>

        <div className="word-chips-side">
          {gamePhase === 'guessing' && rightWords.map((word, i) => renderWordChip(word, mid + i))}
        </div>
      </div>
    </LessonShell>
  );
}

export default function WordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WordPageContent />
    </Suspense>
  );
}
