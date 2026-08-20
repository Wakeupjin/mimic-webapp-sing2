"use client";

import { ReactNode } from "react";
import Link from "next/link";

export type ModeSelectItem = {
  id: string;
  label: string;
  locked: boolean;
  done: boolean;
  here: boolean;
  onSelect: () => void;
};

export type ChapterSelectItem = {
  id: string | number;
  label: string;
  locked: boolean;
  selected: boolean;
  done: boolean;
  onSelect: () => void;
};

type ModeSelectLayoutProps = {
  chapterLabel: string;
  chapters: ChapterSelectItem[];
  modes: ModeSelectItem[];
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  listRef?: React.RefObject<HTMLDivElement | null>;
  extraActions?: ReactNode;
};

export default function ModeSelectLayout({
  chapterLabel,
  chapters,
  modes,
  dropdownOpen,
  onToggleDropdown,
  dropdownRef,
  listRef,
  extraActions,
}: ModeSelectLayoutProps) {
  return (
    <main className="select-stage relative flex flex-col overflow-hidden px-[clamp(1rem,2vw,2.5rem)] py-[clamp(0.8rem,1.6vw,1.5rem)]">
      <header className="relative z-20 flex shrink-0 items-start justify-end gap-2">
        {extraActions}
        <Link href="/" className="select-close" aria-label="닫기">
          <img src="/home/close.svg" alt="" className="h-full w-full" />
        </Link>
      </header>

      <div className="absolute left-1/2 top-[clamp(1.2rem,5.3vh,3.6rem)] z-30 -translate-x-1/2" ref={dropdownRef}>
        <button type="button" onClick={onToggleDropdown} className="select-chapter" aria-expanded={dropdownOpen}>
          {chapterLabel}
          <svg
            width="28"
            height="16"
            viewBox="0 0 41 20"
            fill="none"
            aria-hidden
            className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          >
            <path d="M2 2L20.5 18L39 2" stroke="white" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(50vh,22rem)] overflow-hidden rounded-[25px] shadow-lg"
            style={{ backgroundColor: "#201E1E" }}
          >
            <div ref={listRef} className="custom-scrollbar max-h-[min(50vh,22rem)] overflow-auto">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  disabled={chapter.locked}
                  onClick={chapter.onSelect}
                  className={`relative flex w-full items-center justify-center border-t border-[#333] px-6 py-3 first:border-t-0 disabled:cursor-not-allowed ${
                    chapter.locked ? "text-[#555]" : "text-white hover:bg-[#2a2a2a]"
                  }`}
                  style={{
                    fontFamily: '"Encode Sans Semi Condensed", "Encode Sans", sans-serif',
                    fontWeight: 800,
                    fontSize: "clamp(1rem, 2.2vw, 1.6rem)",
                  }}
                >
                  {chapter.label}
                  {chapter.done && (
                    <span className="absolute right-4 flex h-6 w-6 items-center justify-center rounded-md bg-[#60D96C]">
                      <svg width="14" height="12" viewBox="0 0 18 16" fill="none" aria-hidden>
                        <path d="M2 7.5L7 13L16 2" stroke="#ECECEC" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="select-modes">
          {modes.map((mode) => (
            <div key={mode.id} className="flex w-[clamp(9.5rem,14.5vw,17.4rem)] flex-col items-center">
              <button
                type="button"
                onClick={mode.onSelect}
                disabled={mode.locked}
                className={`select-mode ${mode.done || mode.here ? "is-open" : ""}`}
              >
                {mode.here && (
                  <img src="/home/chameleon.png" alt="" className="select-chameleon" />
                )}
                {mode.label}
              </button>
              <p className="select-here" style={{ visibility: mode.here ? "visible" : "hidden" }}>
                You are Here
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
