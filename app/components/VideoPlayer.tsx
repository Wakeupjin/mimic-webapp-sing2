"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import dynamic from "next/dynamic";
import { setupVideoForScreenshot } from "../utils/screenshot";
import { setupVideoCors, addCorsToVideoUrl } from "../utils/videoCors";
import { setupVideoCorsOnLoad, forceVideoCors } from "../utils/corsProxy";
import { getVideoSource } from "../utils/videoSource";
import {
  VIDEO_SEGMENT_END_CHECK_INTERVAL,
  VIDEO_ONPLAY_TIMEOUT,
  VIDEO_ONPLAY_BUTTON_DELAY,
  VIDEO_DEBOUNCE_DELAY,
  VIDEO_SUPPRESS_END_CHECK_DURATION,
  VIDEO_END_THRESHOLD,
} from "../constants/timings";

// Dynamically import ReactPlayer to avoid SSR
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
});

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
  onPlayTimeout?: () => void; // onPlay가 1초 내에 호출되지 않을 때 호출
  playNonce?: number; // 상위에서 증가시키면 재생 시도
  hidePauseOverlay?: boolean; // 자동 시퀀스 등에서 일시정지 오버레이 숨김
  activeControlIndex?: number | null; // 활성화된 컨트롤 인덱스
  onClick?: () => void; // 비디오 플레이어 클릭 이벤트
  playing?: boolean; // 강제 재생/정지 제어
  disableOnReadySeek?: boolean; // onReady에서 seekTo 비활성화 (word 페이지용)
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
  onPlayTimeout,
  playNonce,
  hidePauseOverlay,
  activeControlIndex,
  onClick,
  playing = true,
  disableOnReadySeek = false,
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
  const onReadyHasSeekedRef = useRef<boolean>(false); // Track if onReady did initial seek
  const hasPlayedForCurrentSegmentRef = useRef<boolean>(false); // Track if onPlay fired for current segment
  const segmentStartTimeRef = useRef<number>(0); // Track when segment playback was requested
  const onPlayCalledForCurrentSegmentRef = useRef<boolean>(false); // Track if onPlay callback was called for current segment

  useEffect(() => {
    // ReactPlayer.canPlay cannot be used due to dynamic import
    // Always runs on browser; set HTML video currentTime as a fallback
    if (typeof window === 'undefined') return;
    
    const video = htmlVideoRef.current;
    if (video && isFinite(startTime) && startTime >= 0) {
      video.currentTime = startTime;
    }
  }, [startTime, src]);

  // Helper to handle segment end logic identically across interval and onProgress
  const handlePotentialSegmentEnd = (currentSeconds: number) => {
    if (!isFinite(endTime)) return;

    if (currentSeconds >= endTime - VIDEO_END_THRESHOLD) {
      if (endFiredForSegmentRef.current) return;

      const timeSinceSegmentStart = Date.now() - segmentStartTimeRef.current;
      // Wait for onPlay unless it times out
      if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart < VIDEO_ONPLAY_TIMEOUT) {
        return;
      }

      if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart >= VIDEO_ONPLAY_TIMEOUT) {
        if (onPlayTimeout) {
          onPlayTimeout(); // Turn button green before ending
        }
        hasPlayedForCurrentSegmentRef.current = true;
        endFiredForSegmentRef.current = true;
        setIsPaused(true);
        // Delay so the user can see the button color change
        setTimeout(() => {
          if (onEndedSegment) onEndedSegment();
        }, VIDEO_ONPLAY_BUTTON_DELAY);
        return;
      }

      endFiredForSegmentRef.current = true;
      setIsPaused(true);
      if (onEndedSegment) onEndedSegment();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Always use ReactPlayer
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now < suppressEndCheckUntilRef.current) return;
      const current = reactPlayerRef.current?.getCurrentTime?.() ?? 0;

      // Invoke time update callback
      if (onTimeUpdate) {
        onTimeUpdate(current);
      }

      handlePotentialSegmentEnd(current);
    }, VIDEO_SEGMENT_END_CHECK_INTERVAL); // 더 자주 확인하여 정확도 향상
    return () => window.clearInterval(interval);
  }, [endTime, onEndedSegment, onTimeUpdate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // ReactPlayer는 muted 프롭으로 제어됨 (항상 ReactPlayer 사용)
  }, [muted, src]);

  // Handle external play trigger via playNonce
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (playNonce === undefined) return;
    if (playNonce === 0) {
      setIsPaused(true);
      return; // playNonce가 0이면 재생하지 않음
    }

    // 같은 playNonce 값이면 무시
    if (playNonce === lastPlayNonceRef.current) {
      return;
    }

    // playNonce가 이전 값보다 작으면 무시 (역방향 실행 방지)
    if (playNonce < lastPlayNonceRef.current) {
      return;
    }

    // onReady가 이미 seek했고, 이것이 첫 playNonce=1이면 seek 건너뛰기 (중복 방지)
    if (playNonce === 1 && onReadyHasSeekedRef.current) {
      lastPlayNonceRef.current = playNonce;
      setIsPaused(false);
      return;
    }

    const now = Date.now();

    // Debounce duplicate triggers (supports short clips)
    if (now - lastPlayTriggerAtRef.current < VIDEO_DEBOUNCE_DELAY) {
      return;
    }

    if (suppressEndCheckUntilRef.current > now) {
      return;
    }

    // Update playNonce instantly to avoid duplication
    lastPlayNonceRef.current = playNonce;
    lastPlayTriggerAtRef.current = now;
    endFiredForSegmentRef.current = false;
    hasPlayedForCurrentSegmentRef.current = false; // Reset on new segment
    onPlayCalledForCurrentSegmentRef.current = false; // Reset on new segment
    segmentStartTimeRef.current = Date.now(); // Track when segment playback was requested

    // Always use ReactPlayer
    suppressEndCheckUntilRef.current = Date.now() + VIDEO_SUPPRESS_END_CHECK_DURATION;
    if (isFinite(startTime)) {
      reactPlayerRef.current?.seekTo(startTime, "seconds");
    } else {
      console.warn('⚠️ 잘못된 startTime:', startTime);
    }
    setIsPaused(false); // ReactPlayer는 playing prop으로 제어

    // Do not force play; ReactPlayer's 'playing' prop handles it
  }, [playNonce, src, startTime]); // muted removed from deps - muted prop is passed directly to ReactPlayer

  return (
    <div className="relative w-full" onClick={onClick}>
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
        {/* Loading state overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Always use ReactPlayer */}
        <ReactPlayer
            ref={reactPlayerRef}
            url={getVideoSource()}
            playing={playing && !isPaused && isReady}
            onStart={() => {}}
            onPlay={() => {
              if (!onPlayCalledForCurrentSegmentRef.current) {
                onPlayCalledForCurrentSegmentRef.current = true;
                hasPlayedForCurrentSegmentRef.current = true; // Mark that video has played for this segment
                setIsPaused(false);
                if (onPlay) onPlay();
              }
            }}
            controls={false}
            width="100%"
            height="100%"
            className="absolute inset-0"
            onPause={() => setIsPaused(true)}
            onLoad={() => {}}
            onReady={() => {
              if (!isReady) {
                // CORS 설정을 위한 비디오 요소 설정 (게싱 모드 최소화)
                try {
                  const internalPlayer = reactPlayerRef.current?.getInternalPlayer();
                  if (internalPlayer && internalPlayer.tagName === 'VIDEO') {
                    const videoElement = internalPlayer as HTMLVideoElement;
                    
                    // 중복 설정 방지
                    if (!(videoElement as any).corsSetup) {
                      // 게싱 모드에서는 CORS 설정을 최소화하여 비디오 재생에 영향 주지 않도록
                      videoElement.crossOrigin = 'anonymous';
                      videoElement.setAttribute('crossorigin', 'anonymous');
                      console.log('✅ 비디오 CORS 최소 설정 완료');
                    }
                  }
                } catch (error) {
                  console.warn('CORS 설정 실패:', error);
                }

                if (isFinite(startTime) && startTime >= 0) {
                  reactPlayerRef.current?.seekTo(startTime, "seconds");
                  onReadyHasSeekedRef.current = true; // Mark that we seeked
                } else {
                  console.warn('⚠️ 잘못된 startTime:', startTime);
                }
                setIsReady(true);
                setIsPaused(false);
                setIsLoading(false);
              }
            }}
            onProgress={(state) => {
              // If this is the first onProgress for this segment and onPlay callback hasn't been called yet, call it now
              // This is a fallback in case ReactPlayer's onPlay event doesn't fire
              if (!onPlayCalledForCurrentSegmentRef.current && !hasPlayedForCurrentSegmentRef.current && state.playedSeconds >= startTime) {
                onPlayCalledForCurrentSegmentRef.current = true;
                hasPlayedForCurrentSegmentRef.current = true;
                setIsPaused(false);
                if (onPlay) onPlay();
              }

              // Invoke time update callback
              if (onTimeUpdate) {
                onTimeUpdate(state.playedSeconds);
              }
              // Delegate end detection to the shared helper
              if (!endFiredForSegmentRef.current) {
                handlePotentialSegmentEnd(state.playedSeconds);
              }
            }}
            muted={muted}
            config={{
              youtube: { playerVars: { modestbranding: 1 } },
              file: { attributes: { preload: "metadata" } },
            }}
          />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {/* Dimmed overlay when paused - PAUSE text hidden */}
        {isPaused && !hidePauseOverlay && !isLoading && (
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


