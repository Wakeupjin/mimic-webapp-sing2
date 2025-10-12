'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import VideoPlayer from '@/app/components/VideoPlayer';
import ClickToStartOverlay from '@/app/components/ClickToStartOverlay';
import WordCompleteButtons from '@/app/components/WordCompleteButtons';
import { useFullscreen } from '@/app/hooks/useFullscreen';
import { fetchLessonData } from '@/app/dataService';
import { supabase } from '@/app/supabaseClient';
import { srtTimeToSeconds } from '@/app/utils/timeUtils';
import Link from 'next/link';
import { saveProgress, getProgressByMode, saveLog, saveResult } from '@/app/lib/progress';
import { getVideoSource, getVideoSourceWithTimeRange } from '@/app/utils/videoSource';

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

// Type definitions for Supabase data
interface LessonDataType {
  id: number;
  lesson_number: number;
  video_id: number;
  word_data: any[];
  watching_data: any;
}

function WordPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';

  // 모든 훅을 최상단으로 이동
  const [supabaseLessonData, setSupabaseLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(1);

  const [playCount, setPlayCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'playing' | 'guessing'>('playing');
  const [playNonce, setPlayNonce] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [hideAllWords, setHideAllWords] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);

  // Use ref to track actual play count (avoids closure issues in handleVideoEnd)
  const playCountRef = useRef(0);
  const [isPlayingMuted, setIsPlayingMuted] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // 커스텀 훅 사용
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const totalQuestions = 10;

  // Extract current chapter number from movieId (e.g., "001:1" -> 1)
  const currentChapter = parseInt(movieId.split(':')[1] || '1', 10);
  const hasNextChapter = currentChapter < 12; // Assuming 12 chapters total

  // Supabase 데이터 로드
  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      const lessonNumberStr = movieId.split(':')[1];
      const lessonNumber = parseInt(lessonNumberStr);
      setLessonNumber(lessonNumber);

      if (isNaN(lessonNumber)) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Lesson 데이터 (word_data 포함) 가져오기
        const lesson = await fetchLessonData(lessonNumber); 

        if (!lesson) {
          setIsLoading(false);
          return;
        }
        
        // 2. video_id를 이용해 Video URL 가져오기
        const { data: videoResult, error: videoError } = await supabase
          .from('videos')
          .select('video_url')
          .eq('id', lesson.video_id)
          .single();

        if (videoError || !videoResult) {
          console.error('Video URL fetching error:', videoError);
          setIsLoading(false);
          return;
        }

        // 3. 상태 업데이트
        setSupabaseLessonData(lesson as LessonDataType); 
        setVideoUrl(videoResult.video_url); 
        setLessonData({ word: lesson.word_data || [] });
        setIsLoading(false);
        
        // 4. 저장된 진도 불러오기
        try {
          const progress = await getProgressByMode(lessonNumber, 'word');
          if (progress) {
            setSavedProgress(progress);
            console.log('📚 저장된 워드 진도 불러옴:', progress);
          }
        } catch (error) {
          console.log('워드 진도 데이터 없음 (첫 학습)');
        }
      } catch (error) {
        console.error('Supabase data loading error:', error);
        setIsLoading(false);
      }
    };

    loadDataFromSupabase();
  }, [movieId]);

  // 워드 진도 저장 useEffect
  useEffect(() => {
    if (!lessonNumber || !isStarted) return;

    const saveProgressInterval = setInterval(async () => {
      try {
        await saveProgress(
          lessonNumber,
          'word',
          currentQuestionNumber > totalQuestions, // 완료 상태
          currentQuestionNumber, // 현재 문제 번호
          { 
            currentQuestion: currentQuestionNumber,
            totalQuestions: totalQuestions,
            selectedWords: selectedWords,
            isComplete: currentQuestionNumber > totalQuestions,
            lastSaved: new Date().toISOString()
          }
        );
        console.log('💾 워드 진도 저장됨:', currentQuestionNumber);
      } catch (error) {
        console.error('워드 진도 저장 실패:', error);
      }
    }, 20000); // 20초마다 저장

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isStarted, currentQuestionNumber, totalQuestions, selectedWords]);

  // 워드 완료 시 최종 저장
  useEffect(() => {
    if (currentQuestionNumber > totalQuestions && lessonNumber) {
      const saveFinalProgress = async () => {
        try {
          // 진도 저장
          await saveProgress(lessonNumber, 'word', true, currentQuestionNumber, {
            currentQuestion: currentQuestionNumber,
            totalQuestions: totalQuestions,
            isComplete: true,
            completed_at: new Date().toISOString()
          });
          
          // 결과 저장 (워드 모드는 정확한 점수 계산이 어려우므로 완료 여부만 저장)
          await saveResult(
            lessonNumber,
            'word',
            100, // 완료 시 100점
            totalQuestions,
            totalQuestions,
            Date.now()
          );
          
          // 로그 저장
          await saveLog(lessonNumber, 'word', 'word_completed', {
            totalQuestions: totalQuestions,
            completed_at: new Date().toISOString()
          });
          
          console.log('🎉 워드 모드 완료!');
        } catch (error) {
          console.error('워드 완료 저장 실패:', error);
        }
      };
      saveFinalProgress();
    }
  }, [currentQuestionNumber, totalQuestions, lessonNumber]);

  // Generate a new question from word section
  const generateQuestion = () => {
    if (!lessonData || !lessonData.word) return;
    if (currentQuestionNumber > totalQuestions) return;

    const wordQuestion = lessonData.word[currentQuestionNumber - 1];
    if (!wordQuestion) return;

    // Parse text into words and filter out punctuation-only tokens
    const rawWords = wordQuestion.text.split(' ');
    const words = rawWords.filter(word => {
      // Remove punctuation from the word to check if it contains any alphabetic characters
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      return cleanWord.length > 0; // Only keep words that have at least one letter
    });

    // If less than 10 words, add distractor words from other word questions
    let allWords = [...words];
    if (words.length < 10) {
      // Get all other sentences' words (from word questions, not current one)
      const otherWords: string[] = [];
      lessonData.word.forEach((wq, idx) => {
        if (idx !== currentQuestionNumber - 1) {
          const lineWords = wq.text.split(' ').filter(word => {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            return cleanWord.length > 0; // Only keep words with letters
          });
          otherWords.push(...lineWords);
        }
      });

      // Randomly pick distractor words, ensuring no duplicates
      const neededWords = 10 - words.length;
      const shuffledOtherWords = otherWords.sort(() => Math.random() - 0.5);

      // Filter out words that are already in the correct answer
      const uniqueDistractors: string[] = [];
      for (const word of shuffledOtherWords) {
        // Check if this word (case-insensitive) is not already in words or uniqueDistractors
        if (!words.some(w => w.toLowerCase() === word.toLowerCase()) &&
            !uniqueDistractors.some(w => w.toLowerCase() === word.toLowerCase())) {
          uniqueDistractors.push(word);
          if (uniqueDistractors.length >= neededWords) break;
        }
      }

      allWords = [...words, ...uniqueDistractors];
    }

    // Shuffle all words (correct + distractors)
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);

    const startTime = srtTimeToSeconds(wordQuestion.start);
    const endTime = srtTimeToSeconds(wordQuestion.end);
    // console.log(`🎬 Word Question ${currentQuestionNumber}:`);
    // console.log(`  - Original start: "${wordQuestion.start}" → ${startTime}s`);
    // console.log(`  - Original end: "${wordQuestion.end}" → ${endTime}s`);
    // console.log(`  - Duration: ${endTime - startTime}s`);
    
    setCurrentQuestion({
      videoPath: videoUrl || '',
      startTime: startTime,
      endTime: endTime,
      correctWords: words,
      shuffledWords: shuffled
    });
  };

  // Initialize first question when lesson data is loaded
  useEffect(() => {
    if (lessonData && lessonData.word && !currentQuestion) {
      generateQuestion();
    }
  }, [lessonData]);

  // Generate new question when currentQuestionNumber changes
  useEffect(() => {
    if (lessonData && lessonData.word && currentQuestionNumber > 1) {
      generateQuestion();
    }
  }, [currentQuestionNumber]);

  const handleStart = () => {
    // console.log('Starting video sequence');
    setShowStartOverlay(false);
    setIsStarted(true);
    playCountRef.current = 0; // Reset ref
    // setPlayCount(0) will be called in onPlay when 1st video actually starts
    setIsMuted(false);
    setIsPlayingMuted(false);
    setPlayNonce(0); // Reset to 0 first
    setTimeout(() => {
      setPlayNonce(prev => prev + 1); // Increment like "Again" flow
    }, 200); // Match "Again" timing
  };

  const handleVideoEnd = () => {
    const currentCount = playCountRef.current;
    // console.log('🏁 Video ended. playCountRef.current:', currentCount);

    // Update ref IMMEDIATELY to prevent double-trigger
    playCountRef.current = currentCount + 1;

    if (currentCount === 0) {
      // After 1st play (unmuted) → wait → 2nd play (unmuted)
      // console.log('✅ 1st video complete → waiting 1s → 2nd video (unmuted)');
      // setPlayCount(1) will be called in onPlay when 2nd video actually starts
      setTimeout(() => {
        // console.log('▶️ 2nd video starting (unmuted)');
        setPlayNonce(prev => prev + 1);
      }, 1000);
    } else if (currentCount === 1) {
      // After 2nd play (unmuted) → wait → 3rd play (muted with green border)
      // console.log('✅ 2nd video complete → waiting 1s → 3rd video (MUTED with green border)');
      setTimeout(() => {
        // console.log('▶️ 3rd video starting (MUTED)');
        // Border will turn green in onPlay callback when video actually starts
        setIsMuted(true);
        setIsPlayingMuted(true);
        setPlayNonce(prev => prev + 1);
      }, 1000);
    } else if (currentCount === 2) {
      // After 3rd play (muted) → wait 1.5s → show word buttons
      // console.log('✅ 3rd video complete → showing word buttons after 1.5s delay');
      setTimeout(() => {
        setPlayCount(3);
        setIsPlayingMuted(false);
        setIsMuted(false);
        setGamePhase('guessing');
        // console.log('⏳ 1.5s delay complete, showing word buttons now');
      }, 1500);
      return;
    }
  };

  const playVideo = () => {
    setPlayNonce(prev => prev + 1);
  };

  const handleWordClick = (word: string, index: number) => {
    if (gamePhase === 'guessing' && !usedWords.includes(index.toString())) {
      setSelectedWords(prev => [...prev, word]);
      setUsedWords(prev => [...prev, index.toString()]);
    }
  };

  const handleDeleteLast = () => {
    if (selectedWords.length > 0) {
      setSelectedWords(prev => prev.slice(0, -1));
      setUsedWords(prev => prev.slice(0, -1));
    }
  };

  const handleReplay = () => {
    // Trigger replay by incrementing playNonce
    setPlayNonce(prev => prev + 1);
  };

  const playCorrectSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createCorrectSound(audioContext);
        });
      } else {
        createCorrectSound(audioContext);
      }

      function createCorrectSound(ctx: AudioContext) {
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (Do-Mi-Sol ascending)
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
      }
    } catch (error) {
      console.error('소리 재생 실패:', error);
    }
  };

  const playAgainSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          createAgainSound(audioContext);
        });
      } else {
        createAgainSound(audioContext);
      }

      function createAgainSound(ctx: AudioContext) {
        const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5 (Sol-Mi-Do descending)
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
      }
    } catch (error) {
      console.error('소리 재생 실패:', error);
    }
  };

  const handleAgain = () => {
    // Reset to first question
    setShowCompletion(false);
    setCurrentQuestionNumber(1);
    playCountRef.current = 0; // Reset ref
    setPlayCount(0);
    setIsMuted(false);
    setIsPlayingMuted(false);
    setGamePhase('playing');
    setSelectedWords([]);
    setUsedWords([]);
    setHideAllWords(false);
    setShowStartOverlay(true);
    setIsStarted(false);
  };

  const handleNext = () => {
    // Navigate to next chapter
    const nextChapter = currentChapter + 1;
    if (nextChapter <= 12) {
      window.location.href = `/sing2/word?id=001:${nextChapter}`;
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;

    // Check if answer is correct
    const isCorrect = JSON.stringify(selectedWords) === JSON.stringify(currentQuestion.correctWords);

    // Hide all remaining word buttons
    setHideAllWords(true);

    if (isCorrect) {
      playCorrectSound();
      setShowCorrect(true);

      setTimeout(() => {
        setShowCorrect(false);
        setSelectedWords([]);
        setUsedWords([]);
        setHideAllWords(false);

        // Check if we've completed all 10 questions
        if (currentQuestionNumber >= totalQuestions) {
          // Show completion UI
          setShowCompletion(true);
        } else {
          // Move to next question
          playCountRef.current = 0; // Reset ref
          setPlayCount(0);
          setIsMuted(false);
          setIsPlayingMuted(false);
          setGamePhase('playing');
          setPlayNonce(0); // Reset playNonce to 0 BEFORE changing question
          setCurrentQuestionNumber(prev => prev + 1); // This will trigger useEffect to generate question
          setTimeout(() => {
            setPlayNonce(prev => prev + 1);
          }, 200);
        }
      }, 2000);
    } else {
      playAgainSound();
      setShowAgain(true);

      setTimeout(() => {
        // Restart the video sequence (play -> play -> muted play)
        setShowAgain(false);
        setSelectedWords([]);
        setUsedWords([]);
        setHideAllWords(false);
        playCountRef.current = 0; // Reset ref
        setPlayCount(0);
        setIsMuted(false);
        setIsPlayingMuted(false);
        setGamePhase('playing');
        setTimeout(() => {
          setPlayNonce(prev => prev + 1);
        }, 200);
      }, 2000);
    }
  };

  // 로딩 화면
  if (isLoading || !supabaseLessonData || !videoUrl || !lessonData) {
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

  return (
    <main className="min-h-screen px-4 py-4">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
          <span className="text-lg text-gray-400" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            Question {currentQuestionNumber}/{totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsTextVisible((v) => !v)}
            className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
            style={{ width: '29px', height: '29px' }}
          >
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
          <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 flex items-center justify-center" style={{
        paddingLeft: isFullscreen ? '16px' : '32px',
        paddingRight: isFullscreen ? '16px' : '32px',
        paddingTop: isFullscreen ? '8px' : '20px',
        paddingBottom: isFullscreen ? '8px' : '20px'
      }}>
        <div className="grid grid-cols-[180px_1fr_180px] gap-6 w-full" style={{
          maxWidth: isFullscreen ? '100%' : '1400px'
        }} items-start>

          {/* Left Word Buttons */}
          <div className="flex flex-col gap-4 pt-0">
            {gamePhase === 'guessing' && currentQuestion && currentQuestion.shuffledWords.slice(0, 5).map((word, index) => {
              const isUsed = usedWords.includes(index.toString());
              const shouldHide = isUsed || hideAllWords;
              return (
                <button
                  key={index}
                  onClick={() => handleWordClick(word, index)}
                  className={`bg-white text-black font-bold text-lg py-4 px-6 rounded-2xl transition-all shadow-lg w-full border-4 border-gray-300 ${
                    shouldHide
                      ? 'opacity-0 scale-75 pointer-events-none'
                      : 'hover:bg-gray-100 hover:shadow-xl hover:scale-105'
                  }`}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    transition: 'opacity 0.4s ease, transform 0.4s ease'
                  }}
                  disabled={shouldHide}
                >
                  {word}
                </button>
              );
            })}
          </div>

          {/* Center Column - Video and Controls */}
          <div className="flex flex-col items-center">
            {/* Video Player */}
            <div className="w-full mb-4" style={{ maxWidth: isFullscreen ? '100%' : '800px' }}>
              <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
                   style={{ border: `8px solid ${playCount === 2 && gamePhase === 'playing' && isStarted ? '#60D96C' : '#201E1E'}` }}>


                <div style={{ marginTop: '-4px' }}>
                  {currentQuestion && (
                    <VideoPlayer
                      key={`word-${currentQuestionNumber}`}
                      src={currentQuestion ? getVideoSourceWithTimeRange(
                        currentQuestion.startTime,
                        currentQuestion.endTime
                      ) : getVideoSource()}
                      startTime={currentQuestion.startTime}
                      endTime={currentQuestion.endTime}
                      onEndedSegment={handleVideoEnd}
                      onPlay={() => {
                        // Turn button/border green when video actually starts playing
                        const currentCount = playCountRef.current;
                        // console.log(`🎬 Video ${currentCount + 1} actually playing - button ${currentCount} turns green NOW`);
                        setPlayCount(currentCount);
                      }}
                      muted={isMuted}
                      showText={false}
                      text=""
                      playNonce={gamePhase === 'playing' && isStarted ? playNonce : 0}
                      playing={gamePhase === 'playing' && isStarted}
                      hidePauseOverlay={true}
                      disableOnReadySeek={true}
                    />
                  )}
                </div>

                {/* Click to Start Overlay - 비디오 플레이어 위에만 표시 */}
                {showStartOverlay && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer z-10" onClick={handleStart}>
                    <div className="text-center">
                      <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
                        클릭하여 시작하세요
                      </div>
                    </div>
                  </div>
                )}

                {/* Correct Overlay */}
                {showCorrect && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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

                {/* Again Overlay */}
                {showAgain && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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

                {/* Completion Overlay */}
                {showCompletion && (
                  <WordCompleteButtons
                    onAgain={handleAgain}
                    onNext={handleNext}
                    hasNextChapter={hasNextChapter}
                  />
                )}
              </div>
            </div>

            {/* Control Buttons - 원래 하단바 디자인 */}
            <div className="rounded-lg w-full mx-auto" style={{ 
              paddingTop: '4px', 
              paddingBottom: '4px', 
              paddingLeft: '8px', 
              paddingRight: '8px',
              marginTop: isFullscreen ? '0px' : '-10px',
              position: 'relative',
              zIndex: 50
            }}>
              {/* 5개 버튼 컨테이너 */}
              <div className="flex items-center justify-center rounded-lg w-fit mx-auto" style={{ 
                backgroundColor: '#201E1E', 
                opacity: 1, 
                gap: '6px', 
                paddingTop: '4px', 
                paddingBottom: '4px',
                paddingLeft: '8px', 
                paddingRight: '8px',
                position: 'relative',
                zIndex: 51,
                alignItems: 'center'
              }}>
                {/* 이전 버튼 - 동그라미 */}
                <div 
                  className="flex items-center justify-center cursor-pointer rounded-lg transition-transform duration-200 hover:scale-110"
                  onClick={handleReplay}
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#201E1E',
                    opacity: gamePhase === 'playing' ? 1 : 1,
                    cursor: gamePhase === 'playing' ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="이전"
                >
                  <div 
                    style={{
                      width: '0',
                      height: '0',
                      borderRight: '36px solid #666666',
                      borderTop: '27px solid transparent',
                      borderBottom: '27px solid transparent'
                    }}
                  />
                </div>

                {/* 재생 버튼 1 */}
                <div
                  className="flex items-center justify-center text-black font-bold text-lg transition-transform duration-300"
                  style={{
                    background: playCount === 0 && gamePhase === 'playing' && isStarted ? '#60D96C' : '#666666',
                    borderRadius: '10px',
                    width: '56.97px',
                    height: '56.97px',
                    position: 'relative',
                    boxSizing: 'border-box',
                    cursor: 'default',
                    pointerEvents: 'none'
                  }}
                  aria-label="재생"
                >
                  <div
                    style={{
                      width: '0',
                      height: '0',
                      borderLeft: '21.6px solid black',
                      borderTop: '14.4px solid transparent',
                      borderBottom: '14.4px solid transparent'
                    }}
                  />
                </div>

                {/* 재생 버튼 2 */}
                <div
                  className="flex items-center justify-center text-black font-bold text-lg transition-transform duration-300"
                  style={{
                    background: playCount === 1 && gamePhase === 'playing' && isStarted ? '#60D96C' : '#666666',
                    borderRadius: '10px',
                    width: '56.97px',
                    height: '56.97px',
                    position: 'relative',
                    boxSizing: 'border-box',
                    cursor: 'default',
                    pointerEvents: 'none'
                  }}
                  aria-label="재생"
                >
                  <div
                    style={{
                      width: '0',
                      height: '0',
                      borderLeft: '21.6px solid black',
                      borderTop: '14.4px solid transparent',
                      borderBottom: '14.4px solid transparent'
                    }}
                  />
                </div>

                {/* 무음 버튼 */}
                <div
                  className="flex items-center justify-center text-black font-bold text-lg transition-transform duration-300"
                  style={{
                    background: playCount === 2 && gamePhase === 'playing' && isStarted ? '#60D96C' : '#666666',
                    borderRadius: '10px',
                    width: '56.97px',
                    height: '56.97px',
                    position: 'relative',
                    boxSizing: 'border-box',
                    cursor: 'default',
                    pointerEvents: 'none'
                  }}
                  aria-label="무음 재생"
                >
                  <span style={{ fontFamily: 'Jolly Lodger, cursive', fontSize: '48px', fontWeight: '300' }}>m</span>
                </div>

                {/* 우측 방향 버튼 */}
                <div 
                  className="flex items-center justify-center cursor-pointer rounded-lg transition-transform duration-200 hover:scale-110"
                  onClick={playVideo}
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#201E1E',
                    opacity: gamePhase === 'playing' ? 1 : 1,
                    cursor: gamePhase === 'playing' ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="다음"
                >
                  <div 
                    style={{
                      width: '0',
                      height: '0',
                      borderLeft: '36px solid #666666',
                      borderTop: '27px solid transparent',
                      borderBottom: '27px solid transparent'
                    }}
                  />
                </div>
                {/* Delete Button - 쓰레기통 */}
            <button
              onClick={handleDeleteLast}
              disabled={selectedWords.length === 0 || gamePhase === 'playing'}
              className="text-4xl hover:scale-110 transition-transform disabled:opacity-100 disabled:cursor-not-allowed rounded-full p-3"
              style={{ 
                width: '60px', 
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 52,
                backgroundColor: '#201E1E'
              }}
              aria-label="마지막 단어 삭제"
            >
              🗑️
            </button>
              </div>
            </div>

            {/* Chameleon Mascot - Check Button */}
            <button
              onClick={handleSubmit}
              disabled={selectedWords.length === 0}
              className="hover:scale-110 transition-transform disabled:opacity-100 disabled:cursor-not-allowed mb-4"
              style={{ 
                width: '108px',
                height: '108px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                position: 'relative',
                zIndex: 52
              }}
            >
              <img 
                src="/Subject.png" 
                alt="카멜레온" 
                className="w-full h-full object-contain"
              />
            </button>
          </div>

          {/* Right Word Buttons */}
          <div className="flex flex-col gap-4 pt-0">
            {gamePhase === 'guessing' && currentQuestion && currentQuestion.shuffledWords.slice(5, 10).map((word, index) => {
              const actualIndex = index + 5;
              const isUsed = usedWords.includes(actualIndex.toString());
              const shouldHide = isUsed || hideAllWords;
              return (
                <button
                  key={actualIndex}
                  onClick={() => handleWordClick(word, actualIndex)}
                  className={`bg-white text-black font-bold text-lg py-4 px-6 rounded-2xl transition-all shadow-lg w-full border-4 border-gray-300 ${
                    shouldHide
                      ? 'opacity-0 scale-75 pointer-events-none'
                      : 'hover:bg-gray-100 hover:shadow-xl hover:scale-105'
                  }`}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    transition: 'opacity 0.4s ease, transform 0.4s ease'
                  }}
                  disabled={shouldHide}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Words Display */}
        {selectedWords.length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/95 rounded-2xl p-5 flex items-center gap-3 shadow-2xl border-2 border-gray-700">
            {selectedWords.map((word, index) => (
              <span key={index} className="bg-green-500 px-5 py-3 rounded-xl font-bold text-white text-lg shadow-lg">
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function WordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WordPageContent />
    </Suspense>
  );
}
