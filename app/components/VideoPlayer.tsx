"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  src: string;
  startTime: number;
  endTime: number;
  muted: boolean;
  showText: boolean;
  text: string;
  onEndedSegment?: () => void;
  playNonce?: number; // 상위에서 증가시키면 재생 시도
  hidePauseOverlay?: boolean; // 자동 시퀀스 등에서 일시정지 오버레이 숨김
}

export default function VideoPlayer({
  src,
  startTime,
  endTime,
  muted,
  showText,
  text,
  onEndedSegment,
  playNonce,
  hidePauseOverlay,
}: VideoPlayerProps) {
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const reactPlayerRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const suppressEndCheckUntilRef = useRef<number>(0);
  const lastPlayTriggerAtRef = useRef<number>(0);
  const endFiredForSegmentRef = useRef<boolean>(false);

  useEffect(() => {
    const isPlayable = ReactPlayer.canPlay(src);
    if (isPlayable) {
      // ReactPlayer가 로드된 후 시킹
      const timer = setTimeout(() => {
        reactPlayerRef.current?.seekTo(startTime, "seconds");
      }, 100);
      return () => clearTimeout(timer);
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.currentTime = startTime;
    }
  }, [startTime, src]);

  useEffect(() => {
    const isPlayable = ReactPlayer.canPlay(src);
    if (isPlayable) {
      const interval = window.setInterval(() => {
        const now = Date.now();
        if (now < suppressEndCheckUntilRef.current) return;
        const current = reactPlayerRef.current?.getCurrentTime?.() ?? 0;
        if (current >= endTime - 0.03) { // tolerate small drift
          if (endFiredForSegmentRef.current) return;
          endFiredForSegmentRef.current = true;
          setIsPaused(true);
          if (onEndedSegment) onEndedSegment();
        }
      }, 200);
      return () => window.clearInterval(interval);
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;

      const onTimeUpdate = () => {
        const now = Date.now();
        if (now < suppressEndCheckUntilRef.current) return;
        if (video.currentTime >= endTime - 0.03) {
          if (endFiredForSegmentRef.current) return;
          endFiredForSegmentRef.current = true;
          video.pause();
          setIsPaused(true);
          if (onEndedSegment) onEndedSegment();
        }
      };

      const onPlay = () => setIsPaused(false);
      const onPause = () => setIsPaused(true);

      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      return () => {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
      };
    }
  }, [endTime, onEndedSegment, src]);

  useEffect(() => {
    const isPlayable = ReactPlayer.canPlay(src);
    if (isPlayable) {
      // ReactPlayer는 muted 프롭으로 제어됨
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.muted = muted;
    }
  }, [muted, src]);

  // 외부 재생 트리거 처리
  useEffect(() => {
    if (playNonce === undefined) return;
    const isPlayable = ReactPlayer.canPlay(src);
    const now = Date.now();
    // Debounce external play triggers (dev StrictMode or rapid clicks)
    if (now - lastPlayTriggerAtRef.current < 300) {
      return;
    }
    lastPlayTriggerAtRef.current = now;
    endFiredForSegmentRef.current = false; // reset for new segment
    if (isPlayable) {
      suppressEndCheckUntilRef.current = Date.now() + 500;
      reactPlayerRef.current?.seekTo(startTime, "seconds");
      setIsPaused(false); // ReactPlayer는 playing prop으로 제어
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      try {
        suppressEndCheckUntilRef.current = Date.now() + 500;
        video.currentTime = startTime;
        video.muted = muted;
        video.play();
        setIsPaused(false);
      } catch {}
    }
  }, [playNonce, src, startTime, muted]);

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
        {ReactPlayer.canPlay(src) ? (
          <ReactPlayer
            ref={reactPlayerRef}
            url={src}
            playing={!isPaused}
            controls
            width="100%"
            height="100%"
            className="absolute inset-0"
            onPlay={() => { setIsPaused(false); }}
            onPause={() => setIsPaused(true)}
            muted={muted}
            config={{
              youtube: { playerVars: { modestbranding: 1 } },
              file: { attributes: { preload: "metadata" } },
            }}
          />
        ) : (
          <video
            ref={htmlVideoRef}
            src={src}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            playsInline
            preload="metadata"
            onClick={() => {
              const video = htmlVideoRef.current;
              if (!video) return;
              if (video.paused) video.play();
              else video.pause();
            }}
          />
        )}
        {/* Dimmed overlay when paused */}
        {isPaused && !hidePauseOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-sm font-semibold tracking-widest">PAUSE</span>
          </div>
        )}

        {/* Current line text */}
        {showText && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[90%] rounded bg-black/50 text-white text-xs px-2 py-1">
            {text}
          </div>
        )}
      </div>

    </div>
  );
}


