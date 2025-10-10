"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import PauseOverlay from "../../components/PauseOverlay";
import { WATCHING_NAVIGATION_DELAY_MS } from "../../constants/timings"; // 재사용
// import { useRecording } from "../../hooks/useRecording"; // 🚫 녹음 훅 제거 (에러 해결)

// --- [SUPABASE 연결 및 타입 정의] ---
import { fetchLessonData } from '../../dataService'; // 당신의 dataService.js 경로에 맞게 수정하세요.
import { supabase } from '../../supabaseClient'; // 비디오 URL을 가져오기 위해 직접 supabase 클라이언트 사용
import { notFound } from 'next/navigation';

// Mimicking 문장 데이터 타입
type MimicSentence = {
  id: number;
  text: string;
  start_sec: number; // 데이터베이스에서 초 단위로 저장
  end_sec: number;   // 데이터베이스에서 초 단위로 저장
};

// Lesson 데이터 타입 (mimic_data 배열 포함)
type LessonDataType = {
  watch_start_sec: number;
  watch_end_sec: number;
  video_id: number;
  lesson_number: number;
  mimic_data: MimicSentence[]; // 핵심: 모방할 문장 리스트
};
// --- [/SUPABASE 연결 및 타입 정의] ---


function MimickingPageContent() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  
  // --- [새로운 상태 및 데이터 로딩] ---
  const [lessonData, setLessonData] = useState<LessonDataType | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mimicDataList, setMimicDataList] = useState<MimicSentence[]>([]); // 추출된 문장 리스트

  // Supabase 데이터 로딩 useEffect
  useEffect(() => {
    if (!movieId) return;

    const loadDataFromSupabase = async () => {
      setIsLoading(true);

      const lessonNumberStr = movieId.split(':')[1];
      const lessonNumber = parseInt(lessonNumberStr);

      if (isNaN(lessonNumber)) {
        setIsLoading(false);
        return; 
      }

      // 2. Lesson 데이터 (mimic_data 포함) 가져오기
      const lesson = await fetchLessonData(lessonNumber); 

      if (!lesson) {
        setIsLoading(false);
        return;
      }
      
      // 3. Video URL 가져오기
      const { data: videoResult, error: videoError } = await supabase
        .from('videos')
        .select('video_url, title')
        .eq('id', lesson.video_id)
        .single();

      if (videoError || !videoResult) {
        console.error('Video URL fetching error:', videoError);
        setIsLoading(false);
        return;
      }

      // 4. 상태 업데이트
      console.log('Supabase lesson data:', lesson);
      console.log('Mimic data:', lesson.mimic_data);
      console.log('Mimic data length:', lesson.mimic_data?.length);
      if (lesson.mimic_data && lesson.mimic_data.length > 0) {
        console.log('First mimic item:', lesson.mimic_data[0]);
        console.log('start_sec type:', typeof lesson.mimic_data[0]?.start_sec);
        console.log('start_sec value:', lesson.mimic_data[0]?.start_sec);
      }
      setLessonData(lesson as LessonDataType); 
      setVideoUrl(videoResult.video_url); 
      setMimicDataList(lesson.mimic_data || []); 
      setIsLoading(false);
    };

    loadDataFromSupabase();
  }, [movieId]);
  // --- [/새로운 상태 및 데이터 로딩] ---


  // Custom hooks (기존 코드 유지)
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
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

  // 🚫 useRecording 훅 제거로 인한 주석 처리 (에러 해결)
  // const { startRecording, stopRecording, isRecording, mediaRecorder, recordingBlob } = useRecording(); 

  // 로컬 상태 (기존 코드 유지)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackMode, setPlaybackMode] = useState<'loop' | 'mimic'>('loop'); // 'loop': 원본 반복 재생, 'mimic': 녹음 재생 (임시)

  // --- 비디오 재생 구간 설정 및 로직 ---
  const currentSentence = useMemo(() => {
    if (mimicDataList.length === 0) return null;
    return mimicDataList[currentSentenceIndex];
  }, [mimicDataList, currentSentenceIndex]);

  // 비디오 시작 시간 설정 및 재생 (currentSentence가 바뀔 때마다 실행)
  useEffect(() => {
    if (videoRef.current && currentSentence) {
      const video = videoRef.current;
      // 유효한 시간 값인지 확인
      const startTime = Number(currentSentence.start_sec);
      console.log('Mimicking - start_sec:', currentSentence.start_sec, 'converted:', startTime, 'isFinite:', isFinite(startTime));
      if (isFinite(startTime) && startTime >= 0) {
        video.currentTime = startTime;
      } else {
        console.error('Invalid start_sec value:', currentSentence.start_sec);
      }
      
      if (isVideoStarted && playbackMode === 'loop') {
        video.play();
      }
    }
  }, [currentSentence, isVideoStarted, playbackMode]);


  // Keyboard event handling (녹음 로직 제거)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent fullscreen exit via ESC
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Spacebar: Play/Pause
      else if (e.code === "Space") {
        e.preventDefault();
        
        // 🚫 녹음 관련 if (playbackMode === 'mimic' && recordingBlob) { ... } 제거
        
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // 🚫 의존성 배열에서 recordingBlob 제거
  }, [isFullscreen, playbackMode]); 


  // 다음 문장으로 이동
  const goToNextSentence = useCallback(() => {
    if (currentSentenceIndex < mimicDataList.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setPlaybackMode('loop');
      // 녹음 상태 초기화 (필요하다면)
      // resetRecording();
    } else {
      // 모든 문장 완료 후 이동할 페이지 (예: 결과 페이지)
      window.location.href = `/sing2/result?id=${movieId}`;
    }
  }, [currentSentenceIndex, mimicDataList.length, movieId]);


  // --- [로딩 화면] ---
  if (isLoading || !lessonData || !videoUrl || mimicDataList.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">데이터를 불러오는 중...</h1>
      </main>
    );
  }
  
  // 비디오가 로드된 후 사용할 변수
  const totalSentences = mimicDataList.length;
  // --- [/로딩 화면] ---

  // Time format function (seconds to mm:ss format) - 기존 코드 유지
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <main className="min-h-screen px-4 py-4">
      <div className="mb-4 flex items-center justify-between group">
        {/* Title/Header (임시로 사용) */}
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2 (Mimicking)</h1>
        
        {/* Progress Display */}
        <div className="text-lg font-bold text-gray-400">
          {currentSentenceIndex + 1} / {totalSentences}
        </div>
        
        {/* Fullscreen/Exit Buttons (기존 코드 유지) */}
        <div className="flex items-center gap-3">
          {/* CC Button (Text Visibility) */}
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
          {/* Fullscreen Button */}
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
          {/* Exit Button */}
          <Link href="/" className="flex items-center justify-center cursor-pointer transition-colors duration-200 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" style={{ width: '29px', height: '29px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none">
              <circle cx="29" cy="29" r="29" fill="#60D96C"/>
              <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
              <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 180px)' }}>
        <div className={`aspect-video bg-black rounded-2xl overflow-hidden border-[10px] ${isFullscreen ? 'w-[84%]' : 'w-[70%]'}`} style={{ borderColor: '#201E1E' }}>
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={videoUrl} // <-- Supabase에서 가져온 URL 사용
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${isVideoPaused ? 'opacity-50' : 'opacity-100'}`}
              controls={false}
              autoPlay={false}
              muted={false} 
              playsInline
              preload="auto"
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
                  }
                }
              }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (currentSentence) {
                  // 비디오가 문장 끝 시간에 도달하면 일시정지하고 루프 시작 시간으로 재설정
                  const endTime = Number(currentSentence.end_sec);
                  const startTime = Number(currentSentence.start_sec);
                  if (isFinite(endTime) && video.currentTime >= endTime) {
                    video.pause();
                    if (isFinite(startTime) && startTime >= 0) {
                      video.currentTime = startTime;
                    }
                    
                    // 재생 모드가 'loop'인 경우, 자동으로 다시 재생
                    if (playbackMode === 'loop' && isVideoStarted && !isVideoPaused) {
                      video.play();
                    }
                  }
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                // Disable right-click menu
              }}
              onPause={() => {
                // 비디오가 일시정지됨
              }}
            />
            
            {/* Click overlay to start */}
            {!isVideoStarted && (
              <ClickToStartOverlay
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    video.play();
                    setIsVideoStarted(true);
                  }
                }}
                text="Click to start"
              />
            )}

            {/* PAUSE overlay */}
            {isVideoPaused && (
              <PauseOverlay />
            )}

            {/* Current Sentence Text Overlay */}
            {isTextVisible && currentSentence && (
              <div className="absolute inset-x-0 bottom-4 text-center">
                <p 
                  className="bg-black/70 text-white inline-block px-4 py-2 rounded-lg font-bold text-2xl"
                  style={{ fontFamily: 'Encode Sans, sans-serif' }}
                >
                  {currentSentence.text}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Mimicking Controls - 녹음 기능 임시 제거 후 버튼 로직 대체 */}
        <div className={`mt-6 flex items-center gap-6 ${isFullscreen ? 'w-[84%]' : 'w-[70%]'}`}>
            
            {/* Prev Button */}
            <button
                className="text-white text-lg font-bold px-5 py-3 rounded-xl transition-all duration-200 hover:opacity-80 disabled:opacity-30"
                style={{ backgroundColor: '#201E1E' }}
                onClick={() => {
                    setCurrentSentenceIndex(prev => Math.max(0, prev - 1));
                    setPlaybackMode('loop');
                    // resetRecording();
                }}
                disabled={currentSentenceIndex === 0}
            >
                Prev
            </button>

            {/* Loop / Mimic Toggle Button (녹음 기능 임시 대체) */}
            <button
                className={`text-black text-xl font-extrabold px-10 py-4 rounded-full transition-all duration-200 shadow-xl ${playbackMode === 'loop' ? 'bg-[#60D96C] hover:bg-[#4CAF50]' : 'bg-gray-400 hover:bg-gray-500'}`}
                onClick={() => {
                    // 녹음 기능이 없으므로, 재생 모드만 토글하도록 임시 수정
                    setPlaybackMode(prev => prev === 'loop' ? 'mimic' : 'loop');
                }}
                style={{ fontFamily: 'Encode Sans, sans-serif' }}
            >
                {playbackMode === 'loop' ? 'LOOP (원문 반복)' : 'MIMIC (모방 모드)'} 
            </button>

            {/* Next Button */}
            <button
                className="text-white text-lg font-bold px-5 py-3 rounded-xl transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#201E1E' }}
                onClick={goToNextSentence}
            >
                {currentSentenceIndex < totalSentences - 1 ? 'Next' : 'Finish'}
            </button>
        </div>
      </div>
    </main>
  );
}

export default function MimickingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MimickingPageContent />
    </Suspense>
  );
}