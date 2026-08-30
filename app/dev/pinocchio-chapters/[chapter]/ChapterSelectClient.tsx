"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModeSelectLayout from "../../../components/ModeSelectLayout";
import { FullscreenIcon, HeaderIconButton } from "../../../components/HeaderIcons";
import { useFullscreen } from "../../../hooks/useFullscreen";
import { chapterRoot, MODE_LABEL, MODE_ORDER, modeHref } from "../lessonData";
import {
  canOpenChapter,
  canOpenMode,
  PINOCCHIO_PROGRESS_EVENT,
  readProgress,
  resetProgress,
  safeChapterRoot,
  type ChapterProgress,
} from "../localProgress";
import type { LessonMode } from "../types";
import styles from "../pinocchio-chapters.module.css";

type Props = {
  chapterNumber: number;
  totalChapters: number;
  titleEn: string;
  titleKo: string;
};

export default function ChapterSelectClient({
  chapterNumber,
  totalChapters,
  titleEn,
  titleKo,
}: Props) {
  const router = useRouter();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [progress, setProgress] = useState<ChapterProgress>({});
  const [ready, setReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const nextProgress = readProgress();
      setProgress(nextProgress);
      setReady(true);
      if (!canOpenChapter(chapterNumber, nextProgress)) {
        router.replace(safeChapterRoot(chapterNumber, nextProgress));
      }
    };
    sync();
    window.addEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [chapterNumber, router]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const selected = listRef.current?.querySelector<HTMLElement>("[aria-current='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [dropdownOpen]);

  const completed = progress[String(chapterNumber)] ?? [];
  const hereMode = MODE_ORDER.find((mode) => !completed.includes(mode));

  if (!ready || !canOpenChapter(chapterNumber, progress)) {
    return <main className="min-h-screen bg-black" />;
  }

  return (
    <ModeSelectLayout
      badge={
        <button
          type="button"
          className={styles.profileBadge}
          title="더블클릭하면 12개 Chapter의 로컬 진행을 초기화합니다"
          onDoubleClick={() => {
            resetProgress();
            setProgress({});
            router.push(chapterRoot(1));
          }}
        >
          <span>피</span>
          <b>피노키오</b>
          <small title={`${titleEn} · ${titleKo}`}>Core · {chapterNumber}/{totalChapters}</small>
        </button>
      }
      chapterLabel={`CHAPTER ${chapterNumber}`}
      dropdownOpen={dropdownOpen}
      onToggleDropdown={() => setDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      listRef={listRef}
      closeHref="/dev/pinocchio-levels"
      extraActions={
        <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
          <FullscreenIcon active={isFullscreen} />
        </HeaderIconButton>
      }
      chapters={Array.from({ length: totalChapters }, (_, index) => {
        const number = index + 1;
        const chapterCompleted = progress[String(number)] ?? [];
        return {
          id: number,
          label: `CHAPTER ${number}`,
          locked: !canOpenChapter(number, progress),
          selected: number === chapterNumber,
          done: chapterCompleted.includes("word"),
          onSelect: () => {
            setDropdownOpen(false);
            router.push(chapterRoot(number));
          },
        };
      })}
      modes={MODE_ORDER.map((mode: LessonMode) => ({
        id: mode,
        label: MODE_LABEL[mode],
        locked: !canOpenMode(mode, completed),
        done: completed.includes(mode),
        here: hereMode === mode,
        onSelect: () => router.push(modeHref(chapterNumber, mode)),
      }))}
    />
  );
}
