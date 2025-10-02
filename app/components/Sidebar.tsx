"use client";

import { useEffect, useRef } from "react";
import { Scene } from "../constants/movies";

interface SidebarProps {
  scenes: Scene[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ scenes, currentIndex, onSelect, isOpen, onToggle }: SidebarProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const currentItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (currentItemRef.current && listRef.current) {
      const listElement = listRef.current;
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
  }, [currentIndex]);

  return (
    <div className="h-full flex items-center justify-center">
      <ul ref={listRef} id="scene-list" className="h-[495px] overflow-auto divide-y rounded border">
        {scenes.map((scene, index) => (
          <li key={scene.id} ref={index === currentIndex ? currentItemRef : null}>
            <button
              className={`w-full text-center px-3 py-2 text-sm hover:bg-[#2A602F] hover:text-white ${index === currentIndex ? "bg-[#60D96C] text-black" : ""}`}
              onClick={() => onSelect(index)}
              aria-current={index === currentIndex ? "true" : undefined}
            >
              <span className="mr-2 text-gray-500">{index + 1}.</span>
              {scene.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


