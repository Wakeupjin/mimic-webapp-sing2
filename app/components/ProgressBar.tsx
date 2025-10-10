import React from 'react';

interface ProgressBarProps {
  progress: number;
  onSeek: (progress: number) => void;
  isDragging: boolean;
  showTooltip: boolean;
  tooltipPosition: number;
  className?: string;
}

export default function ProgressBar({ 
  progress, 
  onSeek, 
  isDragging, 
  showTooltip, 
  tooltipPosition,
  className = ""
}: ProgressBarProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#60D96C] transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      
      {/* Draggable button */}
      <div
        className={`absolute top-1/2 w-4 h-4 bg-[#60D96C] rounded-full cursor-pointer transform -translate-y-1/2 transition-all duration-100 ${
          isDragging ? 'scale-125' : 'hover:scale-110'
        }`}
        style={{ left: `${progress * 100}%` }}
        onMouseDown={(e) => {
          e.preventDefault();
          // 드래그 로직은 상위 컴포넌트에서 처리
        }}
      />
      
      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="absolute bottom-6 bg-black text-white px-2 py-1 rounded text-sm"
          style={{ left: `${tooltipPosition}%` }}
        >
          {Math.floor(progress * 100)}%
        </div>
      )}
    </div>
  );
}
