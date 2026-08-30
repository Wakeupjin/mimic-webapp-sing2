"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModeSelectLayout from "../../../components/ModeSelectLayout";
import { FullscreenIcon, HeaderIconButton } from "../../../components/HeaderIcons";
import { useAuth } from "../../../contexts/AuthContext";
import { useFullscreen } from "../../../hooks/useFullscreen";
import { fetchOwnProgress, isMasterRole } from "../../../lib/progressGate";
import { chapterRoot, MODE_LABEL, MODE_ORDER, modeHref } from "../lessonData";
import {
  canOpenChapter,
  canOpenMode,
  mergeRemoteProgress,
  PINOCCHIO_PROGRESS_EVENT,
  readProgress,
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
  const { user, profile, loading, profileLoading } = useAuth();
  const isMaster = isMasterRole(profile?.role);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [progress, setProgress] = useState<ChapterProgress>({});
  const [ready, setReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    let cancelled = false;
    const sync = () => {
      const nextProgress = readProgress();
      setProgress(nextProgress);
      setReady(true);
      if (!isMaster && !canOpenChapter(chapterNumber, nextProgress)) {
        router.replace(safeChapterRoot(chapterNumber, nextProgress));
      }
    };
    sync();
    void fetchOwnProgress().then((rows) => {
      if (cancelled) return;
      const nextProgress = mergeRemoteProgress(rows);
      setProgress(nextProgress);
      setReady(true);
      if (!isMaster && !canOpenChapter(chapterNumber, nextProgress)) {
        router.replace(safeChapterRoot(chapterNumber, nextProgress));
      }
    });
    window.addEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [chapterNumber, isMaster, loading, profileLoading, router, user]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const selected = listRef.current?.querySelector<HTMLElement>("[aria-current='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [dropdownOpen]);

  const completed = progress[String(chapterNumber)] ?? [];
  const hereMode = MODE_ORDER.find((mode) => !completed.includes(mode));

  if (loading || profileLoading || !user || !ready || (!isMaster && !canOpenChapter(chapterNumber, progress))) {
    return <main className="min-h-screen bg-black" />;
  }

  return (
    <ModeSelectLayout
      badge={
        <div className={styles.profileBadge}>
          <span>피</span>
          <b>피노키오</b>
          <small title={`${titleEn} · ${titleKo}`}>Core · {chapterNumber}/{totalChapters}</small>
        </div>
      }
      chapterLabel={`CHAPTER ${chapterNumber}`}
      dropdownOpen={dropdownOpen}
      onToggleDropdown={() => setDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      listRef={listRef}
      closeHref="/"
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
          locked: !isMaster && !canOpenChapter(number, progress),
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
        locked: !isMaster && !canOpenMode(mode, completed),
        done: completed.includes(mode),
        here: hereMode === mode,
        onSelect: () => router.push(modeHref(chapterNumber, mode)),
      }))}
    />
  );
}
