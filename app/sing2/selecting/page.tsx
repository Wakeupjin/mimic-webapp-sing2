"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useFullscreen } from '../../hooks/useFullscreen';
// 기존 상수 제거 (Supabase에서 데이터 수를 가져옴)
// import { SELECTING_CHAPTER_COUNT, SELECTING_DROPDOWN_MAX_HEIGHT_PX, SELECTING_SCROLL_THRESHOLD_PX } from '../../constants/timings'; 

// --- [SUPABASE 연결 및 타입 정의] ---
import { fetchLessonSummaries, formatChapterLabel, formatMovieId, parsePack, parseProgressLesson } from '../../dataService';
import {
  fetchOwnProgress,
  canAccessLesson,
  canAccessMode,
  isMasterRole,
  isModeCompleted,
  MODE_ORDER,
  type LearnMode,
  type ProgressRow,
} from '../../lib/progressGate';
import { FullscreenIcon, HeaderIconButton } from '../../components/HeaderIcons';
import ModeSelectLayout from '../../components/ModeSelectLayout'; 
import AccountMenu from '../../components/AccountMenu';
import { lessonPath } from '../../lib/lessonMedia';

// Lesson 목록 데이터 타입 (lessons 테이블에서 가져올 정보)
type LessonSummary = {
  id: number;
  lesson_number: number;
  video_id: number; 
};
// --- [/SUPABASE 연결 및 타입 정의] ---

type SelectingData = {
  lessons: LessonSummary[];
  selectedLesson: LessonSummary | null;
  progressRows: ProgressRow[];
};

function SelectingLoadingScreen() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#201E1E' }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#60D96C] border-t-transparent" />
        <h1 className="text-xl font-semibold text-[#60D96C]">학습을 준비하고 있어요…</h1>
      </div>
    </main>
  );
}

// 상수 (로컬 상수는 최소화하고 Supabase 데이터를 사용)
function SelectingPageContent() {
  // 모든 훅을 최상단에 배치 (조건부 호출 방지)
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pack = parsePack(searchParams.get('id') || '001:1');
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  // 상태 관리
  const [selectingData, setSelectingData] = useState<SelectingData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isMaster = isMasterRole(profile?.role); 
  
  // refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 인증 체크 - useEffect로 처리
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // --- [SUPABASE 데이터 로딩] ---
  useEffect(() => {
    const userId = user?.id;
    if (loading || profileLoading || !userId) {
      setSelectingData(null);
      setLoadError('');
      return;
    }

    let cancelled = false;
    setSelectingData(null);
    setLoadError('');

    const lessonRequest =
      pack >= 2
        ? Promise.resolve<LessonSummary[]>([{ id: 1, lesson_number: 1, video_id: 1 }])
        : fetchLessonSummaries();

    void Promise.all([lessonRequest, fetchOwnProgress()])
      .then(([lessonList, nextProgressRows]) => {
        if (cancelled) return;
        const lessonOne =
          lessonList.find((lesson) => lesson.lesson_number === 1) || lessonList[0] || null;
        setSelectingData({
          lessons: lessonList,
          selectedLesson: lessonOne,
          progressRows: nextProgressRows,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Selecting data load error:', error);
        setLoadError('학습 상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      });

    return () => {
      cancelled = true;
    };
  }, [loading, pack, profileLoading, user?.id]);
  // --- [/SUPABASE 데이터 로딩] ---

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 로딩 상태 처리
  if (loading || profileLoading) return <SelectingLoadingScreen />;

  // 인증되지 않은 경우
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요해요.</h1>
        </div>
      </main>
    );
  }

  const handleModeSelect = (mode: LearnMode) => {
    const selectedLesson = selectingData?.selectedLesson;
    const progressRows = selectingData?.progressRows || [];
    if (!selectedLesson) return;
    if (
      !isMaster &&
      !canAccessMode(
        progressRows,
        parseProgressLesson(formatMovieId(pack, selectedLesson.lesson_number)),
        mode
      )
    ) {
      return;
    }

    const movieId = formatMovieId(pack, selectedLesson.lesson_number);
    
    window.location.href = lessonPath(movieId, mode);
  };

  
  // --- [로딩 및 에러 화면] ---
  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <div className="text-center">
          <h1 className="mb-4 text-xl font-semibold text-white">학습 상태를 불러오지 못했어요.</h1>
          <p className="text-gray-300">새로고침한 뒤 다시 시도해 주세요.</p>
        </div>
      </main>
    );
  }

  if (!selectingData) return <SelectingLoadingScreen />;

  const { lessons, selectedLesson, progressRows } = selectingData;

  if (lessons.length === 0) {
     return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <div className="text-center">
          <h1 className="mb-4 text-xl font-semibold text-white">학습 내용을 찾지 못했어요.</h1>
          <p className="text-gray-300">잠시 후 다시 시도해 주세요.</p>
        </div>
      </main>
    );
  }
  // --- [/로딩 및 에러 화면] ---

  const lessonNo = selectedLesson?.lesson_number || 1;
  const progressLesson = parseProgressLesson(formatMovieId(pack, lessonNo));
  const modeOpen = (mode: LearnMode) =>
    isMaster || canAccessMode(progressRows, progressLesson, mode);
  const hereMode =
    MODE_ORDER.find((mode) => !isModeCompleted(progressRows, progressLesson, mode));

  const MODE_LABEL: Record<LearnMode, string> = {
    watching: 'Watch',
    mimicking: 'Mimic',
    guessing: 'Guess',
    retelling: 'Story',
    word: 'Word',
  };

  return (
    <ModeSelectLayout
      badge={<AccountMenu onOpenAdmin={isMaster ? () => router.push('/admin') : undefined} />}
      chapterLabel={selectedLesson ? formatChapterLabel(pack, selectedLesson.lesson_number) : formatChapterLabel(pack, 1)}
      dropdownOpen={isDropdownOpen}
      onToggleDropdown={() => setIsDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      listRef={scrollContainerRef}
      extraActions={
        <>
          <HeaderIconButton label={isFullscreen ? '전체화면 종료' : '전체화면'} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
        </>
      }
      chapters={lessons.map((lesson) => {
        const chapterProgress = parseProgressLesson(formatMovieId(pack, lesson.lesson_number));
        return {
          id: lesson.id,
          label: formatChapterLabel(pack, lesson.lesson_number),
          locked: !isMaster && !canAccessLesson(progressRows, chapterProgress),
          selected: lesson.id === selectedLesson?.id,
          done: isModeCompleted(progressRows, chapterProgress, 'word'),
          onSelect: () => {
            setSelectingData((current) =>
              current ? { ...current, selectedLesson: lesson } : current
            );
            setIsDropdownOpen(false);
          },
        };
      })}
      modes={MODE_ORDER.map((mode) => ({
        id: mode,
        label: MODE_LABEL[mode],
        locked: !modeOpen(mode),
        done: isModeCompleted(progressRows, progressLesson, mode),
        here: hereMode === mode,
        open: isMaster,
        onSelect: () => handleModeSelect(mode),
      }))}
    />
  );
}

export default function SelectingPage() {
  return (
    <Suspense fallback={<SelectingLoadingScreen />}>
      <SelectingPageContent />
    </Suspense>
  );
}
