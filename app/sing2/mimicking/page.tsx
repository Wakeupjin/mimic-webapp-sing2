"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchLessonData } from "../../dataService";
import { supabase } from "../../supabaseClient";
import { timeStringToSeconds } from "../../utils/timeConverter";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import Sidebar from "../../components/Sidebar";
import PlaybackControls from "../../components/PlaybackControls";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
// import { useMimickingSequence } from "../../hooks/useMimickingSequence"; // 문제가 되는 훅 제거
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import SceneList from "../../components/SceneList";

function MimickingPageContent() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  console.log('🎬 미믹킹 현재 movieId:', movieId);
  
  // 초기 상태를 더 안전하게 설정
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    if (movieId === '001:0') {
      console.log('🚫 Chapter 0은 존재하지 않습니다. Chapter 1로 리다이렉트');
      window.location.href = '/sing2/mimicking?id=001:1';
      return;
    }
  }, [movieId]);
  // Supabase 데이터 상태
  const [lessonData, setLessonData] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scenes, setScenes] = useState<any[]>([]);
  
  // 커스텀 훅 사용
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();
  const {
    isPlaying,
    playNonce,
    isVideoPaused,
    isVideoStarted,
    setIsVideoStarted,
    setPlayNonce,
    playVideo,
    pauseVideo,
    resetVideo
  } = useVideoPlayer();
  // 로컬 상태로 대체 (문제가 되는 훅 제거)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMimickingComplete, setIsMimickingComplete] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [showNextCta, setShowNextCta] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null);
  const mimickingTimeouts = useRef<NodeJS.Timeout[]>([]);

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isMimickingStarted, setIsMimickingStarted] = useState(false); // 미믹킹 시작 상태
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]); // 미믹킹 setTimeout 관리
  const autoSeqIndexRef = useRef<number | null>(null); // autoSeqIndex ref for closure fix
  const currentIndexRef = useRef<number>(0); // currentIndex ref for closure fix
  const pendingButtonIndexRef = useRef<number | null>(null); // Button waiting to turn green when video plays

  // Supabase 데이터 로딩 - 더 안전한 방식
  useEffect(() => {
    if (!movieId || isInitialized) return;
    
    const loadDataFromSupabase = async () => {
      try {
        setIsLoading(true);
        const lessonNumberStr = movieId.split(':')[1];
        const lessonNumber = parseInt(lessonNumberStr);
        
        if (isNaN(lessonNumber)) {
          setIsLoading(false);
          return;
        }
        
        // Lesson 데이터 가져오기
        const lesson = await fetchLessonData(lessonNumber);
        if (!lesson) {
          setIsLoading(false);
          return;
        }
        
        // Video URL 가져오기
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
        
        // 상태 업데이트
        setLessonData(lesson);
        setVideoUrl(videoResult.video_url);
        setScenes(lesson.mimic_data || []);
        setIsLoading(false);
        setIsInitialized(true);
        
        console.log('🎬 Supabase 미믹킹 데이터 로딩 완료:', lesson);
        console.log(`📚 총 ${lesson.mimic_data?.length || 0}개 미믹킹 씬 로드됨`);
        
        // 데이터 로딩 완료 후 시퀀스 시작
        setTimeout(() => {
          startMimickingSequence();
        }, 100);
      } catch (error) {
        console.error('❌ Supabase 미믹킹 데이터 로딩 실패:', error);
        setIsLoading(false);
      }
    };
    
    loadDataFromSupabase();
  }, [movieId, isInitialized]);

  const currentScene = scenes[currentIndex];
  
  // 디버깅: currentScene 정보 확인
  if (currentScene && currentScene.start_sec && currentScene.end_sec) {
    let startTime: number;
    let endTime: number;
    
    if (typeof currentScene.start_sec === 'string') {
      startTime = timeStringToSeconds(currentScene.start_sec);
    } else {
      startTime = Number(currentScene.start_sec);
    }
    
    if (typeof currentScene.end_sec === 'string') {
      endTime = timeStringToSeconds(currentScene.end_sec);
    } else {
      endTime = Number(currentScene.end_sec);
    }
    console.log(`🎬 Mimicking Scene ${currentIndex + 1}:`);
    console.log(`  - Original start: "${currentScene.start_sec}" → ${startTime}s`);
    console.log(`  - Original end: "${currentScene.end_sec}" → ${endTime}s`);
    console.log(`  - Duration: ${(endTime - startTime).toFixed(2)}s`);
    console.log(`  - Text: "${currentScene.text}"`);
  }
  
  // autoSeqIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    autoSeqIndexRef.current = autoSeqIndex;
    console.log(`📌 autoSeqIndex 업데이트: ${autoSeqIndex}`);
  }, [autoSeqIndex]);
  
  // currentIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    console.log(`📌 currentIndex 업데이트: ${currentIndex}`);
  }, [currentIndex]);
  
  // currentScene이 존재하지 않으면 안전하게 처리
  if (!currentScene) {
    return null;
  }

  // 풀스크린 복원 로직
  useEffect(() => {
    const shouldMaintainFullscreen = sessionStorage.getItem('maintainFullscreen') === 'true';
    const fromWatching = sessionStorage.getItem('fromWatching') === 'true';
    
    console.log('🔍 미믹킹 페이지 로드 체크:', { shouldMaintainFullscreen, fromWatching });
    
    if (shouldMaintainFullscreen) {
      // 풀스크린 유지
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('풀스크린 복원 실패:', err);
      });
      sessionStorage.removeItem('maintainFullscreen');
    }
    
    if (fromWatching) {
      // 워칭에서 넘어온 경우 자동 시작 방지
      console.log('🚫 워칭에서 미믹킹으로 이동: 자동 시작 방지');
      
      // 모든 비디오 요소 정지
      const videos = document.querySelectorAll('video');
      console.log('📹 발견된 비디오 요소 수:', videos.length);
      videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
        console.log('⏹️ 비디오 정지됨');
      });
      
      // 모든 오디오 요소 정지
      const audios = document.querySelectorAll('audio');
      console.log('🔊 발견된 오디오 요소 수:', audios.length);
      audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        console.log('⏹️ 오디오 정지됨');
      });
      
      // 상태 완전 초기화
      setIsMimickingStarted(false);
      setActiveControlIndex(null);
      setAutoSeqIndex(null);
      setMuted(false);
      pauseVideo();
      resetVideo();
      
      console.log('✅ 상태 초기화 완료');
      sessionStorage.removeItem('fromWatching');
    } else {
      console.log('ℹ️ 새로고침 또는 직접 접근: 정상 로드');
    }
  }, []);

  // 풀스크린 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      // isFullscreen은 훅에서 관리됨
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
      // 화살표 키로 이전/다음 씬 이동
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
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

  // 씬 변경 시 자동 시퀀스 시작 (제거 - 수동으로만 시작)
  // useEffect(() => {
  //   if (currentIndex > 0 && isMimickingStarted) {
  //     // 두 번째 씬부터는 자동으로 시퀀스 시작 (단, 미믹킹이 시작된 후에만)
  // 미믹킹 시퀀스 실행 (수동으로만) - useEffect 제거
  // useEffect로 인한 React Error #310 방지를 위해 수동 실행으로 변경
  
  // 로컬 executeMimickingSequence 함수 구현
  const executeMimickingSequence = useCallback((sceneIndex: number, playVideo: () => void, currentScene?: any) => {
    if (isSequenceRunning) {
      console.log('이미 시퀀스가 실행 중입니다.');
      return;
    }
    
    console.log(`🎬 미믹킹 시퀀스 시작: Scene ${sceneIndex + 1}`);
    
    // 이전 시퀀스 정리
    mimickingTimeouts.current.forEach(timeout => clearTimeout(timeout));
    mimickingTimeouts.current = [];
    
    // 상태 초기화
    setIsSequenceRunning(true);
    setIsMimickingComplete(false);
    setShowNextCta(false);
    
    // 간단한 시퀀스 실행 (복잡한 로직 제거)
    const timeout = setTimeout(() => {
      console.log('🎬 시퀀스 완료');
      setIsSequenceRunning(false);
      setIsMimickingComplete(true);
    }, 3000); // 3초 후 완료
    
    mimickingTimeouts.current.push(timeout);
  }, [isSequenceRunning]);

  // 수동 시퀀스 시작 함수
  const startMimickingSequence = useCallback(() => {
    if (isMimickingStarted && !isSequenceRunning && currentScene && isInitialized) {
      console.log(`🔄 수동 시퀀스 시작: currentIndex=${currentIndex}`);
      // Set autoSeqIndex for first button (button 0)
      autoSeqIndexRef.current = 0;
      setAutoSeqIndex(0);
      setActiveControlIndex(0); // 첫 번째 버튼 즉시 색상 변경
      console.log(`🎯 첫 번째 버튼 준비: autoSeqIndex = 0, 즉시 색상 변경`);
      executeMimickingSequence(currentIndex, playVideo, currentScene);
    }
  }, [isMimickingStarted, isSequenceRunning, currentScene, isInitialized, currentIndex, executeMimickingSequence, playVideo]);

  // currentIndex 변경 시 상태 초기화는 훅에서 처리
  //   }
  // }, [currentIndex, isMimickingStarted]);



  const handlePrev = useCallback(() => {
    if (!isSequenceRunning) {
      setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : currentIndex);
      setShowNextCta(false);
      
      // 필요한 상태만 리셋
      setActiveControlIndex(null);
      setAutoSeqIndex(null);
      pauseVideo();
      resetVideo();
      
      // 모든 setTimeout 정리
      mimickingTimeoutsRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      mimickingTimeoutsRef.current = [];
      
      // 첫 번째 씬으로 돌아가면 미믹킹 시작 상태 리셋
      if (currentIndex === 1) {
        setIsMimickingStarted(false);
      }
    }
  }, [isSequenceRunning, currentIndex]);

  const handleNext = useCallback(() => {
    if (!isSequenceRunning) {
      if (currentIndex < scenes.length - 1) {
        setPlayNonce(0); // Reset playNonce before changing scene
        setCurrentIndex(currentIndex + 1);
      } else {
        // 마지막 씬이면 게싱 모드로 전환
        const isCurrentlyFullscreen = document.fullscreenElement !== null;
        if (isCurrentlyFullscreen) {
          sessionStorage.setItem('maintainFullscreen', 'true');
        }
        sessionStorage.setItem('mimickingComplete', 'true');
        window.location.href = `/sing2/guessing?id=${movieId}`;
      }
      setShowNextCta(false);
    }
  }, [currentIndex, scenes.length, isSequenceRunning, movieId]);


  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    console.log(`🎮 handlePlay: muted=${m}, slotIndex=${slotIndex}`);
    setMuted(m);
    setActiveControlIndex(slotIndex);
    playVideo();
  }, [playVideo]);


  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#60D96C] mx-auto mb-4"></div>
          <p className="text-[#60D96C]">Loading lesson data...</p>
        </div>
      </div>
    );
  }

  // 데이터가 없을 때
  if (!lessonData || !videoUrl || scenes.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#60D96C]">No lesson data available</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-2">
      <div className="mb-2 flex items-center justify-between group">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: 'Encode Sans, sans-serif' }}>SING 2</h1>
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
        <section className="flex flex-col" style={{ backgroundColor: showNextCta ? '#0a0a0a' : undefined }}>
          <div className={`mx-auto relative ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`} style={{ transform: isFullscreen ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'top', marginLeft: isFullscreen ? '130px' : '0px' }}>
            <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-[10px]`} style={{ borderColor: (activeControlIndex !== null && [3, 5, 7].includes(activeControlIndex)) ? '#60D96C' : 'rgb(32, 30, 30)' }}>
              <VideoPlayer
                key={`mimicking-${currentIndex}`}
                src={videoUrl || ''}
                startTime={currentScene?.start_sec ? (typeof currentScene.start_sec === 'string' ? timeStringToSeconds(currentScene.start_sec) : Number(currentScene.start_sec)) : 0}
                endTime={currentScene?.end_sec ? (typeof currentScene.end_sec === 'string' ? timeStringToSeconds(currentScene.end_sec) : Number(currentScene.end_sec)) : 0}
                muted={muted}
                showText={isTextVisible}
                text={currentScene.text}
                playNonce={isMimickingStarted && playNonce > 0 ? playNonce : 0}
                playing={isMimickingStarted}
                hidePauseOverlay={autoSeqIndex !== null}
                activeControlIndex={activeControlIndex}
                onPlay={() => {
                  // Video started playing - no need to change button color here
                  // Button color is already set when sequence starts
                  console.log(`🎬 onPlay fired - video started playing`);
                }}
                onPlayTimeout={() => {
                  // Turn button green when onPlay times out (1s)
                  const pendingIndex = pendingButtonIndexRef.current;
                  console.log(`⏱️ onPlayTimeout fired - pendingIndex: ${pendingIndex}, turning button green`);
                  if (pendingIndex !== null) {
                    console.log(`✅ 버튼 ${pendingIndex} 색상 변경 (timeout)`);
                    setActiveControlIndex(pendingIndex);
                    pendingButtonIndexRef.current = null; // Clear pending
                  }
                }}
                onEndedSegment={() => {
                  const currentAutoSeqIndex = autoSeqIndexRef.current;
                  console.log(`🏁 비디오 재생 완료: autoSeqIndex=${currentAutoSeqIndex}`);
                  setActiveControlIndex(null);
                  
                  // 자동 시퀀스 중이면 다음 버튼으로 진행
                  if (currentAutoSeqIndex !== null) {
                    const next = currentAutoSeqIndex + 1;
                    console.log(`다음 버튼으로 이동: ${currentAutoSeqIndex} → ${next}`);
                    
                    if (next <= 7) {
                      // 다음 버튼으로 진행
                      setTimeout(() => {
                        const isMuted = [3, 5, 7].includes(next);
                        console.log(`🎯 버튼 ${next} 준비: muted=${isMuted} (색상 즉시 변경)`);
                        setAutoSeqIndex(next);
                        autoSeqIndexRef.current = next; // Update ref immediately
                        setMuted(isMuted);
                        setActiveControlIndex(next); // 즉시 색상 변경
                        playVideo();
                      }, 1000);
                    } else {
                      // 8개 완료 → 시퀀스 종료
                      console.log(`✅ 8단계 완료`);
                      setAutoSeqIndex(null);
                      
                      // 다음 문장으로 자동 진행
                      const currentIdx = currentIndexRef.current;
                      if (currentIdx < 29) { // 30개 문장 (0-29)
                        const nextIdx = currentIdx + 1;
                        console.log(`다음 문장으로 자동 진행: ${currentIdx} → ${nextIdx}`);

                        setTimeout(() => {
                          console.log(`⏭️ currentIndex 업데이트: ${currentIdx} → ${nextIdx}`);
                          setMuted(false); // 다음 문장 시작 전 무음 해제
                          setActiveControlIndex(null); // 활성 버튼 초기화
                          setIsSequenceRunning(false); // 이동 직전에 시퀀스 종료
                          pendingButtonIndexRef.current = null; // Clear pending button ref to prevent stale data
                          autoSeqIndexRef.current = null; // Clear auto sequence ref to prevent stale data
                          setPlayNonce(0); // Reset playNonce to 0 BEFORE changing scene (prevents old playNonce with new scene)
                          setCurrentIndex(nextIdx); // useEffect가 자동으로 시퀀스 시작
                        }, 1000);
                      } else {
                        // 30번째 문장이면 게싱 모드로 전환
                        console.log(`30번째 문장 완료 - 게싱 모드로 전환`);
                        setIsSequenceRunning(false);
                        setIsMimickingComplete(true);
                        setShowNextCta(true);
                        pauseVideo();
                      }
                    }
                  }
                }}
              />
              
              {/* 시작을 위한 클릭 오버레이 */}
              {!isMimickingStarted && currentIndex === 0 && (
                <ClickToStartOverlay
                  onClick={() => {
                    setIsMimickingStarted(true);
                    setActiveControlIndex(0);
                    setAutoSeqIndex(0);
                    setMuted(false);
                    playVideo();
                  }}
                />
              )}
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
                      // 간단한 재시작 로직
                      setIsMimickingComplete(false);
                      setCurrentIndex(0);
                      startMimickingSequence();
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
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 40px)' }} ref={(el) => {
                  if (el && currentIndex >= 0 && currentIndex === 0) {
                    // 첫 번째 씬일 때만 중앙으로 스크롤
                    const buttonHeight = 48; // 버튼 높이 + gap
                    const containerHeight = el.clientHeight;
                    const scrollTop = (currentIndex * buttonHeight) - (containerHeight / 2) + (buttonHeight / 2);
                    el.scrollTop = Math.max(0, scrollTop);
                  }
                }}>
                  <SceneList
                    scenes={scenes as any}
                    currentIndex={currentIndex}
                    onSceneClick={(index) => {
                      if (index === 0 && !isMimickingStarted) {
                        // 첫 번째 씬이고 아직 시작하지 않았다면 클릭 오버레이를 통해 시작
                        return;
                      }
                      
                      // 진행 중인 시퀀스 정리
                      console.log(`🖱️ 씬 클릭: ${index + 1}, 기존 시퀀스 정리`);
                      mimickingTimeouts.current.forEach(timeout => clearTimeout(timeout));
                      mimickingTimeouts.current = []; // 기존 타임아웃 정리
                      setAutoSeqIndex(null); // 자동 시퀀스 중단
                      setActiveControlIndex(null); // 활성 버튼 초기화
                      setMuted(false); // 무음 해제
                      setIsSequenceRunning(false); // 시퀀스 실행 중단
                      setPlayNonce(0); // Reset playNonce before changing scene

                      // 새 씬으로 이동 (useEffect가 자동으로 시퀀스 시작)
                      setCurrentIndex(index);
                    }}
                    isSequenceRunning={isSequenceRunning}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
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