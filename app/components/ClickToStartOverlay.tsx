import React from 'react';

interface ClickToStartOverlayProps {
  onClick: () => void;
  text?: string;
  description?: string;
  actionLabel?: string;
  className?: string;
}

export default function ClickToStartOverlay({ 
  onClick, 
  text = "학습을 시작해요",
  description,
  actionLabel = "시작",
  className = ""
}: ClickToStartOverlayProps) {
  return (
    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-5 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="w-full max-w-md rounded-2xl border border-white/25 bg-[#201e1e]/95 px-7 py-7 text-center transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#60D96C] sm:px-10 sm:py-9"
      >
        <p className="text-xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
          {text}
        </p>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">{description}</p>
        ) : null}
        <span className="mt-6 inline-flex min-w-24 items-center justify-center rounded-full bg-[#60D96C] px-5 py-2.5 text-base font-bold text-black">
          {actionLabel}
        </span>
      </button>
    </div>
  );
}
