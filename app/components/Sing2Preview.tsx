"use client";

import { useRef, useState } from "react";
import { getVideoSourceWithTimeRange } from "../utils/videoSource";
import styles from "../dev/brand-preview/brand-preview.module.css";

const CLIP_START = 288.5;
const CLIP_END = 300.218;
const CLIP_DURATION = CLIP_END - CLIP_START;

const previewCopy = {
  ko: {
    badge: "가입 없이 보는 12초 미리보기",
    prompt: "먼저 듣고, 장면의 리듬을 그대로 따라 말해 보세요.",
    play: "재생",
    pause: "일시정지",
    mute: "음소거",
    unmute: "소리 켜기",
  },
  en: {
    badge: "12-SECOND PREVIEW · NO SIGN-UP",
    prompt: "Listen first. Then say it back with the scene’s rhythm.",
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Sound on",
  },
} as const;

export default function Sing2Preview({ language }: { language: "ko" | "en" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const t = previewCopy[language];

  const keepInsideClip = (video: HTMLVideoElement) => {
    if (video.currentTime < CLIP_START - 0.2 || video.currentTime >= CLIP_END) {
      video.currentTime = CLIP_START;
      setProgress(0);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    keepInsideClip(video);
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= CLIP_END) {
      video.currentTime = CLIP_START;
      setProgress(0);
      if (!video.paused) void video.play();
      return;
    }
    setProgress(Math.max(0, Math.min(1, (video.currentTime - CLIP_START) / CLIP_DURATION)));
  };

  return (
    <figure className={styles.preview}>
      <div className={styles.previewMedia}>
        <video
          ref={videoRef}
          className={styles.previewVideo}
          src={getVideoSourceWithTimeRange(CLIP_START)}
          poster="/sing2Poster.jpg"
          preload="metadata"
          autoPlay
          muted={muted}
          playsInline
          onLoadedMetadata={(event) => keepInsideClip(event.currentTarget)}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          aria-label="Sing 2 Mimic scene preview"
        />
        <span className={styles.previewBadge}>{t.badge}</span>
        <div className={styles.previewRhythm} aria-hidden="true">
          <strong>LISTEN</strong><span>→</span><strong>SAY IT BACK</strong>
        </div>
      </div>
      <figcaption className={styles.previewCaption}>
        <p>{t.prompt}</p>
        <div className={styles.previewControls}>
          <button type="button" onClick={togglePlayback} aria-label={isPlaying ? t.pause : t.play}>
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <span className={styles.previewProgress} aria-hidden="true">
            <i style={{ width: `${progress * 100}%` }} />
          </span>
          <button type="button" onClick={toggleMuted} aria-label={muted ? t.unmute : t.mute}>
            {muted ? "SOUND ON" : "MUTE"}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
