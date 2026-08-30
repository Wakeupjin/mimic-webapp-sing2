"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import rawPack from "../../../content-packs/pinocchio/v2/sessions/session-01/pack.json";
import styles from "./pinocchio-session-1.module.css";

type Mode = "watch" | "mimic" | "guess" | "word";
type Segment = { id: string; text: string; start: number; end: number; sourceLineIndex?: number };
type Timeline = { duration: number; lines: Segment[]; mimicItems: Segment[] };
type GuessItem = {
  id: string;
  audioLineIndex: number;
  correctAnswer: string;
  options: { label: string; lineIndex: number; text: string }[];
};
type WordItem = { id: string; lineIndex: number; text: string; tokens: string[] };
type Pack = {
  story: { titleEn: string; titleKo: string; synopsisKo: string; guidingQuestionKo: string };
  course: { modeMinutes: Record<Mode, number> };
  livingStorybook: { beats: { titleKo: string; summaryKo: string; lineRanges: { core: number[] } }[] };
  levels: {
    core: {
      label: string;
      readingBand: string;
      goalKo: string;
      lines: { id: string; text: string }[];
      activities: {
        watch: { beforePromptsKo: string[]; afterPromptsKo: string[] };
        mimic: { items: { id: string; text: string; sourceLineIndex: number }[] };
        guess: { items: GuessItem[] };
        word: { items: WordItem[]; retellPromptKo: string };
      };
    };
  };
};

const pack = rawPack as unknown as Pack;
const level = pack.levels.core;
const AUDIO = "/prototype-audio/pinocchio-v2/session-01/lily-british/core.master.mp3";
const TIMELINE = "/prototype-audio/pinocchio-v2/session-01/lily-british/core.timeline.json";
const ART = "/prototype-art/pinocchio-v2/session-01.png";
const MODES: { id: Mode; label: string; ko: string }[] = [
  { id: "watch", label: "WATCH", ko: "이야기 보기" },
  { id: "mimic", label: "MIMIC", ko: "30라인 따라 말하기" },
  { id: "guess", label: "GUESS", ko: "듣고 찾기" },
  { id: "word", label: "WORD", ko: "문장 만들기" },
];
const FOCUS_X = ["4%", "12%", "23%", "34%", "46%", "60%", "74%", "91%"];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function shuffledTokens(item: WordItem, seed: number) {
  const values = item.tokens.map((text, id) => ({ id, text }));
  let state = seed + 17;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swap = Math.floor((state / 233280) * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

export default function PinocchioSessionOne() {
  const [mode, setMode] = useState<Mode>("watch");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeLine, setActiveLine] = useState(0);
  const [activeMimic, setActiveMimic] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const [completed, setCompleted] = useState<Mode[]>([]);
  const [guessIndex, setGuessIndex] = useState(0);
  const [guessAnswer, setGuessAnswer] = useState<string | null>(null);
  const [guessScore, setGuessScore] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedTokenIds, setSelectedTokenIds] = useState<number[]>([]);
  const [wordResult, setWordResult] = useState<"correct" | "wrong" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentEndRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const beatIndex = pack.livingStorybook.beats.findIndex((beat) => {
    const [start, end] = beat.lineRanges.core;
    return activeLine >= start && activeLine <= end;
  });
  const beat = pack.livingStorybook.beats[Math.max(0, beatIndex)];
  const guessItem = level.activities.guess.items[guessIndex];
  const wordItem = level.activities.word.items[wordIndex];
  const wordBank = useMemo(() => shuffledTokens(wordItem, wordIndex), [wordItem, wordIndex]);
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const markComplete = (value: Mode) => setCompleted((current) => current.includes(value) ? current : [...current, value]);

  const stopPlayback = () => {
    audioRef.current?.pause();
    segmentEndRef.current = null;
  };

  const playSafely = (audio: HTMLAudioElement) => {
    setAudioError(null);
    audio.playbackRate = rate;
    void audio.play().catch(() => setAudioError("오디오를 재생할 수 없어요. 파일을 다시 확인해 주세요."));
  };

  const playSegment = (segment: Segment, mimicIndex?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = segment.start;
    segmentEndRef.current = segment.end;
    setCurrentTime(segment.start);
    if (typeof mimicIndex === "number") setActiveMimic(mimicIndex);
    if (typeof segment.sourceLineIndex === "number") setActiveLine(segment.sourceLineIndex);
    playSafely(audio);
  };

  const toggleWholeStory = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) return audio.pause();
    segmentEndRef.current = null;
    if (audio.currentTime >= (duration || timeline?.duration || 0) - 0.15) audio.currentTime = 0;
    playSafely(audio);
  };

  const syncAudio = (audio: HTMLAudioElement) => {
    const time = audio.currentTime;
    setCurrentTime(time);
    const nextLine = timeline?.lines.findIndex((line, index, lines) => time >= line.start && time < (lines[index + 1]?.start ?? Infinity));
    if (typeof nextLine === "number" && nextLine >= 0) setActiveLine(nextLine);
    if (segmentEndRef.current !== null && time >= segmentEndRef.current - 0.035) {
      const stopAt = segmentEndRef.current;
      segmentEndRef.current = null;
      audio.pause();
      audio.currentTime = Math.min(stopAt, audio.duration || stopAt);
      setCurrentTime(audio.currentTime);
    }
  };

  const chooseMode = (next: Mode) => {
    stopPlayback();
    setMode(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextMode = () => {
    markComplete(mode);
    const index = MODES.findIndex((item) => item.id === mode);
    if (index < MODES.length - 1) chooseMode(MODES[index + 1].id);
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setAudioError("마이크 권한을 허용하면 내 목소리를 바로 비교할 수 있어요.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setIsRecording(false);
  };

  const submitGuess = (answer: string) => {
    if (guessAnswer) return;
    setGuessAnswer(answer);
    if (answer === guessItem.correctAnswer) setGuessScore((score) => score + 1);
  };

  const advanceGuess = () => {
    if (guessIndex === level.activities.guess.items.length - 1) return markComplete("guess");
    setGuessIndex((index) => index + 1);
    setGuessAnswer(null);
  };

  const checkWord = () => {
    const correct = selectedTokenIds.length === wordItem.tokens.length && selectedTokenIds.every((id, index) => id === index);
    setWordResult(correct ? "correct" : "wrong");
  };

  const advanceWord = () => {
    if (wordIndex === level.activities.word.items.length - 1) return markComplete("word");
    setWordIndex((index) => index + 1);
    setSelectedTokenIds([]);
    setWordResult(null);
  };

  useEffect(() => {
    void fetch(TIMELINE)
      .then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Timeline>; })
      .then(setTimeline)
      .catch(() => setAudioError("문장 타임스탬프를 불러오지 못했어요."));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => { if (audioRef.current) syncAudio(audioRef.current); }, 40);
    return () => window.clearInterval(timer);
  }, [isPlaying, timeline]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  return (
    <main className={styles.page}>
      <audio
        ref={audioRef}
        src={AUDIO}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => syncAudio(event.currentTarget)}
        onEnded={() => { setIsPlaying(false); segmentEndRef.current = null; if (mode === "watch") markComplete("watch"); }}
      />

      <header className={styles.header}>
        <a href="/dev/pinocchio-levels" className={styles.logo}>MimiC</a>
        <div className={styles.sessionTitle}>
          <span>PINOCCHIO · SESSION 01 / 12</span>
          <strong>{pack.story.titleEn}</strong>
        </div>
        <div className={styles.voice}><i /> LILY · BRITISH · ELEVEN V3</div>
      </header>

      <nav className={styles.modeNav} aria-label="수업 단계">
        {MODES.map((item, index) => (
          <button key={item.id} type="button" className={mode === item.id ? styles.modeActive : ""} onClick={() => chooseMode(item.id)}>
            <span>{completed.includes(item.id) ? "✓" : String(index + 1).padStart(2, "0")}</span>
            <b>{item.label}</b>
            <small>{item.ko} · {pack.course.modeMinutes[item.id]}분</small>
          </button>
        ))}
      </nav>

      <section className={styles.lessonHeading}>
        <div>
          <span>CORE · {level.readingBand}</span>
          <h1>{pack.story.titleKo}</h1>
        </div>
        <p>{level.goalKo}</p>
      </section>

      {mode === "watch" ? (
        <section className={styles.watchMode}>
          <div className={styles.storyStage} style={{ "--focus-x": FOCUS_X[Math.max(0, beatIndex)] } as CSSProperties}>
            <img src={ART} alt="말하는 나무에서 피노키오의 첫 탈출까지 이어지는 종이극장 장면" />
            <div className={styles.stageShade} />
            <div className={styles.beatCard}><span>SCENE {String(Math.max(0, beatIndex) + 1).padStart(2, "0")}</span><strong>{beat.titleKo}</strong><small>{beat.summaryKo}</small></div>
            {captions ? <p className={styles.caption}>{level.lines[activeLine]?.text}</p> : null}
            <div className={styles.stageControls}>
              <button type="button" onClick={toggleWholeStory}>{isPlaying ? "Ⅱ 잠깐 멈추기" : "▶ 이야기 전체 듣기"}</button>
              <div><span>{formatTime(currentTime)} / {formatTime(duration || timeline?.duration || 0)}</span><i><b style={{ width: `${progress}%` }} /></i></div>
              <button type="button" className={styles.quietButton} onClick={() => setCaptions((value) => !value)}>CC {captions ? "ON" : "OFF"}</button>
              <select aria-label="재생 속도" value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value={0.85}>0.85×</option><option value={1}>1.0×</option><option value={1.1}>1.1×</option></select>
            </div>
          </div>
          <div className={styles.promptGrid}>
            <article><span>BEFORE</span><strong>{level.activities.watch.beforePromptsKo[0]}</strong></article>
            <article><span>AFTER</span><strong>{level.activities.watch.afterPromptsKo[0]}</strong></article>
          </div>
        </section>
      ) : null}

      {mode === "mimic" ? (
        <section className={styles.practiceLayout}>
          <aside className={styles.lineRail}>
            <div><span>30 LINES · ONE TAKE</span><strong>{activeMimic + 1} / 30</strong></div>
            <ol>{level.activities.mimic.items.map((item, index) => <li key={item.id}><button className={index === activeMimic ? styles.lineSelected : ""} type="button" onClick={() => timeline && playSegment(timeline.mimicItems[index], index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.text}</button></li>)}</ol>
          </aside>
          <div className={styles.practiceCard}>
            <span className={styles.eyebrow}>LISTEN → RECORD → COMPARE → RETRY</span>
            <div className={styles.bigNumber}>{String(activeMimic + 1).padStart(2, "0")}</div>
            <h2>{level.activities.mimic.items[activeMimic].text}</h2>
            <button className={styles.primaryAction} type="button" onClick={() => timeline && playSegment(timeline.mimicItems[activeMimic], activeMimic)}>{isPlaying ? "Ⅱ 원어민 멈추기" : "▶ Lily 듣기"}</button>
            <div className={styles.recordBox}>
              <div><span>MY VOICE · 브라우저에만 임시 저장</span><strong>{isRecording ? "말해 보세요…" : recordingUrl ? "녹음 완료 — 바로 비교하세요" : "첫 시도를 녹음하세요"}</strong></div>
              <button type="button" className={isRecording ? styles.recording : ""} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "■ 녹음 끝" : "● 녹음"}</button>
              {recordingUrl ? <audio controls src={recordingUrl} /> : null}
            </div>
            <div className={styles.practicePager}>
              <button type="button" disabled={activeMimic === 0} onClick={() => setActiveMimic((index) => index - 1)}>← 이전</button>
              <button type="button" onClick={() => activeMimic === 29 ? markComplete("mimic") : setActiveMimic((index) => index + 1)}>{activeMimic === 29 ? "Mimic 완료 ✓" : "다음 라인 →"}</button>
            </div>
          </div>
        </section>
      ) : null}

      {mode === "guess" ? (
        <section className={styles.quizMode}>
          <div className={styles.quizMeta}><span>LISTENING RETRIEVAL</span><strong>{guessIndex + 1} / {level.activities.guess.items.length}</strong><small>SCORE {guessScore}</small></div>
          <h2>어떤 문장이 들렸나요?</h2>
          <button className={styles.listenOrb} type="button" onClick={() => timeline && playSegment(timeline.lines[guessItem.audioLineIndex])}>{isPlaying ? "Ⅱ" : "▶"}<span>한 번 더 듣기</span></button>
          <div className={styles.answers}>{guessItem.options.map((option) => {
            const correct = guessAnswer && option.label === guessItem.correctAnswer;
            const wrong = guessAnswer === option.label && option.label !== guessItem.correctAnswer;
            return <button key={option.label} type="button" className={correct ? styles.answerCorrect : wrong ? styles.answerWrong : ""} onClick={() => submitGuess(option.label)}><span>{option.label}</span><p>{option.text}</p></button>;
          })}</div>
          {guessAnswer ? <div className={styles.feedback}><strong>{guessAnswer === guessItem.correctAnswer ? "정답! 귀가 정확했다." : `정답은 ${guessItem.correctAnswer}. 다시 들으면 차이가 잡힌다.`}</strong><button type="button" onClick={advanceGuess}>{guessIndex === 9 ? "Guess 완료 ✓" : "다음 문제 →"}</button></div> : null}
        </section>
      ) : null}

      {mode === "word" ? (
        <section className={styles.wordMode}>
          <div className={styles.quizMeta}><span>SENTENCE BUILDER</span><strong>{wordIndex + 1} / {level.activities.word.items.length}</strong><small>CORE</small></div>
          <h2>들은 문장을 순서대로 조립하세요.</h2>
          <div className={styles.buildZone}>
            {selectedTokenIds.length ? selectedTokenIds.map((id) => <button type="button" key={id} onClick={() => { setSelectedTokenIds((ids) => ids.filter((value) => value !== id)); setWordResult(null); }}>{wordItem.tokens[id]}</button>) : <span>단어를 눌러 문장을 만드세요</span>}
          </div>
          <div className={styles.tokenBank}>{wordBank.filter((token) => !selectedTokenIds.includes(token.id)).map((token) => <button type="button" key={token.id} onClick={() => { setSelectedTokenIds((ids) => [...ids, token.id]); setWordResult(null); }}>{token.text}</button>)}</div>
          <div className={styles.wordActions}>
            <button type="button" onClick={() => { setSelectedTokenIds([]); setWordResult(null); }}>다시 섞기</button>
            <button type="button" className={styles.primaryAction} onClick={wordResult === "correct" ? advanceWord : checkWord}>{wordResult === "correct" ? wordIndex === 9 ? "Word 완료 ✓" : "다음 문장 →" : "문장 확인"}</button>
          </div>
          {wordResult ? <p className={wordResult === "correct" ? styles.wordCorrect : styles.wordWrong}>{wordResult === "correct" ? "정확해요. 이제 소리 내어 한 번 읽어 보세요." : "아직 순서가 달라요. 주어와 동사부터 다시 찾아보세요."}</p> : null}
          {wordIndex === 9 && wordResult === "correct" ? <div className={styles.retell}><span>FINAL RETELL</span><strong>{level.activities.word.retellPromptKo}</strong></div> : null}
        </section>
      ) : null}

      {audioError ? <p className={styles.error} role="alert">{audioError}</p> : null}

      <footer className={styles.lessonFooter}>
        <div><span>SESSION PROGRESS</span><strong>{completed.length} / 4 MODE COMPLETE</strong></div>
        <div className={styles.footerProgress}>{MODES.map((item) => <i key={item.id} className={completed.includes(item.id) ? styles.done : mode === item.id ? styles.current : ""} />)}</div>
        {mode !== "word" ? <button type="button" onClick={nextMode}>{mode.toUpperCase()} 완료하고 다음 →</button> : <button type="button" onClick={() => markComplete("word")}>수업 마치기 ✓</button>}
      </footer>
    </main>
  );
}
