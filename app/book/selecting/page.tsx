"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useFullscreen } from "../../hooks/useFullscreen";
import { BOOK_MONTH, BOOK_SCENES } from "../../lib/monthCatalog";
import { FullscreenIcon, HeaderCloseLink, HeaderIconButton } from "../../components/HeaderIcons";

type BookMode = "listen" | "mimicking" | "guessing" | "word";

const MODE_BUTTON =
  "rounded-2xl border-4 border-gray-300 px-4 py-4 text-lg font-bold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400 sm:text-xl lg:border-8 lg:px-8 lg:py-5 lg:text-2xl";

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
    <main className="flex min-h-dvh flex-col px-4 py-4" style={{ backgroundColor: "#000000" }}>
      <div className="mb-6 flex items-center justify-between md:mb-8">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          {BOOK_MONTH.title}
        </h1>
        <div className="flex items-center gap-1.5">
          <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
          <HeaderCloseLink />
        </div>
      </div>

      <div className="mb-6 flex justify-center md:mb-8">
        <div className="relative w-full max-w-xs sm:max-w-sm" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl px-6 py-3 text-xl font-bold text-white transition-all duration-200 hover:bg-[#2a2a2a]"
            style={{ backgroundColor: "#201E1E", fontFamily: "Encode Sans, sans-serif" }}
          >
            <span className="text-base">Scene {sceneIndex + 1}</span>
          </button>

          {isDropdownOpen && (
            <div
              className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl shadow-lg"
              style={{ backgroundColor: "#201E1E", maxHeight: "220px" }}
            >
              <div className="custom-scrollbar overflow-auto" style={{ maxHeight: "220px" }}>
                {BOOK_SCENES.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setSceneIndex(index);
                      setIsDropdownOpen(false);
                    }}
                    className="relative flex w-full items-center justify-center border-t border-gray-800 px-6 py-3 text-center text-white first:border-t-0 hover:bg-[#2a2a2a]"
                    style={{ fontFamily: "Encode Sans, sans-serif" }}
                  >
                    <span className="text-base">Scene {index + 1}</span>
                    {index === sceneIndex && (
                      <span className="absolute right-4 h-3 w-3 rounded-sm bg-[#60D96C]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center py-4">
        <div className="w-full text-center">
          <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4 lg:flex lg:max-w-none lg:justify-center lg:gap-6">
            <button type="button" onClick={() => openMode("listen")} className={MODE_BUTTON} style={{ backgroundColor: "white", fontFamily: "Encode Sans, sans-serif" }}>
              Listen
            </button>
            <button type="button" onClick={() => openMode("mimicking")} className={MODE_BUTTON} style={{ backgroundColor: "white", fontFamily: "Encode Sans, sans-serif" }}>
              Mimic
            </button>
            <button type="button" onClick={() => openMode("guessing")} className={MODE_BUTTON} style={{ backgroundColor: "white", fontFamily: "Encode Sans, sans-serif" }}>
              Guess
            </button>
            <button type="button" onClick={() => openMode("word")} className={MODE_BUTTON} style={{ backgroundColor: "white", fontFamily: "Encode Sans, sans-serif" }}>
              Word
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-500" style={{ fontFamily: "Encode Sans, sans-serif" }}>
            영화와 같은 네 칸 · Watch 자리에 Listen
          </p>
        </div>
      </div>
    </main>
  );
}

export default function BookSelectingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookSelectingContent />
    </Suspense>
  );
}
