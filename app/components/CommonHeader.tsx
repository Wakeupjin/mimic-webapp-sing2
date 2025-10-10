import React from 'react';
import { useFullscreen } from '../hooks/useFullscreen';
import { useMediaControl } from '../hooks/useMediaControl';

interface CommonHeaderProps {
  onHomeClick: () => void;
  onCcToggle: () => void;
  isTextVisible: boolean;
  className?: string;
}

export default function CommonHeader({ 
  onHomeClick, 
  onCcToggle, 
  isTextVisible, 
  className = "" 
}: CommonHeaderProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { stopAllMedia } = useMediaControl();

  const handleFullscreenToggle = () => {
    stopAllMedia();
    toggleFullscreen();
  };

  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      {/* 홈 버튼 */}
      <button
        onClick={onHomeClick}
        className="text-white hover:text-gray-300 transition-colors"
        style={{ fontFamily: 'Encode Sans, sans-serif' }}
      >
        ← Home
      </button>

      {/* 중앙 컨트롤 */}
      <div className="flex items-center space-x-4">
        {/* CC 버튼 */}
        <button
          onClick={onCcToggle}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            isTextVisible 
              ? 'bg-[#60D96C] text-black' 
              : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          CC
        </button>

        {/* 풀스크린 버튼 */}
        <button
          onClick={handleFullscreenToggle}
          className="text-white hover:text-gray-300 transition-colors"
          style={{ fontFamily: 'Encode Sans, sans-serif' }}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </div>
  );
}
