"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFullscreen } from '../../hooks/useFullscreen';

export default function ResultPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  const [showCelebration, setShowCelebration] = useState(false);

  // Extract current chapter number from movieId (e.g., "001:1" -> 1)
  const currentChapter = parseInt(movieId.split(':')[1] || '1', 10);
  const hasNextChapter = currentChapter < 12; // Assuming 12 chapters total

  // Celebration animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCelebration(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleModeSelect = (mode: string) => {
    // Switch to different mode (maintain fullscreen if needed)
    const isCurrentlyFullscreen = document.fullscreenElement !== null;
    if (isCurrentlyFullscreen) {
      sessionStorage.setItem('maintainFullscreen', 'true');
    }
    
    // Small delay before navigation (ensure sessionStorage is saved)
    setTimeout(() => {
      window.location.href = `/sing2/${mode}?id=${movieId}`;
    }, 100);
  };

  const handleNextChapter = () => {
    const nextChapter = currentChapter + 1;
    const nextMovieId = `001:${nextChapter}`;
    
    // Switch to next chapter (maintain fullscreen if needed)
    const isCurrentlyFullscreen = document.fullscreenElement !== null;
    if (isCurrentlyFullscreen) {
      sessionStorage.setItem('maintainFullscreen', 'true');
    }
    
    // Small delay before navigation
    setTimeout(() => {
      window.location.href = `/sing2/selecting?id=${nextMovieId}`;
    }, 100);
  };

  return (
    <main className="min-h-screen px-4 py-4 flex flex-col items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between w-full max-w-4xl">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
        <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center text-center max-w-2xl">
        {/* Celebration Animation */}
        <div className={`mb-8 transition-all duration-1000 ${showCelebration ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`}>
          <div className="text-8xl mb-4">🎉</div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            Congratulations!
          </h2>
          <p className="text-xl text-gray-300 mb-8" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            You've completed Chapter {currentChapter}
          </p>
        </div>

        {/* Mode Selection Buttons */}
        <div className="grid grid-cols-2 gap-6 mb-8 w-full max-w-lg">
          <button
            onClick={() => handleModeSelect('watching')}
            className="bg-white text-black font-bold py-6 px-8 rounded-2xl border-8 border-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ fontFamily: 'Encode Sans, sans-serif', fontSize: '1.2rem' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            📺 Watching
          </button>
          
          <button
            onClick={() => handleModeSelect('mimicking')}
            className="bg-white text-black font-bold py-6 px-8 rounded-2xl border-8 border-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ fontFamily: 'Encode Sans, sans-serif', fontSize: '1.2rem' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            🎭 Mimicking
          </button>
          
          <button
            onClick={() => handleModeSelect('guessing')}
            className="bg-white text-black font-bold py-6 px-8 rounded-2xl border-8 border-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ fontFamily: 'Encode Sans, sans-serif', fontSize: '1.2rem' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            🤔 Guessing
          </button>
          
          <button
            onClick={() => handleModeSelect('word')}
            className="bg-white text-black font-bold py-6 px-8 rounded-2xl border-8 border-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
            style={{ fontFamily: 'Encode Sans, sans-serif', fontSize: '1.2rem' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            📝 Word
          </button>
        </div>

        {/* Next Chapter Button */}
        {hasNextChapter && (
          <button
            onClick={handleNextChapter}
            className="relative bg-white text-black font-bold py-6 px-12 rounded-2xl border-8 border-[#60D96C] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-[#4CAF50] mb-4"
            style={{
              fontFamily: 'Encode Sans, sans-serif',
              fontSize: '1.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {/* Chameleon image overlay */}
            <img 
              src="/Subject.png" 
              alt="Chameleon" 
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
              style={{ maxWidth: '80px', height: 'auto' }}
            />
            Next Chapter ({currentChapter + 1})
          </button>
        )}

        {/* Back to Selection */}
        <Link
          href={`/sing2/selecting?id=${movieId}`}
          className="text-[#60D96C] text-lg hover:text-[#4CAF50] transition-colors duration-200"
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          ← Back to Chapter Selection
        </Link>
      </div>
    </main>
  );
}
