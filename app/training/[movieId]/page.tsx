"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { MOVIES } from "@/app/constants/movies";
import Link from "next/link";
import VideoPlayer from "@/app/components/VideoPlayer";
import Sidebar from "@/app/components/Sidebar";
import PlaybackControls from "@/app/components/PlaybackControls";

interface TrainingPageProps {
  params: Promise<{ movieId: string }> | { movieId: string };
}

export default function TrainingPage({ params }: TrainingPageProps) {
  const unwrappedParams = (params as any)?.then ? use(params as Promise<{ movieId: string }>) : (params as { movieId: string });
  const movie = useMemo(() => MOVIES.find((m) => m.id === unwrappedParams.movieId), [unwrappedParams.movieId]);

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
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [activeControlIndex, setActiveControlIndex] = useState<number | null>(null);
  const [autoSeqIndex, setAutoSeqIndex] = useState<number | null>(null); // 0~7 진행
  const [showNextCta, setShowNextCta] = useState(false);

  const currentScene = movie.scenes[currentIndex];

  // 페이지 진입 또는 문장 변경 시 자동 시퀀스 시작
  useEffect(() => {
    setShowNextCta(false);
    setAutoSeqIndex(0);
    // 첫 버튼 실행
    const isMuted = [3,5,7].includes(0); // false
    handlePlay(isMuted, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene.id]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
    setShowNextCta(false);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((idx) => (idx < movie.scenes.length - 1 ? idx + 1 : idx));
    setShowNextCta(false);
  }, [movie.scenes.length]);

  const handlePlay = useCallback((m: boolean, slotIndex: number) => {
    setMuted(m);
    // 외부 재생 신호 전달
    setPlayNonce((n) => n + 1);
    setActiveControlIndex(slotIndex);
  }, []);

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
        // 스페이스는 Video 태그 클릭 토글과 동일 동작을 위해 음소거 상태 유지
        e.preventDefault();
        setMuted((m) => m);
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
  }, [handleNext, handlePlay, handlePrev]);

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{movie.title}</h1>
        <div className="flex items-center gap-3">
          <button 
            className="rounded border px-2 py-1 text-sm bg-black text-white hover:bg-[#2A602F]" 
            onClick={() => setIsSidebarOpen((v) => !v)}
          >
            {isSidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
          </button>
          <button className="rounded border px-2 py-1 text-sm hover:bg-[#2A602F] hover:text-white" onClick={() => setIsTextVisible((v) => !v)}>
            자막 {isTextVisible ? "숨기기" : "보기"}
          </button>
          <Link href="/" className="text-sm text-blue-600 underline">홈으로</Link>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${isSidebarOpen ? 'lg:grid-cols-[1fr_280px]' : 'lg:grid-cols-1'}`}>
        <section className="flex flex-col">
          <div className={`mx-auto ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'}`}>
          <VideoPlayer
            src={movie.videoUrl}
            startTime={currentScene.startTime}
            endTime={currentScene.endTime}
            muted={muted}
            showText={isTextVisible}
            text={currentScene.text}
            playNonce={playNonce}
            hidePauseOverlay={autoSeqIndex !== null}
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
                  }
                }
              }
            }}
          />
          </div>

          <div className={`mt-3 ${isSidebarOpen ? 'w-[85%]' : 'w-[70%]'} mx-auto`}>
            <PlaybackControls onPrev={handlePrev} onNext={handleNext} onPlay={handlePlay} activeIndex={activeControlIndex} />
            {showNextCta && (
              <div className="mt-3 flex justify-center">
                <button className="rounded border px-4 py-2 bg-blue-600 text-white hover:bg-[#2A602F] hover:text-white" onClick={handleNext}>
                  다음 문장으로 이동 (→)
                </button>
              </div>
            )}
          </div>
        </section>

        {isSidebarOpen && (
          <aside className="hidden lg:block border rounded-md p-3 h-[540px]">
            <Sidebar
              scenes={movie.scenes}
              currentIndex={currentIndex}
              onSelect={setCurrentIndex}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen((v) => !v)}
            />
          </aside>
        )}
      </div>
    </main>
  );
}


