"use client";

import ControlTriangle from "./ControlTriangle";

interface PlaybackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onPlay: (muted: boolean, slotIndex: number) => void;
  activeIndex: number | null;
  isFullscreen?: boolean;
  highlightNext?: boolean;
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
}: PlaybackControlsProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto flex w-max max-w-full items-center justify-center rounded-lg bg-[#201E1E] px-1 py-1 sm:px-2"
        style={{ gap: "var(--ctrl-gap)" }}
      >
        <ControlTriangle direction="left" onClick={onPrev} label="이전 문장" />
        {STEPS.map((step) => {
          const isActive = activeIndex === step.index;
          return (
            <button
              key={step.index}
              type="button"
              aria-label={step.muted ? "무음 재생" : "재생"}
              onClick={() => onPlay(step.muted, step.index)}
              className={`flex shrink-0 items-center justify-center rounded-[10px] transition-transform duration-200 hover:scale-105 ${
                isActive ? "scale-105" : ""
              }`}
              style={{
                width: "var(--ctrl-size)",
                height: "var(--ctrl-size)",
                background: isActive ? "#60D96C" : "#666666",
              }}
            >
              {step.muted ? <span className="ctrl-mute-letter">m</span> : <span className="ctrl-play-icon" />}
            </button>
          );
        })}
        <ControlTriangle
          direction="right"
          onClick={onNext}
          label="다음 문장"
          highlight={highlightNext}
        />
      </div>
    </div>
  );
}
