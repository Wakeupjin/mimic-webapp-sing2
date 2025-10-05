"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MOVIES } from "../../constants/movies";
import { loadMovie } from "../../constants/movies";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import Sidebar from "../../components/Sidebar";
import PlaybackControls from "../../components/PlaybackControls";

// SRT 시간을 초로 변환하는 함수
function srtTimeToSeconds(srtTime: string): number {
  const [time, ms] = srtTime.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}

function TrainingPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'mimicking'; // 기본값: mimicking
  
  
  const movie = useMemo(() => MOVIES[0], []); // Sing 2 영화 사용
  const [movieData, setMovieData] = useState<any>(null);
  const [guessingData, setGuessingData] = useState<any[]>([]);

  // 풀스크린 복원 useEffect
  useEffect(() => {
    const shouldRestoreFullscreen = localStorage.getItem('shouldRestoreFullscreen');
    const restoreFullscreen = localStorage.getItem('restoreFullscreen');
    
    if (shouldRestoreFullscreen === 'true' || restoreFullscreen === 'true') {
      localStorage.removeItem('shouldRestoreFullscreen');
      localStorage.removeItem('restoreFullscreen');
      
      // 여러 시점에서 풀스크린 복원 시도
      const restoreFullscreenFn = () => {
        console.log('풀스크린 복원 시도');
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().then(() => {
            console.log('풀스크린 복원 성공');
          }).catch((err) => {
            console.error('풀스크린 복원 실패:', err);
          });
        }
      };
      
      // 즉시 시도
      restoreFullscreenFn();
      
      // 100ms 후 재시도
      setTimeout(restoreFullscreenFn, 100);
      
      // 500ms 후 재시도
      setTimeout(restoreFullscreenFn, 500);
      
      // 1초 후 재시도
      setTimeout(restoreFullscreenFn, 1000);
    }
  }, []);

  // 게싱 데이터 로드 및 모드 전환
  useEffect(() => {
    if (mode === 'watching') {
      // 워칭 모드 상태 초기화
      setIsGuessingMode(false);
      setCurrentIndex(0);
      setShowNextCta(false);
      setActiveControlIndex(null);
      setMuted(false);
      setIsPlaying(false);
      setPlayNonce(0);
      setIsVideoStarted(false);
      setVideoProgress(0);
      setIsVideoPaused(false);
    } else if (mode === 'guessing') {
      
      // 게싱 모드 상태 완전 초기화 (URL 검색으로 진입 시)
      setCurrentQuestionIndex(0);
      setVideoPlayCount(0);
      setPlayingAudio(null);
      setAutoPlaySequence(['A', 'B', 'C']);
      setAllOptionsPlayed(false);
      setShowCorrect(false);
      setShowAgain(false);
      setCurrentAutoIndex(0);
      setAutoSeqIndex(null);
      setScreenshot(null);
      setScreenshotTaken(false);
      
      // 미디어 정리
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.remove();
      });
      
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.pause();
        video.currentTime = 0;
      });
      
      setIsGuessingMode(true);
      setShowIntro(true); // 게싱 모드 인트로 표시
      setUserInteracted(false); // 사용자 상호작용 초기화
      
      const loadGuessingData = async () => {
        try {
          const data = await loadMovie("001:1");
          setMovieData(data);
          setGuessingData(data.lesson[0].guessing || []);
        } catch (error) {
          console.error("게싱 데이터 로드 실패:", error);
        }
      };
      loadGuessingData();
    } else {
      setIsGuessingMode(false);
      setShowIntro(false);
    }
  }, [mode]);

  if (!movie) {
    return (
      <main className="min-h-screen px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">영화를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-gray-600">홈으로 돌아가 다시 선택해주세요.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          홈으로 이동
        </Link>
      </main>
    );
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null); // 0~7 진행
  const [showNextCta, setShowNextCta] = useState(true); // 미믹킹 모드에서는 자동 재생
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGuessingMode, setIsGuessingMode] = useState(false); // 게싱 모드 상태
  const [isVideoStarted, setIsVideoStarted] = useState(false); // 워칭 모드 비디오 시작 상태
  const [videoProgress, setVideoProgress] = useState(0); // 워칭 모드 비디오 진행률 (0-100)
  const [isDragging, setIsDragging] = useState(false); // 진행률 바 드래그 상태
  const [isVideoPaused, setIsVideoPaused] = useState(false); // 워칭 모드 비디오 일시정지 상태
  const [showProgressTooltip, setShowProgressTooltip] = useState(false); // 진행률 바 툴팁 표시 상태
  const [tooltipPosition, setTooltipPosition] = useState(0); // 툴팁 위치 (0-100)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [videoPlayCount, setVideoPlayCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [autoPlaySequence, setAutoPlaySequence] = useState<string[]>(['A', 'B', 'C']);
  const [currentAutoIndex, setCurrentAutoIndex] = useState(0);
  const autoPlayIndexRef = useRef(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [allOptionsPlayed, setAllOptionsPlayed] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false); // 미믹킹 시퀀스 실행 중 상태
  const autoPlayTriggeredRef = useRef(false); // 자동 재생 트리거 방지
  const onEndedFiredRef = useRef(false); // onEndedSegment 중복 호출 방지
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]); // 미믹킹 setTimeout 관리

  const currentScene = movie.scenes[currentIndex];
  
  // currentScene이 존재하지 않으면 안전하게 처리
  if (!currentScene) {
    return null;
  }
  
  
  
  // endTime 디버깅 (중복 방지)
  if (currentIndex !== 0 || !isGuessingMode) {
  }
  const currentQuestion = guessingData[currentQuestionIndex];

  // 주의를 끄는 소리 효과 함수
  const playAttentionSound = () => {
    try {
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createAndPlaySound(audioContext);
        });
      } else {
        createAndPlaySound(audioContext);
      }
      
      function createAndPlaySound(ctx: AudioContext) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.6);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.6);
        
      }
    } catch (error) {
    }
  };

  // 정답 축하 소리 효과 함수
  const playCorrectSound = () => {
    try {
      console.log('정답 축하 소리 재생 시도');
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createCorrectSound(audioContext);
        });
      } else {
        createCorrectSound(audioContext);
      }
      
      function createCorrectSound(ctx: AudioContext) {
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const duration = 0.3;
        
        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * duration);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.4, ctx.currentTime + index * duration);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * duration + duration);
          
          oscillator.start(ctx.currentTime + index * duration);
          oscillator.stop(ctx.currentTime + index * duration + duration);
        });
        
        console.log('정답 축하 소리 재생 성공!');
      }
    } catch (error) {
      console.log('정답 축하 소리 재생 실패:', error);
    }
  };

  // 오답 안타까운 소리 효과 함수
  const playAgainSound = () => {
    try {
      console.log('오답 안타까운 소리 재생 시도');
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createAgainSound(audioContext);
        });
      } else {
        createAgainSound(audioContext);
      }
      
      function createAgainSound(ctx: AudioContext) {
        const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5
        const duration = 0.4;
        
        frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * duration);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime + index * duration);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * duration + duration);
          
          oscillator.start(ctx.currentTime + index * duration);
          oscillator.stop(ctx.currentTime + index * duration + duration);
        });
        
        console.log('오답 안타까운 소리 재생 성공!');
      }
    } catch (error) {
      console.log('오답 안타까운 소리 재생 실패:', error);
    }
  };

  // 비디오 스크린샷을 찍는 함수
  const captureVideoScreenshot = () => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  };

  // 영상 재생 중 여러 시점에서 스크린샷을 찍고 가장 좋은 것을 선택하는 함수
  const captureMidpointScreenshot = (startTime: number, endTime: number) => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return;

    const currentTime = videoElement.currentTime;
    const duration = endTime - startTime;
    
    // 여러 시점에서 캡쳐 (25%, 50%, 75% 지점)
    const capturePoints = [
      startTime + duration * 0.25,  // 25% 지점
      startTime + duration * 0.5,   // 50% 지점 (중앙)
      startTime + duration * 0.75   // 75% 지점
    ];
    
    // 각 시점에서 캡쳐 시도
    capturePoints.forEach((point, index) => {
      if (currentTime >= point && !screenshotTaken) {
        const screenshotData = captureVideoScreenshot();
        if (screenshotData) {
          // 이미지 품질 체크 (간단한 픽셀 분석)
          if (isGoodScreenshot(screenshotData)) {
            setScreenshot(screenshotData);
            setScreenshotTaken(true);
            console.log(`스크린샷 캡처 성공: ${point.toFixed(2)}초 (${(index + 1) * 25}% 지점)`);
          } else {
            console.log(`스크린샷 품질 낮음: ${point.toFixed(2)}초, 다음 시점 시도`);
          }
        }
      }
    });
  };

  // 스크린샷 품질을 체크하는 함수 (검정색 화면 방지)
  const isGoodScreenshot = (imageData: string): boolean => {
    try {
      // 간단한 픽셀 분석으로 검정색 화면 방지
      // Base64 이미지 데이터에서 간단한 패턴 체크
      const blackPatterns = ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='];
      
      // 검정색 패턴이 포함되어 있으면 나쁜 스크린샷으로 판단
      for (const pattern of blackPatterns) {
        if (imageData.includes(pattern)) {
          console.log('검정색 패턴 감지: 나쁜 스크린샷');
          return false;
        }
      }
      
      // 이미지 크기 체크 (너무 작으면 나쁜 스크린샷)
      if (imageData.length < 1000) {
        console.log('이미지 크기 너무 작음: 나쁜 스크린샷');
        return false;
      }
      
      console.log('스크린샷 품질 양호');
      return true;
    } catch (error) {
      console.log('스크린샷 품질 체크 실패:', error);
      return false;
    }
  };

  // 전체화면 상태 감지 및 유지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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
    document.addEventListener('fullscreenchange', preventFullscreenExit);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenchange', preventFullscreenExit);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // 게싱 데이터 로드
  useEffect(() => {
    const loadGuessingData = async () => {
      try {
        const response = await fetch('/movies/sing2.json');
        const rawData = await response.json();
        if (rawData.lesson && rawData.lesson[0] && rawData.lesson[0].guessing) {
          setGuessingData(rawData.lesson[0].guessing);
        }
      } catch (error) {
        console.error('Failed to load guessing data:', error);
      }
    };
    loadGuessingData();
  }, []);

  // 페이지 언마운트 시 모든 미디어 정지
  useEffect(() => {
    return () => {
      console.log('🏠 페이지 언마운트: 모든 미디어 정지');
      
      // 모든 오디오 정지
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // 모든 비디오 정지
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.pause();
        video.currentTime = 0;
      });
      
      // 모든 setTimeout 정리
      mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      mimickingTimeoutsRef.current = [];
      
      // 시퀀스 상태 초기화
      setIsSequenceRunning(false);
      setIsPlaying(false);
      setPlayNonce(0);
      setActiveControlIndex(null);
      setShowNextCta(false);
      setAutoSeqIndex(null);
      setAllOptionsPlayed(false);
    };
  }, []);

  // 게싱 모드에서 자동 게임 시작 (한 번만 실행)
  useEffect(() => {
    console.log(`🔍 게싱 모드 useEffect 체크: isGuessingMode=${isGuessingMode}, guessingData.length=${guessingData.length}, showIntro=${showIntro}, userInteracted=${userInteracted}`);
    if (isGuessingMode && guessingData.length > 0 && showIntro && !userInteracted) {
      console.log('게싱 모드 시작, 5초 후 자동 시작');
      const timer = setTimeout(() => {
        setShowIntro(false);
        setUserInteracted(true); // 사용자 상호작용으로 간주
        console.log('게싱 게임 자동 시작');
        
        // 게싱 모드에서 currentIndex를 0으로 리셋
        setCurrentIndex(0);
        
        // 게싱 모드에서 currentQuestionIndex를 0으로 리셋
        setCurrentQuestionIndex(0);
        
        // 사용자 상호작용 트리거 (오디오 재생을 위해)
        const triggerUserInteraction = () => {
          // 더미 오디오 재생으로 사용자 상호작용 트리거
          const dummyAudio = new Audio();
          dummyAudio.volume = 0;
          dummyAudio.play().then(() => {
            console.log('사용자 상호작용 트리거 완료');
            dummyAudio.pause();
          }).catch(() => {
            console.log('더미 오디오 재생 실패 (정상)');
          });
        };
        triggerUserInteraction();
        
        // 게싱 모드 무음 영상 3번 재생 시작
        setVideoPlayCount(0); // videoPlayCount 초기화
        autoPlayTriggeredRef.current = false; // 자동 재생 트리거 초기화
        onEndedFiredRef.current = false; // onEndedSegment 중복 호출 방지 초기화
          setIsPlaying(true);
          setPlayNonce(prev => prev + 1);
        console.log('게싱 무음 영상 1번째 재생 시작');
        
        // guessingMaking과 동일한 구조로 변경
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isGuessingMode, guessingData.length, showIntro, userInteracted]);

  // 홈 버튼 클릭 시 모든 미디어 중지 함수
  const stopAllMedia = () => {
    console.log('🏠 홈 버튼 클릭: 모든 미디어 정지');
    
    // 모든 오디오 요소 중지
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // 모든 비디오 요소 중지
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    // 모든 setTimeout 정리
    mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeoutsRef.current = [];
    
    // ReactPlayer 중지
    setIsPlaying(false);
    setPlayNonce(0);
    
    // 게싱 모드 오디오 상태 초기화
    setPlayingAudio(null);
    setAutoPlaySequence([]);
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
    
    // 미믹킹 모드 상태 초기화
    setActiveControlIndex(0);
    setShowNextCta(false);
    
    console.log('모든 미디어 재생 중지됨');
  };

  // 30번째 미믹킹 8번 플레이 순서 실행 함수
  const execute30thMimickingSequence = () => {
    setCurrentIndex(29); // 30번째 문장 (인덱스 29)
    setShowNextCta(false); // 30번째 문장에서는 Next 버튼 없음
    setActiveControlIndex(0); // 첫 번째 재생 버튼 활성화

    // 8번 플레이 순서 자동 실행
    setTimeout(() => {
      // 첫 번째 재생
      handlePlay(false, 0);
      setTimeout(() => {
        // 두 번째 재생
        handlePlay(false, 1);
        setTimeout(() => {
          // 세 번째 재생
          handlePlay(false, 2);
          setTimeout(() => {
            // 첫 번째 무음재생
            handlePlay(true, 3);
            setTimeout(() => {
              // 네 번째 재생
              handlePlay(false, 4);
              setTimeout(() => {
                // 두 번째 무음재생
                handlePlay(true, 5);
                setTimeout(() => {
                  // 다섯 번째 재생
                  handlePlay(false, 6);
                  setTimeout(() => {
                    // 세 번째 무음재생
                    handlePlay(true, 7);
                    // 마지막 무음재생 후 Next와 Again 버튼 표시
                    setTimeout(() => {
                      setShowNextCta(true);
                      setIsPlaying(false); // 영상 재생 중지
                      setPlayNonce(0); // 재생 상태 리셋
                      
                      // 모든 미디어 정리
                      const audioElements = document.querySelectorAll('audio');
                      audioElements.forEach(audio => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.remove();
                      });
                      
                      // 비디오 재생 중지
                      const videoElements = document.querySelectorAll('video');
                      videoElements.forEach(video => {
                        video.pause();
                        video.currentTime = 0;
                      });
                      
                      // ReactPlayer 인스턴스 정리
                      const reactPlayerElements = document.querySelectorAll('.react-player');
                      reactPlayerElements.forEach(player => {
                        if (player && typeof (player as any).getInternalPlayer === 'function') {
                          const internalPlayer = (player as any).getInternalPlayer();
                          if (internalPlayer && typeof internalPlayer.pause === 'function') {
                            internalPlayer.pause();
                          }
                        }
                      });
                      
                      console.log('🎬 Scene 30 완료 - 모든 미디어 정리됨');
                    }, 2000);
                  }, 2000);
                }, 2000);
              }, 2000);
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    }, 500);
  };

  // 페이지 진입 또는 문장 변경 시 첫 번째 버튼 활성화 및 재생 시작 (미믹킹 모드에서만)
  useEffect(() => {
    console.log(`🔍 자동 재생 조건 체크: isGuessingMode=${isGuessingMode}, isSequenceRunning=${isSequenceRunning}`);
    
    if (!isGuessingMode && !isSequenceRunning) {
    setShowNextCta(false);
    setAutoSeqIndex(0);
      // 자동 재생도 시퀀스와 동일한 로직 적용
      console.log(`🎬 자동 재생 시작: Scene ${currentIndex + 1}`);
      handlePlay(false, 0);
    } else if (isSequenceRunning) {
      console.log('시퀀스 실행 중이므로 자동 재생 차단');
    } else if (isGuessingMode) {
      console.log('게싱 모드이므로 미믹킹 자동 재생 차단');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene.id, isGuessingMode, isSequenceRunning]);

  const handlePrev = useCallback(() => {
    if (!isSequenceRunning) {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
    setShowNextCta(false);
      
      // 필요한 상태만 리셋
      setActiveControlIndex(null); // 버튼 활성화 리셋
      setMuted(false); // 음소거 상태 리셋
    } else {
      // 시퀀스 실행 중이어도 상태 리셋
      setActiveControlIndex(null);
      setMuted(false);
      setIsSequenceRunning(false);
      setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
      setShowNextCta(false);
      
      // 미디어 정리 (시퀀스 강제 중단 시)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.remove();
      });
      
      // 모든 타이머 정리
      for (let i = 1; i < 10000; i++) {
        clearTimeout(i);
      }
    }
  }, [isSequenceRunning]);

  // 풀스크린 토글 함수
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // 풀스크린 진입
      document.documentElement.requestFullscreen().then(() => {
        console.log('풀스크린 진입');
      }).catch((err) => {
        console.error('풀스크린 진입 실패:', err);
      });
    } else {
      // 풀스크린 종료
      document.exitFullscreen().then(() => {
        console.log('풀스크린 종료');
      }).catch((err) => {
        console.error('풀스크린 종료 실패:', err);
      });
    }
  };

  // 풀스크린 상태 유지 함수
  const navigateWithFullscreen = (url: string) => {
    const isCurrentlyFullscreen = document.fullscreenElement !== null;
    
    if (isCurrentlyFullscreen) {
      // 풀스크린 상태를 localStorage에 저장
      localStorage.setItem('shouldRestoreFullscreen', 'true');
    }
    
    window.location.href = url;
  };

  // 워칭 모드 진행률 바 드래그 핸들러
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    const newTime = (progress / 100) * 401.5;
    
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.currentTime = newTime;
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

  // 시간 포맷 함수 (초를 mm:ss 형식으로)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 오디오 재생 함수
  const playAudio = (option: any, currentIndex?: number) => {
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
      audio.src = movie.videoUrl; // 비디오 파일을 오디오 소스로 사용
      audio.preload = 'auto'; // 전체 오디오 데이터 미리 로드
      document.body.appendChild(audio);
      console.log(`${option.label} 오디오 요소 생성: ${audioId}`);
    } else {
      console.log(`${option.label} 기존 오디오 요소 재사용: ${audioId}`);
    }

    // 해당 옵션의 시간대로 재생
    let startTime, endTime;
    
    if (option.start && option.end) {
      // 옵션에 직접 시간 정보가 있는 경우 사용
      startTime = srtTimeToSeconds(option.start);
      endTime = srtTimeToSeconds(option.end);
      console.log(`${option.label} 재생: "${option.text}" (${startTime}초 ~ ${endTime}초)`);
    } else {
      // 옵션에 시간 정보가 없으면 기본 시간 사용
      startTime = srtTimeToSeconds(currentQuestion.video.start);
      endTime = srtTimeToSeconds(currentQuestion.video.end);
      console.log(`${option.label} 기본 시간 사용: ${startTime}초 ~ ${endTime}초`);
    }
    
    // 오디오 로딩 대기 (재귀 호출 대신 재시도 로직 개선)
    if (audio.readyState < 4) {
      console.log(`${option.label} 오디오 로딩 중... (readyState: ${audio.readyState})`);
      
      // 오디오 로딩 강제 트리거
      if (audio.readyState < 2) {
        audio.load(); // 오디오 다시 로드
        console.log(`${option.label} 오디오 load() 호출`);
      }
      
      const retryCount = (audio as any).retryCount || 0;
      if (retryCount < 20) { // 최대 20번 재시도 (더 증가)
        (audio as any).retryCount = retryCount + 1;
        setTimeout(() => {
          playAudio(option);
        }, 500); // 500ms 후 재시도 (시간 더 증가)
      } else {
        console.error(`${option.label} 오디오 로딩 실패 (readyState: ${audio.readyState})`);
        setPlayingAudio(null);
      }
      return;
    }
    
    audio.currentTime = startTime;
    audio.muted = false; // 소리 켜기
    
    setPlayingAudio(option.label);
    
    audio.play().then(() => {
      console.log(`${option.label} 재생 시작`);
      
      // 재생 시간 체크하여 자동 정지 (중복 호출 방지)
      const checkTime = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          setPlayingAudio(null);
          console.log(`${option.label} 오디오 재생 완료`);
          
          // 자동 재생 시퀀스에서 다음으로 진행
          autoPlayIndexRef.current += 1;
          const nextIndex = autoPlayIndexRef.current;
          console.log(`다음 인덱스: ${nextIndex}, 시퀀스 길이: ${autoPlaySequence.length}`);
          if (nextIndex < autoPlaySequence.length) {
            console.log('다음 자동 재생으로 진행');
            setTimeout(() => {
              playNextInSequence(nextIndex);
            }, 500); // 0.5초 후 다음 재생
          } else {
            console.log('자동 재생 시퀀스 완료');
            setAllOptionsPlayed(true); // 모든 옵션 재생 완료
          }
        } else {
          setTimeout(checkTime, 100);
        }
      };
      checkTime();
    }).catch((error) => {
      console.error(`${option.label} 오디오 재생 실패:`, error);
      
      // 사용자 상호작용이 필요한 경우 처리
      if (error.name === 'NotAllowedError') {
        console.log(`${option.label} 사용자 상호작용이 필요합니다. 클릭해주세요.`);
        
        // 사용자 상호작용을 기다리는 로직
        const handleUserInteraction = () => {
          audio.play().then(() => {
            console.log(`${option.label} 사용자 상호작용 후 재생 시작`);
            
            // 재생 시간 체크하여 자동 정지
            const checkTime = () => {
              if (audio.currentTime >= endTime) {
                audio.pause();
                setPlayingAudio(null);
                console.log(`${option.label} 오디오 재생 완료`);
                
                // 자동 재생 시퀀스에서 다음으로 진행
                autoPlayIndexRef.current += 1;
                const nextIndex = autoPlayIndexRef.current;
                console.log(`다음 인덱스: ${nextIndex}, 시퀀스 길이: ${autoPlaySequence.length}`);
                if (nextIndex < autoPlaySequence.length) {
                  console.log('다음 자동 재생으로 진행');
                  setTimeout(() => {
                    playNextInSequence(nextIndex);
                  }, 500);
                } else {
                  console.log('자동 재생 시퀀스 완료');
                  setAllOptionsPlayed(true);
                }
              } else {
                setTimeout(checkTime, 100);
              }
            };
            checkTime();
          }).catch(err => {
            console.error(`${option.label} 재시도 실패:`, err);
            setPlayingAudio(null);
          });
          
          // 이벤트 리스너 제거
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
        };
        
        // 사용자 상호작용 이벤트 리스너 추가
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
      } else {
        setPlayingAudio(null);
      }
    });
  };

  // 자동 재생 시퀀스 시작
  const startAutoPlaySequence = () => {
    console.log('자동 재생 시퀀스 시작');
    
    // 중복 호출 방지
    if (autoPlayIndexRef.current > 0) {
      console.log('자동 재생 시퀀스가 이미 시작됨, 중복 호출 방지');
      return;
    }
    
    // 기존 재생 중인 오디오 정지
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    autoPlayIndexRef.current = 0; // ref 초기화
    setCurrentAutoIndex(0); // 인덱스 초기화
    setAutoPlaySequence(['A', 'B', 'C']); // 시퀀스 초기화
    setPlayingAudio(null); // 재생 상태 초기화
    playNextInSequence(0);
  };

  // 다음 순서 재생
  const playNextInSequence = (index: number) => {
    if (index < autoPlaySequence.length) {
      const currentLabel = autoPlaySequence[index];
      const currentOption = currentQuestion.options.find((opt: any) => opt.label === currentLabel);
      
      if (currentOption) {
        console.log(`${currentLabel} 자동 재생 시작`);
        setCurrentAutoIndex(index); // 현재 인덱스 업데이트
        autoPlayIndexRef.current = index; // ref도 업데이트
        // setPlayingAudio(null) 제거 - playAudio에서 설정됨
        playAudio(currentOption, index);
      } else {
        console.error(`${currentLabel} 옵션을 찾을 수 없습니다.`);
      }
    } else {
      console.log('자동 재생 시퀀스 완료');
      setAllOptionsPlayed(true); // 모든 옵션 재생 완료
    }
  };

  const handleNext = useCallback(() => {
    if (!isSequenceRunning) {
    if (currentIndex < movie.scenes.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      // 마지막 씬이면 게싱 모드로 전환 (URL 변경 없이)
        console.log('마지막 씬: 게싱 모드로 전환');
      setIsGuessingMode(true);
      setCurrentQuestionIndex(0);
      setVideoPlayCount(0);
      setUserAnswers([]);
      setShowResults(false);
      setShowIntro(true);
      setIsPlaying(false);
        // 게싱 모드 초기화 - 원래 게싱 로직과 동일하게
        setScreenshot(null);
        setScreenshotTaken(false);
        setPlayingAudio(null);
        setAutoPlaySequence(['A', 'B', 'C']);
        setCurrentAutoIndex(0);
        autoPlayIndexRef.current = 0;
        setAllOptionsPlayed(false);
        setShowCorrect(false);
        setShowAgain(false);
        setUserInteracted(false); // 자동 시작을 위해 false로 설정
    }
    setShowNextCta(false);
    } else {
      // 시퀀스 실행 중이어도 상태 리셋
      setActiveControlIndex(null);
      setMuted(false);
      setIsSequenceRunning(false);
      
      if (currentIndex < movie.scenes.length - 1) {
        setCurrentIndex((idx) => idx + 1);
      } else {
        // 마지막 씬이면 게싱 모드로 전환
        console.log('마지막 씬: 게싱 모드로 전환');
        setIsGuessingMode(true);
        setCurrentQuestionIndex(0);
        setVideoPlayCount(0);
        setUserAnswers([]);
        setShowResults(false);
        setShowIntro(true);
        setIsPlaying(false);
        setScreenshot(null);
        setScreenshotTaken(false);
        setPlayingAudio(null);
        setAutoPlaySequence(['A', 'B', 'C']);
        setCurrentAutoIndex(0);
        autoPlayIndexRef.current = 0;
        setAllOptionsPlayed(false);
        setShowCorrect(false);
        setShowAgain(false);
        setUserInteracted(false);
      }
      setShowNextCta(false);
      
      // 미디어 정리 (시퀀스 강제 중단 시)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.remove();
      });
      
      // 모든 타이머 정리
      for (let i = 1; i < 10000; i++) {
        clearTimeout(i);
      }
    }
  }, [currentIndex, movie.scenes.length, isSequenceRunning]);

  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    console.log(`🎮 handlePlay: muted=${m}, slotIndex=${slotIndex}`);
    setMuted(m);
    setActiveControlIndex(slotIndex);
    setPlayNonce(prev => {
      console.log(`🎮 playNonce 증가: ${prev} → ${prev + 1}`);
      return prev + 1;
    });
  }, []);

  // 현재 실행 중인 시퀀스 ID를 추적하는 ref
  const currentSequenceRef = useRef<number>(0);
  
  // 실행 중인 시퀀스들을 추적하는 Set
  const activeSequencesRef = useRef<Set<number>>(new Set());
  
  // 현재 실행 중인 시퀀스의 단계를 추적하는 ref
  const currentStepRef = useRef<number>(0);

  // 미믹킹 문장 8번 플레이 순서 실행 함수
  const executeMimickingSequence = (sceneIndex: number) => {
    if (isSequenceRunning) {
      console.log('이미 시퀀스가 실행 중입니다.');
      return;
    }
    
    console.log(`🎬 미믹킹 시퀀스 시작: Scene ${sceneIndex + 1}`);
    
    // 이전 시퀀스 정리
    mimickingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeoutsRef.current = [];
    
    // 상태 초기화
    setIsPlaying(false);
    setPlayNonce(0);
    setActiveControlIndex(null);
    setShowNextCta(false);
    
    // 자동 재생 중지
    setAutoSeqIndex(null);
    setAllOptionsPlayed(false);
    
    // VideoPlayer 리셋을 위해 key 변경
    console.log('VideoPlayer 리셋을 위해 key 변경');
    
    // Scene n으로 자동 스크롤 (스마트)
    setTimeout(() => {
      const sceneElement = document.querySelector(`[data-scene-index="${sceneIndex}"]`);
      if (sceneElement) {
        console.log(`📍 Scene ${sceneIndex + 1}로 자동 스크롤`);
        
        // 경계 케이스 처리
        if (sceneIndex < 3) {
          // 상단 Scene들 (1~3): 시작 부분으로 스크롤
          sceneElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        } else if (sceneIndex >= movie.scenes.length - 3) {
          // 하단 Scene들 (마지막 3개): 끝 부분으로 스크롤
          sceneElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          });
        } else {
          // 중간 Scene들: 중앙으로 스크롤
          sceneElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }, 100);
    
    // 오디오 정지
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    setIsSequenceRunning(true);
    setCurrentIndex(sceneIndex);
    
    // 8단계 시퀀스 실행
    const steps = [
      { slotIndex: 0, muted: false }, // 1단계: 폴리곤 (유음)
      { slotIndex: 1, muted: false }, // 2단계: 폴리곤 (유음)
      { slotIndex: 2, muted: false }, // 3단계: 폴리곤 (유음)
      { slotIndex: 3, muted: true },  // 4단계: M (무음)
      { slotIndex: 4, muted: false }, // 5단계: 폴리곤 (유음)
      { slotIndex: 5, muted: true },  // 6단계: M (무음)
      { slotIndex: 6, muted: false }, // 7단계: 폴리곤 (유음)
      { slotIndex: 7, muted: true }   // 8단계: M (무음)
    ];
    
    // 첫 번째 단계 즉시 실행
    handlePlay(false, 0);
    
    // 나머지 7단계를 2초 간격으로 실행
    steps.slice(1).forEach((step, index) => {
      const timeout = setTimeout(() => {
        handlePlay(step.muted, step.slotIndex);
        
        // 마지막 단계 완료 후
        if (index === steps.length - 2) {
          setTimeout(() => {
            console.log(`🏁 시퀀스 완료 - isSequenceRunning을 false로 설정`);
            setIsSequenceRunning(false);
            
            // 다음 문장으로 자동 진행
            if (sceneIndex < movie.scenes.length - 1) {
              console.log(`다음 문장으로 자동 진행: ${sceneIndex + 1} → ${sceneIndex + 2}`);
              console.log(`현재 sceneIndex: ${sceneIndex}, 총 문장 수: ${movie.scenes.length}`);
              setCurrentIndex(sceneIndex + 1);
            } else {
              // 마지막 문장이면 게싱 모드로 전환
              console.log(`마지막 문장 완료: ${sceneIndex + 1} - 게싱 모드로 전환`);
              setIsGuessingMode(true);
              setCurrentQuestionIndex(0);
              setVideoPlayCount(0);
              setUserAnswers([]);
              setShowResults(false);
              setShowIntro(true);
              setIsPlaying(false);
              // 게싱 모드 초기화
              setScreenshot(null);
              setScreenshotTaken(false);
              setPlayingAudio(null);
              setAutoPlaySequence(['A', 'B', 'C']);
              setCurrentAutoIndex(0);
              autoPlayIndexRef.current = 0;
              setAllOptionsPlayed(false);
              setShowCorrect(false);
              setShowAgain(false);
              setUserInteracted(false);
            }
          }, 2000);
        }
      }, (index + 1) * 2000);
      
      mimickingTimeoutsRef.current.push(timeout);
    });
  };

  // 게싱 문장 3번 무음재생 + A,B,C 자동재생 순서 실행 함수
  const executeGuessingSequence = (questionIndex: number) => {
    console.log(`🔄 게싱 시퀀스 전환: ${currentQuestionIndex} → ${questionIndex}`);
    
    // 모든 setTimeout 정리 (게싱 모드용)
    const allTimeouts = document.querySelectorAll('[data-timeout-id]');
    allTimeouts.forEach(element => {
      const timeoutId = element.getAttribute('data-timeout-id');
      if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
      }
    });
    
    // 모든 이벤트 리스너 정리
    const clickListeners = document.querySelectorAll('[data-click-listener]');
    clickListeners.forEach(element => {
      element.removeEventListener('click', () => {});
      element.removeEventListener('touchstart', () => {});
    });
    
    // 이전 재생 완전 중지
    setIsPlaying(false);
    setPlayNonce(0);
    setVideoPlayCount(0);
    setScreenshot(null);
    setScreenshotTaken(false);
    setPlayingAudio(null);
    setAutoPlaySequence(['A', 'B', 'C']);
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
    setUserInteracted(false);
    setShowCorrect(false);
    setShowAgain(false);
    setAllOptionsPlayed(false);
    
    // 모든 오디오 정지 및 제거
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      audio.remove(); // DOM에서 완전 제거
    });
    
    // 모든 비디오 정지
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    // ReactPlayer 정지 (강제)
    const reactPlayerElements = document.querySelectorAll('[data-react-player]');
    reactPlayerElements.forEach(element => {
      const player = element as any;
      if (player.getInternalPlayer) {
        const internalPlayer = player.getInternalPlayer();
        if (internalPlayer && internalPlayer.pause) {
          internalPlayer.pause();
        }
      }
    });
    
    // 새로운 문제로 이동
    setCurrentQuestionIndex(questionIndex);
    
    // 무음재생 3번 시작
    setTimeout(() => {
      console.log('게싱 사이드바 클릭 - 무음재생 시작');
      setVideoPlayCount(0); // videoPlayCount 초기화
      autoPlayTriggeredRef.current = false; // 자동 재생 트리거 초기화
      onEndedFiredRef.current = false; // onEndedSegment 중복 호출 방지 초기화
      setIsPlaying(true);
      setPlayNonce(prev => prev + 1);
      
      // guessingMaking과 동일한 구조로 변경
    }, 500);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "Space") {
        e.preventDefault();
        console.log('스페이스바 눌림, 현재 모드:', mode);
        if (mode === 'watching') {
          // 워칭 모드에서 스페이스바 처리
          const video = document.querySelector('video') as HTMLVideoElement;
          console.log('비디오 요소:', video);
          if (video) {
            if (video.paused) {
              console.log('비디오 재생 시작');
              video.play();
              setIsVideoPaused(false);
            } else {
              console.log('비디오 일시정지');
              video.pause();
              setIsVideoPaused(true);
            }
          }
        } else {
          // 다른 모드에서는 기존 동작 유지
        setMuted((m) => m);
        }
      } else if (e.key === ">") {
        e.preventDefault();
        handlePlay(false, 0);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        handlePlay(true, 3);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePlay, handlePrev, mode]);

  // 게싱 모드일 때 게싱 UI 렌더링
  if (isGuessingMode) {
    // 결과 화면
    if (showResults) {
      const correctAnswers = guessingData.filter((question, index) => 
        question.correctAnswer === userAnswers[index]
      ).length;
      
      return (
        <main className="min-h-screen px-4 py-4">
          <div className="mb-4 flex items-center justify-between group">
            <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFullscreen}
                className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                style={{ width: '29px', height: '29px' }}
              >
                {isFullscreen ? (
                  // 풀스크린 종료 아이콘 (제공된 SVG - 풀스크린에서 나가기)
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
                  // 풀스크린 진입 아이콘 (4개 L자 모양 - 풀스크린으로 들어가기)
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

          <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                게임 완료!
              </h1>
              <p className="text-2xl mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                정답: {correctAnswers}/10
              </p>
              <p className="text-lg opacity-70" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                {correctAnswers >= 8 ? '훌륭합니다!' : correctAnswers >= 6 ? '좋습니다!' : '다시 도전해보세요!'}
              </p>
            </div>
          </div>
        </main>
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
                  // 풀스크린 종료 아이콘 (제공된 SVG - 풀스크린에서 나가기)
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
                  // 풀스크린 진입 아이콘 (4개 L자 모양 - 풀스크린으로 들어가기)
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
                // 풀스크린 종료 아이콘 (제공된 SVG - 풀스크린에서 나가기)
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
                // 풀스크린 진입 아이콘 (4개 L자 모양 - 풀스크린으로 들어가기)
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
                      console.log('영상 끝남, videoPlayCount:', videoPlayCount);
                          setVideoPlayCount(prev => prev + 1);
                      
                      // 3번 재생 후 선택지 표시
                      if (videoPlayCount >= 2) { // 0, 1, 2 (총 3번)
                        console.log('3번 재생 완료, 선택지 표시');
                        setIsPlaying(false);
                        
                        // 0.75초 후 자동 재생 시작
                        setTimeout(() => {
                          console.log('0.75초 후 자동 재생 시작');
                          startAutoPlaySequence();
                        }, 750);
                      } else {
                        // 아직 3번이 안 되었으면 다시 재생
                        console.log(`${videoPlayCount + 1}번째 재생 시작`);
                        // 재생 상태를 false로 설정하고 잠시 후 재생
                        setIsPlaying(false);
                        
                        // 대기 시간에 스크린샷 표시
                        if (screenshot) {
                          console.log('대기 시간에 스크린샷 표시');
                        }
                        
                        setTimeout(() => {
                          setIsPlaying(true);
                          setPlayNonce(prev => prev + 1);
                        }, 1000); // 1초 후 다시 재생
                      }
                    }}
                    onTimeUpdate={(currentTime) => {
                      // 중앙 시점에서 스크린샷 캡처 (세번 모두)
                      captureMidpointScreenshot(
                        srtTimeToSeconds(currentQuestion.video.start),
                        srtTimeToSeconds(currentQuestion.video.end)
                      );
                    }}
                    onPlay={() => {
                      console.log('무음 영상 재생 시작');
                      // 무음 영상 재생 시작과 동시에 "부우웅" 소리 재생 (세번 모두)
                      playAttentionSound();
                    }}
                  />
                )}
              </div>
              
              {/* 정답 선택 안내 오버레이 */}
              {videoPlayCount >= 3 && !showCorrect && !showAgain && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {/* 스크린샷 배경 */}
                  {screenshot && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${screenshot})` }}
                    />
                  )}
                  {/* 검정색 오버레이 */}
                  <div className="absolute inset-0 bg-black/70" />
                  {/* 정답 선택 텍스트 */}
                  <div className="relative z-10 text-center text-white">
                    <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                      A B C 를 순차적으로<br />
                      듣고 정답을 선택하세요
                    </p>
                  </div>
                </div>
              )}

              {/* Correct 표시 오버레이 */}
              {showCorrect && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {/* 스크린샷 배경 */}
                  {screenshot && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${screenshot})` }}
                    />
                  )}
                  {/* 검정색 오버레이 */}
                  <div className="absolute inset-0 bg-black/70" />
                  {/* Correct 텍스트 */}
                  <div className="relative z-10 text-center">
                    <div 
                      className="text-6xl font-bold animate-pulse"
                      style={{ 
                        fontFamily: 'Encode Sans, sans-serif',
                        color: '#60D96C',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        animation: 'fadeInOut 3s ease-in-out',
                        fontWeight: '900'
                      }}
                    >
                      Correct
                    </div>
                  </div>
                </div>
              )}


              {/* Again 표시 오버레이 */}
              {showAgain && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {/* 스크린샷 배경 */}
                  {screenshot && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${screenshot})` }}
                    />
                  )}
                  {/* 검정색 오버레이 */}
                  <div className="absolute inset-0 bg-black/70" />
                  {/* Again 텍스트 */}
                  <div className="relative z-10 text-center">
                    <div 
                      className="text-6xl font-bold animate-pulse"
                      style={{ 
                        fontFamily: 'Encode Sans, sans-serif',
                        color: '#9CA3AF',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(156, 163, 175, 0.3)',
                        animation: 'fadeInOut 2s ease-in-out',
                        fontWeight: '900'
                      }}
                    >
                      Again
                    </div>
                  </div>
                </div>
              )}
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
                        setCurrentQuestionIndex(prev => prev - 1);
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
                        
                        setIsGuessingMode(false);
                        // URL을 미믹킹 모드로 업데이트
                        window.history.pushState({}, '', '?mode=mimicking');
                        execute30thMimickingSequence();
                        // 사이드바 스크롤을 맨 하단으로 이동 (Scene1부터 보이고 맨 아래로 스크롤)
                        setTimeout(() => {
                          const sidebar = document.querySelector('.bg-\\[\\#1a1a1a\\]') as HTMLElement;
                          if (sidebar) {
                            // Scene1부터 보이고 맨 아래로 스크롤
                            sidebar.scrollTop = 0; // 먼저 맨 위로 이동
                            setTimeout(() => {
                              sidebar.scrollTop = sidebar.scrollHeight; // 그 다음 맨 아래로 이동
                            }, 50);
                          }
                        }, 100);
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
                    onClick={() => {
                      const newQuestionIndex = currentQuestionIndex - 1;
                      if (newQuestionIndex >= 0) {
                        // 이전 문제로 이동
                        executeGuessingSequence(newQuestionIndex);
                      } else {
                        // Guess1에서 좌측 방향키 클릭 시 미믹킹 모드로 전환
                        setIsGuessingMode(false);
                        // URL을 미믹킹 모드로 업데이트
                        window.history.pushState({}, '', '?mode=mimicking');
                        execute30thMimickingSequence();
                      }
                    }}
                    aria-label="이전 문제"
                  >
                    <div 
                      style={{
                        width: '0',
                        height: '0',
                        borderRight: '60px solid #666666',
                        borderTop: '45px solid transparent',
                        borderBottom: '45px solid transparent'
                      }}
                    />
                  </div>
                  
                    {currentQuestion.options.map((option: any, index: number) => (
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
                        onClick={(e) => {
                        // 모든 옵션이 재생되지 않았으면 클릭 무시
                        if (!allOptionsPlayed) {
                          console.log('아직 모든 옵션이 재생되지 않았습니다.');
                          return;
                        }
                        
                        // 펄스 효과 즉시 제거
                        setAllOptionsPlayed(false);
                        
                        // 정답 선택
                          const newAnswers = [...userAnswers, option.label];
                          setUserAnswers(newAnswers);
                          console.log(`Question ${currentQuestionIndex + 1}: Selected ${option.label}`);
                          
                        // 오디오 정지
                        if (playingAudio) {
                          const audio = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement;
                          if (audio) {
                            audio.pause();
                            audio.currentTime = 0;
                          }
                          setPlayingAudio(null);
                        }
                        
                        // 정답인 경우 Correct 표시 후 다음 문제로
                        if (option.label === currentQuestion.correctAnswer) {
                          setShowCorrect(true);
                          playCorrectSound(); // 정답 축하 소리
                          
                          // 3초 후 다음 문제로 진행
                          setTimeout(() => {
                            setShowCorrect(false);
                            
                          if (currentQuestionIndex < 9) {
                            // 이전 문제의 모든 미디어 중지
                            const audioElements = document.querySelectorAll('audio');
                            audioElements.forEach(audio => {
                              audio.pause();
                              audio.currentTime = 0;
                            });
                            
                            setCurrentQuestionIndex(prev => prev + 1);
                            setVideoPlayCount(0);
                            setIsPlaying(false);
                              setScreenshot(null);
                              setScreenshotTaken(false);
                              setCurrentAutoIndex(0);
                              autoPlayIndexRef.current = 0;
                              setAutoPlaySequence(['A', 'B', 'C']);
                              setPlayingAudio(null);
                              setAllOptionsPlayed(false); // 다음 문제를 위해 초기화
                            // 다음 문제 자동 재생 시작
                            setTimeout(() => {
                              setIsPlaying(true);
                              setPlayNonce(prev => prev + 1);
                            }, 500);
                          } else {
                            setShowResults(true);
                            }
                          }, 3000);
                        } else {
                          // 오답인 경우 Again 표시 후 A부터 다시 재생
                          setShowAgain(true);
                          playAgainSound(); // 오답 안타까운 소리
                          
                          // 2초 후 Again 사라지고 A부터 다시 재생
                          setTimeout(() => {
                            setShowAgain(false);
                            
                            // 모든 상태 완전 초기화
                            setAllOptionsPlayed(false);
                            setCurrentAutoIndex(0);
                            autoPlayIndexRef.current = 0;
                            setAutoPlaySequence(['A', 'B', 'C']);
                            setPlayingAudio(null);
                            
                            // 모든 오디오 정지
                            const audioElements = document.querySelectorAll('audio');
                            audioElements.forEach(audio => {
                              audio.pause();
                              audio.currentTime = 0;
                            });
                            
                            console.log('틀렸을 때 상태 초기화 완료, A부터 다시 재생 시작');
                            // A부터 다시 자동 재생 시작
                            startAutoPlaySequence();
                          }, 2000);
                        }
                      }}
                    >
                      <div className="text-6xl font-bold text-black">
                        {option.label}
                      </div>
                      </button>
                    ))}
                  
                  {/* 다음 버튼 - C 우측 */}
                  <div 
                    className="flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:animate-heartbeat"
                    onClick={() => {
                      if (currentQuestionIndex < guessingData.length - 1) {
                        // 정답 맞춘 것과 동일한 로직 (Correct 표시 없이)
                        if (currentQuestionIndex < 9) {
                          // 이전 문제의 모든 미디어 중지
                          const audioElements = document.querySelectorAll('audio');
                          audioElements.forEach(audio => {
                            audio.pause();
                            audio.currentTime = 0;
                          });
                          
                          setCurrentQuestionIndex(prev => prev + 1);
                          setVideoPlayCount(0);
                          setIsPlaying(false);
                          setScreenshot(null);
                          setScreenshotTaken(false);
                          setCurrentAutoIndex(0);
                          autoPlayIndexRef.current = 0;
                          setAutoPlaySequence(['A', 'B', 'C']);
                          setPlayingAudio(null);
                          setAllOptionsPlayed(false);
                          // 다음 문제 자동 재생 시작
                          setTimeout(() => {
                            setIsPlaying(true);
                            setPlayNonce(prev => prev + 1);
                          }, 500);
                        } else {
                          setShowResults(true);
                        }
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
                    aria-label="다음 문제"
                  >
                    <div 
                      style={{
                        width: '0',
                        height: '0',
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

          {/* 게싱 사이드바 */}
          {isSidebarOpen && (
            <div className="flex justify-center">
              <aside className="flex flex-col gap-2 h-full">
                <div className="bg-[#1a1a1a] rounded-lg p-4 h-full overflow-y-auto">
              <h3 className="text-sm font-semibold text-[#60D96C] mb-3" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                QUESTIONS
              </h3>
              <div className="flex flex-col gap-2">
                {guessingData.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      executeGuessingSequence(index);
                    }}
                    className={`px-3 py-3 rounded text-sm font-medium transition-colors ${
                      currentQuestionIndex === index
                        ? 'bg-[#60D96C] text-black'  // 현재 문제만 미믹색
                        : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'  // 나머지는 모두 회색
                    }`}
                    style={{ fontFamily: 'Encode Sans, sans-serif' }}
                  >
                    Guess{index + 1}
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

  // 워칭 모드일 때 워칭 UI 렌더링
  if (mode === 'watching') {
  return (
    <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
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
                src={movie.videoUrl}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${isVideoPaused ? 'opacity-50' : 'opacity-100'}`}
                controls={false}
                autoPlay={false}
                muted={false}
                playsInline
                preload="metadata"
            onClick={() => {
                  const video = document.querySelector('video') as HTMLVideoElement;
                  if (video) {
                    if (video.paused) {
                      video.play();
                      setIsVideoPaused(false);
              } else {
                      video.pause();
                      setIsVideoPaused(true);
                    }
                  }
                }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                const progress = (video.currentTime / 401.5) * 100;
                setVideoProgress(progress);
                if (video.currentTime >= 401.5) {
                  video.pause();
                  setShowNextCta(true);
                }
              }}
                onLoadedData={() => {
                  console.log('워칭 모드 영상 로드 완료');
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // 우클릭 메뉴 비활성화
                }}
                onPause={(e) => {
                  // 워칭 모드에서는 사용자가 일시정지한 경우를 존중
                  if (!showNextCta && !isVideoPaused) {
                    e.currentTarget.play();
                  }
                }}
              />
              
              {/* 시작을 위한 클릭 오버레이 */}
              {!showNextCta && !isVideoStarted && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer z-10"
            onClick={() => {
                    const video = document.querySelector('video');
                    if (video) {
                      video.play();
                      setIsVideoStarted(true);
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                      시작을 위해 클릭해주세요
                    </div>
                  </div>
                </div>
              )}

              {/* 워칭 모드 PAUSE 오버레이 */}
              {isVideoPaused && !showNextCta && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="text-gray-200 text-6xl font-bold" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                    PAUSE
                  </div>
                </div>
              )}

              {/* 워칭 모드 Again/Next 버튼 오버레이 */}
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
                          video.currentTime = 0;
                          video.play();
                          setShowNextCta(false);
                          setVideoProgress(0);
                          setIsVideoStarted(true); // 바로 재생 시작으로 설정
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
                       // 미믹킹 모드로 전환 (풀스크린 유지)
                       window.history.pushState({}, '', '/sing2/lesson?mode=mimicking');
                       // 페이지 새로고침으로 모드 변경하되 풀스크린 상태 저장
                       const isFullscreen = document.fullscreenElement !== null;
                       if (isFullscreen) {
                         localStorage.setItem('restoreFullscreen', 'true');
                       }
                       window.location.reload();
                     }}
                   >
                      {/* 카멜레온 이미지 오버레이 */}
                      <img 
                        src="/Subject.png" 
                        alt="카멜레온" 
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
          
          {/* 워칭 모드 진행률 바 - 비디오 플레이어 아래 */}
          {mode === 'watching' && !showNextCta && (
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
                {/* 진행률 바 배경 */}
                <div className="absolute inset-0 bg-gray-300 rounded-full overflow-hidden"></div>
                {/* 진행률 표시 */}
                <div
                  className="absolute inset-0 h-full bg-[#60D96C] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${videoProgress}%` }}
                />
                {/* 드래그 가능한 동그라미 버튼 */}
                <div 
                  className="absolute top-1/2 w-3 h-3 bg-gray-500 rounded-full cursor-pointer transform -translate-y-1/2 shadow-lg hover:bg-gray-600 transition-colors duration-200"
                  style={{ left: `calc(${videoProgress}% - 6px)` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                />
                
                {/* 시간 정보 툴팁 - 진행률 바 하단 */}
                {showProgressTooltip && (
                  <div 
                    className="absolute top-9 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-50"
                    style={{ 
                      backgroundColor: 'rgb(32, 30, 30)',
                      left: `${tooltipPosition}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {/* 포인터 삼각형 */}
                    <div 
                      className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '16px solid rgb(32, 30, 30)'
                      }}
                    ></div>
                    {formatTime((tooltipPosition / 100) * 401.5)} / {formatTime(401.5)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    );
  }

  // 미믹킹 모드일 때 미믹킹 UI 렌더링
  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
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
            onClick={() => setIsSidebarOpen((v) => !v)}
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
              // 풀스크린 종료 아이콘 (제공된 SVG - 풀스크린에서 나가기)
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
              // 풀스크린 진입 아이콘 (4개 L자 모양 - 풀스크린으로 들어가기)
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
            <section className="flex flex-col" style={{ backgroundColor: showNextCta ? '#0a0a0a' : undefined }}>
              <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top', marginLeft: isFullscreen ? '130px' : '0px' }}>
                <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-[10px]`} style={{ borderColor: muted ? '#60D96C' : 'rgb(32, 30, 30)' }}>
          <VideoPlayer
            key={`mimicking-${currentIndex}-${playNonce}`}
            src={movie.videoUrl}
            startTime={currentScene.startTime}
            endTime={currentScene.endTime}
            muted={muted}
            showText={isTextVisible}
            text={currentScene.text}
            playNonce={playNonce}
            hidePauseOverlay={autoSeqIndex !== null}
            activeControlIndex={activeControlIndex}
            onEndedSegment={() => {
              setActiveControlIndex(null);
              // 자동 시퀀스 중이면 다음 버튼으로 진행
              if (autoSeqIndex !== null) {
                const next = autoSeqIndex + 1;
                if (next <= 7) {
                  setTimeout(() => {
                    // 짝수 인덱스는 재생, 홀수 인덱스는 무음 패턴(> > > m > m > m)
                    const isMuted = [3,5,7].includes(next);
                    handlePlay(isMuted, next);
                    setAutoSeqIndex(next);
                  }, 1000);
                } else {
                  // 8개 완료 → 다음 씬으로 자동 진행 (30문장 등 긴 레슨 지원)
                  setAutoSeqIndex(null);
                  if (currentIndex < movie.scenes.length - 1) {
                    setTimeout(() => {
                      setCurrentIndex((idx) => Math.min(idx + 1, movie.scenes.length - 1));
                      // 다음 씬 진입 시 자동 시퀀스가 다시 시작됨(useEffect)
                    }, 800);
                  } else {
                    // 마지막 씬이면 CTA 노출
                    setShowNextCta(true);
                    setIsPlaying(false); // 영상 재생 중지
                    setPlayNonce(0); // 재생 상태 리셋
                  }
                }
              }
            }}
          />
                </div>
          
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
                    execute30thMimickingSequence();
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
                  onClick={handleNext}
                >
                  {/* 카멜레온 이미지 오버레이 */}
                  <img 
                    src="/Subject.png" 
                    alt="카멜레온" 
                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
                    style={{ maxWidth: '80px', height: 'auto' }}
                  />
                  Next
                </button>
              </div>
            </div>
          )}
          </div>

          <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top', marginTop: '-20px', marginLeft: isFullscreen ? '130px' : '0px' }}>
            {!showNextCta && (
            <PlaybackControls onPrev={handlePrev} onNext={handleNext} onPlay={handlePlay} activeIndex={activeControlIndex} isFullscreen={isFullscreen} />
            )}
            {showNextCta && (
              <div className="absolute inset-0 bg-black/80 rounded-lg"></div>
            )}
          </div>
        </section>

        {isSidebarOpen && (
          <div className="flex justify-center">
            <aside className="flex flex-col gap-2 h-full">
              <div className="bg-[#1a1a1a] rounded-lg p-4" style={{ height: 'calc(100vh - 150px)' }}>
                <h3 className="text-sm font-semibold text-[#60D96C] mb-3" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                  SCENES
                </h3>
                <div className="flex flex-col gap-2 overflow-y-auto" style={{ height: 'calc(100% - 40px)' }} ref={(el) => {
                  if (el && currentIndex >= 0 && currentIndex === 0) {
                    // 첫 번째 씬일 때만 중앙으로 스크롤
                    const buttonHeight = 48; // 버튼 높이 + gap
                    const containerHeight = el.clientHeight;
                    const scrollTop = (currentIndex * buttonHeight) - (containerHeight / 2) + (buttonHeight / 2);
                    el.scrollTop = Math.max(0, scrollTop);
                  }
                }}>
                  {movie.scenes
                    .map((scene, index) => ({ scene, index }))
                    .map(({ scene, index }) => (
        <button
          key={index}
          data-scene-index={index}
          onClick={() => {
            if (!isSequenceRunning && index < movie.scenes.length) {
              executeMimickingSequence(index);
            }
          }}
          disabled={isSequenceRunning || index >= movie.scenes.length}
          className={`px-3 py-3 rounded text-sm font-medium transition-colors ${
            isSequenceRunning || index >= movie.scenes.length
              ? currentIndex === index
                ? 'bg-[#60D96C] text-black animate-pulse border-2 border-[#60D96C] cursor-not-allowed' // 현재 플레이 중인 문장 (미믹색 + 펄스 + 테두리)
                : 'bg-gray-600 text-gray-400 cursor-not-allowed' // 다른 문장들 (회색)
              : currentIndex === index
              ? 'bg-[#60D96C] text-black' // 일반 활성 문장 (미믹색)
              : index < currentIndex
              ? 'bg-green-900/30 text-green-400'
              : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
          }`}
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          Scene{index + 1}
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

export default function TrainingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TrainingPageContent />
    </Suspense>
  );
}


