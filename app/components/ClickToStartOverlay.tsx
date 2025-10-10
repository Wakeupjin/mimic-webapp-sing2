import React from 'react';

interface ClickToStartOverlayProps {
  onClick: () => void;
  text?: string;
  className?: string;
}

export default function ClickToStartOverlay({ 
  onClick, 
  text = "클릭하여 시작하세요",
  className = ""
}: ClickToStartOverlayProps) {
  return (
    <div 
      className={`absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer z-10 ${className}`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-white text-2xl font-bold" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
          {text}
        </div>
      </div>
    </div>
  );
}
