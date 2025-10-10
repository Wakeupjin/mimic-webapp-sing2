"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import dynamic from "next/dynamic";

// ReactPlayer를 동적 import로 변경 (SSR 방지)
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
    // 동적 import로 인해 ReactPlayer.canPlay 사용 불가
    // 브라우저에서만 실행되므로 항상 ReactPlayer 사용
    if (typeof window === 'undefined') return;
    
    const video = htmlVideoRef.current;
    if (video) {
      // console.log('HTML video currentTime 설정:', startTime);
      video.currentTime = startTime;
    }
  }, [startTime, src]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ReactPlayer 사용 (항상 사용)
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now < suppressEndCheckUntilRef.current) return;
      const current = reactPlayerRef.current?.getCurrentTime?.() ?? 0;

      // 시간 업데이트 콜백 호출
      if (onTimeUpdate) {
        onTimeUpdate(current);
      }

      if (current >= endTime - 0.001) { // endTime에 근접하면 멈춤 (정확도 향상)
        if (endFiredForSegmentRef.current) return;
        // IMPORTANT: Only fire onEndedSegment if onPlay has fired at least once
        // BUT if 1 second has passed since segment start, fire anyway (timeout fallback)
        const timeSinceSegmentStart = Date.now() - segmentStartTimeRef.current;
        if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart < 1000) {
          console.log('⚠️ interval: endTime reached but onPlay has not fired yet - skipping onEndedSegment');
          return;
        }
        if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart >= 1000) {
          console.log('⚠️ interval: onPlay timeout (1s) - calling onPlayTimeout then firing onEndedSegment after 200ms delay');
          if (onPlayTimeout) {
            onPlayTimeout(); // Turn button green before ending
          }
          hasPlayedForCurrentSegmentRef.current = true; // Mark as played to prevent repeated timeout calls
          endFiredForSegmentRef.current = true;
          setIsPaused(true);
          // Add 200ms delay so user can see button turn green
          setTimeout(() => {
            if (onEndedSegment) onEndedSegment();
          }, 200);
          return; // Exit early to prevent immediate onEndedSegment call
        } else {
          console.log('✅ interval: endTime reached and onPlay has fired - calling onEndedSegment');
        }
        endFiredForSegmentRef.current = true;
        setIsPaused(true);
        if (onEndedSegment) onEndedSegment();
      }
    }, 50); // 더 자주 확인하여 정확도 향상
    return () => window.clearInterval(interval);
  }, [endTime, onEndedSegment, onTimeUpdate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // ReactPlayer는 muted 프롭으로 제어됨 (항상 ReactPlayer 사용)
  }, [muted, src]);

  // 외부 재생 트리거 처리
  useEffect(() => {
    console.log('🎬 playNonce useEffect 실행:', playNonce);
    if (typeof window === 'undefined') return;
    if (playNonce === undefined) return;
    if (playNonce === 0) {
      setIsPaused(true);
      return; // playNonce가 0이면 재생하지 않음
    }

    // 같은 playNonce 값이면 무시
    if (playNonce === lastPlayNonceRef.current) {
      console.log('⛔ 같은 playNonce 값이므로 중복 실행 방지');
      return;
    }

    // playNonce가 이전 값보다 작으면 무시 (역방향 실행 방지)
    if (playNonce < lastPlayNonceRef.current) {
      console.log('⛔ playNonce가 이전 값보다 작으므로 무시');
      return;
    }

    // onReady가 이미 seek했고, 이것이 첫 playNonce=1이면 seek 건너뛰기 (중복 방지)
    if (playNonce === 1 && onReadyHasSeekedRef.current) {
      console.log('⛔ onReady가 이미 seekTo했으므로 playNonce=1 seek 건너뛰기');
      lastPlayNonceRef.current = playNonce;
      setIsPaused(false);
      return;
    }

    const now = Date.now();

    // 중복 실행 방지 (500ms debounce - 짧은 클립도 지원)
    if (now - lastPlayTriggerAtRef.current < 500) {
      console.log('⛔ 재생 요청 debounced:', now - lastPlayTriggerAtRef.current, 'ms ago');
      return;
    }

    if (suppressEndCheckUntilRef.current > now) {
      console.log('⛔ 이미 재생 중이므로 중복 실행 방지');
      return;
    }

    // playNonce를 즉시 업데이트하여 중복 실행 방지
    lastPlayNonceRef.current = playNonce;
    lastPlayTriggerAtRef.current = now;
    endFiredForSegmentRef.current = false;
    hasPlayedForCurrentSegmentRef.current = false; // Reset on new segment
    onPlayCalledForCurrentSegmentRef.current = false; // Reset on new segment
    segmentStartTimeRef.current = Date.now(); // Track when segment playback was requested
    console.log('✅ playNonce 변경, endFiredForSegmentRef 리셋, hasPlayedForCurrentSegmentRef 리셋, onPlayCalledForCurrentSegmentRef 리셋, playNonce:', playNonce);

    // 항상 ReactPlayer 사용
    suppressEndCheckUntilRef.current = Date.now() + 500;
    console.log('▶️ ReactPlayer seekTo:', startTime, 'seconds');
    if (isFinite(startTime)) {
      reactPlayerRef.current?.seekTo(startTime, "seconds");
    } else {
      console.warn('⚠️ 잘못된 startTime:', startTime);
    }
    setIsPaused(false); // ReactPlayer는 playing prop으로 제어

    // 강제로 재생 시작 (필요한 경우만)
    // Removed to prevent double-play issues - ReactPlayer's 'playing' prop should handle this
  }, [playNonce, src, startTime]); // muted removed from deps - muted prop is passed directly to ReactPlayer

  return (
    <div className="relative w-full" onClick={onClick}>
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
        {/* 로딩 상태 표시 */}
        {isLoading && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-[#60D96C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* 항상 ReactPlayer 사용 */}
        <ReactPlayer
            ref={reactPlayerRef}
            url={src}
            playing={playing && !isPaused && isReady}
            onStart={() => {/* console.log('ReactPlayer onStart') */}}
            onPlay={() => {
              console.log('ReactPlayer onPlay - hasPlayedForCurrentSegmentRef 설정');
              if (!onPlayCalledForCurrentSegmentRef.current) {
                console.log('🎬 ReactPlayer onPlay event - calling onPlay callback');
                onPlayCalledForCurrentSegmentRef.current = true;
                hasPlayedForCurrentSegmentRef.current = true; // Mark that video has played for this segment
                setIsPaused(false);
                if (onPlay) onPlay();
              } else {
                console.log('🎬 ReactPlayer onPlay event - onPlay callback already called via onProgress');
              }
            }}
            controls={false}
            width="100%"
            height="100%"
            className="absolute inset-0"
            onPause={() => setIsPaused(true)}
            onLoad={() => {
              // console.log('ReactPlayer onLoad - 비디오 로드 완료');
            }}
            onReady={() => {
              if (!isReady) {
                console.log('ReactPlayer onReady - seekTo to startTime');
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
              // console.log('ReactPlayer onProgress:', state.playedSeconds, 'seconds, endTime:', endTime);

              // If this is the first onProgress for this segment and onPlay callback hasn't been called yet, call it now
              // This is a fallback in case ReactPlayer's onPlay event doesn't fire
              if (!onPlayCalledForCurrentSegmentRef.current && !hasPlayedForCurrentSegmentRef.current && state.playedSeconds >= startTime) {
                console.log(`🎬 onProgress detected playback at ${state.playedSeconds}s (startTime: ${startTime}s) - calling onPlay callback manually (fallback)`);
                onPlayCalledForCurrentSegmentRef.current = true;
                hasPlayedForCurrentSegmentRef.current = true;
                setIsPaused(false);
                if (onPlay) onPlay();
              }

              // 시간 업데이트 콜백 호출
              if (onTimeUpdate) {
                onTimeUpdate(state.playedSeconds);
              }
              // 종료 시간에 도달하면 정지 (endTime 유효성 검사)
              // IMPORTANT: Only fire onEndedSegment if onPlay has fired at least once
              // BUT if 1 second has passed since segment start, fire anyway (timeout fallback)
              if (isFinite(endTime) && state.playedSeconds >= endTime && !endFiredForSegmentRef.current) {
                const timeSinceSegmentStart = Date.now() - segmentStartTimeRef.current;
                if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart < 1000) {
                  console.log('⚠️ onProgress: endTime reached but onPlay has not fired yet - skipping onEndedSegment');
                  return;
                }
                if (!hasPlayedForCurrentSegmentRef.current && timeSinceSegmentStart >= 1000) {
                  console.log('⚠️ onProgress: onPlay timeout (1s) - calling onPlayTimeout then firing onEndedSegment after 200ms delay');
                  if (onPlayTimeout) {
                    onPlayTimeout(); // Turn button green before ending
                  }
                  hasPlayedForCurrentSegmentRef.current = true; // Mark as played to prevent repeated timeout calls
                  endFiredForSegmentRef.current = true;
                  // Add 200ms delay so user can see button turn green
                  setTimeout(() => {
                    if (onEndedSegment) onEndedSegment();
                  }, 200);
                  return; // Exit early to prevent immediate onEndedSegment call
                } else {
                  console.log('✅ onProgress: endTime reached and onPlay has fired - calling onEndedSegment');
                }
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


