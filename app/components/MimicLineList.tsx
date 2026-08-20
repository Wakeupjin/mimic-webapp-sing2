"use client";

import { useEffect, useRef } from "react";

type MimicLineListProps = {
  total: number;
  currentIndex: number;
  canOpen: (index: number) => boolean;
  onSelect: (index: number) => void;
};

function lineLabel(index: number) {
  return `Line ${String(index + 1).padStart(2, "0")}`;
}

export default function MimicLineList({
  total,
  currentIndex,
  canOpen,
  onSelect,
}: MimicLineListProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentIndex]);

  return (
    <div className="mimic-lines" role="listbox" aria-label="문장 목록">
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
}
