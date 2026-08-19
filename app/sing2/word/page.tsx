'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import VideoPlayer from '@/app/components/VideoPlayer';
import ClickToStartOverlay from '@/app/components/ClickToStartOverlay';
import WordCompleteButtons from '@/app/components/WordCompleteButtons';
import PauseOverlay from '@/app/components/PauseOverlay';
import { useFullscreen } from '@/app/hooks/useFullscreen';
import { fetchLessonData, parseLessonNumber, parsePack, parseProgressLesson, formatMovieId, resolveVideoUrl } from '@/app/dataService';
import { srtTimeToSeconds } from '@/app/utils/timeUtils';
import { saveProgress, getProgressByMode, saveLog, saveResult } from '@/app/lib/progress';
import { useEvaluationLog } from '@/app/lib/evaluation';
import { useRequireModeAccess } from '@/app/lib/useRequireModeAccess';
import { getVideoSource } from '@/app/utils/videoSource';
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

const WORD_CHIP_FONT = 'Encode Sans, sans-serif';

function WordPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';

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
  const totalQuestions = 10;
  const evalLog = useEvaluationLog(lessonNumber, 'word', isStarted);
  const { checking } = useRequireModeAccess(lessonNumber, 'word');

  const currentChapter = parseInt(movieId.split(':')[1] || '1', 10);
  const pack = parsePack(movieId);
  const hasNextChapter = pack <= 1 && currentChapter < 12;

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
    return () => clearStepTimeout();
  }, [clearStepTimeout]);

  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      const contentLesson = parseLessonNumber(movieId);
      const packName = parsePack(movieId);
      setLessonNumber(parseProgressLesson(movieId));

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

        const resolvedVideoUrl = await resolveVideoUrl(lesson.video_id);
        setSupabaseLessonData(lesson as LessonDataType);
        setVideoUrl(resolvedVideoUrl);
        setLessonData({ word: lesson.word_data || [] });
        setIsLoading(false);

        try {
          const progress = await getProgressByMode(lessonNumber, 'word');
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

  const playCorrectSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const createCorrectSound = (ctx: AudioContext) => {
        const frequencies = [523.25, 659.25, 783.99];
        const duration = 0.3;
        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          const startTime = ctx.currentTime + index * 0.1;
          gainNode.gain.setValueAtTime(0.4, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        });
      };

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => createCorrectSound(audioContext));
      } else {
        createCorrectSound(audioContext);
      }
    } catch (error) {
      console.error('소리 재생 실패:', error);
    }
  };

  const playAgainSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const createAgainSound = (ctx: AudioContext) => {
        const frequencies = [783.99, 659.25, 523.25];
        const duration = 0.4;
        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          const startTime = ctx.currentTime + index * 0.15;
          gainNode.gain.setValueAtTime(0.4, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        });
      };

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => createAgainSound(audioContext));
      } else {
        createAgainSound(audioContext);
      }
    } catch (error) {
      console.error('소리 재생 실패:', error);
    }
  };

  const handleAgain = () => {
    clearStepTimeout();
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
    if (pack <= 1 && nextChapter <= 12) {
      window.location.href = `/sing2/word?id=${formatMovieId(pack, nextChapter)}`;
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;
    if (selectedWords.length !== currentQuestion.correctWords.length) return;
    if (showCorrect || showAgain || isPaused) return;

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
          setCurrentQuestionNumber((prev) => prev + 1);
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
        className={`break-words border-gray-300 bg-white text-center font-bold text-black shadow-lg transition-all ${
          compact
            ? 'rounded-xl border-2 px-3 py-1.5 text-sm'
            : 'w-full rounded-xl border-4 px-2 py-2 text-xs lg:rounded-2xl lg:px-4 lg:py-4 lg:text-lg'
        } ${
          shouldHide
            ? 'pointer-events-none scale-75 opacity-0'
            : !canArrange || cannotAddMore
              ? 'pointer-events-none cursor-not-allowed opacity-40'
              : 'hover:scale-105 hover:bg-gray-100 hover:shadow-xl'
        }`}
        style={{
          fontFamily: WORD_CHIP_FONT,
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
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

  return (
    <LessonShell
      subtitle={`${currentQuestionNumber}/${totalQuestions}`}
      onCloseHref="/"
      extraActions={
        <HeaderIconButton label={isFullscreen ? '전체화면 종료' : '전체화면'} onClick={toggleFullscreen}>
          <FullscreenIcon active={isFullscreen} />
        </HeaderIconButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(5.5rem,0.9fr)_minmax(0,1.7fr)_minmax(5.5rem,0.9fr)] md:gap-3 lg:grid-cols-[minmax(7.5rem,1fr)_minmax(0,2.2fr)_minmax(7.5rem,1fr)]">
        <div className="hidden min-h-0 flex-col gap-2 overflow-y-auto md:flex">
          {gamePhase === 'guessing' &&
            leftWords.map((word, i) => renderWordChip(word, i))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center">
          <div className="flex w-full shrink-0 items-center justify-center md:min-h-0 md:flex-1">
            <div
              className="relative aspect-video w-full overflow-hidden rounded-xl border-4 md:h-full md:rounded-3xl md:border-8 md:aspect-auto"
              style={{
                borderColor:
                  playCount === 2 && gamePhase === 'playing' && isStarted && !isPaused
                    ? '#60D96C'
                    : '#201E1E',
              }}
            >
              <div className="absolute inset-0">
                {currentQuestion && (
                  <VideoPlayer
                    key="word-player"
                    src={getVideoSource()}
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

              {showStartOverlay && <ClickToStartOverlay onClick={handleStart} />}

              {isPaused && !showCorrect && !showAgain && !showCompletion && <PauseOverlay />}

              {showCorrect && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="absolute inset-0 bg-black/70" />
                  <div className="relative z-10 text-center">
                    <div
                      className="animate-pulse text-3xl font-bold sm:text-6xl"
                      style={{
                        fontFamily: 'Encode Sans, sans-serif',
                        color: '#60D96C',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        fontWeight: '900',
                      }}
                    >
                      Correct
                    </div>
                  </div>
                </div>
              )}

              {showAgain && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="absolute inset-0 bg-black/70" />
                  <div className="relative z-10 text-center">
                    <div
                      className="animate-pulse text-3xl font-bold sm:text-6xl"
                      style={{
                        fontFamily: 'Encode Sans, sans-serif',
                        color: '#9CA3AF',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        fontWeight: '900',
                      }}
                    >
                      Again
                    </div>
                  </div>
                </div>
              )}

              {showCompletion && (
                <WordCompleteButtons
                  onAgain={handleAgain}
                  onNext={handleNext}
                  hasNextChapter={hasNextChapter}
                />
              )}
            </div>
          </div>

          <div className="mt-2 flex max-h-[22vh] flex-wrap justify-center gap-1 overflow-y-auto md:hidden">
            {gamePhase === 'guessing' &&
              shuffled.map((word, index) => renderWordChip(word, index, true))}
          </div>

          <div className="relative z-50 mt-auto w-full overflow-x-auto pt-1">
            <div
              className="mx-auto flex w-max max-w-full items-center justify-center rounded-lg bg-[#201E1E] px-1 py-1 sm:px-2"
              style={{ gap: 'var(--ctrl-gap)' }}
            >
              <ControlTriangle
                direction="left"
                label="다시 듣기"
                disabled={controlsLocked}
                onClick={handleReplayOnce}
              />

              <div
                className="flex items-center justify-center text-lg font-bold text-black transition-transform duration-300"
                style={{
                  background:
                    playCount === 0 && gamePhase === 'playing' && isStarted && !isPaused
                      ? 'var(--mimic)'
                      : 'var(--mute)',
                  borderRadius: '10px',
                  width: 'var(--ctrl-size)',
                  height: 'var(--ctrl-size)',
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <span className="ctrl-play-icon" />
              </div>

              <div
                className="flex items-center justify-center text-lg font-bold text-black transition-transform duration-300"
                style={{
                  background:
                    playCount === 1 && gamePhase === 'playing' && isStarted && !isPaused
                      ? 'var(--mimic)'
                      : 'var(--mute)',
                  borderRadius: '10px',
                  width: 'var(--ctrl-size)',
                  height: 'var(--ctrl-size)',
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                <span className="ctrl-play-icon" />
              </div>

              <div
                className="flex items-center justify-center text-lg font-bold text-black transition-transform duration-300"
                style={{
                  background:
                    playCount === 2 && gamePhase === 'playing' && isStarted && !isPaused
                      ? 'var(--mimic)'
                      : 'var(--mute)',
                  borderRadius: '10px',
                  width: 'var(--ctrl-size)',
                  height: 'var(--ctrl-size)',
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
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
                  fontFamily: WORD_CHIP_FONT,
                }}
                aria-label="마지막 단어 삭제"
              >
                ⌫
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`relative z-50 mb-1 mt-1 h-12 w-12 shrink-0 transition-transform sm:h-16 sm:w-16 md:mb-3 md:h-[88px] md:w-[88px] ${
              canSubmit
                ? 'hover:scale-105 animate-pulse-button'
                : 'cursor-not-allowed opacity-40'
            }`}
            style={{ background: 'transparent', border: 'none' }}
            aria-label="정답 제출"
          >
            <img src="/Subject.png" alt="제출" className="h-full w-full object-contain" />
          </button>
        </div>

        <div className="hidden min-h-0 flex-col gap-2 overflow-y-auto md:flex">
          {gamePhase === 'guessing' &&
            rightWords.map((word, i) => renderWordChip(word, mid + i))}
        </div>
      </div>

      {(selectedWords.length > 0 || (gamePhase === 'guessing' && neededCount > 0)) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-gray-900/95 p-2">
          <span
            className="mr-1 text-xs font-semibold text-gray-400 sm:text-sm"
            style={{ fontFamily: WORD_CHIP_FONT }}
          >
            {selectedWords.length}/{neededCount}
          </span>
          {selectedWords.map((word, index) => (
            <button
              key={`${word}-${index}`}
              type="button"
              onClick={() => handleRemoveAt(index)}
              disabled={!canArrange}
              className="rounded-lg bg-[#60D96C] px-3 py-1 text-sm font-bold text-black transition-transform hover:scale-105 disabled:cursor-default md:px-5 md:py-3 md:text-lg"
              style={{ fontFamily: WORD_CHIP_FONT }}
              aria-label={`${word} 제거`}
            >
              {word}
            </button>
          ))}
        </div>
      )}
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
