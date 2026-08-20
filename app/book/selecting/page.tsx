"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useFullscreen } from "../../hooks/useFullscreen";
import { BOOK_SCENES } from "../../lib/monthCatalog";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";
import ModeSelectLayout from "../../components/ModeSelectLayout";

type BookMode = "listen" | "mimicking" | "guessing" | "word";

const BOOK_MODES: Array<{ id: BookMode; label: string }> = [
  { id: "listen", label: "Listen" },
  { id: "mimicking", label: "Mimic" },
  { id: "guessing", label: "Guess" },
  { id: "word", label: "Quiz" },
];

function BookSelectingContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialScene = Math.max(1, Math.min(BOOK_SCENES.length, Number(searchParams.get("scene") || 1)));
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [sceneIndex, setSceneIndex] = useState(initialScene - 1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

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

  const openMode = (mode: BookMode) => {
    const scene = sceneIndex + 1;
    window.location.href = `/book/coming-soon?mode=${mode}&scene=${scene}`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">로딩 중...</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-xl font-semibold text-[#60D96C]">로그인이 필요합니다...</h1>
      </main>
    );
  }

  return (
    <ModeSelectLayout
      chapterLabel={`CHAPTER ${sceneIndex + 1}`}
      dropdownOpen={isDropdownOpen}
      onToggleDropdown={() => setIsDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      extraActions={
        <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
          <FullscreenIcon active={isFullscreen} />
        </HeaderIconButton>
      }
      chapters={BOOK_SCENES.map((label, index) => ({
        id: label,
        label: `CHAPTER ${index + 1}`,
        locked: false,
        selected: index === sceneIndex,
        done: false,
        onSelect: () => {
          setSceneIndex(index);
          setIsDropdownOpen(false);
        },
      }))}
      modes={BOOK_MODES.map((mode, index) => ({
        id: mode.id,
        label: mode.label,
        locked: false,
        done: false,
        here: index === 0,
        onSelect: () => openMode(mode.id),
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
