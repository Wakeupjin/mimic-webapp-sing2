"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MimicLineListProps = {
  id?: string;
  label?: string;
  mobileSheet?: boolean;
  total: number;
  currentIndex: number;
  canOpen: (index: number) => boolean;
  onDismiss?: () => void;
  onSelect: (index: number) => void;
};

function lineLabel(index: number) {
  return `Line ${String(index + 1).padStart(2, "0")}`;
}

export default function MimicLineList({
  id,
  label = "문장 목록",
  mobileSheet = false,
  total,
  currentIndex,
  canOpen,
  onDismiss,
  onSelect,
}: MimicLineListProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);
  const [sheetActive, setSheetActive] = useState(false);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
    currentRef.current?.focus({ preventScroll: true });
  }, [currentIndex, sheetActive]);

  useEffect(() => {
    if (!mobileSheet) return;
    const query = window.matchMedia("(orientation: portrait) and (max-width: 540px)");
    const update = () => setSheetActive(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [mobileSheet]);

  useEffect(() => {
    if (!sheetActive || !onDismiss) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss, sheetActive]);

  const list = (
    <div id={id} className="mimic-lines" role="listbox" aria-label={label}>
      {Array.from({ length: total }, (_, index) => {
        const current = index === currentIndex;
        const locked = !canOpen(index);
        return (
          <button
            key={index}
            ref={current ? currentRef : undefined}
            type="button"
            role="option"
            aria-selected={current}
            disabled={locked}
            className={`mimic-line ${current ? "is-current" : ""}`}
            onClick={() => onSelect(index)}
          >
            <span>{lineLabel(index)}</span>
            {current ? (
              <span className="mimic-line-mark" aria-hidden>
                <img src="/home/line-check.svg" alt="" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (!sheetActive) return list;

  return createPortal(
    <div className="mimic-lines-sheet" role="dialog" aria-modal="true" aria-labelledby={id ? `${id}-title` : undefined} aria-label={id ? undefined : label}>
      <button type="button" className="mimic-lines-sheet-backdrop" aria-label={`${label} 닫기`} onClick={onDismiss} />
      <div className="mimic-lines-sheet-panel">
        <div className="mimic-lines-sheet-header">
          <strong id={id ? `${id}-title` : undefined}>{label}</strong>
          <button type="button" onClick={onDismiss} aria-label={`${label} 닫기`}>닫기</button>
        </div>
        {list}
      </div>
    </div>,
    document.body,
  );
}
