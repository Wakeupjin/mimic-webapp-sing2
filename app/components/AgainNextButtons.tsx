import React from 'react';

interface AgainNextButtonsProps {
  onAgain: () => void;
  onNext: () => void;
  className?: string;
}

export default function AgainNextButtons({ 
  onAgain, 
  onNext,
  className = ""
}: AgainNextButtonsProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="cta-row relative z-10 pointer-events-auto">
        <button
          onClick={onAgain}
          className="cta-btn bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          Again
        </button>
        <button
          onClick={onNext}
          className="cta-btn bg-[#60D96C] text-black hover:bg-[#4CAF50] transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
