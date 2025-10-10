import React from 'react';

interface PauseOverlayProps {
  className?: string;
}

export default function PauseOverlay({ 
  className = ""
}: PauseOverlayProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${className}`}>
      <div className="text-gray-200 text-6xl font-bold" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
        PAUSE
      </div>
    </div>
  );
}
