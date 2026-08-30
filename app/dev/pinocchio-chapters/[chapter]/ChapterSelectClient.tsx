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
  LEGACY_PINOCCHIO_LESSON_NUMBER_BASE,
  LEGACY_PINOCCHIO_PROGRESS_SCOPE,
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
  levelLabel?: string;
  releaseBadge?: string | null;
  mediaReady?: boolean;
  mediaMessage?: string;
  chapterAvailability?: boolean[];
  progressScope?: string;
  lessonNumberBase?: number;
};

export default function ChapterSelectClient({
  chapterNumber,
  totalChapters,
  titleEn,
  titleKo,
  levelLabel = "Core",
  releaseBadge = null,
  mediaReady = true,
  mediaMessage,
  chapterAvailability,
  progressScope = LEGACY_PINOCCHIO_PROGRESS_SCOPE,
  lessonNumberBase = LEGACY_PINOCCHIO_LESSON_NUMBER_BASE,
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
    let remoteProgressSettled = isMaster;

    const applyProgress = (nextProgress: ChapterProgress) => {
      setProgress(nextProgress);
      if (remoteProgressSettled) setReady(true);
      if (remoteProgressSettled && !isMaster && !canOpenChapter(chapterNumber, nextProgress)) {
        router.replace(safeChapterRoot(chapterNumber, nextProgress));
      }
    };

    const sync = () => applyProgress(readProgress(progressScope));
    sync();

    if (!isMaster) {
      void fetchOwnProgress()
        .then((rows) => mergeRemoteProgress(rows, progressScope, lessonNumberBase))
        .catch(() => readProgress(progressScope))
        .then((nextProgress) => {
          if (cancelled) return;
          remoteProgressSettled = true;
          applyProgress(nextProgress);
        });
    }
    window.addEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(PINOCCHIO_PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [chapterNumber, isMaster, lessonNumberBase, loading, profileLoading, progressScope, router, user]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const selected = listRef.current?.querySelector<HTMLElement>("[aria-current='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [dropdownOpen]);

  const completed = progress[String(chapterNumber)] ?? [];
  const hereMode = mediaReady ? MODE_ORDER.find((mode) => !completed.includes(mode)) : undefined;

  if (loading || profileLoading || !user || !ready || (!isMaster && !canOpenChapter(chapterNumber, progress))) {
    return <main className="min-h-screen bg-black" />;
  }

  return (
    <ModeSelectLayout
      badge={
        <div className={styles.profileBadge}>
          <span>피</span>
          <b>피노키오</b>
          <small title={`${titleEn} · ${titleKo}`}>{levelLabel} · {chapterNumber}/{totalChapters}</small>
        </div>
      }
      chapterLabel={`CHAPTER ${chapterNumber}`}
      dropdownOpen={dropdownOpen}
      onToggleDropdown={() => setDropdownOpen((open) => !open)}
      dropdownRef={dropdownRef}
      listRef={listRef}
      closeHref="/"
      extraActions={
        <>
          {releaseBadge ? <span className={styles.betaBadge}>{releaseBadge}</span> : null}
          <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
            <FullscreenIcon active={isFullscreen} />
          </HeaderIconButton>
        </>
      }
      notice={!mediaReady ? (
        <p>{mediaMessage ?? `Chapter ${chapterNumber} 음원과 타임라인을 준비 중입니다.`}</p>
      ) : undefined}
      chapters={Array.from({ length: totalChapters }, (_, index) => {
        const number = index + 1;
        const chapterCompleted = progress[String(number)] ?? [];
        const chapterMediaReady = chapterAvailability?.[index] ?? true;
        return {
          id: number,
          label: `CHAPTER ${number}`,
          locked: !chapterMediaReady || (!isMaster && !canOpenChapter(number, progress)),
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
        locked: !mediaReady || (!isMaster && !canOpenMode(mode, completed)),
        done: completed.includes(mode),
        here: hereMode === mode,
        onSelect: () => router.push(modeHref(chapterNumber, mode)),
      }))}
    />
  );
}
