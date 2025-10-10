"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MOVIES } from "../../constants/movies";
import { loadMovie } from "../../constants/movies";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { useGuessingGame } from "../../hooks/useGuessingGame";
import { useSoundEffects } from "../../hooks/useSoundEffects";
import { srtTimeToSeconds } from "../../utils/srt";
import { captureVideoScreenshot, shouldCaptureScreenshot } from "../../utils/screenshot";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import GuessingResultScreen from "../../components/GuessingResultScreen";
import GuessingOverlays from "../../components/GuessingOverlays";
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


export default function GuessingPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      window.location.href = '/sing2/guessing?id=001:1';
      return;
    }
  }, [movieId]);
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용
  
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
    loadGuessingData,
    startGuessing,
    playAudio,
    startAutoPlaySequence,
    handleAnswerSelect,
    resetGuessingState
  } = useGuessingGame();

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [movieData, setMovieData] = useState<any>(null);
  const [guessingData, setGuessingData] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const videoPlayCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayIndexRef = useRef(0);
  const autoPlayTriggeredRef = useRef(false); // 자동 재생 트리거 방지
  const onEndedFiredRef = useRef(false); // onEndedSegment 중복 호출 방지

  const currentScene = movie.scenes[currentIndex];
  const currentQuestion = guessingData[currentQuestionIndex];
  
  // currentScene이 존재하지 않으면 안전하게 처리
  if (!currentScene) {
    return null;
  }

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
        });
      }, FULLSCREEN_RESTORE_RETRY_2);
    }
  }, []);

  // 직접 오디오 재생 함수
  const playAudioDirect = (option: any, currentQuestion: any, movie: any, onComplete?: () => void) => {
    // 기존 재생 중인 오디오가 있으면 정지
    if (playingAudio) {
      const existingAudio = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement;
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.currentTime = 0;
      }
    }

    // 새로운 오디오 재생 (기존 요소 재사용)
    const audioId = `audio-${option.label}`;
    let audio = document.getElementById(audioId) as HTMLAudioElement;

    if (!audio) {
      // 오디오 요소가 없으면 생성
      audio = document.createElement('audio');
      audio.id = audioId;
      audio.src = movie?.videoUrl || ''; // 비디오 파일을 오디오 소스로 사용
      audio.preload = 'auto'; // 전체 오디오 데이터 미리 로드
      document.body.appendChild(audio);
    }

    // 해당 옵션의 시간대로 재생
    let startTime, endTime;
    
    if (option.start && option.end) {
      // 옵션에 직접 시간 정보가 있는 경우 사용
      startTime = srtTimeToSeconds(option.start);
      endTime = srtTimeToSeconds(option.end);
    } else if (currentQuestion?.video) {
      // 옵션에 시간 정보가 없으면 기본 시간 사용
      startTime = srtTimeToSeconds(currentQuestion.video.start);
      endTime = srtTimeToSeconds(currentQuestion.video.end);
    } else {
      console.error(`${option.label} 재생 시간 정보 없음`);
      return;
    }
    
    // 오디오 로딩 대기
    if (audio.readyState < 4) {
      // 오디오 로딩 강제 트리거
      if (audio.readyState < 2) {
        audio.load(); // 오디오 다시 로드
      }

      const retryCount = (audio as any).retryCount || 0;
      if (retryCount < AUDIO_MAX_RETRIES) {
        (audio as any).retryCount = retryCount + 1;
        setTimeout(() => {
          playAudioDirect(option, currentQuestion, movie, onComplete);
        }, AUDIO_RETRY_DELAY);
      } else {
        console.error(`${option.label} 오디오 로딩 실패 (readyState: ${audio.readyState})`);
        setPlayingAudio(null);
      }
      return;
    }
    
    audio.currentTime = startTime;
    audio.muted = false; // 소리 켜기
    
    // 오디오 재생
    audio.play().then(() => {
      setPlayingAudio(option.label);

      // endTime에 도달하면 자동 정지
      const checkTime = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          setPlayingAudio(null);
          // 콜백 호출
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
  };

  // 게싱 데이터 로드
  useEffect(() => {
    const loadGuessingData = async () => {
      try {
        const data = await loadMovie(movieId);
        setMovieData(data);
        const guessingQuestions = data.lesson[0].guessing || [];
        setGuessingData(guessingQuestions);
        setTotalQuestions(guessingQuestions.length);
      } catch (error) {
        console.error("게싱 데이터 로드 실패:", error);
      }
    };
    loadGuessingData();
  }, []);


  // 풀스크린 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      // 풀스크린 상태는 useFullscreen 훅에서 관리
    };

    const preventFullscreenExit = (e: Event) => {
      // 풀스크린 상태에서 ESC 키나 다른 이벤트로 인한 풀스크린 해제 방지
      if (isFullscreen && !document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        // 풀스크린 재진입
        document.documentElement.requestFullscreen();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키로 풀스크린 해제 방지
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

  // 영상 재생 중 중앙 시점에서 스크린샷을 찍는 함수
  const captureMidpointScreenshot = (startTime: number, endTime: number) => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return;

    const currentTime = videoElement.currentTime;

    // 중앙 시점 근처에서 스크린샷 캡처
    if (shouldCaptureScreenshot(currentTime, startTime, endTime, screenshotTaken)) {
      const screenshot = captureVideoScreenshot();
      if (screenshot) {
        setScreenshot(screenshot);
        setScreenshotTaken(true);
      }
    }
  };



  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    setMuted(m);
    setActiveControlIndex(slotIndex);
    playVideo();
  }, []);

  // 훅에서 가져온 함수들을 사용

  // Play A/B/C options sequentially using a direct audio playback helper
  const playABCSequence = (question: any, movieData: any, onAllPlayed?: () => void) => {
    const playNextOption = (idx: number) => {
      if (idx < GUESSING_OPTION_LABELS.length && question) {
        const currentLabel = GUESSING_OPTION_LABELS[idx];
        const currentOption = question.options.find((opt: any) => opt.label === currentLabel);
        if (currentOption) {
          playAudioDirect(currentOption, question, movieData, () => {
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
  };

  // 답안 선택 처리
  const handleAnswerSelection = (selectedAnswer: string) => {
    const correctAnswer = currentQuestion.correctAnswer;
    const isCorrect = selectedAnswer === correctAnswer;
    
    // 훅의 handleAnswerSelect에 correctAnswer 전달
    handleAnswerSelect(selectedAnswer, correctAnswer);
    
    if (isCorrect) {
      playCorrectSound();
      
      setTimeout(() => {
        // 다음 문제로 이동
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCurrentIndex(currentIndex + 1);
          setVideoPlayCount(0);
          videoPlayCountRef.current = 0;
          setUserAnswers([]);
          setShowResults(false);
          setShowIntro(false);
          setUserInteracted(true); // 다음 문제는 바로 시작
          setIsGuessingStarted(true); // 다음 문제는 바로 시작
          setPlayingAudio(null);
          setAllOptionsPlayed(false);
          setCurrentAutoIndex(0);
          autoPlayIndexRef.current = 0;
          setScreenshot(null); // 스크린샷 초기화
          setScreenshotTaken(false); // 스크린샷 캡처 상태 초기화

          // 다음 문제 바로 시작
          setTimeout(() => {
            playVideo();
            playVideo();
          }, GUESSING_NEXT_QUESTION_DELAY);
        } else {
          // 모든 문제 완료
          setShowResults(true);
        }
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    } else {
      playAgainSound();
      
      setTimeout(() => {
        // 오답 시 다시 무음영상 1번 재생 후 A, B, C 재생
        setVideoPlayCount(0);
        videoPlayCountRef.current = 0;
        playVideo();
        // playVideo()가 이미 호출됨
        setPlayingAudio(null);
        setAllOptionsPlayed(false);
        setCurrentAutoIndex(0);
        autoPlayIndexRef.current = 0;
      }, GUESSING_ANSWER_FEEDBACK_DURATION);
    }
  };

  // 결과 화면
  if (showResults) {
    const correctAnswers = guessingData.filter((question, index) =>
      question.correctAnswer === userAnswers[index]
    ).length;

    return (
      <GuessingResultScreen
        movieTitle={movie.title}
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
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
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
              onClick={() => setIsTextVisible(!isTextVisible)}
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
                // 풀스크린 종료 아이콘
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
      <div className="mb-4 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
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
          <Link href="/" onClick={stopAllMedia} className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${isSidebarOpen ? 'lg:grid-cols-[1fr_200px]' : 'lg:grid-cols-1'}`}>
        <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top' }}>
          {/* 게싱 게임 영역 */}
          <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-[10px] ${isPlaying ? 'border-[#60D96C]' : 'border-[rgb(32,30,30)]'}`}>
            {/* 비디오 영역 */}
            <div className="w-full h-full">
              {/* 재생 중이 아닐 때 스크린샷 표시 */}
              {!isPlaying && screenshot && (
                <div className="w-full h-full flex items-center justify-center">
                  <img 
                    src={screenshot} 
                    alt="Video Screenshot" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* 게싱 시작 전 검은 화면 */}
              {!isGuessingStarted && currentQuestion && (
                <div className="w-full h-full bg-black">
                </div>
              )}
              
              {isPlaying && currentQuestion && (
                <VideoPlayer
                  key={`guessing-${currentQuestionIndex}`}
                  src={movie.videoUrl}
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

                    // 오답 시에는 1번만 재생
                    if (userAnswers.length > 0) {
                      pauseVideo();

                      // A/B/C 자동 재생 시작 전 딜레이
                      setTimeout(() => {
                        // A, B, C 순차 재생 시작
                        playABCSequence(currentQuestion, movie, () => setAllOptionsPlayed(true));
                      }, GUESSING_AUTO_PLAY_DELAY);
                    } else {
                      // 첫 번째 시도에서는 3번 재생
                      if (currentCount >= GUESSING_OPTION_LABELS.length) {
                        pauseVideo();

                        // A/B/C 자동 재생 시작 전 딜레이
                        setTimeout(() => {
                          playABCSequence(currentQuestion, movie, () => setAllOptionsPlayed(true));
                        }, GUESSING_AUTO_PLAY_DELAY);
                      } else {
                        // 아직 3번이 안 되었으면 다시 재생
                        pauseVideo();

                        setTimeout(() => {
                          playVideo();
                          // 2번째, 3번째 재생에서는 부우웅 소리 제거 (중복 방지)
                        }, GUESSING_VIDEO_REPLAY_DELAY);
                      }
                    }
                  }}
                  onTimeUpdate={(currentTime) => {
                    // 중앙 시점에서 스크린샷 캡처
                    captureMidpointScreenshot(
                      srtTimeToSeconds(currentQuestion.video.start),
                      srtTimeToSeconds(currentQuestion.video.end)
                    );
                  }}
                  onPlay={() => {
                    // 각 반복마다 "부우웅" 소리 재생
                    playAttentionSound();
                  }}
                />
              )}

              {/* A, B, C 소리 재생을 위한 숨겨진 비디오 */}
              <video
                id="audio-video"
                src={movie.videoUrl}
                style={{ display: 'none' }}
                muted={false}
                preload="metadata"
              />

              {/* 시작을 위한 클릭 오버레이 */}
              {!isGuessingStarted && currentQuestion && (
                <ClickToStartOverlay
                  onClick={() => {
                    startGuessing();
                    playVideo(); // 첫 번째 무음 비디오 재생 시작 (onPlay에서 부우웅 소리 재생)
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

          {/* 게싱용 하단바 - A, B, C 버튼 */}
          <div className="rounded-lg w-full mx-auto mt-5" style={{ marginTop: isFullscreen ? '7px' : '5px' }}>
            <div 
              className={`flex items-center justify-center rounded-lg mx-auto transition-all duration-300 ${isFullscreen ? 'w-fit' : 'w-fit'}`}
              style={{ 
                backgroundColor: '#201E1E', 
                gap: '20px', 
                paddingTop: '4px', 
                paddingBottom: '4px', 
                paddingLeft: '10px', 
                paddingRight: '10px' 
              }}
            >
              {currentQuestion && (
                <>
                  {/* 이전 버튼 - A 좌측 */}
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
                        // 첫 번째 문제에서 이전 버튼 클릭 시 미믹킹 모드로 돌아가기
                        // 게싱 모드의 모든 미디어 중지
                        const audioElements = document.querySelectorAll('audio');
                        audioElements.forEach(audio => {
                          audio.pause();
                          audio.currentTime = 0;
                        });
                        
                        // 미믹킹 모드로 돌아가기
                        window.location.href = `/sing2/mimicking?id=${movieId}`;
                      }
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: '#201E1E'
                    }}
                    onMouseEnter={(e) => {
                      // 배경색 변화 없음 - 삼각형 크기만 확대
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderRight = '70px solid #777777'; // 더 크게 확대
                        triangle.style.borderTop = '50px solid transparent'; // 더 크게 확대
                        triangle.style.borderBottom = '50px solid transparent'; // 더 크게 확대
                        triangle.style.transition = 'all 0.6s ease-in-out'; // 천천히 전환
                      }
                    }}
                    onMouseLeave={(e) => {
                      // 배경색 변화 없음 - 삼각형 크기만 원래대로
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

                  {/* A, B, C 버튼들 - JSON의 label 사용, A, B, C 순서로 정렬 */}
                  {currentQuestion.options
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((option, index) => (
                    <button
                      key={option.label}
                      className={`rounded-2xl border-8 px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                        playingAudio === option.label && !isPlaying
                          ? 'border-[#60D96C] animate-pulse-playing' 
                          : 'border-gray-300 hover:border-gray-400'
                      } ${allOptionsPlayed ? 'animate-pulse-button' : ''}`}
                      style={{
                        backgroundColor: 'white', 
                        fontFamily: 'Encode Sans, sans-serif', 
                        fontSize: '1.5rem',
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

                  {/* 다음 버튼 - C 우측 */}
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
                      // 배경색 변화 없음 - 삼각형 크기만 확대
                      const triangle = e.currentTarget.querySelector('div');
                      if (triangle) {
                        triangle.style.borderLeft = '70px solid #777777'; // 더 크게 확대
                        triangle.style.borderTop = '50px solid transparent'; // 더 크게 확대
                        triangle.style.borderBottom = '50px solid transparent'; // 더 크게 확대
                        triangle.style.transition = 'all 0.6s ease-in-out'; // 천천히 전환
                      }
                    }}
                    onMouseLeave={(e) => {
                      // 배경색 변화 없음 - 삼각형 크기만 원래대로
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
            <aside className="flex flex-col gap-2 h-full">
              <div className="bg-[#1a1a1a] rounded-lg p-4" style={{ height: 'calc(100vh - 150px)' }}>
                <h3 className="text-sm font-semibold text-[#60D96C] mb-3" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  QUESTIONS
                </h3>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 40px)' }}>
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