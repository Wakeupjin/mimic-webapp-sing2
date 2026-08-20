"use client";

import ControlTriangle from "./ControlTriangle";

interface PlaybackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onPlay: (muted: boolean, slotIndex: number) => void;
  activeIndex: number | null;
  isFullscreen?: boolean;
  highlightNext?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  variant?: "default" | "cinema";
}

const STEPS: Array<{ index: number; muted: boolean }> = [
  { index: 0, muted: false },
  { index: 1, muted: false },
  { index: 2, muted: false },
  { index: 3, muted: true },
  { index: 4, muted: false },
  { index: 5, muted: true },
  { index: 6, muted: false },
  { index: 7, muted: true },
];

export default function PlaybackControls({
  onPrev,
  onNext,
  onPlay,
  activeIndex,
  highlightNext = false,
  prevLabel = "이전 문장",
  nextLabel = "다음 문장",
  variant = "default",
}: PlaybackControlsProps) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div
        className={`mx-auto flex w-max max-w-full items-center justify-center bg-[var(--bar)] px-1 py-1 sm:px-2 ${
          variant === "cinema" ? "mimic-bar" : "rounded-lg"
        }`}
        style={{ gap: "var(--ctrl-gap)" }}
      >
        <ControlTriangle direction="left" onClick={onPrev} label={prevLabel} />
        {STEPS.map((step) => {
          const isActive = activeIndex === step.index;
          return (
            <button
              key={step.index}
              type="button"
              aria-label={step.muted ? "무음 재생" : "재생"}
              onClick={() => onPlay(step.muted, step.index)}
              className={`ctrl-slot ${step.muted ? "is-mimic" : "is-listen"} ${isActive ? "is-active" : ""}`}
              style={{
                width: "var(--ctrl-size)",
                height: "var(--ctrl-size)",
              }}
            >
              {step.muted ? <span className="ctrl-mute-letter">m</span> : <span className="ctrl-play-icon" />}
            </button>
          );
        })}
        <ControlTriangle
          direction="right"
          onClick={onNext}
          label={nextLabel}
          highlight={highlightNext}
        />
      </div>
    </div>
  );
}
