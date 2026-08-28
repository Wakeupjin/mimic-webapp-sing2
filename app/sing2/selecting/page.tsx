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

// Lesson 목록 데이터 타입 (lessons 테이블에서 가져올 정보)
type LessonSummary = {
  id: number;
  lesson_number: number;
  video_id: number; 
};
// --- [/SUPABASE 연결 및 타입 정의] ---

// 상수 (로컬 상수는 최소화하고 Supabase 데이터를 사용)
function SelectingPageContent() {
  // 모든 훅을 최상단에 배치 (조건부 호출 방지)
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pack = parsePack(searchParams.get('id') || '001:1');
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  // 상태 관리
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<LessonSummary | null>(null); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
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
    const fetchLessons = async () => {
      // console.log('🔄 Lesson 데이터 로딩 시작...');
      setIsLoading(true);
      
      try {
        const lessonList =
          pack >= 2
            ? [{ id: 1, lesson_number: 1, video_id: 1 }]
            : await fetchLessonSummaries();
        setLessons(lessonList);

        const lessonOne = lessonList.find((lesson) => lesson.lesson_number === 1) || lessonList[0];
        if (lessonOne) {
          setSelectedLesson(lessonOne);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('❌ fetchLessons 에러:', err);
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, [pack]);

  useEffect(() => {
    if (!user) {
      setProgressRows([]);
      return;
    }
    fetchOwnProgress().then(setProgressRows);
  }, [user]);
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

  const handleModeSelect = (mode: LearnMode) => {
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
    
    if (mode === 'mimicking') {
      window.location.href = `/sing2/mimicking?id=${movieId}`;
    } else if (mode === 'guessing') {
      window.location.href = `/sing2/guessing?id=${movieId}`;
    } else if (mode === 'watching') {
      window.location.href = `/sing2/watching?id=${movieId}`;
    } else if (mode === 'word') {
      window.location.href = `/sing2/word?id=${movieId}`;
    }
  };

  
  // --- [로딩 및 에러 화면] ---
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <h1 className="text-xl font-semibold text-[#60D96C]">Lesson 목록을 불러오는 중...</h1>
      </main>
    );
  }

  if (lessons.length === 0) {
     return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#201E1E' }}>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-500 mb-4">등록된 Lesson이 없습니다.</h1>
          <p className="text-gray-300 mb-2">Supabase 연결을 확인해주세요.</p>
          <p className="text-gray-400 text-sm">환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
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
    word: 'Word',
  };

  return (
    <ModeSelectLayout
      contentTitle="Sing 2"
      contentType="영화"
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
            setSelectedLesson(lesson);
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
    <Suspense fallback={<div>Loading...</div>}>
      <SelectingPageContent />
    </Suspense>
  );
}
