"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLessonData } from "../../dataService";
import { supabase } from "../../supabaseClient";
import Link from "next/link";
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
import { getVideoSource, getVideoSourceWithTimeRange } from "../../utils/videoSource";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import GuessingResultScreen from "../../components/GuessingResultScreen";
import GuessingOverlays from "../../components/GuessingOverlays";
import { saveProgress, getProgressByMode, saveLog, saveResult } from "../../lib/progress";
import {
  GUESSING_ANSWER_FEEDBACK_DURATION,
  GUESSING_NEXT_QUESTION_DELAY,
  GUESSING_AUTO_PLAY_DELAY,
  GUESSING_VIDEO_REPLAY_DELAY,
  AUDIO_RETRY_DELAY,
  AUDIO_MAX_RETRIES,
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
  watching_data: any;
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

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // 로딩 중인 경우
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-[#60D96C]">로딩 중...</h1>
        </div>
      </main>
    );
  }

  // 인증되지 않은 경우
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요합니다...</h1>
        </div>
      </main>
    );
  }
  
  // Supabase data states
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

  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/guessing?id=001:1';
      return;
    }
  }, [movieId]);

  // 모바일 가로화면 자동 변경 (넷플릭스 스타일)
  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.innerWidth < 768) { // 모바일 화면
        if (window.orientation === 0 || window.orientation === 180) { // 세로화면
          // 가로화면으로 강제 변경
          (screen.orientation as any)?.lock('landscape').catch(() => {
            // orientation lock이 지원되지 않는 경우
            console.log('Orientation lock not supported');
          });
        }
      }
    };

    // 초기 로드 시 체크
    handleOrientationChange();

    // 화면 회전 시 체크
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // 풀스크린 복원 useEffect
  useEffect(() => {
    const shouldMaintainFullscreen = sessionStorage.getItem('maintainFullscreen') === 'true';
    const mimickingComplete = sessionStorage.getItem('mimickingComplete') === 'true';
    
    if (shouldMaintainFullscreen && mimickingComplete) {
      setTimeout(() => {
        document.documentElement.requestFullscreen().then(() => {
          sessionStorage.removeItem('maintainFullscreen');
          sessionStorage.removeItem('mimickingComplete');
        }).catch((err) => {
          console.error('Fullscreen restore failed:', err);
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
        document.documentElement.requestFullscreen();
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

        const lessonNumberStr = movieId.split(':')[1];
        const lessonNumber = parseInt(lessonNumberStr);
        setLessonNumber(lessonNumber);

        if (isNaN(lessonNumber)) {
          console.error('❌ Invalid lesson number:', lessonNumberStr);
          setIsLoading(false);
          return;
        }

        // 1. Lesson 데이터 가져오기
        const lesson = await fetchLessonData(lessonNumber);

        if (!lesson) {
          console.error('❌ No lesson data found');
          setIsLoading(false);
          return;
        }
        
        // 2. Video URL 가져오기
        const { data: videoResult, error: videoError } = await supabase
          .from('videos')
          .select('video_url')
          .eq('id', lesson.video_id)
          .single();

        if (videoError || !videoResult) {
          console.error('❌ Video URL fetching error:', videoError);
          setIsLoading(false);
          return;
        }

        // 3. 상태 업데이트 - 한 번에 모두 업데이트
        const guessingDataArray = lesson.guessing_data || [];
        
        setLessonData(lesson as LessonDataType);
        setVideoUrl(videoResult.video_url);
        setGuessingData(guessingDataArray);
        setTotalQuestions(guessingDataArray.length);
        setIsLoading(false);
        
        // 저장된 진도 불러오기
        try {
          const progress = await getProgressByMode(lessonNumber, 'guessing');
          if (progress) {
            setSavedProgress(progress);
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

  // 직접 오디오 재생 함수 (기존 비디오 요소 재사용)
  const playAudioDirect = useCallback((option: any, currentQuestion: any, onComplete?: () => void) => {
    // 기존 audio-video 요소 재사용
    const audioVideo = document.getElementById('audio-video') as HTMLVideoElement;
    if (!audioVideo) {
      console.error('audio-video 요소를 찾을 수 없습니다');
      if (onComplete) onComplete();
      return;
    }

    // 이전 재생 중지
    if (playingAudio) {
      audioVideo.pause();
      audioVideo.currentTime = 0;
    }

    let startTime, endTime;
    
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
    
    // 기존 비디오 요소의 로딩 상태 확인
    if (audioVideo.readyState < 4) {
      if (audioVideo.readyState < 2) {
        audioVideo.load();
      }

      const retryCount = (audioVideo as any).retryCount || 0;
      if (retryCount < AUDIO_MAX_RETRIES) {
        (audioVideo as any).retryCount = retryCount + 1;
        setTimeout(() => {
          playAudioDirect(option, currentQuestion, onComplete);
        }, AUDIO_RETRY_DELAY);
      } else {
        console.error(`❌ ${option.label} 오디오 로딩 실패 (readyState: ${audioVideo.readyState})`);
        // 오디오 재생 실패 시에도 다음 단계로 진행
        if (onComplete) onComplete();
        setPlayingAudio(null);
      }
      return;
    }
    
    // 기존 비디오 요소를 사용하여 오디오 재생
    audioVideo.currentTime = startTime;
    audioVideo.muted = false;
    
    audioVideo.play().then(() => {
      setPlayingAudio(option.label);

      const checkTime = () => {
        if (audioVideo.currentTime >= endTime) {
          audioVideo.pause();
          setPlayingAudio(null);
          if (onComplete) {
            onComplete();
          }
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      checkTime();
    }).catch((error) => {
      console.error(`${option.label} 오디오 재생 실패:`, error);
      setPlayingAudio(null);
    });
  }, [playingAudio, setPlayingAudio]);

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

  // 답안 선택 처리
  const handleAnswerSelection = useCallback((selectedAnswer: string) => {
    const currentQuestion = guessingData[currentQuestionIndex];
    const correctAnswer = currentQuestion.correctAnswer;
    const isCorrect = selectedAnswer === correctAnswer;
    
    handleAnswerSelect(selectedAnswer, correctAnswer);
    
    if (isCorrect) {
      playCorrectSound();
      
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCurrentIndex(currentIndex + 1);
          setVideoPlayCount(0);
          videoPlayCountRef.current = 0;
          setUserAnswers([]);
          setShowResults(false);
          setShowIntro(false);
          setUserInteracted(true);
          setIsGuessingStarted(true);
          setPlayingAudio(null);
          setAllOptionsPlayed(false);
          setCurrentAutoIndex(0);
          autoPlayIndexRef.current = 0;
          setScreenshot(null);
          setScreenshotTaken(false);

          setTimeout(() => {
            playVideo();
            playVideo();
          }, GUESSING_NEXT_QUESTION_DELAY);
        } else {
          setShowResults(true);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      playAgainSound();
      
      setTimeout(() => {
        setVideoPlayCount(0);
        videoPlayCountRef.current = 0;
        playVideo();
        setPlayingAudio(null);
        setAllOptionsPlayed(false);
        setCurrentAutoIndex(0);
        autoPlayIndexRef.current = 0;
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  }, [currentQuestionIndex, totalQuestions, currentIndex, guessingData, handleAnswerSelect, playCorrectSound, playAgainSound, playVideo, setCurrentQuestionIndex, setCurrentIndex, setVideoPlayCount, setUserAnswers, setShowResults, setShowIntro, setUserInteracted, setIsGuessingStarted, setPlayingAudio, setAllOptionsPlayed, setCurrentAutoIndex, setScreenshot, setScreenshotTaken]);
  
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
    const correctAnswers = guessingData.filter((question, index) =>
      question.correctAnswer === userAnswers[index]
    ).length;

    return (
      <GuessingResultScreen
        movieTitle="SING 2"
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        onStopAllMedia={stopAllMedia}
      />
    );
  }

  // 안내 화면
  if (showIntro) {
    return (
      <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between group">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center cursor-pointer transition-colors duration-200"
              style={{ width: '29px', height: '29px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
                <circle cx="29" cy="29" r="29" fill="#60D96C"/>
                <path d="M16 16L42 16" stroke="black" strokeWidth="5" strokeLinecap="round"/>
                <path d="M16 29L42 29" stroke="black" strokeWidth="5" strokeLinecap="round"/>
                <path d="M16 42L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center cursor-pointer transition-colors duration-200 hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
              style={{ width: '29px', height: '29px' }}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="24" fill="#60D96C"/>
                  <g transform="scale(1.35) translate(6, 6)">
                    <path d="M7 16L2 16C1.44772 16 1 15.5523 1 15C1 14.4477 1.44772 14 2 14L7 14C8.65685 14 10 15.3431 10 17V22C10 22.5523 9.55228 23 9 23C8.44772 23 8 22.5523 8 22V17C8 16.4477 7.55228 16 7 16Z" fill="black"/>
                    <path d="M10 2C10 1.44772 9.55229 1 9 1C8.44772 1 8 1.44772 8 2L8 7C8 7.55228 7.55228 8 7 8L2 8C1.44772 8 1 8.44771 1 9C1 9.55228 1.44772 10 2 10L7 10C8.65685 10 10 8.65685 10 7L10 2Z" fill="black"/>
                    <path d="M14 22C14 22.5523 14.4477 23 15 23C15.5523 23 16 22.5523 16 22V17C16 16.4477 16.4477 16 17 16H22C22.5523 16 23 15.5523 23 15C23 14.4477 22.5523 14 22 14H17C15.3431 14 14 15.3431 14 17V22Z" fill="black"/>
                    <path d="M14 7C14 8.65686 15.3431 10 17 10L22 10C22.5523 10 23 9.55228 23 9C23 8.44772 22.5523 8 22 8L17 8C16.4477 8 16 7.55229 16 7L16 2C16 1.44772 15.5523 1 15 1C14.4477 1 14 1.44772 14 2L14 7Z" fill="black"/>
                  </g>
                </svg>
              ) : (
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
            <Link href="/" onClick={stopAllMedia} className="flex items-center justify-center cursor-pointer transition-colors duration-200" style={{ width: '29px', height: '29px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
                <circle cx="29" cy="29" r="29" fill="#60D96C"/>
                <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
                <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              </svg>
            </Link>
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
    <main className="min-h-screen px-4 py-4 flex flex-col">
      {/* 모바일 가로화면 안내 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-black text-center py-2 text-sm font-bold">
        📱 모바일에서는 가로화면으로 자동 변경됩니다
      </div>
      <div className="mb-4 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill={isSidebarOpen ? "#60D96C" : "#9CA3AF"}/>
              <path d="M16 16L42 16" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M16 29L42 29" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M16 42L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
            {isFullscreen ? (
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
          <Link href="/" onClick={stopAllMedia} className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${
        isFullscreen 
          ? 'grid-cols-1' 
          : isSidebarOpen 
            ? 'lg:grid-cols-[1fr_200px]' 
            : 'lg:grid-cols-1'
      }`}>
        <div className={`mx-auto relative transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full' 
            : isSidebarOpen 
              ? 'w-[85%] max-w-4xl' 
              : 'w-[90%] max-w-5xl'
        }`} style={{ 
          transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', 
          transformOrigin: 'top',
          minHeight: isFullscreen ? '100vh' : 'auto'
        }}>
          <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-[10px] ${isPlaying ? 'border-[#60D96C]' : 'border-[rgb(32,30,30)]'}`}>
            <div className="w-full h-full">
              {!isPlaying && screenshot && (
                <div className="w-full h-full flex items-center justify-center">
                  <img 
                    src={screenshot} 
                    alt="Video Screenshot" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {!isGuessingStarted && currentQuestion && (
                <div className="w-full h-full bg-black">
                </div>
              )}
              
              {isPlaying && currentQuestion && (
                <VideoPlayer
                  key={`guessing-${currentQuestionIndex}`}
                  src={currentQuestion ? getVideoSourceWithTimeRange(
                    srtTimeToSeconds(currentQuestion.video.start),
                    srtTimeToSeconds(currentQuestion.video.end)
                  ) : getVideoSource()}
                  startTime={srtTimeToSeconds(currentQuestion.video.start)}
                  endTime={srtTimeToSeconds(currentQuestion.video.end)}
                  muted={true}
                  showText={false}
                  text=""
                  playNonce={playNonce}
                  hidePauseOverlay={true}
                  activeControlIndex={3}
                  onEndedSegment={() => {
                    videoPlayCountRef.current += 1;
                    const currentCount = videoPlayCountRef.current;
                    setVideoPlayCount(currentCount);

                    // 첫 번째 재생 완료 직전에 스크린샷 캡처
                    if (currentCount === 1 && !screenshotTaken) {
                      const videoElement = document.querySelector('video') as HTMLVideoElement;
                      if (videoElement) {
                        const endTime = srtTimeToSeconds(currentQuestion.video.end);
                        videoElement.currentTime = endTime - 0.5; // 끝나기 0.5초 전으로 이동
                        
                        setTimeout(() => {
                          try {
                            const screenshot = captureVideoScreenshot();
                            if (screenshot) {
                              setScreenshot(screenshot);
                              setScreenshotTaken(true);
                            }
                          } catch (error) {
                            // 스크린샷 캡처 실패
                          }
                        }, 100);
                      }
                    }

                    if (userAnswers.length > 0) {
                      pauseVideo();
                      setTimeout(() => {
                        playABCSequence(currentQuestion, () => setAllOptionsPlayed(true));
                      }, GUESSING_AUTO_PLAY_DELAY);
                    } else {
                      if (currentCount >= GUESSING_OPTION_LABELS.length) {
                        pauseVideo();
                        setTimeout(() => {
                          playABCSequence(currentQuestion, () => setAllOptionsPlayed(true));
                        }, GUESSING_AUTO_PLAY_DELAY);
                      } else {
                        pauseVideo();
                        setTimeout(() => {
                          playVideo();
                        }, GUESSING_VIDEO_REPLAY_DELAY);
                      }
                    }
                  }}
                  onTimeUpdate={(currentTime) => {
                    // 스크린샷 캡처를 onTimeUpdate에서 제거
                  }}
                  onPlay={() => {
                    playAttentionSound();
                  }}
                />
              )}

              <video
                id="audio-video"
                src="https://mimic-ai.b-cdn.net/sing2_audio.mp3"
                style={{ display: 'none' }}
                muted={false}
                preload="auto"
                crossOrigin="anonymous"
              />

              {!isGuessingStarted && currentQuestion && (
                <ClickToStartOverlay
                  onClick={() => {
                    startGuessing();
                    playVideo();
                  }}
                />
              )}
            </div>

            <GuessingOverlays
              screenshot={screenshot}
              videoPlayCount={videoPlayCount}
              showCorrect={showCorrect}
              showAgain={showAgain}
            />
          </div>

          <div className="rounded-lg w-full mx-auto transition-all duration-300" style={{ 
            marginTop: isFullscreen ? '7px' : '20px',
            marginBottom: isFullscreen ? '7px' : '20px'
          }}>
            <div 
              className={`flex items-center justify-center rounded-lg mx-auto transition-all duration-300 ${
                isFullscreen 
                  ? 'w-fit' 
                  : 'w-full max-w-4xl'
              }`}
              style={{ 
                backgroundColor: '#201E1E', 
                gap: isFullscreen ? '20px' : '15px', 
                paddingTop: isFullscreen ? '4px' : '8px', 
                paddingBottom: isFullscreen ? '4px' : '8px', 
                paddingLeft: isFullscreen ? '10px' : '20px', 
                paddingRight: isFullscreen ? '10px' : '20px'
              }}
            >
              {currentQuestion && (
                <>
                  <div 
                    className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
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
                      className={`rounded-2xl border-8 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                        isFullscreen 
                          ? 'px-10 py-5 text-lg' 
                          : 'px-6 py-4 text-base sm:px-8 sm:py-5 sm:text-lg'
                      } ${
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
        </div>

        {isSidebarOpen && (
          <div className="flex justify-center">
            <aside className={`flex flex-col gap-2 transition-all duration-300 ${
              isFullscreen ? 'h-full' : 'h-auto'
            }`}>
              <div className={`bg-[#1a1a1a] rounded-lg p-4 transition-all duration-300 ${
                isFullscreen 
                  ? 'h-full' 
                  : 'max-h-[70vh]'
              }`} style={{ 
                height: isFullscreen ? 'calc(100vh - 150px)' : 'auto',
                minHeight: isFullscreen ? 'calc(100vh - 150px)' : '400px'
              }}>
                <h3 className="text-sm font-semibold text-[#60D96C] mb-3" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  QUESTIONS
                </h3>
                <div className={`flex flex-col gap-2 overflow-y-auto custom-scrollbar transition-all duration-300 ${
                  isFullscreen 
                    ? 'h-full' 
                    : 'max-h-[60vh]'
                }`} style={{ 
                  height: isFullscreen ? 'calc(100% - 40px)' : 'auto'
                }}>
                  {guessingData.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
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
                      className={`px-3 py-3 rounded text-sm font-medium transition-colors ${
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
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default function GuessingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GuessingPageContent />
    </Suspense>
  );
}
