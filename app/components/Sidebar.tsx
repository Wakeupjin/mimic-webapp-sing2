"use client";

import { useEffect, useRef } from "react";
import { Scene } from "../constants/movies";

interface SidebarProps {
  scenes: Scene[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  showText: boolean;
  isFullscreen?: boolean;
}

export default function Sidebar({ scenes, currentIndex, onSelect, isOpen, onToggle, showText, isFullscreen }: SidebarProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const currentItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const listElement = listRef.current;
      
      // 첫 번째 문장일 때는 맨 위로 스크롤
      if (currentIndex === 0) {
        listElement.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }
      
      if (currentItemRef.current) {
        const currentItem = currentItemRef.current;
        
        // 현재 아이템의 위치 계산
        const listRect = listElement.getBoundingClientRect();
        const itemRect = currentItem.getBoundingClientRect();
        
        // 리스트 중앙으로 스크롤
        const listCenter = listRect.height / 2;
        const itemCenter = itemRect.top - listRect.top + (itemRect.height / 2);
        const scrollTop = listElement.scrollTop + (itemCenter - listCenter);
        
        listElement.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex]);

  return (
    <div className="hidden lg:block w-[200px] flex items-center justify-center absolute right-2.5 transform -translate-y-1/2" style={{ top: isFullscreen ? 'calc(50% + 15px)' : '50%', height: isFullscreen ? 'calc(100vh - 80px - 20px)' : '540px' }}>
      <ul ref={listRef} id="scene-list" className="overflow-auto divide-y rounded border" style={{ height: isFullscreen ? 'calc(100vh - 80px - 40px)' : '495px' }}>
        {scenes.map((scene, index) => (
          <li key={scene.id} ref={index === currentIndex ? currentItemRef : null}>
            <button
              className={`w-full h-[40px] text-center px-3 py-2 text-sm flex items-center justify-center hover:bg-[#2A602F] hover:text-white ${index === currentIndex ? "bg-[#60D96C] text-black" : ""}`}
              style={{ fontFamily: 'Encode Sans, sans-serif' }}
              onClick={() => onSelect(index)}
              aria-current={index === currentIndex ? "true" : undefined}
            >
              {index === currentIndex && showText ? (
                <>
                  <span className="mr-2 text-gray-500">{index + 1}.</span>
                  {scene.text.length > 15 ? `${scene.text.substring(0, 15)}...` : scene.text}
                </>
                  ) : (
                    `Line ${index + 1}`
                  )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


