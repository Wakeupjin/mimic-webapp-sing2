"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { HeaderCloseLink } from "./HeaderIcons";

export type ModeSelectItem = {
  id: string;
  label: string;
  locked: boolean;
  done: boolean;
  here: boolean;
  open?: boolean;
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
  contentTitle?: string;
  contentType?: "영화" | "원서";
  chapterLabel: string;
  chapters: ChapterSelectItem[];
  modes: ModeSelectItem[];
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  listRef?: React.RefObject<HTMLDivElement | null>;
  extraActions?: ReactNode;
  badge?: ReactNode;
};

const MODE_COPY: Record<string, { eyebrow: string; description: string }> = {
  watching: { eyebrow: "01", description: "장면과 소리를 먼저 익혀요" },
  mimicking: { eyebrow: "02", description: "리듬까지 똑같이 따라 해요" },
  guessing: { eyebrow: "03", description: "소리만 듣고 문장을 찾아요" },
  word: { eyebrow: "04", description: "단어를 직접 이어 완성해요" },
  listen: { eyebrow: "01", description: "이야기와 소리를 먼저 익혀요" },
};

export default function ModeSelectLayout({
  contentTitle = "Sing 2",
  contentType = "영화",
  chapterLabel,
  chapters,
  modes,
  dropdownOpen,
  onToggleDropdown,
  dropdownRef,
  listRef,
  extraActions,
  badge,
}: ModeSelectLayoutProps) {
  return (
    <main className="select-stage select-stage-v2">
      <header className="select-header-v2">
        <Link href="/" className="select-brand-v2" aria-label="MimiC 홈">MimiC</Link>
        <div className="select-header-actions-v2">
          {badge}
          {extraActions}
          <HeaderCloseLink href="/" />
        </div>
      </header>

      <section className="select-hero-v2">
        <div className="select-heading-v2">
          <p>{contentType} · MONTHLY COURSE</p>
          <h1>{contentTitle}</h1>
          <span>한 단계씩 완료하면 다음 학습이 열려요.</span>
        </div>

        <div className="select-chapter-wrap select-chapter-wrap-v2" ref={dropdownRef}>
          <span>학습 장면</span>
          <button type="button" onClick={onToggleDropdown} className="select-chapter select-chapter-v2" aria-expanded={dropdownOpen}>
            {chapterLabel}
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className={dropdownOpen ? "is-open" : ""}>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="select-chapter-menu-v2">
              <div ref={listRef} className="custom-scrollbar">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    disabled={chapter.locked}
                    onClick={chapter.onSelect}
                    className={`${chapter.selected ? "is-selected" : ""} ${chapter.locked ? "is-locked" : ""}`}
                  >
                    <span>{chapter.label}</span>
                    {chapter.done ? <b aria-label="완료">✓</b> : chapter.locked ? <b aria-label="잠김">⌁</b> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="select-journey-v2" aria-label="학습 단계">
        <div className="select-journey-line-v2" aria-hidden />
        {modes.map((mode, index) => {
          const copy = MODE_COPY[mode.id] ?? MODE_COPY[mode.label.toLowerCase()] ?? {
            eyebrow: String(index + 1).padStart(2, "0"),
            description: "학습을 이어가요",
          };
          const state = mode.done ? "완료" : mode.here ? "현재 단계" : mode.locked ? "잠김" : "시작 가능";
          return (
            <article key={mode.id} className={`select-step-v2 ${mode.done ? "is-done" : ""} ${mode.here ? "is-current" : ""} ${mode.locked ? "is-locked" : ""}`}>
              <button type="button" onClick={mode.onSelect} disabled={mode.locked} aria-label={`${mode.label}, ${state}`}>
                <span className="select-step-number-v2">{copy.eyebrow}</span>
                <span className="select-step-state-v2">{state}</span>
                <strong>{mode.label}</strong>
                <small>{copy.description}</small>
                <span className="select-step-arrow-v2" aria-hidden>{mode.done ? "✓" : mode.locked ? "·" : "→"}</span>
              </button>
            </article>
          );
        })}
      </section>

      <footer className="select-legend-v2">
        <span><i className="is-current" /> 현재</span>
        <span><i className="is-done" /> 완료</span>
        <span><i /> 시작 가능</span>
      </footer>
    </main>
  );
}
