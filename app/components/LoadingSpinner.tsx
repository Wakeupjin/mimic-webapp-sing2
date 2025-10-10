import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ 
  message = "로딩 중...", 
  size = 'md',
  className = ""
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin mb-4`}></div>
      <p className="text-white text-sm" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
        {message}
      </p>
    </div>
  );
}
