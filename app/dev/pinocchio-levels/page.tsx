"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import content from "./content.json";
import styles from "./pinocchio-levels.module.css";

type Level = (typeof content.levels)[number];

type TimelineLine = {
  index: number;
  text: string;
  start: number;
  end: number;
};

type Timeline = {
  duration: number;
  lines: TimelineLine[];
};

const AUDIO_ROOT = "/prototype-audio/pinocchio-levels";
const NARRATION_VARIANTS = [
  {
    id: "lily-british",
    name: "Lily · British",
    meta: "SAME VOICE · UK",
    tone: "릴리 본래 결에 가까운, 따뜻하고 선명한 영국식",
    availableLevels: ["foundation", "core", "studio"],
  },
  {
    id: "lily-american",
    name: "Lily · American",
    meta: "SAME VOICE · US",
    tone: "같은 릴리에게 조금 더 친근한 미국식 리듬을 디렉팅",
    availableLevels: ["foundation", "core"],
  },
] as const;

type NarrationVariant = (typeof NARRATION_VARIANTS)[number];
type NarrationVariantId = NarrationVariant["id"];

function supportsLevel(variant: NarrationVariant, levelId: Level["id"]) {
  return (variant.availableLevels as readonly string[]).includes(levelId);
}

function masterAudio(variantId: NarrationVariantId, levelId: Level["id"]) {
  return `${AUDIO_ROOT}/voices/${variantId}/${levelId}.master.mp3`;
}

function timelineSource(variantId: NarrationVariantId, levelId: Level["id"]) {
  return `${AUDIO_ROOT}/voices/${variantId}/${levelId}.timeline.json`;
}

function countWords(lines: string[]) {
  const words = lines.reduce((sum, line) => sum + line.trim().split(/\s+/).length, 0);
  return Math.round(words / lines.length);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function PinocchioLevelsPreview() {
  const [levelId, setLevelId] = useState<Level["id"]>("core");
  const [variantId, setVariantId] = useState<NarrationVariantId>("lily-british");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [activeLine, setActiveLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<"all" | "line" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentEndRef = useRef<number | null>(null);

  const level = useMemo(
    () => content.levels.find((item) => item.id === levelId) ?? content.levels[1],
    [levelId]
  );
  const averageWords = countWords(level.lines);
  const variant = NARRATION_VARIANTS.find((item) => item.id === variantId) ?? NARRATION_VARIANTS[0];
  const overallProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const playSafely = (audio: HTMLAudioElement) => {
    setAudioError(null);
    audio.playbackRate = rate;
    void audio.play().catch(() => {
      setIsPlaying(false);
      setAudioError("낭독 샘플을 재생할 수 없어요. 음원 파일을 다시 확인해 주세요.");
    });
  };

  const requestLine = (index: number) => {
    const audio = audioRef.current;
    const segment = timeline?.lines[index];
    if (!audio || !segment) return;
    audio.pause();
    audio.currentTime = segment.start;
    segmentEndRef.current = Math.min(segment.end, audio.duration || segment.end);
    setActiveLine(index);
    setCurrentTime(segment.start);
    setPlaybackMode("line");
    playSafely(audio);
  };

  const chooseLevel = (nextLevel: Level["id"]) => {
    audioRef.current?.pause();
    segmentEndRef.current = null;
    if (!supportsLevel(variant, nextLevel)) setVariantId("lily-british");
    setLevelId(nextLevel);
    setActiveLine(0);
    setIsPlaying(false);
    setPlaybackMode(null);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  };

  const chooseVariant = (nextVariant: NarrationVariant) => {
    if (!supportsLevel(nextVariant, level.id)) return;
    audioRef.current?.pause();
    segmentEndRef.current = null;
    setVariantId(nextVariant.id);
    setActiveLine(0);
    setIsPlaying(false);
    setPlaybackMode(null);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    segmentEndRef.current = null;
    if (duration > 0 && audio.currentTime >= duration - 0.15) {
      audio.currentTime = timeline?.lines[0]?.start ?? 0;
    }
    setPlaybackMode("all");
    playSafely(audio);
  };

  const syncPlayback = (audio: HTMLAudioElement) => {
    const time = audio.currentTime;
    setCurrentTime(time);

    const nextActiveLine = timeline?.lines.findIndex((line, index, lines) => {
      const nextStart = lines[index + 1]?.start ?? Number.POSITIVE_INFINITY;
      return time >= line.start && time < nextStart;
    });
    if (nextActiveLine !== undefined && nextActiveLine >= 0) setActiveLine(nextActiveLine);

    const segmentEnd = segmentEndRef.current;
    if (segmentEnd !== null && time >= segmentEnd - 0.035) {
      audio.pause();
      audio.currentTime = Math.min(segmentEnd, audio.duration || segmentEnd);
      setCurrentTime(audio.currentTime);
      segmentEndRef.current = null;
      setPlaybackMode(null);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    let cancelled = false;
    setTimeline(null);
    setAudioError(null);

    void fetch(timelineSource(variantId, levelId))
      .then((response) => {
        if (!response.ok) throw new Error(`Timeline returned ${response.status}`);
        return response.json() as Promise<Timeline>;
      })
      .then((nextTimeline) => {
        if (!cancelled) setTimeline(nextTimeline);
      })
      .catch(() => {
        if (!cancelled) setAudioError("이 억양의 연속 낭독 타임스탬프를 불러오지 못했어요.");
      });

    return () => {
      cancelled = true;
    };
  }, [levelId, variantId]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio) syncPlayback(audio);
    }, 40);
    return () => window.clearInterval(interval);
  }, [isPlaying, timeline]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.logo} aria-label="MimiC 홈">MimiC</a>
        <div className={styles.labTitle}>
          <span>LOCAL LAB · 01</span>
          <strong>한 이야기, 세 가지 영어</strong>
        </div>
        <div className={styles.localBadge}><i /> 배포되지 않은 로컬 실험</div>
      </header>

      <section className={styles.layout}>
        <aside className={styles.storyPanel}>
          <div className={styles.poster}>
            <div className={styles.sceneArt} aria-label="목공소에서 목소리를 내는 나무토막을 표현한 추상 일러스트" role="img">
              <div className={styles.voiceBubble}>Please don’t hit me!</div>
              <div className={styles.hatchet}><i /><b /></div>
              <div className={styles.woodBlock}>
                <i /><i /><i /><i />
                <span>?</span>
              </div>
              <div className={styles.woodShaving} />
              <div className={styles.benchLine} />
            </div>
            <div className={styles.posterShade} />
            <span className={styles.posterTag}>PUBLIC-DOMAIN STORY</span>
            <div className={styles.posterCopy}>
              <p>{content.story.scene}</p>
              <h1>{content.story.title}</h1>
            </div>
          </div>

          <div className={styles.storyNote}>
            <span>이번 실험의 질문</span>
            <p>같은 사건을 유지한 채 문장 구조만 바꾸면, 학생이 자기 수준의 영어로 이야기에 들어갈 수 있을까?</p>
          </div>
        </aside>

        <section className={styles.learningPanel}>
          <div className={styles.intro}>
            <div>
              <span className={styles.eyebrow}>CHOOSE YOUR STORY VOICE</span>
              <h2>내 문장 호흡에 맞춰 들어요.</h2>
            </div>
            <p>사건과 인물은 같고, 문장 길이와 표현 밀도만 달라져요. 추천 단계에서 시작해 언제든 위아래로 움직일 수 있어요.</p>
          </div>

          <section className={styles.voiceAudition} aria-labelledby="voice-audition-title">
            <div className={styles.voiceAuditionHeader}>
              <div>
                <span>LILY · ELEVENLABS V3</span>
                <h3 id="voice-audition-title">같은 릴리, 영국식과 미국식</h3>
              </div>
              <p>같은 대본 · 같은 감정 지시 · 억양만 비교</p>
            </div>
            <div className={styles.voiceTakes}>
              {NARRATION_VARIANTS.map((item) => {
                const available = supportsLevel(item, level.id);
                return (
                  <article key={item.id} className={item.id === variant.id ? styles.voiceSelected : ""}>
                    <span>{item.meta}</span>
                    <strong>{item.name}</strong>
                    <p>{item.tone}</p>
                    <audio controls preload="metadata" src={`${AUDIO_ROOT}/voices/${item.id}/opening.mp3`}>
                      브라우저가 오디오 재생을 지원하지 않습니다.
                    </audio>
                    <button type="button" disabled={!available} onClick={() => chooseVariant(item)}>
                      {available ? item.id === variant.id ? "전체 낭독에 적용됨" : "이 억양으로 전체 듣기" : "Studio는 다음 크레딧에 생성"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <div className={styles.levelTabs} role="tablist" aria-label="피노키오 문장 단계">
            {content.levels.map((item) => {
              const selected = item.id === level.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={selected ? styles.levelActive : ""}
                  onClick={() => chooseLevel(item.id)}
                >
                  <small>{item.step}</small>
                  <strong>{item.label}</strong>
                  <span>{countWords(item.lines)} words / line</span>
                </button>
              );
            })}
          </div>

          <div className={styles.levelSummary}>
            <div>
              <span>{level.label.toUpperCase()}</span>
              <h3>{level.summary}</h3>
            </div>
            <dl>
              <div><dt>문장</dt><dd>{level.lines.length}</dd></div>
              <div><dt>평균</dt><dd>{averageWords} words</dd></div>
              <div><dt>목표</dt><dd>{level.goal}</dd></div>
            </dl>
          </div>

          <div className={styles.player}>
            <audio
              key={`${variant.id}-${level.id}`}
              ref={audioRef}
              src={masterAudio(variant.id, level.id)}
              preload="metadata"
              onLoadedMetadata={(event) => {
                const audio = event.currentTarget;
                audio.playbackRate = rate;
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(event) => syncPlayback(event.currentTarget)}
              onEnded={(event) => {
                setCurrentTime(event.currentTarget.duration);
                segmentEndRef.current = null;
                setIsPlaying(false);
                setPlaybackMode(null);
              }}
            />

            <button type="button" className={styles.playButton} onClick={togglePlayback}>
              <span aria-hidden>{isPlaying ? "Ⅱ" : "▶"}</span>
              <b>{isPlaying ? "잠깐 멈추기" : currentTime > 0 ? "이어서 전체 듣기" : "이 버전 전체 듣기"}</b>
            </button>

            <div className={styles.playerCenter}>
              <div className={styles.nowPlaying}>
                <span>NOW READING · {String(activeLine + 1).padStart(2, "0")}</span>
                <p>{level.lines[activeLine]}</p>
              </div>
              <div className={styles.progressTrack} aria-label={`전체 진행률 ${Math.round(overallProgress)}%`}>
                <i style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            <div className={styles.rateControl}>
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              <small>{playbackMode === "line" ? "한 테이크에서 이 문장만" : "ONE TAKE · 자연 호흡"}</small>
              <label>
                속도
                <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
                  <option value={0.85}>0.85×</option>
                  <option value={1}>1.0×</option>
                  <option value={1.1}>1.1×</option>
                </select>
              </label>
            </div>
            {audioError ? <p className={styles.audioError} role="alert">{audioError}</p> : null}
          </div>

          <div className={styles.transcriptHeader}>
            <div><span>ONE TAKE · SENTENCE TIMESTAMPS</span><strong>같은 원본 안에서 문장 위치만 정확히 찾아가요.</strong></div>
            <p>ELEVENLABS V3 · {variant.name.toUpperCase()}</p>
          </div>

          <ol className={styles.transcript}>
            {level.lines.map((line, index) => (
              <li key={`${level.id}-${index}`} className={index === activeLine ? styles.lineActive : ""}>
                <button type="button" onClick={() => requestLine(index)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{line}</p>
                  <i aria-hidden>{index === activeLine && isPlaying ? "Ⅱ" : "▶"}</i>
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.outputChallenge}>
            <span>AFTER LISTENING · RETELL</span>
            <p>{level.output}</p>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>다른 단계와 비교 ↑</button>
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        <span>{content.story.source}</span>
        <strong>같은 이야기. 다른 문장 호흡. 내 목소리로 끝내기.</strong>
      </footer>
    </main>
  );
}
