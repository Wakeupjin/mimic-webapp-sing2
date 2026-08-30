"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import ClickToStartOverlay from "../../../components/ClickToStartOverlay";
import ControlTriangle from "../../../components/ControlTriangle";
import { FullscreenIcon, HeaderIconButton } from "../../../components/HeaderIcons";
import LessonShell from "../../../components/LessonShell";
import MimicLineList from "../../../components/MimicLineList";
import PauseOverlay from "../../../components/PauseOverlay";
import PlaybackControls from "../../../components/PlaybackControls";
import { useFullscreen } from "../../../hooks/useFullscreen";
import {
  ART_SRC,
  AUDIO_SRC,
  LESSON_ROOT,
  MODE_ORDER,
  level,
  modeHref,
  pack,
  sourceLineForMimic,
  timeline,
  type GuessItem,
  type LessonMode,
  type Segment,
  type WordItem,
} from "../lessonData";
import { canOpenMode, completeMode, readCompleted } from "../localProgress";
import styles from "../pinocchio-session-1.module.css";

const FOCUS_X = ["4%", "12%", "24%", "36%", "48%", "62%", "76%", "92%"];
const MIMIC_MUTED_STEPS = new Set([3, 5, 7]);

function useLessonAudio(onFullEnded?: () => void) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentEndRef = useRef<number | null>(null);
  const segmentCallbackRef = useRef<(() => void) | null>(null);
  const fullEndedRef = useRef(onFullEnded);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(timeline.duration);

  useEffect(() => { fullEndedRef.current = onFullEnded; }, [onFullEnded]);

  const finishSegment = useCallback(() => {
    const callback = segmentCallbackRef.current;
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
    if (callback) window.setTimeout(callback, 0);
  }, []);

  const onTimeUpdate = useCallback((audio: HTMLAudioElement) => {
    setCurrentTime(audio.currentTime);
    if (segmentEndRef.current !== null && audio.currentTime >= segmentEndRef.current - 0.035) {
      const end = segmentEndRef.current;
      audio.pause();
      audio.currentTime = Math.min(end, audio.duration || end);
      setCurrentTime(audio.currentTime);
      finishSegment();
    }
  }, [finishSegment]);

  const playRange = useCallback((segment: Segment, muted = false, onEnded?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.muted = muted;
    audio.currentTime = segment.start;
    segmentEndRef.current = segment.end;
    segmentCallbackRef.current = onEnded || null;
    setCurrentTime(segment.start);
    void audio.play();
  }, []);

  const playFull = useCallback((restart = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
    audio.muted = false;
    if (restart || audio.currentTime >= audio.duration - .1) audio.currentTime = 0;
    void audio.play();
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => { if (audioRef.current) void audioRef.current.play(); }, []);
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.muted = false;
    segmentEndRef.current = null;
    segmentCallbackRef.current = null;
  }, []);
  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const audio = (
    <audio
      ref={audioRef}
      src={AUDIO_SRC}
      preload="auto"
      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
      onEnded={() => {
        setCurrentTime(audioRef.current?.duration || timeline.duration);
        setIsPlaying(false);
        if (segmentEndRef.current !== null) finishSegment();
        else fullEndedRef.current?.();
      }}
    />
  );

  return { audio, audioRef, isPlaying, currentTime, duration, playRange, playFull, pause, resume, stop, seek };
}

function activeSourceLine(time: number) {
  const index = timeline.lines.findIndex((line, lineIndex, lines) => time >= line.start && time < (lines[lineIndex + 1]?.start ?? Infinity));
  return Math.max(0, index);
}

function StoryStage({ activeLine, dim = false, faded = false, caption, onClick, children }: {
  activeLine: number;
  dim?: boolean;
  faded?: boolean;
  caption?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}) {
  const beatIndex = Math.max(0, pack.livingStorybook.beats.findIndex((beat) => {
    const [start, end] = beat.lineRanges.core;
    return activeLine >= start && activeLine <= end;
  }));
  return (
    <div
      className={`relative h-full w-full ${dim ? styles.stageDim : ""} ${faded ? styles.stageFaded : ""}`}
      style={{ "--focus-x": FOCUS_X[beatIndex] } as CSSProperties}
      onClick={onClick}
    >
      <img className={styles.stageArt} src={ART_SRC} alt="피노키오 Session 1 Living Storybook 장면" />
      <div className={styles.stageVignette} />
      {caption ? <p className={styles.storyCaption}>{caption}</p> : null}
      {children}
    </div>
  );
}

function StageActions({ onSkip }: { onSkip?: () => void }) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <div className={styles.topActions}>
      <Link href={LESSON_ROOT} className="watch-back" aria-label="뒤로">
        <img src="/home/back.svg" alt="" className="h-full w-full" />
      </Link>
      <div className={styles.topActionsRight}>
        <HeaderIconButton label={isFullscreen ? "전체화면 종료" : "전체화면"} onClick={toggleFullscreen}>
          <FullscreenIcon active={isFullscreen} />
        </HeaderIconButton>
        {onSkip ? <button type="button" className="watch-skip" onClick={onSkip}>SKIP</button> : null}
      </div>
    </div>
  );
}

function Completion({ onAgain, onNext, review }: { onAgain: () => void; onNext: () => void; review?: ReactNode }) {
  return (
    <div className={styles.completionOverlay}>
      <div className={styles.completionStack}>
        {review}
        <div className={styles.completionButtons}>
          <div className={styles.completionButtonWrap}>
            <button type="button" className="select-mode" onClick={onAgain}>Again</button>
            <p className="select-here" style={{ visibility: "hidden" }}>Let&apos;s go</p>
          </div>
          <div className={styles.completionButtonWrap}>
            <button type="button" className="select-mode is-open" onClick={onNext}>
              <img src="/Subject.png" alt="" className="select-chameleon" />
              Next
            </button>
            <p className="cta-go">Let&apos;s go</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchMode() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const finish = useCallback(() => { completeMode("watching"); setComplete(true); }, []);
  const engine = useLessonAudio(finish);
  const activeLine = activeSourceLine(engine.currentTime);
  const percent = complete ? 100 : Math.min(100, (engine.currentTime / Math.max(1, engine.duration)) * 100);

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete) return;
    if (engine.isPlaying) engine.pause(); else engine.resume();
  };

  const again = () => { engine.stop(); engine.seek(0); setStarted(false); setComplete(false); };
  const skip = () => { engine.pause(); engine.seek(engine.duration); finish(); };

  return (
    <LessonShell
      hideHeader
      footer={<p className="watch-chapter">SESSION 1</p>}
      video={
        <StoryStage activeLine={activeLine} faded={complete} onClick={handleStageClick}>
          {engine.audio}
          <StageActions onSkip={complete ? undefined : skip} />
          {!started && !complete ? (
            <ClickToStartOverlay
              onClick={() => { setStarted(true); engine.playFull(true); }}
              text="이야기를 듣고 장면을 따라가요"
              description="Lily의 연속 낭독과 Living Storybook으로 Session 1을 먼저 경험해요."
              actionLabel="시작"
            />
          ) : null}
          {started && !engine.isPlaying && !complete && engine.currentTime > 0 ? <PauseOverlay /> : null}
          {complete ? <Completion onAgain={again} onNext={() => router.push(modeHref("mimicking"))} /> : null}
        </StoryStage>
      }
      controls={
        <div
          className="watch-bar"
          onClick={(event) => {
            if (complete) return;
            const rect = event.currentTarget.getBoundingClientRect();
            engine.seek(((event.clientX - rect.left) / rect.width) * engine.duration);
          }}
        >
          <div className="watch-bar-track"><div className="watch-bar-fill" style={{ width: `${percent}%` }} /></div>
          <div className="watch-bar-thumb" style={{ left: `${percent}%` }} />
        </div>
      }
    />
  );
}

function MimicMode() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [lineListOpen, setLineListOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [hardLines, setHardLines] = useState<number[]>([]);
  const stepTimerRef = useRef<number | null>(null);
  const engine = useLessonAudio();
  const activeLine = sourceLineForMimic(current);

  const clearStepTimer = () => {
    if (stepTimerRef.current !== null) window.clearTimeout(stepTimerRef.current);
    stepTimerRef.current = null;
  };

  const runStep = useCallback((slot: number, lineIndex = current) => {
    if (complete) return;
    clearStepTimer();
    setStarted(true);
    setPaused(false);
    setActiveSlot(slot);
    engine.playRange(timeline.mimicItems[lineIndex], MIMIC_MUTED_STEPS.has(slot), () => {
      setActiveSlot(null);
      if (slot < 7) stepTimerRef.current = window.setTimeout(() => runStep(slot + 1, lineIndex), 800);
      else setFeedbackOpen(true);
    });
  }, [complete, current, engine]);

  useEffect(() => () => clearStepTimer(), []);

  const finish = () => { clearStepTimer(); engine.stop(); setCurrent(29); completeMode("mimicking"); setComplete(true); setFeedbackOpen(false); };
  const chooseLine = (index: number, autoplay = false) => {
    clearStepTimer();
    engine.stop();
    setCurrent(index);
    setActiveSlot(null);
    setFeedbackOpen(false);
    setLineListOpen(false);
    setPaused(false);
    if (autoplay) runStep(0, index);
  };
  const next = () => { if (!feedbackOpen) current >= 29 ? finish() : chooseLine(current + 1, true); };
  const prev = () => { if (!feedbackOpen && current > 0) chooseLine(current - 1, true); };
  const feedback = (hard: boolean) => {
    if (hard) setHardLines((items) => items.includes(current) ? items : [...items, current]);
    setFeedbackOpen(false);
    if (current >= 29) finish(); else chooseLine(current + 1, true);
  };
  const togglePause = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a") || !started || complete || feedbackOpen) return;
    if (engine.isPlaying) { engine.pause(); setPaused(true); } else { engine.resume(); setPaused(false); }
  };
  const again = () => { setCurrent(0); setStarted(false); setActiveSlot(null); setComplete(false); setHardLines([]); engine.stop(); engine.seek(0); };

  const review = (
    <div className={styles.reviewCard}>
      <span>오늘의 복습</span>
      <h2>어려웠던 문장 TOP 3</h2>
      {hardLines.length ? <ol>{hardLines.slice(0, 3).map((index, rank) => <li key={index}><b>{rank + 1}</b>{level.activities.mimic.items[index].text}</li>)}</ol> : <p>어렵다고 표시한 문장이 없어요. 오늘 연습 끝!</p>}
    </div>
  );

  return (
    <LessonShell
      hideHeader
      video={
        <StoryStage activeLine={activeLine} faded={complete} onClick={togglePause}>
          {engine.audio}
          <StageActions onSkip={complete ? undefined : finish} />
          {lineListOpen && !complete ? <MimicLineList total={30} currentIndex={current} canOpen={() => true} onSelect={(index) => chooseLine(index, true)} /> : null}
          {!started && !complete ? <ClickToStartOverlay onClick={() => runStep(0)} text="듣고 따라 말해요" description="먼저 듣고, 소리 없이 한 번 더 말하며 30개 문장을 연습해요." actionLabel="시작" /> : null}
          {paused && !complete ? <PauseOverlay /> : null}
          {feedbackOpen && !complete ? (
            <div className={styles.feedbackCard}>
              <span>LINE {String(current + 1).padStart(2, "0")}</span>
              <strong>이 문장은 어땠나요?</strong>
              <div className={styles.feedbackActions}><button type="button" onClick={() => feedback(false)}>쉬웠어요</button><button type="button" onClick={() => feedback(true)}>어려웠어요</button></div>
            </div>
          ) : null}
          {complete ? <Completion review={review} onAgain={again} onNext={() => router.push(modeHref("guessing"))} /> : null}
        </StoryStage>
      }
      controls={
        <div className="mimic-dock">
          <PlaybackControls variant="cinema" onPrev={prev} onNext={next} onPlay={(_muted, slot) => { if (!feedbackOpen) runStep(slot); }} activeIndex={activeSlot} />
          <button type="button" className="mimic-count" aria-expanded={lineListOpen} aria-label="문장 목록" onClick={() => setLineListOpen((open) => !open)}>
            <span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">30</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
          </button>
        </div>
      }
    />
  );
}

function GuessMode() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [playingLabel, setPlayingLabel] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [complete, setComplete] = useState(false);
  const [lineListOpen, setLineListOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const engine = useLessonAudio();
  const items = level.activities.guess.items;
  const question = items[current];

  const clearTimer = () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); timerRef.current = null; };
  useEffect(() => () => clearTimer(), []);

  const playQuestion = useCallback((questionIndex: number) => {
    const nextQuestion = items[questionIndex];
    const options = [...nextQuestion.options].sort((a, b) => a.label.localeCompare(b.label));
    setReady(false);
    const playAt = (index: number) => {
      const option = options[index];
      setPlayingLabel(option.label);
      engine.playRange(timeline.lines[option.lineIndex], false, () => {
        if (index < options.length - 1) timerRef.current = window.setTimeout(() => playAt(index + 1), 550);
        else { setPlayingLabel(null); setReady(true); }
      });
    };
    playAt(0);
  }, [engine, items]);

  const finish = () => { clearTimer(); engine.stop(); setCurrent(items.length - 1); completeMode("guessing"); setComplete(true); setReady(false); };
  const answer = (label: string) => {
    if (!ready || complete) return;
    setReady(false);
    if (label === question.correctAnswer) {
      setShowCorrect(true);
      timerRef.current = window.setTimeout(() => {
        setShowCorrect(false);
        if (current >= items.length - 1) finish();
        else { const next = current + 1; setCurrent(next); playQuestion(next); }
      }, 950);
    } else {
      setShowAgain(true);
      timerRef.current = window.setTimeout(() => { setShowAgain(false); setReady(true); }, 950);
    }
  };
  const jump = (index: number) => { clearTimer(); engine.stop(); setCurrent(index); setLineListOpen(false); setShowCorrect(false); setShowAgain(false); playQuestion(index); };
  const again = () => { clearTimer(); engine.stop(); setCurrent(0); setStarted(false); setReady(false); setComplete(false); };

  return (
    <LessonShell
      hideHeader
      video={
        <StoryStage activeLine={question.audioLineIndex} dim={!started || complete} faded={complete}>
          {engine.audio}
          <StageActions onSkip={complete ? undefined : finish} />
          {lineListOpen && !complete ? <MimicLineList total={items.length} currentIndex={current} canOpen={() => true} onSelect={jump} /> : null}
          {!started && !complete ? <ClickToStartOverlay onClick={() => { setStarted(true); playQuestion(0); }} text="소리 없는 장면을 보고 대사를 골라요" description="세 문장을 차례로 듣고, 장면에 맞는 문장을 A·B·C에서 고르세요." actionLabel="시작" /> : null}
          {showCorrect ? <p className="guess-banner is-correct">Correct</p> : null}
          {showAgain ? <p className="guess-banner is-again">Again</p> : null}
          {complete ? <Completion onAgain={again} onNext={() => router.push(modeHref("word"))} /> : null}
        </StoryStage>
      }
      controls={
        <div className="guess-dock">
          <div className="guess-abc">
            <ControlTriangle direction="left" label="이전 문제" disabled={current === 0} onClick={() => jump(Math.max(0, current - 1))} />
            {["A", "B", "C"].map((label) => <button key={label} type="button" className={`guess-opt ${playingLabel === label ? "is-playing" : ""}`} disabled={!ready} onClick={() => answer(label)}>{label}</button>)}
            <ControlTriangle direction="right" label="다음 문제" disabled={current >= items.length - 1} onClick={() => jump(Math.min(items.length - 1, current + 1))} />
          </div>
          <button type="button" className="mimic-count" aria-label="문제 목록" onClick={() => setLineListOpen((open) => !open)}><span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">10</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" /></button>
        </div>
      }
    />
  );
}

function normalizedTokens(item: WordItem) {
  return item.tokens.reduce<string[]>((tokens, token) => {
    if (/^[,.;:!?]$/.test(token) && tokens.length) tokens[tokens.length - 1] += token;
    else tokens.push(token);
    return tokens;
  }, []);
}

function shuffledTokens(tokens: string[], seed: number) {
  const values = tokens.map((text, id) => ({ id, text }));
  let state = seed + 19;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swap = Math.floor((state / 233280) * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function WordMode() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"listening" | "arranging">("listening");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [complete, setComplete] = useState(false);
  const [lineListOpen, setLineListOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const engine = useLessonAudio();
  const items = level.activities.word.items;
  const item = items[current];
  const tokens = useMemo(() => normalizedTokens(item), [item]);
  const bank = useMemo(() => shuffledTokens(tokens, current), [tokens, current]);
  const available = bank.filter((token) => !selected.includes(token.id));
  const mid = Math.ceil(available.length / 2);

  const clearTimer = () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); timerRef.current = null; };
  useEffect(() => () => clearTimer(), []);

  const playSequence = useCallback((questionIndex: number) => {
    const nextItem = items[questionIndex];
    const segment = timeline.lines[nextItem.lineIndex];
    setPhase("listening");
    const playAt = (slot: number) => {
      setActiveSlot(slot);
      engine.playRange(segment, slot === 2, () => {
        if (slot < 2) timerRef.current = window.setTimeout(() => playAt(slot + 1), 650);
        else { setActiveSlot(null); setPhase("arranging"); }
      });
    };
    playAt(0);
  }, [engine, items]);

  const finish = () => { clearTimer(); engine.stop(); setCurrent(items.length - 1); completeMode("word"); setComplete(true); };
  const submit = () => {
    if (phase !== "arranging" || selected.length !== tokens.length) return;
    const correct = selected.every((id, index) => id === index);
    if (correct) {
      setShowCorrect(true);
      timerRef.current = window.setTimeout(() => {
        setShowCorrect(false);
        if (current >= items.length - 1) finish();
        else { const next = current + 1; setCurrent(next); setSelected([]); playSequence(next); }
      }, 900);
    } else {
      setShowAgain(true);
      timerRef.current = window.setTimeout(() => { setShowAgain(false); setSelected([]); }, 900);
    }
  };
  const jump = (index: number) => { clearTimer(); engine.stop(); setCurrent(index); setSelected([]); setLineListOpen(false); setShowCorrect(false); setShowAgain(false); playSequence(index); };
  const again = () => { clearTimer(); engine.stop(); setCurrent(0); setStarted(false); setPhase("listening"); setSelected([]); setComplete(false); };
  const selectToken = (id: number) => { if (phase === "arranging") setSelected((items) => [...items, id]); };
  const renderChip = (token: { id: number; text: string }, compact = false) => <button key={token.id} type="button" className={`word-chip ${compact ? "is-compact" : ""}`} onClick={() => selectToken(token.id)} disabled={phase !== "arranging"}>{token.text}</button>;

  return (
    <LessonShell hideHeader compactStage>
      <div className={`word-board ${phase === "arranging" && !complete ? "is-arranging" : ""}`}>
        <div className="word-chips-side">{phase === "arranging" ? available.slice(0, mid).map((token) => renderChip(token)) : null}</div>
        <div className={`word-main-stack ${styles.wordMainStack} flex min-h-0 flex-1 flex-col items-center justify-center`}>
          <div className="flex w-full min-h-0 items-center justify-center">
            <div className={`word-video watch-frame relative aspect-video w-full max-h-full overflow-hidden ${activeSlot === 2 ? "is-live" : ""}`}>
              <StoryStage activeLine={item.lineIndex} dim={!started || complete} faded={complete}>
                {engine.audio}
                <StageActions onSkip={complete ? undefined : finish} />
                {lineListOpen && !complete ? <MimicLineList total={items.length} currentIndex={current} canOpen={() => true} onSelect={jump} /> : null}
                {!started && !complete ? <ClickToStartOverlay onClick={() => { setStarted(true); playSequence(0); }} text="단어를 바르게 배열해요" description="문장을 두 번 듣고, 소리 없이 한 번 말한 뒤 단어를 올바른 순서로 놓아 보세요." actionLabel="시작" /> : null}
                {selected.length && !complete ? <div className="word-sentence">{selected.map((id, index) => <button key={`${id}-${index}`} type="button" className="word-sentence-item" onClick={() => setSelected((values) => values.filter((_, itemIndex) => itemIndex !== index))}>{tokens[id]}</button>)}</div> : null}
                {showCorrect ? <p className="guess-banner is-correct">Correct</p> : null}
                {showAgain ? <p className="guess-banner is-again">Again</p> : null}
                {complete ? <Completion onAgain={again} onNext={() => router.push(LESSON_ROOT)} /> : null}
              </StoryStage>
            </div>
          </div>
          <div className="word-chips-mobile">{phase === "arranging" && !complete ? available.map((token) => renderChip(token, true)) : null}</div>
          <div className="word-dock relative z-20 w-full justify-center overflow-x-auto pt-1">
            <div className="word-bar">
              <ControlTriangle direction="left" label="다시 듣기" onClick={() => engine.playRange(timeline.lines[item.lineIndex])} />
              {[0, 1].map((slot) => <div key={slot} className={`ctrl-slot is-listen ${activeSlot === slot ? "is-active" : ""}`} style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}><span className="ctrl-play-icon" /></div>)}
              <div className={`ctrl-slot is-mimic ${activeSlot === 2 ? "is-active" : ""}`} style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}><span className="ctrl-mute-letter">m</span></div>
              <ControlTriangle direction="right" label="전체 다시 듣기" onClick={() => playSequence(current)} />
              <button type="button" onClick={() => setSelected((values) => values.slice(0, -1))} disabled={!selected.length} className="flex shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a] text-xl font-bold text-white disabled:opacity-40" style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)" }}>⌫</button>
            </div>
            <button type="button" className="mimic-count" aria-label="문제 목록" onClick={() => setLineListOpen((open) => !open)}><span>{String(current + 1).padStart(2, "0")} / </span><span className="mimic-count-total">10</span><img src="/home/chevron.svg" alt="" className="mimic-count-chevron" /></button>
          </div>
          {!complete ? <button type="button" className={`word-submit relative z-20 mb-1 mt-1 ${selected.length === tokens.length ? "hover:scale-105" : "opacity-40"}`} onClick={submit} disabled={selected.length !== tokens.length || phase !== "arranging"}><img src="/Subject.png" alt="완성한 문장 제출" /></button> : null}
        </div>
        <div className="word-chips-side">{phase === "arranging" ? available.slice(mid).map((token) => renderChip(token)) : null}</div>
      </div>
    </LessonShell>
  );
}

export default function PinocchioLessonModePage() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const mode = params.mode as LessonMode;
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!MODE_ORDER.includes(mode)) { setAllowed(false); return; }
    const nextAllowed = canOpenMode(mode, readCompleted());
    setAllowed(nextAllowed);
    if (!nextAllowed) router.replace(LESSON_ROOT);
  }, [mode, router]);

  if (allowed !== true) return <main className="min-h-screen bg-black" />;
  if (mode === "watching") return <WatchMode />;
  if (mode === "mimicking") return <MimicMode />;
  if (mode === "guessing") return <GuessMode />;
  if (mode === "word") return <WordMode />;
  return <main className="flex min-h-screen items-center justify-center bg-black text-white"><Link href={LESSON_ROOT}>Session 1으로 돌아가기</Link></main>;
}
