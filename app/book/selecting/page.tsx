"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useFullscreen } from "../../hooks/useFullscreen";
import { BOOK_SCENES } from "../../lib/monthCatalog";
import { formatChapterLabel, formatMovieId, parseLessonNumber, parseProgressLesson } from "../../dataService";
import {
  fetchOwnProgress,
  canAccessMode,
  isMasterRole,
  isModeCompleted,
  MODE_ORDER,
  type LearnMode,
  type ProgressRow,
} from "../../lib/progressGate";
import { BOOK_PACK, bookSceneHasContent, lessonPath } from "../../lib/lessonMedia";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";
import ModeSelectLayout from "../../components/ModeSelectLayout";
import AccountMenu from "../../components/AccountMenu";

const BOOK_MODES: Array<{ learn: LearnMode; label: string }> = [
  { learn: "watching", label: "Listen" },
  { learn: "mimicking", label: "Mimic" },
  { learn: "guessing", label: "Guess" },
  { learn: "word", label: "Word" },
];

function BookSelectingContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id") || formatMovieId(BOOK_PACK, 1);
  const pack = BOOK_PACK;
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [sceneIndex, setSceneIndex] = useState(() =>
    Math.max(0, Math.min(BOOK_SCENES.length - 1, parseLessonNumber(requestedId) - 1))
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMaster = isMasterRole(profile?.role);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      setProgressRows([]);
      return;
    }
    fetchOwnProgress().then(setProgressRows);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const scene = sceneIndex + 1;
  const movieId = formatMovieId(pack, scene);
  const progressLesson = parseProgressLesson(movieId);
  const hasContent = bookSceneHasContent(scene);
  const modeOpen = (mode: LearnMode) =>
    hasContent && (isMaster || canAccessMode(progressRows, progressLesson, mode));
  const hereMode =
    MODE_ORDER.find((mode) => !isModeCompleted(progressRows, progressLesson, mode));

  const openMode = (mode: LearnMode) => {
    if (!modeOpen(mode)) return;
    if (!hasContent) {
      window.location.href = `/book/coming-soon?mode=${mode === "watching" ? "listen" : mode}&scene=${scene}`;
      return;
    }
    window.location.href = lessonPath(movieId, mode);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">불러오는 중…</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요해요.</h1>
      </main>
    );
  }

  return (
    <ModeSelectLayout
      badge={<AccountMenu onOpenAdmin={isMaster ? () => router.push("/admin") : undefined} />}
      chapterLabel={formatChapterLabel(pack, scene)}
      dropdownOpen={isDropdownOpen}
      onToggleDropdown={() => setIsDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      extraActions={
        <>
          <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
        </>
      }
      chapters={BOOK_SCENES.map((label, index) => {
        const n = index + 1;
        return {
          id: label,
          label: bookSceneHasContent(n) ? formatChapterLabel(pack, n) : `${formatChapterLabel(pack, n)} · 준비 중`,
          locked: !bookSceneHasContent(n),
          selected: index === sceneIndex,
          done: isModeCompleted(progressRows, parseProgressLesson(formatMovieId(pack, n)), "word"),
          onSelect: () => {
            setSceneIndex(index);
            setIsDropdownOpen(false);
          },
        };
      })}
      modes={BOOK_MODES.map((mode) => ({
        id: mode.learn,
        label: mode.label,
        locked: !modeOpen(mode.learn),
        done: hasContent && isModeCompleted(progressRows, progressLesson, mode.learn),
        here: hasContent && hereMode === mode.learn,
        open: isMaster && hasContent,
        onSelect: () => openMode(mode.learn),
      }))}
    />
  );
}

export default function BookSelectingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookSelectingContent />
    </Suspense>
  );
}
