'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from '@/app/components/VideoPlayer';
import ClickToStartOverlay from '@/app/components/ClickToStartOverlay';
import { getVideoSource } from '@/app/utils/videoSource';

export default function WordTestPage() {
  const [playCount, setPlayCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'playing' | 'guessing'>('playing');
  const [playNonce, setPlayNonce] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [hideAllWords, setHideAllWords] = useState(false);

  // Sample data - using main Sing2 video with timestamps from lesson data
  const currentScene = {
    videoPath: getVideoSource(),
    startTime: 103.721, // 00:01:43,721 from lesson-1.json
    endTime: 106.124,   // 00:01:46,124 - "All right, let's keep up the good work"
    correctWords: ['all right', 'let\'s', 'keep up', 'the', 'good', 'work']
  };

  const wordOptions = [
    'all right', 'give me', 'hear us', 'good',
    'under', 'let us', 'the', 'listen to',
    'let\'s', 'happy', 'work', 'keep up'
  ];

  const handleStart = () => {
    setShowStartOverlay(false);
    setTimeout(() => {
      setPlayNonce(1);
    }, 200);
  };

  const handleVideoEnd = () => {
    const newCount = playCount + 1;
    setPlayCount(newCount);

    if (newCount === 1) {
      // After first play, play again
      setTimeout(() => {
        setPlayNonce(prev => prev + 1);
      }, 500);
    } else if (newCount === 2) {
      // After second play, play muted
      setIsMuted(true);
      setTimeout(() => {
        setPlayNonce(prev => prev + 1);
      }, 500);
    } else if (newCount === 3) {
      // After muted play, start guessing phase
      setGamePhase('guessing');
    }
  };

  const playVideo = () => {
    setPlayNonce(prev => prev + 1);
  };

  const handleWordClick = (word: string) => {
    if (gamePhase === 'guessing' && !usedWords.includes(word)) {
      setSelectedWords(prev => [...prev, word]);
      setUsedWords(prev => [...prev, word]);
    }
  };

  const handleDeleteLast = () => {
    setSelectedWords(prev => {
      const lastWord = prev[prev.length - 1];
      if (lastWord) {
        setUsedWords(prevUsed => prevUsed.filter(w => w !== lastWord));
      }
      return prev.slice(0, -1);
    });
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

  const handleSubmit = () => {
    // Check if answer is correct
    const isCorrect = JSON.stringify(selectedWords) === JSON.stringify(currentScene.correctWords);

    // Hide all remaining word buttons
    setHideAllWords(true);

    if (isCorrect) {
      playCorrectSound();
      setShowCorrect(true);

      setTimeout(() => {
        // Move to next question or show completion
        setShowCorrect(false);
        setSelectedWords([]);
        setHideAllWords(false);
        alert('Great! Moving to next question...');
      }, 2000);
    } else {
      playAgainSound();
      setShowAgain(true);

      setTimeout(() => {
        setShowAgain(false);
        setSelectedWords([]);
        setUsedWords([]);
        setHideAllWords(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative">
      {/* Click to Start Overlay */}
      {showStartOverlay && (
        <ClickToStartOverlay
          onClick={handleStart}
          text="Click to Start"
          className="fixed"
        />
      )}

      {/* Main Content - Grid Layout */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="grid grid-cols-[180px_1fr_180px] gap-6 w-full max-w-[1400px] items-start">

          {/* Left Word Buttons */}
          <div className="flex flex-col gap-4 pt-0">
            {gamePhase === 'guessing' && wordOptions.slice(0, 6).map((word, index) => {
              const isUsed = usedWords.includes(word);
              const shouldHide = isUsed || hideAllWords;
              return (
                <button
                  key={index}
                  onClick={() => handleWordClick(word)}
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
            <div className="w-full mb-6">
              <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
                   style={{ border: '8px solid rgba(50, 50, 50, 0.8)' }}>

                {/* SKIP Button */}
                <button className="absolute top-4 right-4 z-20 bg-gray-700/90 hover:bg-gray-600 text-white font-bold px-5 py-2 rounded-full text-sm uppercase tracking-wider shadow-lg">
                  SKIP
                </button>

                <VideoPlayer
                  src={currentScene.videoPath}
                  startTime={currentScene.startTime}
                  endTime={currentScene.endTime}
                  onEndedSegment={handleVideoEnd}
                  muted={isMuted}
                  showText={false}
                  text=""
                  playNonce={playNonce}
                  hidePauseOverlay={true}
                />

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
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4 mb-6 items-center">
              <button
                onClick={handleReplay}
                disabled={gamePhase === 'playing'}
                className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                ◀
              </button>
              <button
                onClick={playVideo}
                disabled={gamePhase === 'playing'}
                className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                ▶
              </button>
              <button
                onClick={handleDeleteLast}
                disabled={selectedWords.length === 0 || gamePhase === 'playing'}
                className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                🗑️
              </button>

              {/* Progress Indicator */}
              <div className="ml-auto flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-xl">
                <span className="text-xl font-bold text-white">07 / 10</span>
                <span className="text-green-400 text-xl">▲</span>
              </div>
            </div>

            {/* Chameleon Mascot - Check Button */}
            <button
              onClick={handleSubmit}
              disabled={selectedWords.length === 0}
              className="text-7xl hover:scale-110 transition-transform disabled:opacity-30 disabled:cursor-not-allowed mb-4"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(96, 217, 108, 0.4))' }}
            >
              🦎
            </button>
          </div>

          {/* Right Word Buttons */}
          <div className="flex flex-col gap-4 pt-0">
            {gamePhase === 'guessing' && wordOptions.slice(6).map((word, index) => {
              const isUsed = usedWords.includes(word);
              const shouldHide = isUsed || hideAllWords;
              return (
                <button
                  key={index + 6}
                  onClick={() => handleWordClick(word)}
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
    </div>
  );
}
