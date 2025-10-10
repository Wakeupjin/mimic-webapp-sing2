import { useState, useRef, useCallback } from 'react';

export function useGuessing() {
  const [isGuessingMode, setIsGuessingMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [videoPlayCount, setVideoPlayCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [allOptionsPlayed, setAllOptionsPlayed] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [autoPlaySequence, setAutoPlaySequence] = useState<string[]>([]);
  const [currentAutoIndex, setCurrentAutoIndex] = useState(0);
  
  const autoPlayIndexRef = useRef(0);

  const resetGuessingState = useCallback(() => {
    setUserAnswer(null);
    setShowCorrect(false);
    setShowAgain(false);
    setUserInteracted(false);
    setAllOptionsPlayed(false);
    setPlayingAudio(null);
    setAutoPlaySequence([]);
    setCurrentAutoIndex(0);
    autoPlayIndexRef.current = 0;
  }, []);

  const startGuessingMode = useCallback(() => {
    setIsGuessingMode(true);
    resetGuessingState();
  }, [resetGuessingState]);

  const exitGuessingMode = useCallback(() => {
    setIsGuessingMode(false);
    resetGuessingState();
  }, [resetGuessingState]);

  return {
    // 상태
    isGuessingMode,
    setIsGuessingMode,
    currentQuestion,
    setCurrentQuestion,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    videoPlayCount,
    setVideoPlayCount,
    userAnswers,
    setUserAnswers,
    showIntro,
    setShowIntro,
    userAnswer,
    setUserAnswer,
    showCorrect,
    setShowCorrect,
    showAgain,
    setShowAgain,
    showResults,
    setShowResults,
    userInteracted,
    setUserInteracted,
    allOptionsPlayed,
    setAllOptionsPlayed,
    playingAudio,
    setPlayingAudio,
    autoPlaySequence,
    setAutoPlaySequence,
    currentAutoIndex,
    setCurrentAutoIndex,
    
    // refs
    autoPlayIndexRef,
    
    // 함수
    resetGuessingState,
    startGuessingMode,
    exitGuessingMode
  };
}
