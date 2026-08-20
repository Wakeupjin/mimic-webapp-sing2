"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { fetchLessonData, parseLessonNumber, parsePack, parseProgressLesson, resolveVideoUrl } from "../../dataService";
import { timeStringToSeconds } from "../../utils/timeConverter";
import Link from "next/link";
import VideoPlayer from "../../components/VideoPlayer";
import PlaybackControls from "../../components/PlaybackControls";
import MimicLineList from "../../components/MimicLineList";
import { useFullscreen } from "../../hooks/useFullscreen";
import { useMediaControl } from "../../hooks/useMediaControl";
import { useVideoPlayer } from "../../hooks/useVideoPlayer";
import { useMimickingSequence } from "../../hooks/useMimickingSequence";
import ClickToStartOverlay from "../../components/ClickToStartOverlay";
import { saveProgress, getProgressByMode, saveLog } from "../../lib/progress";
import { useEvaluationLog } from "../../lib/evaluation";
import { useRequireModeAccess } from "../../lib/useRequireModeAccess";
import { getVideoSource } from "../../utils/videoSource";
import { requestAppFullscreen } from "../../utils/device";
import LessonShell from "../../components/LessonShell";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";
import PauseOverlay from "../../components/PauseOverlay";

function MimickingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  // console.log('🎬 미믹킹 현재 movieId:', movieId);

  // 모든 훅을 최상단으로 이동
  const [lessonData, setLessonData] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scenes, setScenes] = useState<any[]>([]);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const [lessonNumber, setLessonNumber] = useState<number>(() => parseProgressLesson(movieId));
  
  // 커스텀 훅 사용
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

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
  const {
    currentIndex,
    isMimickingComplete,
    isSequenceRunning,
    showNextCta,
    muted,
    activeControlIndex,
    autoSeqIndex,
    mimickingTimeouts,
    setCurrentIndex,
    setIsMimickingComplete,
    setIsSequenceRunning,
    setShowNextCta,
    setMuted,
    setActiveControlIndex,
    setAutoSeqIndex,
    executeMimickingSequence,
    execute30thMimickingSequence,
    resetMimickingState,
    clearTimeouts
  } = useMimickingSequence();

  // 로컬 상태 (훅으로 교체되지 않은 것들)
  const [isLineListOpen, setIsLineListOpen] = useState(false);
  const [isMimickingStarted, setIsMimickingStarted] = useState(false);
  const [isSequencePaused, setIsSequencePaused] = useState(false);
  const [nudgeNext, setNudgeNext] = useState(false);
  const { bumpPlay, patch } = useEvaluationLog(lessonNumber, 'mimicking', isMimickingStarted);
  const { isMaster, checking } = useRequireModeAccess(lessonNumber, 'mimicking');
  const maxSentenceRef = useRef(0);
  const lastStartedIndexRef = useRef<number | null>(null);
  const mimickingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const autoSeqIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number>(0);
  const pendingButtonIndexRef = useRef<number | null>(null);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSequencePausedRef = useRef(false);

  const clearStepTimeout = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  }, []);

  const pauseActualVideo = useCallback(() => {
    document.querySelectorAll("video").forEach((video) => {
      video.pause();
    });
  }, []);

  // Chapter 0 접근 시 Chapter 1로 리다이렉트
  useEffect(() => {
    lastStartedIndexRef.current = null;
    if (movieId === '001:0') {
      console.log('🚫 Chapter 0은 존재하지 않습니다. Chapter 1로 리다이렉트');
      window.location.href = '/sing2/mimicking?id=001:1';
      return;
    }
  }, [movieId]);

  // Supabase 데이터 로딩
  useEffect(() => {
    const loadDataFromSupabase = async () => {
      try {
        setIsLoading(true);
        const contentLesson = parseLessonNumber(movieId);
        const pack = parsePack(movieId);
        setLessonNumber(parseProgressLesson(movieId));
        
        if (isNaN(contentLesson)) {
          setIsLoading(false);
          return;
        }
        
        const lesson = await fetchLessonData(contentLesson, pack);
        if (!lesson) {
          setIsLoading(false);
          return;
        }

        const resolvedVideoUrl = await resolveVideoUrl(lesson.video_id);
        
        setLessonData(lesson);
        setVideoUrl(resolvedVideoUrl);
        
        // mimic_data가 JSON 배열인 경우 파싱
        let mimicData = [];
        if (lesson.mimic_data) {
          if (typeof lesson.mimic_data === 'string') {
            mimicData = JSON.parse(lesson.mimic_data);
          } else if (Array.isArray(lesson.mimic_data)) {
            mimicData = lesson.mimic_data;
          }
        }
        setScenes(mimicData);
        setIsLoading(false);
        
        // 저장된 진도 불러오기
        try {
          const progress = await getProgressByMode(lessonNumber, 'mimicking');
          if (progress) {
            setSavedProgress(progress);
            const idx = Math.max(0, Math.floor(Number(progress.current_position || 0)));
            setCurrentIndex(idx);
            maxSentenceRef.current = idx;
            if (idx > 0) {
              setIsMimickingStarted(true);
            }
          }
        } catch (error) {
          console.log('미믹킹 진도 데이터 없음 (첫 학습)');
        }
        
        // console.log('🎬 Supabase 미믹킹 데이터 로딩 완료:', lesson);
        // console.log('🎬 lesson 전체 구조:', Object.keys(lesson));
        // console.log('🎬 mimic_data 타입:', typeof lesson.mimic_data);
        // console.log('🎬 mimic_data 내용:', lesson.mimic_data);
        console.log(`📚 총 ${mimicData.length}개 미믹킹 씬 로드됨`);
      } catch (error) {
        console.error('❌ Supabase 미믹킹 데이터 로딩 실패:', error);
        setIsLoading(false);
      }
    };
    
    loadDataFromSupabase();
  }, [movieId]);
  
  // autoSeqIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    autoSeqIndexRef.current = autoSeqIndex;
  }, [autoSeqIndex]);

  useEffect(() => {
    isSequencePausedRef.current = isSequencePaused;
  }, [isSequencePaused]);
  
  // currentIndex가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // 미믹킹 진도 저장 useEffect
  useEffect(() => {
    if (!lessonNumber || !isMimickingStarted) return;

    const saveProgressInterval = setInterval(async () => {
      try {
        await saveProgress(
          lessonNumber,
          'mimicking',
          isMimickingComplete, // 완료 상태
          currentIndex, // 현재 씬 인덱스
          { 
            currentScene: currentIndex,
            totalScenes: scenes.length,
            isComplete: isMimickingComplete,
            lastSaved: new Date().toISOString()
          }
        );
        console.log('💾 미믹킹 진도 저장됨:', currentIndex);
      } catch (error) {
        console.error('미믹킹 진도 저장 실패:', error);
      }
    }, 10000); // 10초마다 저장

    return () => clearInterval(saveProgressInterval);
  }, [lessonNumber, isMimickingStarted, currentIndex, isMimickingComplete, scenes.length]);

  // 미믹킹 완료 시 최종 저장
  useEffect(() => {
    if (isMimickingComplete && lessonNumber) {
      const saveFinalProgress = async () => {
        try {
          await saveProgress(lessonNumber, 'mimicking', true, currentIndex, {
            currentScene: currentIndex,
            totalScenes: scenes.length,
            isComplete: true,
            completed_at: new Date().toISOString()
          });
          await saveLog(lessonNumber, 'mimicking', 'mimicking_completed', {
            totalScenes: scenes.length,
            completed_at: new Date().toISOString()
          });
          console.log('🎉 미믹킹 모드 완료!');
        } catch (error) {
          console.error('미믹킹 완료 저장 실패:', error);
        }
      };
      saveFinalProgress();
    }
  }, [isMimickingComplete, lessonNumber, currentIndex, scenes.length]);

  // 풀스크린 복원 로직
  useEffect(() => {
    const shouldMaintainFullscreen = sessionStorage.getItem('maintainFullscreen') === 'true';
    const fromWatching = sessionStorage.getItem('fromWatching') === 'true';
    
    // console.log('🔍 미믹킹 페이지 로드 체크:', { shouldMaintainFullscreen, fromWatching });
    
    if (shouldMaintainFullscreen) {
      // 풀스크린 유지
      requestAppFullscreen();
      sessionStorage.removeItem('maintainFullscreen');
    }
    
    if (fromWatching) {
      // 워칭에서 넘어온 경우 자동 시작 방지
      // console.log('🚫 워칭에서 미믹킹으로 이동: 자동 시작 방지');
      
      // 모든 비디오 요소 정지
      const videos = document.querySelectorAll('video');
      // console.log('📹 발견된 비디오 요소 수:', videos.length);
      videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
        // console.log('⏹️ 비디오 정지됨');
      });
      
      // 모든 오디오 요소 정지
      const audios = document.querySelectorAll('audio');
      // console.log('🔊 발견된 오디오 요소 수:', audios.length);
      audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        // console.log('⏹️ 오디오 정지됨');
      });
      
      // 상태 완전 초기화
      setIsMimickingStarted(false);
      setActiveControlIndex(null);
      setAutoSeqIndex(null);
      setMuted(false);
      pauseVideo();
      resetVideo();
      
      // console.log('✅ 상태 초기화 완료');
      sessionStorage.removeItem('fromWatching');
    } else {
      // console.log('ℹ️ 새로고침 또는 직접 접근: 정상 로드');
    }
  }, [pauseVideo, resetVideo, setActiveControlIndex, setAutoSeqIndex, setMuted]);

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
        requestAppFullscreen();
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

  // 미믹킹 시퀀스 실행 (자동)
  useEffect(() => {
    if (!isMimickingStarted || isSequenceRunning || !scenes[currentIndex]) {
      return;
    }
    if (lastStartedIndexRef.current === currentIndex) {
      return;
    }
    lastStartedIndexRef.current = currentIndex;
    const currentScene = scenes[currentIndex];
    setIsSequencePaused(false);
    isSequencePausedRef.current = false;
    setNudgeNext(false);
    clearStepTimeout();
    autoSeqIndexRef.current = 0;
    setAutoSeqIndex(0);
    setActiveControlIndex(0);
    executeMimickingSequence(currentIndex, playVideo, currentScene);
    bumpPlay(String(currentIndex + 1));
    patch({
      totalSentences: scenes.length,
      sentencesPlayed: currentIndex + 1,
    });
  }, [isMimickingStarted, currentIndex, executeMimickingSequence, playVideo, isSequenceRunning, scenes, bumpPlay, patch, clearStepTimeout]);

  const toggleSequencePause = useCallback(() => {
    if (!isMimickingStarted || showNextCta) return;
    if (autoSeqIndexRef.current === null && !isSequenceRunning && !isSequencePaused) return;

    if (isSequencePaused) {
      setIsSequencePaused(false);
      isSequencePausedRef.current = false;
      const step = autoSeqIndexRef.current;
      if (step !== null) {
        setMuted([3, 5, 7].includes(step));
        setActiveControlIndex(step);
      }
      playVideo();
      return;
    }

    clearStepTimeout();
    setIsSequencePaused(true);
    isSequencePausedRef.current = true;
    pauseVideo();
    pauseActualVideo();
  }, [
    isMimickingStarted,
    showNextCta,
    isSequenceRunning,
    isSequencePaused,
    clearStepTimeout,
    playVideo,
    pauseVideo,
    pauseActualVideo,
    setMuted,
    setActiveControlIndex,
  ]);

  const handlePrev = useCallback(() => {
    if (isSequenceRunning && !isMaster && !nudgeNext) {
      return;
    }
    clearStepTimeout();
    setIsSequencePaused(false);
    isSequencePausedRef.current = false;
    setNudgeNext(false);
    setIsSequenceRunning(false);
    lastStartedIndexRef.current = null;
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
  }, [isSequenceRunning, isMaster, nudgeNext, currentIndex, pauseVideo, resetVideo, setActiveControlIndex, setAutoSeqIndex, setCurrentIndex, setShowNextCta, clearStepTimeout, setIsSequenceRunning]);

  const handleNext = useCallback(() => {
    if (isSequenceRunning && !isMaster && !nudgeNext) {
      return;
    }
    if (!isMaster && currentIndex >= maxSentenceRef.current && !nudgeNext) {
      return;
    }
    clearStepTimeout();
    setIsSequencePaused(false);
    isSequencePausedRef.current = false;
    setNudgeNext(false);
    setIsSequenceRunning(false);
    lastStartedIndexRef.current = null;
    if (currentIndex < scenes.length - 1) {
      const nextIdx = currentIndex + 1;
      if (isMaster || nudgeNext) {
        maxSentenceRef.current = Math.max(maxSentenceRef.current, nextIdx);
      }
      setCurrentIndex(nextIdx);
    } else {
        if (!isMaster && !isMimickingComplete) {
          return;
        }
        const isCurrentlyFullscreen = document.fullscreenElement !== null;
        if (isCurrentlyFullscreen) {
          sessionStorage.setItem('maintainFullscreen', 'true');
        }
        sessionStorage.setItem('mimickingComplete', 'true');
        window.location.href = `/sing2/guessing?id=${movieId}`;
    }
    setShowNextCta(false);
  }, [currentIndex, scenes.length, isSequenceRunning, isMaster, isMimickingComplete, movieId, nudgeNext, setCurrentIndex, setShowNextCta, clearStepTimeout, setIsSequenceRunning]);

  const skipLine = useCallback(() => {
    if (showNextCta) return;
    if (currentIndex < scenes.length - 1) {
      handleNext();
      return;
    }
    clearStepTimeout();
    setIsSequenceRunning(false);
    setIsMimickingComplete(true);
    setShowNextCta(true);
    pauseVideo();
  }, [showNextCta, currentIndex, scenes.length, handleNext, clearStepTimeout, setIsSequenceRunning, setIsMimickingComplete, setShowNextCta, pauseVideo]);

  const handleSceneSelect = useCallback((index: number) => {
    if (index === 0 && !isMimickingStarted) {
      return;
    }
    if (!isMaster && index > maxSentenceRef.current) {
      return;
    }
    if (isMaster) {
      maxSentenceRef.current = Math.max(maxSentenceRef.current, index);
    }
    clearTimeouts();
    clearStepTimeout();
    setIsSequencePaused(false);
    isSequencePausedRef.current = false;
    setNudgeNext(false);
    setAutoSeqIndex(null);
    setActiveControlIndex(null);
    setMuted(false);
    setIsSequenceRunning(false);
    setPlayNonce(0);
    lastStartedIndexRef.current = null;
    setIsLineListOpen(false);
    setCurrentIndex(index);
  }, [
    isMimickingStarted,
    isMaster,
    clearTimeouts,
    clearStepTimeout,
    setAutoSeqIndex,
    setActiveControlIndex,
    setMuted,
    setIsSequenceRunning,
    setPlayNonce,
    setCurrentIndex,
  ]);

  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    if (showNextCta) return;
    clearStepTimeout();
    setIsSequencePaused(false);
    isSequencePausedRef.current = false;
    setNudgeNext(false);
    setMuted(m);
    setActiveControlIndex(slotIndex);
    setAutoSeqIndex(slotIndex);
    autoSeqIndexRef.current = slotIndex;
    setIsSequenceRunning(true);
    playVideo();
  }, [showNextCta, playVideo, setActiveControlIndex, setMuted, setAutoSeqIndex, setIsSequenceRunning, clearStepTimeout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggleSequencePause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSequencePause, handlePrev, handleNext]);

  const currentScene = scenes[currentIndex];

  if (loading || checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-[#60D96C]">로딩 중...</h1>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요합니다...</h1>
        </div>
      </main>
    );
  }

  // 로딩 화면
  if (isLoading || !lessonData || !videoUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">데이터를 불러오는 중...</h1>
      </main>
    );
  }
  
  // currentScene이 존재하지 않으면 안전하게 처리
  if (!currentScene) {
    return null;
  }

  // 디버깅: currentScene 정보 확인
  if (currentScene && currentScene.start && currentScene.end) {
    const startTime = timeStringToSeconds(currentScene.start);
    const endTime = timeStringToSeconds(currentScene.end);
    // console.log(`🎬 Mimicking Scene ${currentIndex + 1}:`);
    // console.log(`  - Original start: "${currentScene.start}" → ${startTime}s`);
    // console.log(`  - Original end: "${currentScene.end}" → ${endTime}s`);
    // console.log(`  - Duration: ${(endTime - startTime).toFixed(2)}s`);
    // console.log(`  - Text: "${currentScene.text}"`);
  }

  const lineTotal = scenes.length || 30;
  const lineCurrent = String(Math.min(currentIndex + 1, lineTotal)).padStart(2, "0");
  const lineTotalLabel = String(lineTotal).padStart(2, "0");

  return (
    <LessonShell
      hideHeader
      video={
            <div className="relative h-full w-full">
              <div className={`absolute inset-0 ${showNextCta ? "opacity-10" : ""}`}>
              <VideoPlayer
                key="mimicking-player"
                src={getVideoSource()}
                startTime={currentScene?.start ? timeStringToSeconds(currentScene.start) : 0}
                endTime={currentScene?.end ? timeStringToSeconds(currentScene.end) : 0}
                muted={muted}
                showText={false}
                text={currentScene.text}
                playNonce={isMimickingStarted && playNonce > 0 ? playNonce : 0}
                playing={isMimickingStarted && !isSequencePaused}
                hidePauseOverlay={true}
                activeControlIndex={activeControlIndex}
                onClick={() => {
                  if (isMimickingStarted && !showNextCta) {
                    toggleSequencePause();
                  }
                }}
                onPlay={() => {
                  // Video started playing - no need to change button color here
                  // Button color is already set when sequence starts
                  // console.log(`🎬 onPlay fired - video started playing`);
                }}
                onPlayTimeout={() => {
                  // Turn button green when onPlay times out (1s)
                  const pendingIndex = pendingButtonIndexRef.current;
                  // console.log(`⏱️ onPlayTimeout fired - pendingIndex: ${pendingIndex}, turning button green`);
                  if (pendingIndex !== null) {
                    // console.log(`✅ 버튼 ${pendingIndex} 색상 변경 (timeout)`);
                    setActiveControlIndex(pendingIndex);
                    pendingButtonIndexRef.current = null; // Clear pending
                  }
                }}
                onEndedSegment={() => {
                  if (isSequencePausedRef.current) {
                    return;
                  }
                  const currentAutoSeqIndex = autoSeqIndexRef.current;
                  // console.log(`🏁 비디오 재생 완료: autoSeqIndex=${currentAutoSeqIndex}`);
                  setActiveControlIndex(null);
                  
                  // 자동 시퀀스 중이면 다음 버튼으로 진행
                  if (currentAutoSeqIndex !== null) {
                    const next = currentAutoSeqIndex + 1;
                    // console.log(`다음 버튼으로 이동: ${currentAutoSeqIndex} → ${next}`);
                    
                    if (next <= 7) {
                      // 다음 버튼으로 진행
                      clearStepTimeout();
                      stepTimeoutRef.current = setTimeout(() => {
                        if (isSequencePausedRef.current) return;
                        const isMuted = [3, 5, 7].includes(next);
                        // console.log(`🎯 버튼 ${next} 준비: muted=${isMuted} (색상 즉시 변경)`);
                        setAutoSeqIndex(next);
                        autoSeqIndexRef.current = next; // Update ref immediately
                        setMuted(isMuted);
                        setActiveControlIndex(next); // 즉시 색상 변경
                        playVideo();
                      }, 1000);
                    } else {
                      // 8개 완료 → 다음 문장 안내
                      clearStepTimeout();
                      setAutoSeqIndex(null);
                      autoSeqIndexRef.current = null;
                      setIsSequenceRunning(false);
                      setIsSequencePaused(false);
                      isSequencePausedRef.current = false;
                      setNudgeNext(true);

                      const currentIdx = currentIndexRef.current;
                      if (currentIdx < 29) {
                        // 원장: 직접 다음을 누를 때까지 대기 / 학생: 잠깐 안내 후 자동 이동
                        if (!isMaster) {
                          stepTimeoutRef.current = setTimeout(() => {
                            const nextIdx = currentIdx + 1;
                            maxSentenceRef.current = Math.max(maxSentenceRef.current, nextIdx);
                            setNudgeNext(false);
                            setMuted(false);
                            setActiveControlIndex(null);
                            pendingButtonIndexRef.current = null;
                            setCurrentIndex(nextIdx);
                          }, 1600);
                        }
                      } else {
                        // 30번째 문장이면 게싱 모드로 전환
                        setNudgeNext(false);
                        setIsMimickingComplete(true);
                        setShowNextCta(true);
                        pauseVideo();
                      }
                    }
                  }
                }}
              />
              </div>

              <Link
                href={`/sing2/selecting?id=${movieId}`}
                className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4"
                aria-label="뒤로"
                onClick={stopAllMedia}
              >
                <img src="/home/back.svg" alt="" className="h-full w-full" />
              </Link>
              <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
                <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
                  <FullscreenIcon active={isFullscreen} />
                </HeaderIconButton>
                {isMaster && !showNextCta && (
                  <button type="button" className="watch-skip" onClick={skipLine}>
                    SKIP
                  </button>
                )}
              </div>

              {isLineListOpen && !showNextCta && (
                <MimicLineList
                  total={lineTotal}
                  currentIndex={currentIndex}
                  canOpen={(index) => isMaster || index <= maxSentenceRef.current}
                  onSelect={handleSceneSelect}
                />
              )}
              
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

              {isSequencePaused && !showNextCta && <PauseOverlay />}
        
            {showNextCta && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto flex items-start justify-center gap-[clamp(2rem,8vw,12rem)]">
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button
                      type="button"
                      className="select-mode"
                      onClick={() => {
                        execute30thMimickingSequence();
                      }}
                    >
                      Again
                    </button>
                    <p className="select-here" style={{ visibility: "hidden" }}>Let’s go</p>
                  </div>
                  <div className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
                    <button
                      type="button"
                      className="select-mode is-open"
                      onClick={handleNext}
                    >
                      <img src="/home/chameleon.png" alt="" className="select-chameleon" />
                      Next
                    </button>
                    <p className="cta-go">Let’s go</p>
                  </div>
                </div>
              </div>
            )}
          </div>
      }
      controls={
          <div className="mimic-dock">
            <PlaybackControls
              variant="cinema"
              onPrev={handlePrev}
              onNext={handleNext}
              onPlay={handlePlay}
              activeIndex={activeControlIndex}
              isFullscreen={false}
              highlightNext={nudgeNext}
            />
            <button
              type="button"
              className="mimic-count"
              aria-expanded={isLineListOpen}
              aria-label="문장 목록"
              onClick={() => setIsLineListOpen((open) => !open)}
            >
              <span>{lineCurrent} / </span>
              <span className="mimic-count-total">{lineTotalLabel}</span>
              <img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
            </button>
          </div>
      }
    />
  );
}

export default function MimickingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
      <MimickingPageContent />
    </Suspense>
  );
}