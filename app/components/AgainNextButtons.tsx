import React from 'react';

interface AgainNextButtonsProps {
  onAgain: () => void;
  onNext: () => void;
  className?: string;
}

export default function AgainNextButtons({
  onAgain,
  onNext,
  className = "",
}: AgainNextButtonsProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="cta-row relative z-10 pointer-events-auto">
        <button type="button" onClick={onAgain} className="cta-btn cta-ghost">
          Again
        </button>
        <button type="button" onClick={onNext} className="cta-btn cta-primary relative">
          <img src="/Subject.png" alt="" className="cta-mascot" />
          Next
        </button>
      </div>
    </div>
  );
}
