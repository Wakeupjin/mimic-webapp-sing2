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
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      {/* Again/Next 버튼 */}
      <div className="relative z-10 flex gap-8 pointer-events-auto">
        <button
          onClick={onAgain}
          className="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xl font-bold"
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          Again
        </button>
        <button
          onClick={onNext}
          className="px-8 py-4 bg-[#60D96C] text-black rounded-lg hover:bg-[#4CAF50] transition-colors text-xl font-bold"
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
