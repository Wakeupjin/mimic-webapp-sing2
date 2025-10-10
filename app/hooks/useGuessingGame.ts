import { useState, useRef, useCallback } from 'react';

interface GuessingGameState {
  currentIndex: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  videoPlayCount: number;
  userAnswers: string[];
  showResults: boolean;
  showIntro: boolean;
  isGuessingStarted: boolean;
  screenshot: string | null;
  screenshotTaken: boolean;
  playingAudio: string | null;
  autoPlaySequence: string[];
  currentAutoIndex: number;
  userInteracted: boolean;
  showCorrect: boolean;
  showAgain: boolean;
  allOptionsPlayed: boolean;
}

interface GuessingGameActions {
  setCurrentIndex: (index: number) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setTotalQuestions: (total: number) => void;
  setVideoPlayCount: (count: number) => void;
  setUserAnswers: (answers: string[]) => void;
  setShowResults: (show: boolean) => void;
  setShowIntro: (show: boolean) => void;
  setIsGuessingStarted: (started: boolean) => void;
  setScreenshot: (screenshot: string | null) => void;
  setScreenshotTaken: (taken: boolean) => void;
  setPlayingAudio: (audio: string | null) => void;
  setAutoPlaySequence: (sequence: string[]) => void;
  setCurrentAutoIndex: (index: number) => void;
  setUserInteracted: (interacted: boolean) => void;
  setShowCorrect: (show: boolean) => void;
  setShowAgain: (show: boolean) => void;
  setAllOptionsPlayed: (played: boolean) => void;
  loadGuessingData: (data: any[]) => void;
  startGuessing: () => void;
  playAudio: (option: any) => void;
  startAutoPlaySequence: () => void;
  handleAnswerSelect: (answer: string) => void;
  resetGuessingState: () => void;
}

export function useGuessingGame(): GuessingGameState & GuessingGameActions {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [videoPlayCount, setVideoPlayCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isGuessingStarted, setIsGuessingStarted] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [autoPlaySequence, setAutoPlaySequence] = useState<string[]>(['A', 'B', 'C']);
  const [currentAutoIndex, setCurrentAutoIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [allOptionsPlayed, setAllOptionsPlayed] = useState(false);

  const autoPlayIndexRef = useRef(0);
  const videoPlayCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadGuessingData = useCallback((data: any[]) => {
    setTotalQuestions(data.length);
  }, []);

  const startGuessing = useCallback(() => {
    console.log('🎮 게싱 시작');
    setIsGuessingStarted(true);
    setUserInteracted(true);
    setCurrentQuestionIndex(0);
    setVideoPlayCount(0);
    videoPlayCountRef.current = 0;
    setShowIntro(false);
  }, []);

  const startAutoPlaySequence = useCallback(() => {
    console.log('🎵 자동 재생 시퀀스 시작');
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
    setAllOptionsPlayed(false);
    
    // A, B, C 순차 재생 시작
    const playNextOption = () => {
      if (autoPlayIndexRef.current < 3) {
        const optionLabels = ['A', 'B', 'C'];
        const currentLabel = optionLabels[autoPlayIndexRef.current];
        console.log(`🎵 ${currentLabel} 자동 재생 시작`);
        
        // 실제 오디오 재생을 위해 playAudio 호출
        // currentQuestion과 options는 guessing/page.tsx에서 전달받아야 함
        setPlayingAudio(currentLabel);
        
        // 2초 후 다음 옵션 재생
        setTimeout(() => {
          autoPlayIndexRef.current += 1;
          setCurrentAutoIndex(autoPlayIndexRef.current);
          playNextOption();
        }, 2000);
      } else {
        console.log('🎵 모든 옵션 재생 완료');
        setAllOptionsPlayed(true);
      }
    };
    
    playNextOption();
  }, []);

  const playAudio = useCallback((option: any, currentQuestion?: any, movie?: any) => {
    console.log(`🎵 ${option.label} 오디오 재생:`, option.text);
    
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
    } else if (currentQuestion?.video) {
      // 옵션에 시간 정보가 없으면 기본 시간 사용
      startTime = srtTimeToSeconds(currentQuestion.video.start);
      endTime = srtTimeToSeconds(currentQuestion.video.end);
      console.log(`${option.label} 기본 시간 사용: ${startTime}초 ~ ${endTime}초`);
    } else {
      console.error(`${option.label} 재생 시간 정보 없음`);
      return;
    }
    
    // 오디오 로딩 대기
    if (audio.readyState < 4) {
      console.log(`${option.label} 오디오 로딩 중... (readyState: ${audio.readyState})`);
      
      // 오디오 로딩 강제 트리거
      if (audio.readyState < 2) {
        audio.load(); // 오디오 다시 로드
        console.log(`${option.label} 오디오 load() 호출`);
      }
      
      const retryCount = (audio as any).retryCount || 0;
      if (retryCount < 20) { // 최대 20번 재시도
        (audio as any).retryCount = retryCount + 1;
        setTimeout(() => {
          playAudio(option, currentQuestion, movie);
        }, 500); // 500ms 후 재시도
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
      console.log(`${option.label} 오디오 재생 시작`);
      setPlayingAudio(option.label);
      
      // endTime에 도달하면 자동 정지
      const checkTime = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          console.log(`${option.label} 오디오 재생 완료`);
          setPlayingAudio(null);
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      checkTime();
    }).catch((error) => {
      console.error(`${option.label} 오디오 재생 실패:`, error);
      setPlayingAudio(null);
    });
  }, [playingAudio]);

  const handleAnswerSelect = useCallback((selectedAnswer: string, correctAnswer?: string) => {
    setUserAnswers(prev => [...prev, selectedAnswer]);
    
    // 정답/오답 판단
    if (correctAnswer && selectedAnswer === correctAnswer) {
      setShowCorrect(true);
      setTimeout(() => setShowCorrect(false), 2000);
    } else {
      setShowAgain(true);
      setTimeout(() => setShowAgain(false), 2000);
    }
  }, []);

  const resetGuessingState = useCallback(() => {
    setCurrentIndex(0);
    setCurrentQuestionIndex(0);
    setTotalQuestions(0);
    setVideoPlayCount(0);
    setUserAnswers([]);
    setShowResults(false);
    setShowIntro(false);
    setIsGuessingStarted(false);
    setScreenshot(null);
    setScreenshotTaken(false);
    setPlayingAudio(null);
    setAutoPlaySequence(['A', 'B', 'C']);
    setCurrentAutoIndex(0);
    setUserInteracted(false);
    setShowCorrect(false);
    setShowAgain(false);
    setAllOptionsPlayed(false);
    autoPlayIndexRef.current = 0;
    videoPlayCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
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
    resetGuessingState,
  };
}
