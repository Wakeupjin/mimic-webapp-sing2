import React from 'react';

interface Scene {
  startTime: number;
  endTime: number;
  text: string;
}

interface SceneListProps {
  scenes: Scene[];
  currentIndex: number;
  onSceneClick: (index: number) => void;
  isSequenceRunning: boolean;
  className?: string;
}

export default function SceneList({ 
  scenes, 
  currentIndex, 
  onSceneClick, 
  isSequenceRunning,
  className = ""
}: SceneListProps) {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {scenes
        .map((scene, index) => ({ scene, index }))
        .map(({ scene, index }) => (
          <button
            key={index}
            data-scene-index={index}
            onClick={() => {
              if (index < scenes.length) {
                onSceneClick(index);
              }
            }}
            disabled={index >= scenes.length}
            className={`px-3 py-3 rounded text-sm font-medium transition-colors ${
              index >= scenes.length
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : currentIndex === index
                  ? isSequenceRunning
                    ? 'bg-[#60D96C] text-black animate-pulse border-2 border-[#60D96C]'
                    : 'bg-[#60D96C] text-black border-2 border-[#60D96C]'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            LINE {index + 1}
          </button>
        ))}
    </div>
  );
}
