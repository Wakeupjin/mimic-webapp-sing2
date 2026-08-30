"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModeSelectLayout from "../../components/ModeSelectLayout";
import { FullscreenIcon, HeaderIconButton } from "../../components/HeaderIcons";
import { useFullscreen } from "../../hooks/useFullscreen";
import { MODE_LABEL, MODE_ORDER, modeHref, type LessonMode } from "./lessonData";
import { canOpenMode, readCompleted, resetProgress } from "./localProgress";
import styles from "./pinocchio-session-1.module.css";

export default function PinocchioSessionOneSelecting() {
  const router = useRouter();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [completed, setCompleted] = useState<LessonMode[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setCompleted(readCompleted());
    sync();
    window.addEventListener("pinocchio-progress", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pinocchio-progress", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const hereMode = MODE_ORDER.find((mode) => !completed.includes(mode));

  return (
    <ModeSelectLayout
      badge={
        <button
          type="button"
          className={styles.profileBadge}
          title="더블클릭하면 로컬 진행을 초기화합니다"
          onDoubleClick={() => { resetProgress(); setCompleted([]); }}
        >
          <span>피</span>
          <b>피노키오</b>
          <small>Core · 로컬</small>
        </button>
      }
      chapterLabel="SESSION 1"
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
      chapters={Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        label: `SESSION ${index + 1}`,
        locked: index > 0,
        selected: index === 0,
        done: index === 0 && completed.includes("word"),
        onSelect: () => setDropdownOpen(false),
      }))}
      modes={MODE_ORDER.map((mode) => ({
        id: mode,
        label: MODE_LABEL[mode],
        locked: !canOpenMode(mode, completed),
        done: completed.includes(mode),
        here: hereMode === mode,
        onSelect: () => router.push(modeHref(mode)),
      }))}
    />
  );
}
