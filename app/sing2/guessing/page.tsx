"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLessonData, parseLessonNumber, resolveVideoUrl } from "../../dataService";
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
import { getVideoSource } from "../../utils/videoSource";
import { playTimedSegment, unlockMediaPlayback } from "../../utils/playTimedSegment";
import { requestAppFullscreen, applyInlinePlayback } from "../../utils/device";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import GuessingResultScreen from "../../components/GuessingResultScreen";
import GuessingOverlays from "../../components/GuessingOverlays";
import LessonShell from "../../components/LessonShell";
import { FullscreenIcon, HeaderCloseLink, HeaderIconButton, ListIcon } from "../../components/HeaderIcons";
import { saveProgress, getProgressByMode, saveLog, saveResult } from "../../lib/progress";
import { useEvaluationLog } from "../../lib/evaluation";
import { useRequireModeAccess } from "../../lib/useRequireModeAccess";
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
  
  // 모든 훅을 최상단으로 이동
  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guessingData, setGuessingData] = useState<any[]>([]);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(1);
  
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
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, 'guessing');
  const maxQuestionRef = useRef(0);

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const videoPlayCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayIndexRef = useRef(0);
  const autoPlayTriggeredRef = useRef(false);
  const onEndedFiredRef = useRef(false);
  const dataLoadedRef = useRef(false); // 데이터 로딩 중복 방지
  const stopAudioSegmentRef = useRef<(() => void) | null>(null);
  const missedThisQuestionRef = useRef(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);

  useEffect(() => {
    return () => {
      stopAudioSegmentRef.current?.();
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

        const lessonNumber = parseLessonNumber(movieId);
        setLessonNumber(lessonNumber);

        if (isNaN(lessonNumber)) {
          console.error('❌ Invalid lesson number:', movieId);
          setIsLoading(false);
          return;
        }

        const lesson = await fetchLessonData(lessonNumber);

        if (!lesson) {
          console.error('❌ No lesson data found');
          setIsLoading(false);
          return;
        }

        const resolvedVideoUrl = await resolveVideoUrl(lesson.video_id);
        const guessingDataArray = lesson.guessing_data || [];
        
        setLessonData(lesson as LessonDataType);
        setVideoUrl(resolvedVideoUrl);
        setGuessingData(guessingDataArray);
        setTotalQuestions(guessingDataArray.length);
        setIsLoading(false);
        
        // 저장된 진도 불러오기
        try {
          const progress = await getProgressByMode(lessonNumber, 'guessing');
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
    const audioVideo = document.getElementById('audio-video') as HTMLVideoElement;
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
  const playABCSequence = useCallback((question: any, onAllPlayed?: () => void) => {
    const playNextOption = (idx: number) => {
      if (idx < GUESSING_OPTION_LABELS.length && question) {
        const currentLabel = GUESSING_OPTION_LABELS[idx];
        const currentOption = question.options.find((opt: any) => opt.label === currentLabel);
      if (currentOption) {
          playAudioDirect(currentOption, question, () => {
            playNextOption(idx + 1);
          });
        } else {
          playNextOption(idx + 1);
        }
      } else {
        if (onAllPlayed) onAllPlayed();
      }
    };
    playNextOption(0);
  }, [playAudioDirect]);

  const resetQuestionPlayback = useCallback(() => {
    stopAudioSegmentRef.current?.();
    setVideoPlayCount(0);
    videoPlayCountRef.current = 0;
    setPlayingAudio(null);
    setAllOptionsPlayed(false);
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
    setScreenshot(null);
    setScreenshotTaken(false);
    setIsClipPlaying(false);
  }, [setVideoPlayCount, setPlayingAudio, setAllOptionsPlayed, setCurrentAutoIndex, setScreenshot, setScreenshotTaken]);

  // 답안 선택 처리
  const handleAnswerSelection = useCallback((selectedAnswer: string) => {
    if (!allOptionsPlayed) return;

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

      setTimeout(() => {
        missedThisQuestionRef.current = false;
        if (currentQuestionIndex < totalQuestions - 1) {
          const nextIdx = currentQuestionIndex + 1;
          maxQuestionRef.current = Math.max(maxQuestionRef.current, nextIdx);
          setCurrentQuestionIndex(nextIdx);
          setCurrentIndex(currentIndex + 1);
          resetQuestionPlayback();
          setShowResults(false);
          setShowIntro(false);
          setUserInteracted(true);
          setIsGuessingStarted(true);

          setTimeout(() => {
            playVideo();
          }, GUESSING_NEXT_QUESTION_DELAY);
        } else {
          setShowResults(true);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      missedThisQuestionRef.current = true;
      playAgainSound();

      setTimeout(() => {
        resetQuestionPlayback();
        playVideo();
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  }, [allOptionsPlayed, currentQuestionIndex, totalQuestions, currentIndex, guessingData, handleAnswerSelect, playCorrectSound, playAgainSound, playVideo, resetQuestionPlayback, setCurrentQuestionIndex, setCurrentIndex, setShowResults, setShowIntro, setUserInteracted, setIsGuessingStarted, setUserAnswers, setCorrectCount, setAllOptionsPlayed, evalLog, videoPlayCount]);
  
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

  // 결과 화면
  if (showResults) {
    const correctAnswers = correctCount;

    return (
      <GuessingResultScreen
        movieTitle="SING 2"
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        onStopAllMedia={stopAllMedia}
        onNext={() => {
          stopAllMedia();
          if (document.fullscreenElement) {
            sessionStorage.setItem('maintainFullscreen', 'true');
          }
          window.location.href = `/sing2/word?id=${movieId}`;
        }}
      />
    );
  }

  // 안내 화면
  if (showIntro) {
    return (
      <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
          <div className="flex items-center gap-1.5">
            <HeaderIconButton label={isSidebarOpen ? "목록 숨기기" : "목록 보기"} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <ListIcon active={isSidebarOpen} />
            </HeaderIconButton>
            <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
              <FullscreenIcon active={isFullscreen} />
            </HeaderIconButton>
            <HeaderCloseLink onClick={stopAllMedia} />
          </div>
        </div>

        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              Guessing Game
            </h1>
            <p className="text-2xl mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              무음 영상을 3번 보고 정답을 클릭하세요
            </p>
            <p className="text-lg opacity-70" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              준비 중...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 게싱 게임 화면
  return (
    <LessonShell
      subtitle={`${currentQuestionIndex + 1}/${totalQuestions}`}
      onClose={stopAllMedia}
      onCloseHref="/"
      videoHighlight={isClipPlaying}
      extraActions={
        <>
          <HeaderIconButton label={isSidebarOpen ? "목록 숨기기" : "목록 보기"} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <ListIcon active={isSidebarOpen} />
          </HeaderIconButton>
          <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
        </>
      }
      video={
        <div className="h-full w-full">
              {isGuessingStarted && currentQuestion && (
                <VideoPlayer
                  key="guessing-player"
                  src={getVideoSource()}
                  startTime={srtTimeToSeconds(currentQuestion.video.start)}
                  endTime={srtTimeToSeconds(currentQuestion.video.end)}
                  muted={true}
                  showText={false}
                  text=""
                  playing={isPlaying}
                  playNonce={playNonce}
                  hidePauseOverlay={true}
                  activeControlIndex={3}
                  onEndedSegment={() => {
                    setIsClipPlaying(false);
                    videoPlayCountRef.current += 1;
                    const currentCount = videoPlayCountRef.current;
                    setVideoPlayCount(currentCount);

                    if (currentCount >= GUESSING_VIDEO_PLAYS) {
                      pauseVideo();
                      setTimeout(() => {
                        playABCSequence(currentQuestion, () => setAllOptionsPlayed(true));
                      }, GUESSING_AUTO_PLAY_DELAY);
                    } else {
                      setTimeout(() => {
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

              <video
                id="audio-video"
                src={getVideoSource()}
                style={{ display: 'none' }}
                muted={false}
                preload="auto"
                playsInline
                onLoadedMetadata={(e) => applyInlinePlayback(e.currentTarget)}
              />

              {!isGuessingStarted && currentQuestion && (
                <ClickToStartOverlay
                  onClick={() => {
                    const audioVideo = document.getElementById('audio-video') as HTMLVideoElement | null;
                    if (audioVideo) {
                      unlockMediaPlayback(audioVideo);
                    }
                    startGuessing();
                    playVideo();
                  }}
                />
              )}

            <GuessingOverlays
              screenshot={screenshot}
              videoPlayCount={videoPlayCount}
              showCorrect={showCorrect}
              showAgain={showAgain}
            />
        </div>
      }
      controls={
          <div className="origin-bottom scale-90 md:scale-100">
            <div 
              className="flex w-full max-w-4xl items-center justify-center rounded-lg mx-auto"
              style={{ 
                backgroundColor: '#201E1E', 
                gap: '10px', 
                paddingTop: '4px', 
                paddingBottom: '4px', 
                paddingLeft: '8px', 
                paddingRight: '8px'
              }}
            >
              {currentQuestion && (
                <>
                  <div 
                    className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        missedThisQuestionRef.current = false;
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                        setVideoPlayCount(0);
                        setScreenshot(null);
                        setScreenshotTaken(false);
                        setPlayingAudio(null);
                        setAutoPlaySequence([]);
                        setCurrentAutoIndex(0);
                        setUserInteracted(false);
                        setShowCorrect(false);
                        setShowAgain(false);
                        setAllOptionsPlayed(false);
                      } else {
                        const audioElements = document.querySelectorAll('audio');
                        audioElements.forEach(audio => {
                          audio.pause();
                          audio.currentTime = 0;
                        });
                        
                        window.location.href = `/sing2/mimicking?id=${movieId}`;
                      }
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: '#201E1E'
                    }}
                    onMouseEnter={(e) => {
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderRight = '70px solid #777777';
                        triangle.style.borderTop = '50px solid transparent';
                        triangle.style.borderBottom = '50px solid transparent';
                        triangle.style.transition = 'all 0.6s ease-in-out';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderRight = '60px solid #666666';
                        triangle.style.borderTop = '45px solid transparent';
                        triangle.style.borderBottom = '45px solid transparent';
                      }
                    }}
                  >
                    <div 
                      style={{
                        width: 0,
                        height: 0,
                        borderRight: '60px solid #666666',
                        borderTop: '45px solid transparent',
                        borderBottom: '45px solid transparent'
                      }}
                    />
                  </div>

                  {currentQuestion.options
                    .sort((a: any, b: any) => a.label.localeCompare(b.label))
                    .map((option: any) => (
                    <button
                      key={option.label}
                      className={`rounded-2xl border-8 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg px-3 py-2 text-sm sm:px-6 sm:py-4 sm:text-base ${
                        playingAudio === option.label && !isPlaying
                          ? 'border-[#60D96C] animate-pulse-playing' 
                          : 'border-gray-300 hover:border-gray-400'
                      } ${allOptionsPlayed ? 'animate-pulse-button' : ''}`}
                      style={{
                        backgroundColor: 'white', 
                        fontFamily: 'Encode Sans, sans-serif', 
                        fontSize: isFullscreen ? '1.5rem' : '1.25rem',
                        borderColor: playingAudio === option.label && !isPlaying ? '#60D96C' : undefined
                      }}
                      onMouseEnter={(e) => { 
                        if (playingAudio !== option.label) {
                          e.currentTarget.style.backgroundColor = '#f8f8f8'; 
                        }
                      }}
                      onMouseLeave={(e) => { 
                        if (playingAudio !== option.label) {
                          e.currentTarget.style.backgroundColor = 'white'; 
                        }
                      }}
                      onClick={() => {
                        if (allOptionsPlayed) {
                          handleAnswerSelection(option.label);
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}

                  <div 
                    className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
                    onClick={() => {
                      if (currentQuestionIndex < guessingData.length - 1) {
                        if (!isMaster && currentQuestionIndex >= maxQuestionRef.current) {
                          return;
                        }
                        missedThisQuestionRef.current = false;
                        setCurrentQuestionIndex(currentQuestionIndex + 1);
                        setVideoPlayCount(0);
                        setScreenshot(null);
                        setScreenshotTaken(false);
                        setPlayingAudio(null);
                        setAutoPlaySequence([]);
                        setCurrentAutoIndex(0);
                        setUserInteracted(false);
                        setShowCorrect(false);
                        setShowAgain(false);
                        setAllOptionsPlayed(false);
                      }
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: '#201E1E'
                    }}
                    onMouseEnter={(e) => {
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderLeft = '70px solid #777777';
                        triangle.style.borderTop = '50px solid transparent';
                        triangle.style.borderBottom = '50px solid transparent';
                        triangle.style.transition = 'all 0.6s ease-in-out';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderLeft = '60px solid #666666';
                        triangle.style.borderTop = '45px solid transparent';
                        triangle.style.borderBottom = '45px solid transparent';
                      }
                    }}
                  >
                    <div 
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '60px solid #666666',
                        borderTop: '45px solid transparent',
                        borderBottom: '45px solid transparent'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
      }
      aside={
        isSidebarOpen ? (
              <div className="flex h-full flex-col rounded-lg bg-[#1a1a1a] p-3">
                <h3 className="mb-3 text-sm font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  QUESTIONS
                </h3>
                <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                  {guessingData.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (!isMaster && index > maxQuestionRef.current) {
                          return;
                        }
                        if (isMaster) {
                          maxQuestionRef.current = Math.max(maxQuestionRef.current, index);
                        }
                        missedThisQuestionRef.current = false;
                        setCurrentQuestionIndex(index);
                        setCurrentIndex(index);
                        setVideoPlayCount(0);
                        setScreenshot(null);
                        setScreenshotTaken(false);
                        setPlayingAudio(null);
                        setAutoPlaySequence([]);
                        setCurrentAutoIndex(0);
                        setUserInteracted(false);
                        setShowCorrect(false);
                        setShowAgain(false);
                        setAllOptionsPlayed(false);
                        setShowIntro(true);
                      }}
                      className={`rounded px-3 py-3 text-sm font-medium transition-colors ${
                        currentQuestionIndex === index
                          ? 'bg-[#60D96C] text-black'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                      style={{ fontFamily: 'Encode Sans, sans-serif' }}
                    >
                      Question {index + 1}
                    </button>
                  ))}
                </div>
              </div>
        ) : null
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
