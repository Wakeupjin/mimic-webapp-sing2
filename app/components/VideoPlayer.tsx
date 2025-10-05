"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  src: string;
  startTime: number;
  endTime: number;
  muted: boolean;
  showText: boolean;
  text: string;
  onEndedSegment?: () => void;
  onTimeUpdate?: (currentTime: number) => void; // 시간 업데이트 콜백
  onPlay?: () => void; // 재생 시작 콜백
  playNonce?: number; // 상위에서 증가시키면 재생 시도
  hidePauseOverlay?: boolean; // 자동 시퀀스 등에서 일시정지 오버레이 숨김
  activeControlIndex?: number | null; // 활성화된 컨트롤 인덱스
}

const VideoPlayer = memo(function VideoPlayer({
  src,
  startTime,
  endTime,
  muted,
  showText,
  text,
  onEndedSegment,
  onTimeUpdate,
  onPlay,
  playNonce,
  hidePauseOverlay,
  activeControlIndex,
}: VideoPlayerProps) {
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const reactPlayerRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const suppressEndCheckUntilRef = useRef<number>(0);
  const lastPlayTriggerAtRef = useRef<number>(0);
  const endFiredForSegmentRef = useRef<boolean>(false);
  const lastPlayNonceRef = useRef<number>(0);

  useEffect(() => {
    const isPlayable = ReactPlayer.canPlay(src);
    if (!isPlayable) {
      const video = htmlVideoRef.current;
      if (!video) return;
      console.log('HTML video currentTime 설정:', startTime);
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

      const onTimeUpdateHandler = () => {
        const now = Date.now();
        if (now < suppressEndCheckUntilRef.current) return;
        
        // 시간 업데이트 콜백 호출
        if (onTimeUpdate) {
          onTimeUpdate(video.currentTime);
        }
        
        if (video.currentTime >= endTime - 0.03) {
          if (endFiredForSegmentRef.current) return;
          endFiredForSegmentRef.current = true;
          video.pause();
          setIsPaused(true);
          if (onEndedSegment) onEndedSegment();
        }
      };

      const onPlay = () => {
        setIsPaused(false);
        if (onPlay) onPlay();
      };
      const onPause = () => setIsPaused(true);

      video.addEventListener("timeupdate", onTimeUpdateHandler);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      return () => {
        video.removeEventListener("timeupdate", onTimeUpdateHandler);
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
    console.log('playNonce useEffect 실행:', playNonce);
    if (playNonce === undefined) return;
    
    // 같은 playNonce 값이면 무시
    if (playNonce === lastPlayNonceRef.current) {
      console.log('같은 playNonce 값이므로 중복 실행 방지');
      return;
    }
    
    // playNonce가 이전 값보다 작으면 무시 (역방향 실행 방지)
    if (playNonce < lastPlayNonceRef.current) {
      console.log('playNonce가 이전 값보다 작으므로 무시');
      return;
    }
    
    const isPlayable = ReactPlayer.canPlay(src);
    const now = Date.now();
    
    // 강력한 중복 실행 방지
    if (now - lastPlayTriggerAtRef.current < 2500) {
      console.log('재생 요청 debounced:', now - lastPlayTriggerAtRef.current, 'ms ago');
      return;
    }
    
    if (suppressEndCheckUntilRef.current > now) {
      console.log('이미 재생 중이므로 중복 실행 방지');
      return;
    }
    
    // playNonce를 즉시 업데이트하여 중복 실행 방지
    lastPlayNonceRef.current = playNonce;
    lastPlayTriggerAtRef.current = now;
    endFiredForSegmentRef.current = false;
    console.log('playNonce 변경, endFiredForSegmentRef 리셋');
    if (isPlayable) {
      suppressEndCheckUntilRef.current = Date.now() + 500;
      console.log('ReactPlayer seekTo:', startTime, 'seconds');
      reactPlayerRef.current?.seekTo(startTime, "seconds");
      setIsPaused(false); // ReactPlayer는 playing prop으로 제어
      
      // 강제로 재생 시작
      setTimeout(() => {
        console.log('강제 재생 시작');
        reactPlayerRef.current?.getInternalPlayer()?.play();
      }, 200);
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

  const isPlayable = ReactPlayer.canPlay(src);
  // console.log('VideoPlayer render - isPlayable:', isPlayable, 'src:', src);
  
  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
        {/* 로딩 상태 표시 */}
        {isLoading && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {isPlayable ? (
          <ReactPlayer
            ref={reactPlayerRef}
            url={src}
            playing={!isPaused && isReady}
            onStart={() => console.log('ReactPlayer onStart')}
            onPlay={() => { 
              console.log('ReactPlayer onPlay');
              setIsPaused(false);
              if (onPlay) onPlay();
            }}
            controls={false}
            width="100%"
            height="100%"
            className="absolute inset-0"
            onPause={() => setIsPaused(true)}
            onLoad={() => {
              console.log('ReactPlayer onLoad - 비디오 로드 완료');
            }}
            onReady={() => {
              if (!isReady) {
                console.log('ReactPlayer onReady - seekTo 후 재생 시작');
                // 먼저 seekTo를 호출하고, 그 다음에 재생
                reactPlayerRef.current?.seekTo(startTime, "seconds");
                setIsReady(true);
                setIsPaused(false);
                setIsLoading(false);
              }
            }}
            onProgress={(state) => {
              console.log('ReactPlayer onProgress:', state.playedSeconds, 'seconds, endTime:', endTime);
              // 시간 업데이트 콜백 호출
              if (onTimeUpdate) {
                onTimeUpdate(state.playedSeconds);
              }
              // 종료 시간에 도달하면 정지
              if (state.playedSeconds >= endTime && !endFiredForSegmentRef.current) {
                console.log('onEndedSegment 호출!', state.playedSeconds, '>=', endTime);
                endFiredForSegmentRef.current = true;
                if (onEndedSegment) onEndedSegment();
              }
            }}
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
            className="absolute inset-0 w-full h-full object-cover"
            controls={false}
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
        {/* Dimmed overlay when paused - PAUSE text hidden */}
        {isPaused && !hidePauseOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            {/* PAUSE text removed */}
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
});

export default VideoPlayer;


