'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LessonShell from '@/app/components/LessonShell';
import VideoPlayer from '@/app/components/VideoPlayer';
import { FullscreenIcon, HeaderIconButton } from '@/app/components/HeaderIcons';
import { useAuth } from '@/app/contexts/AuthContext';
import { useFullscreen } from '@/app/hooks/useFullscreen';
import { fetchLessonData, formatChapterLabel, parseLessonNumber, parsePack, parseProgressLesson } from '@/app/dataService';
import { getLessonMedia, isBookId, lessonSelectHref, nextChapterHref } from '@/app/lib/lessonMedia';
import { useRequireModeAccess } from '@/app/lib/useRequireModeAccess';
import { buildStoryRecallCues, type StoryRecallCue } from '@/app/lib/storyRecallCues';
import { fetchRetellProgressRows, saveStoryRetellProgress } from '@/app/lib/storyRetellProgress';
import { fetchEvaluation } from '@/app/lib/evaluation';

type Phase = 'intro' | 'ready' | 'recording' | 'review' | 'complete' | 'error';

const OPEN_PROMPTS = [
  { en: 'Tell me what happened in this scene.', ko: '이 장면에서 무슨 일이 있었는지 들려주세요.' },
  { en: 'What happened next?', ko: '그다음에는 무슨 일이 있었나요?' },
  { en: 'How did someone feel or change?', ko: '누구의 마음이나 행동이 어떻게 달라졌나요?' },
  { en: 'What part do you remember most?', ko: '가장 기억에 남는 부분을 더 들려주세요.' },
] as const;

const MAX_RECORDING_MS = 60_000;

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

function StoryRetellContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id') || '001:1';
  const contentLesson = parseLessonNumber(movieId);
  const pack = parsePack(movieId);
  const progressLesson = parseProgressLesson(movieId);
  const media = getLessonMedia(movieId);
  const isBookLesson = isBookId(movieId);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { checking } = useRequireModeAccess(progressLesson, 'retelling', movieId);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isLoading, setIsLoading] = useState(true);
  const [recallCues, setRecallCues] = useState<StoryRecallCue[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState(0);
  const [cueNonce, setCueNonce] = useState(0);
  const [cuePlaying, setCuePlaying] = useState(false);
  const [cueMuted, setCueMuted] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedWithoutMic, setCompletedWithoutMic] = useState(false);
  const [showKoreanHelp, setShowKoreanHelp] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const secondTimerRef = useRef<number | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const prompt = OPEN_PROMPTS[promptIndex % OPEN_PROMPTS.length];
  const activeCue = recallCues[activeCueIndex] || null;
  const nextHref = nextChapterHref(movieId);

  const stopPlayback = useCallback(() => {
    playbackRef.current?.pause();
    playbackRef.current = null;
    setIsPlayingBack(false);
  }, []);

  const clearRecordingUrl = useCallback(() => {
    stopPlayback();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
    chunksRef.current = [];
    setLastRecordingUrl(null);
  }, [stopPlayback]);

  const releaseRecorder = useCallback(() => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (secondTimerRef.current) window.clearInterval(secondTimerRef.current);
    stopTimerRef.current = null;
    secondTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const speakPrompt = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }, []);

  const playRecording = useCallback(() => {
    if (!recordingUrlRef.current) return;
    stopPlayback();
    const audio = new Audio(recordingUrlRef.current);
    playbackRef.current = audio;
    audio.onended = () => {
      playbackRef.current = null;
      setIsPlayingBack(false);
    };
    audio.onerror = () => {
      playbackRef.current = null;
      setIsPlayingBack(false);
    };
    setIsPlayingBack(true);
    void audio.play().catch(() => setIsPlayingBack(false));
  }, [stopPlayback]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const lesson = await fetchLessonData(contentLesson, pack).catch(() => null);
      if (cancelled) return;
      if (lesson) {
        setRecallCues(buildStoryRecallCues(lesson));
        setActiveCueIndex(0);
      }

      if (user) {
        const [rows, existing] = await Promise.all([
          fetchRetellProgressRows(),
          fetchEvaluation(progressLesson, 'retelling'),
        ]);
        if (cancelled) return;
        if (rows.some((row) => row.lesson_number === progressLesson && row.completed)) {
          setTurnCount(Math.max(0, Number(existing.turnCount || 0)));
          setSpeakingSeconds(Math.max(0, Number(existing.speakingSeconds || 0)));
          setCompletedWithoutMic(Boolean(existing.usedFallback));
          setPhase('complete');
        }
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [contentLesson, pack, progressLesson, user]);

  useEffect(
    () => () => {
      releaseRecorder();
      clearRecordingUrl();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [clearRecordingUrl, releaseRecorder]
  );

  const startStory = () => {
    setCuePlaying(false);
    setPromptIndex(0);
    setShowKoreanHelp(false);
    setPhase('ready');
    window.setTimeout(() => speakPrompt(OPEN_PROMPTS[0].en), 80);
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage('');
    setCuePlaying(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    clearRecordingUrl();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorMessage('이 브라우저에서는 마이크를 사용할 수 없어요.');
      setPhase('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Math.max(0, (performance.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        releaseRecorder();
        if (duration < 1 || blob.size < 100) {
          setErrorMessage('목소리가 너무 짧았어요. 한 번 더 들려주세요.');
          setPhase('ready');
          return;
        }
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;
        setLastRecordingUrl(url);
        setTurnCount((value) => value + 1);
        setSpeakingSeconds((value) => value + Math.round(duration));
        setPhase('review');
        window.setTimeout(() => playRecording(), 80);
      };
      startedAtRef.current = performance.now();
      setRecordingSeconds(0);
      recorder.start(250);
      setPhase('recording');
      secondTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((performance.now() - startedAtRef.current) / 1000));
      }, 250);
      stopTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      releaseRecorder();
      setErrorMessage('마이크 권한을 허용한 뒤 다시 시도해 주세요.');
      setPhase('error');
    }
  }, [clearRecordingUrl, playRecording, releaseRecorder, stopRecording]);

  const continueStory = () => {
    clearRecordingUrl();
    const nextIndex = (promptIndex + 1) % OPEN_PROMPTS.length;
    setPromptIndex(nextIndex);
    setShowKoreanHelp(false);
    setPhase('ready');
    window.setTimeout(() => speakPrompt(OPEN_PROMPTS[nextIndex].en), 80);
  };

  const finishStory = useCallback(
    async (usedFallback = false) => {
      if (saving) return;
      setSaving(true);
      clearRecordingUrl();
      const completedAt = new Date().toISOString();
      setCompletedWithoutMic(usedFallback);
      const saved = await saveStoryRetellProgress(progressLesson, {
        version: 1,
        completed: true,
        turnCount,
        speakingSeconds,
        questionCount: turnCount,
        usedFallback,
        completedAt,
      });
      if (!saved) {
        setErrorMessage('완료 기록을 저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.');
        setPhase(turnCount > 0 ? 'review' : 'error');
        setSaving(false);
        return;
      }
      setPhase('complete');
      setSaving(false);
    },
    [clearRecordingUrl, progressLesson, saving, speakingSeconds, turnCount]
  );

  const restart = () => {
    clearRecordingUrl();
    setTurnCount(0);
    setSpeakingSeconds(0);
    setPromptIndex(0);
    setErrorMessage('');
    setCompletedWithoutMic(false);
    setShowKoreanHelp(false);
    setPhase('intro');
  };

  if (loading || checking || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#60D96C] border-t-transparent" />
          <p className="font-semibold text-[#60D96C]">Finale를 준비하는 중…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;
  return (
    <LessonShell
      hideHeader
      compactStage
      stageClassName={`learning-stage learning-stage-retell ${isBookLesson ? 'learning-content-book' : 'learning-content-movie'}`}
    >
      <div className="retell-board">
        <section className="retell-scene watch-frame">
          {activeCue ? (
            <div className="absolute inset-0">
              <VideoPlayer
                src={media.src}
                poster={media.poster}
                startTime={activeCue.start}
                endTime={activeCue.end}
                muted={cueMuted}
                showText={false}
                text=""
                playNonce={cueNonce}
                playing={cuePlaying}
                onEndedSegment={() => setCuePlaying(false)}
                hidePauseOverlay
              />
            </div>
          ) : media.poster ? (
            <img src={media.poster} alt="" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <div className="retell-no-cue">장면 도움 없이 기억해 봐요</div>
          )}
          <div className="retell-scene-shade" />
          <Link href={lessonSelectHref(movieId)} className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4" aria-label="뒤로">
            <img src="/home/back.svg" alt="" className="h-full w-full" />
          </Link>
          <div className="lesson-top-actions absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
            <HeaderIconButton label={isFullscreen ? '전체화면 종료' : '전체화면'} onClick={toggleFullscreen}>
              <FullscreenIcon active={isFullscreen} />
            </HeaderIconButton>
          </div>
          <div className="retell-scene-copy">
            <span>CHAPTER FINALE · MY VOICE</span>
            <h2>{formatChapterLabel(pack, contentLesson)} · 기억 깨우기</h2>
            {recallCues.length > 0 && (
              <div className="retell-cue-picker" aria-label="기억 도움 장면">
                {recallCues.map((cue, index) => (
                  <button
                    key={cue.id}
                    type="button"
                    aria-pressed={activeCueIndex === index}
                    disabled={phase === 'recording'}
                    onClick={() => {
                      setActiveCueIndex(index);
                      setCueMuted(false);
                      setCuePlaying(true);
                      setCueNonce((value) => value + 1);
                    }}
                  >
                    <span aria-hidden>▶</span> {cue.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="retell-dialogue" aria-live="polite">
          {phase === 'intro' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">CHAPTER FINALE</p>
              <h1>이제 내 말로 챕터를 끝내요</h1>
              <p className="retell-lead">위 장면들은 기억을 돕는 힌트예요. 정답 문장 없이 기억나는 영어로 이야기해요.</p>
              <div className="retell-privacy">
                <strong>음성은 이 기기에서만 잠시 재생돼요.</strong>
                <span>서버나 AI로 보내거나 저장하지 않아요.</span>
              </div>
              <button type="button" className="retell-primary" onClick={startStory}>이야기 시작</button>
            </div>
          )}

          {phase === 'ready' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">YOUR TURN</p>
              <h1 lang="en">{prompt.en}</h1>
              <button type="button" className="retell-listen-question" onClick={() => speakPrompt(prompt.en)}>
                <span aria-hidden>▶</span> Listen again
              </button>
              <button type="button" className="retell-help-toggle" onClick={() => setShowKoreanHelp((value) => !value)} aria-expanded={showKoreanHelp}>
                한국어 도움말
              </button>
              {showKoreanHelp && <p className="retell-help">{prompt.ko}</p>}
              {errorMessage && <p className="retell-error">{errorMessage}</p>}
              <button type="button" className="retell-mic" onClick={() => void startRecording()} aria-label="말하기 시작">
                <span className="retell-mic-icon" aria-hidden />
              </button>
              <p className="retell-mic-label">눌러서 말하기</p>
            </div>
          )}

          {phase === 'recording' && (
            <div className="retell-copy-block">
              <p className="retell-kicker is-recording">RECORDING · {recordingSeconds}s</p>
              <h1>계속 들려주세요</h1>
              <div className="retell-wave" aria-hidden>
                {[18, 34, 54, 28, 66, 42, 58, 24, 48].map((height, index) => (
                  <span key={index} style={{ height, animationDelay: `${index * 80}ms` }} />
                ))}
              </div>
              <button type="button" className="retell-stop" onClick={stopRecording}>말하기 끝</button>
            </div>
          )}

          {phase === 'review' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">YOUR VOICE · {turnCount}</p>
              <h1 lang="en">Listen to your story.</h1>
              <p className="retell-lead">{turnCount === 1 ? '한 가지를 더 떠올려도 좋고, 여기서 마쳐도 좋아요.' : '이야기의 순서와 느낌을 더해 가고 있어요.'}</p>
              {lastRecordingUrl && (
                <button type="button" className="retell-playback" onClick={isPlayingBack ? stopPlayback : playRecording}>
                  <span aria-hidden>{isPlayingBack ? 'Ⅱ' : '▶'}</span>
                  {isPlayingBack ? '내 목소리 듣는 중' : '내 목소리 다시 듣기'}
                </button>
              )}
              {errorMessage && <p className="retell-error">{errorMessage}</p>}
              <div className="retell-actions">
                <button type="button" className="retell-secondary" onClick={continueStory}>한 가지 더 말하기</button>
                <button type="button" className="retell-primary" disabled={saving} onClick={() => void finishStory(false)}>
                  {saving ? '기록하는 중…' : '이야기 마치기'}
                </button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">MIC CHECK</p>
              <h1>{errorMessage}</h1>
              <p className="retell-lead">마이크 없이 소리 내어 말해도 Finale 경험은 완료로 인정해요.</p>
              <div className="retell-actions">
                <button type="button" className="retell-secondary" onClick={() => setPhase('ready')}>다시 시도</button>
                <button type="button" className="retell-primary" disabled={saving} onClick={() => void finishStory(true)}>직접 말하고 완료</button>
              </div>
            </div>
          )}

          {phase === 'complete' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">CHAPTER COMPLETE</p>
              <h1>네 가지 연습을 내 이야기로 끝냈어요</h1>
              <div className="retell-proof">
                <div>
                  <strong>{completedWithoutMic ? '직접' : turnCount}</strong>
                  <span>{completedWithoutMic ? '말하기로 완료' : '말하기'}</span>
                </div>
                <div><strong>{speakingSeconds}s</strong><span>내 목소리</span></div>
                <div><strong>0</strong><span>저장된 녹음</span></div>
              </div>
              <p className="retell-lead">녹음은 남기지 않고, 완료 기록만 학습 과정에 표시돼요.</p>
              <div className="retell-actions">
                <button type="button" className="retell-secondary" onClick={restart}>다시 이야기</button>
                <button type="button" className="retell-primary" onClick={() => { window.location.href = nextHref; }}>
                  다음 학습으로
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .learning-stage-retell { --retell-panel: #201e1e; }
        .retell-board { position: relative; min-height: 0; height: 100%; }
        .retell-scene { position: absolute; inset: 0; min-height: 0; overflow: hidden; background: #000; }
        .retell-scene-shade { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.46), transparent 32%, rgba(0,0,0,.9) 100%); }
        .retell-scene-copy { position: absolute; z-index: 3; top: clamp(4.2rem, 8vh, 6rem); left: clamp(1rem, 2.4vw, 2rem); right: clamp(1rem, 2.4vw, 2rem); max-width: min(48rem, 62%); }
        .retell-scene-copy span, .retell-kicker { color: #60D96C; font: 900 clamp(.7rem, 1.1vw, .9rem)/1 "Encode Sans", sans-serif; letter-spacing: .17em; }
        .retell-scene-copy h2 { margin-top: .45rem; color: #fff; font: 900 clamp(1.35rem, 2.5vw, 2.65rem)/1.08 "Encode Sans Semi Condensed", "Encode Sans", sans-serif; }
        .retell-cue-picker { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .85rem; }
        .retell-cue-picker button { display: inline-flex; align-items: center; gap: .35rem; min-height: 2.7rem; border: 1px solid rgba(255,255,255,.38); border-radius: 999px; background: rgba(0,0,0,.58); padding: .55rem .85rem; color: #fff; font: 900 .72rem/1 "Encode Sans", sans-serif; letter-spacing: .08em; backdrop-filter: blur(8px); }
        .retell-cue-picker button[aria-pressed="true"] { border-color: #60D96C; background: rgba(24,67,30,.84); color: #d7ffdc; }
        .retell-cue-picker button:disabled { cursor: not-allowed; opacity: .4; }
        .retell-no-cue { display: grid; position: absolute; inset: 0; place-items: center; color: #a1a1aa; font-weight: 800; background: radial-gradient(circle, #18251a, #050605 68%); }
        .retell-dialogue { position: absolute; z-index: 12; display: flex; right: clamp(.6rem, 1.4vw, 1rem); bottom: clamp(.6rem, 1.4vw, 1rem); left: clamp(.6rem, 1.4vw, 1rem); max-height: min(60%, 32rem); min-height: 0; overflow-x: hidden; overflow-y: auto; align-items: center; justify-content: center; border: 2px solid rgba(96,217,108,.52); border-radius: clamp(1rem, 2vw, 1.6rem); background: radial-gradient(circle at 85% 0%, rgba(96,217,108,.13), transparent 30%), rgba(24,24,24,.94); padding: clamp(1rem, 2vw, 1.7rem); box-shadow: 0 1.4rem 4rem rgba(0,0,0,.48); backdrop-filter: blur(14px); -webkit-overflow-scrolling: touch; }
        .retell-copy-block { position: relative; z-index: 1; width: 100%; max-width: 46rem; text-align: center; }
        .retell-copy-block h1 { margin: .85rem auto 0; max-width: 31rem; color: #fff; font: 900 clamp(1.65rem, 2.65vw, 2.8rem)/1.14 "Encode Sans Semi Condensed", "Encode Sans", sans-serif; word-break: keep-all; }
        .retell-lead { margin: .85rem auto 0; max-width: 29rem; color: #d4d4d8; font: 650 clamp(.94rem, 1.25vw, 1.12rem)/1.55 "Encode Sans", sans-serif; word-break: keep-all; }
        .retell-privacy { display: flex; flex-direction: column; gap: .2rem; margin: .8rem auto 0; max-width: 29rem; color: #a1a1aa; font-size: .74rem; line-height: 1.4; }
        .retell-privacy strong { color: #fff; font-size: .86rem; }
        .retell-primary, .retell-secondary, .retell-stop, .retell-playback, .retell-listen-question { min-height: 3rem; border-radius: 999px; padding: .75rem 1.25rem; font-family: "Encode Sans", sans-serif; font-weight: 900; transition: transform .15s ease, filter .15s ease; }
        .retell-primary { margin-top: 1.25rem; border: 0; background: #60D96C; color: #071208; }
        .retell-primary:hover:not(:disabled), .retell-secondary:hover, .retell-playback:hover, .retell-listen-question:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .retell-primary:disabled { opacity: .55; }
        .retell-secondary { margin-top: 1.25rem; border: 1px solid rgba(255,255,255,.28); background: transparent; color: #fff; }
        .retell-listen-question { margin-top: 1rem; border: 1px solid rgba(96,217,108,.48); background: rgba(96,217,108,.08); color: #c8f5cd; }
        .retell-help-toggle { display: block; margin: .65rem auto 0; border: 0; background: transparent; color: #a1a1aa; font-size: .78rem; font-weight: 800; text-decoration: underline; text-underline-offset: .2rem; }
        .retell-help { margin: .5rem auto 0; color: #d4d4d8; font-size: .88rem; font-weight: 700; }
        .retell-mic { display: grid; width: clamp(5.4rem, 9vw, 7rem); aspect-ratio: 1; place-items: center; margin: 1.5rem auto 0; border: clamp(6px, .7vw, 10px) solid rgba(96,217,108,.25); border-radius: 50%; background: #60D96C; box-shadow: 0 0 0 .55rem rgba(96,217,108,.08), 0 .9rem 2.5rem rgba(0,0,0,.3); }
        .retell-mic-icon { position: relative; display: block; width: 1.45rem; height: 2.15rem; border: .22rem solid #09230d; border-radius: 1rem; }
        .retell-mic-icon::before { content: ''; position: absolute; left: 50%; bottom: -.85rem; width: 2.35rem; height: 1.2rem; translate: -50% 0; border: .22rem solid #09230d; border-top: 0; border-radius: 0 0 1.3rem 1.3rem; }
        .retell-mic-icon::after { content: ''; position: absolute; left: 50%; bottom: -1.3rem; width: .22rem; height: .55rem; translate: -50% 0; background: #09230d; }
        .retell-mic-label { margin-top: 1.05rem; color: #fff; font-weight: 800; }
        .retell-error { margin: .8rem auto -.5rem; color: #fda4af; font-size: .88rem; font-weight: 800; }
        .retell-kicker.is-recording { color: #fb7185; }
        .retell-wave { display: flex; height: 5.3rem; align-items: center; justify-content: center; gap: .34rem; margin-top: 1.25rem; }
        .retell-wave span { width: .42rem; border-radius: 999px; background: #60D96C; animation: retell-wave 850ms ease-in-out infinite alternate; }
        .retell-stop { margin-top: 1rem; border: 1px solid rgba(255,255,255,.34); background: #fff; color: #191919; }
        .retell-playback { display: inline-flex; align-items: center; gap: .65rem; margin-top: 1.15rem; border: 1px solid rgba(96,217,108,.4); background: #132816; color: #fff; }
        .retell-actions { display: flex; align-items: center; justify-content: center; gap: .65rem; }
        .retell-proof { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; margin: 1.25rem auto 0; max-width: 29rem; }
        .retell-proof div { display: flex; min-height: 5.4rem; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.13); border-radius: 1rem; background: rgba(0,0,0,.24); }
        .retell-proof strong { color: #60D96C; font-size: clamp(1.3rem, 2.4vw, 2rem); }
        .retell-proof span { margin-top: .2rem; color: #a1a1aa; font-size: .72rem; font-weight: 800; }
        @keyframes retell-wave { from { transform: scaleY(.55); opacity: .6; } to { transform: scaleY(1); opacity: 1; } }
        @media (max-width: 900px) {
          .retell-scene-copy { max-width: calc(100% - 2rem); }
          .retell-dialogue { max-height: 64%; border-radius: 1.25rem; padding: 1rem 1rem max(1rem, env(safe-area-inset-bottom)); }
        }
        @media (max-width: 540px) and (max-height: 700px) {
          .retell-dialogue { max-height: 66%; justify-content: flex-start; padding: .65rem .75rem max(.65rem, env(safe-area-inset-bottom)); }
          .retell-copy-block { padding-block: .2rem .35rem; }
          .retell-scene-copy { top: 3.6rem; }
          .retell-scene-copy h2 { font-size: 1.15rem; }
          .retell-cue-picker button { min-height: 2.25rem; padding: .42rem .65rem; font-size: .64rem; }
          .retell-copy-block h1 { margin-top: .4rem; font-size: 1.45rem; }
          .retell-lead { margin-top: .5rem; font-size: .82rem; line-height: 1.4; }
          .retell-privacy { margin-top: .55rem; font-size: .68rem; }
          .retell-primary, .retell-secondary, .retell-stop, .retell-playback, .retell-listen-question { min-height: 2.5rem; margin-top: .65rem; padding: .52rem .9rem; font-size: .82rem; }
          .retell-help-toggle { margin-top: .4rem; font-size: .72rem; }
          .retell-help { margin-top: .3rem; font-size: .78rem; }
          .retell-mic { width: 4.6rem; margin-top: .75rem; border-width: 5px; }
          .retell-mic-icon { scale: .84; }
          .retell-mic-label { margin-top: .6rem; font-size: .82rem; }
        }
        @media (orientation: landscape) and (max-height: 540px) {
          .retell-scene-copy { top: 3.6rem; max-width: 54%; }
          .retell-dialogue { top: .5rem; right: .5rem; bottom: .5rem; left: auto; width: min(43vw, 31rem); max-height: none; border-radius: 1rem; padding: .75rem; }
          .retell-copy-block h1 { margin-top: .4rem; font-size: clamp(1.15rem, 5vh, 1.65rem); }
          .retell-lead { margin-top: .45rem; font-size: .78rem; line-height: 1.3; }
          .retell-privacy { margin-top: .6rem; padding: .5rem .65rem; font-size: .68rem; }
          .retell-primary, .retell-secondary, .retell-stop, .retell-playback, .retell-listen-question { min-height: 2.25rem; margin-top: .55rem; padding: .42rem .8rem; font-size: .76rem; }
          .retell-mic { width: 3.5rem; margin-top: .55rem; border-width: 4px; }
          .retell-mic-icon { scale: .72; }
          .retell-mic-label { margin-top: .45rem; font-size: .72rem; }
          .retell-wave { height: 2.8rem; margin-top: .4rem; scale: .7; }
          .retell-proof { margin-top: .55rem; }
          .retell-proof div { min-height: 3rem; }
          .retell-cue-picker { gap: .3rem; margin-top: .5rem; }
          .retell-cue-picker button { min-height: 2rem; padding: .35rem .6rem; font-size: .62rem; }
        }
        @media (prefers-reduced-motion: reduce) { .retell-wave span { animation: none; } }
      `}</style>
    </LessonShell>
  );
}

function LegacyStoryRetellPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <StoryRetellContent />
    </Suspense>
  );
}

export { default } from './StoryRetellExperience';
