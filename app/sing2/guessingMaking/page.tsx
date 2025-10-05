"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import { transformRawLesson } from "../../constants/lesson";

// SRT 시간을 초로 변환하는 함수
function srtTimeToSeconds(srtTime: string): number {
  const [time, ms] = srtTime.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}

export default function GuessingMakingPage() {
  const [movie, setMovie] = useState<any>(null);
  const [guessingData, setGuessingData] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [videoPlayCount, setVideoPlayCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); // 현재 재생 중인 오디오
  const [autoPlaySequence, setAutoPlaySequence] = useState<string[]>(['A', 'B', 'C']); // 자동 재생 순서
  const [currentAutoIndex, setCurrentAutoIndex] = useState(0); // 현재 자동 재생 인덱스
  const autoPlayIndexRef = useRef(0); // ref로 인덱스 관리
  const [userInteracted, setUserInteracted] = useState(false); // 사용자 상호작용 여부
  const [showCorrect, setShowCorrect] = useState(false); // 정답 표시 여부
  const [showAgain, setShowAgain] = useState(false); // 오답 표시 여부
  const [allOptionsPlayed, setAllOptionsPlayed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 주의를 끄는 소리 효과 함수
  const playAttentionSound = () => {
    try {
      console.log('띠링 소리 재생 시도');
      
      // Web Audio API를 사용한 "띠링" 소리 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed');
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
        
        // "부우웅" 소리: 낮은 톤으로 신비로운 느낌
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.6);
        oscillator.type = 'sine';
        
        // 볼륨 조절 (0.3으로 적당한 크기)
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.6);
        
        console.log('띠링 소리 재생 성공!');
      }
    } catch (error) {
      console.log('띠링 소리 재생 실패:', error);
    }
  }; // 모든 옵션 재생 완료 여부

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
        // 상승하는 축하 멜로디: 도-미-솔 (C-E-G)
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
        // 하강하는 안타까운 멜로디: 솔-미-도 (G-E-C)
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

  const currentQuestion = guessingData[currentQuestionIndex];

  // 풀스크린 토글 함수
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.log('풀스크린 진입 실패:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.log('풀스크린 종료 실패:', err);
      });
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

  // 오디오 재생 함수
  const playAudio = (option: any) => {
    // 기존 재생 중인 오디오가 있으면 정지
    if (playingAudio) {
      const existingAudio = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement;
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.currentTime = 0;
      }
    }

    // 새로운 오디오 재생
    const audioId = `audio-${option.label}`;
    let audio = document.getElementById(audioId) as HTMLAudioElement;
    
    if (!audio) {
      // 오디오 요소가 없으면 생성
      audio = document.createElement('audio');
      audio.id = audioId;
      audio.src = movie.videoUrl; // 비디오 파일을 오디오 소스로 사용
      audio.preload = 'metadata';
      document.body.appendChild(audio);
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
    
    // 오디오 로딩 대기
    if (audio.readyState < 2) {
      console.log(`${option.label} 오디오 로딩 중...`);
      setTimeout(() => {
        playAudio(option); // 재귀 호출로 다시 시도
      }, 100);
      return;
    }
    
    audio.currentTime = startTime;
    audio.muted = false; // 소리 켜기
    
    setPlayingAudio(option.label);
    
    audio.play().then(() => {
      console.log(`${option.label} 재생 시작`);
      
      // 재생 시간 체크하여 자동 정지
      const checkTime = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          setPlayingAudio(null);
          console.log(`${option.label} 오디오 재생 완료`);
          // 자동 재생 시퀀스에서 다음으로 진행
          autoPlayIndexRef.current += 1;
          const nextIndex = autoPlayIndexRef.current;
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
      console.error('오디오 요소:', audio);
      console.error('오디오 src:', audio.src);
      console.error('오디오 currentTime:', audio.currentTime);
      console.error('startTime:', startTime, 'endTime:', endTime);
      setPlayingAudio(null);
    });
  };

  // 자동 재생 시퀀스 시작
  const startAutoPlaySequence = () => {
    console.log('자동 재생 시퀀스 시작');
    autoPlayIndexRef.current = 0; // ref 초기화
    setCurrentAutoIndex(0); // 인덱스 초기화
    setAutoPlaySequence(['A', 'B', 'C']); // 시퀀스 초기화
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
        playAudio(currentOption);
      } else {
        console.error(`${currentLabel} 옵션을 찾을 수 없습니다.`);
      }
    } else {
      console.log('자동 재생 시퀀스 완료');
      setAllOptionsPlayed(true); // 모든 옵션 재생 완료
    }
  };

  // 게싱 데이터 로드
  useEffect(() => {
    const loadGuessingData = async () => {
      try {
        console.log('게싱 데이터 로드 시작');
        const response = await fetch('/movies/sing2.json');
        const rawData = await response.json();
        const transformedMovie = transformRawLesson(rawData);
        setMovie(transformedMovie);
        
        if (rawData.lesson && rawData.lesson[0] && rawData.lesson[0].guessing) {
          console.log('게싱 데이터 로드 성공:', rawData.lesson[0].guessing.length, '개');
          setGuessingData(rawData.lesson[0].guessing);
        } else {
          console.log('게싱 데이터 없음');
        }
      } catch (error) {
        console.error('Failed to load guessing data:', error);
      }
    };
    loadGuessingData();
  }, []);

  // 게싱 모드에서 자동 게임 시작
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
        // 자동으로 첫 번째 문제 재생 시작
        if (guessingData.length > 0) {
          console.log('게싱 시작 - isPlaying: true, playNonce 증가');
          setUserInteracted(true); // 자동 시작도 상호작용으로 간주
          setIsPlaying(true);
          setPlayNonce(prev => {
            console.log('playNonce 변경:', prev, '->', prev + 1);
            return prev + 1;
          });
          
        } else {
          console.log('guessingData 길이:', guessingData.length);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showIntro, guessingData]);

  // 사용자 상호작용으로 게임 시작
  const handleStartGame = () => {
    console.log('사용자 클릭으로 게임 시작');
    setUserInteracted(true); // 사용자 상호작용 기록
    setIsPlaying(true);
    setPlayNonce(prev => prev + 1);
    
  };

  if (!movie) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // 결과 화면
  if (showResults) {
    const correctAnswers = guessingData.filter((question, index) => 
      question.correctAnswer === userAnswers[index]
    ).length;
    
    return (
      <main className="min-h-screen px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200" style={{ width: '29px', height: '29px' }}>
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
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200" style={{ width: '29px', height: '29px' }}>
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
            <p className="text-lg opacity-70 mb-8" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              준비 중...
            </p>
            <button
              onClick={handleStartGame}
              className="rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50]"
              style={{
                backgroundColor: 'white',
                fontFamily: 'Encode Sans, sans-serif',
                fontSize: '1.5rem'
              }}
            >
              게임 시작
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 게싱 게임 화면
  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>{movie.title.toUpperCase()}</h1>
        <div className="flex items-center gap-3">
          {/* 풀스크린 버튼 */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 hover:opacity-80"
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
                <circle cx="24" cy="24" r="24" fill="#60D96C"/>
                <g transform="scale(0.7) translate(10.3, 10.3)">
                  <path d="M33 6H42V15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M42 33V42H33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 42H6V33" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 15V6H15" stroke="black" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
            )}
          </button>
          
          <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="mx-auto relative w-[70%]">
          {/* 게싱 게임 영역 */}
          <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden ${(videoPlayCount >= 3 || (!isPlaying && screenshot)) ? 'border-[14px]' : ''}`} style={{ borderColor: (videoPlayCount >= 3 || (!isPlaying && screenshot)) ? '#201E1E' : 'transparent' }}>
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
                  key={`guessing-${currentQuestionIndex}-${videoPlayCount}`}
                  src={movie.videoUrl}
                  startTime={srtTimeToSeconds(currentQuestion.video.start)}
                  endTime={srtTimeToSeconds(currentQuestion.video.end)}
                  muted={true}
                  showText={false}
                  text=""
                  playNonce={playNonce}
                  hidePauseOverlay={true}
                  activeControlIndex={3}
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
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(96, 217, 108, 0.3)',
                      animation: 'fadeInOut 3s ease-in-out',
                      fontWeight: '900'
                    }}
                  >
                    Correct!
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
          <div className="rounded-lg w-full mx-auto mt-5">
            <div 
              className="flex items-center justify-center rounded-lg w-fit mx-auto transition-all duration-300"
              style={{ 
                backgroundColor: '#201E1E', 
                gap: '20px', 
                paddingTop: '4px', 
                paddingBottom: '4px', 
                paddingLeft: '8px', 
                paddingRight: '8px',
                animation: 'none'
              }}
            >
                {currentQuestion && (
                <>
                  {currentQuestion.options.map((option: any, index: number) => (
                    <button
                      key={option.label}
                      className={`rounded-2xl border-8 px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                        playingAudio === option.label 
                          ? 'border-[#60D96C] animate-pulse-playing' 
                          : 'border-gray-300 hover:border-gray-400'
                      } ${allOptionsPlayed ? 'animate-pulse-button' : ''}`}
                      style={{ 
                        backgroundColor: 'white', 
                        fontFamily: 'Encode Sans, sans-serif', 
                        fontSize: '1.5rem',
                        borderColor: playingAudio === option.label ? '#60D96C' : undefined
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
                            setAllOptionsPlayed(false); // 다시 재생을 위해 초기화
                            // A부터 다시 자동 재생 시작
                            startAutoPlaySequence();
                          }, 2000);
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
