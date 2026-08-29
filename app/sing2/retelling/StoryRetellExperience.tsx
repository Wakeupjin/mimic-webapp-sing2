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
import { buildStoryContext } from '@/app/lib/storyConversation';
import { fetchRetellProgressRows, saveStoryRetellProgress } from '@/app/lib/storyRetellProgress';
import { fetchEvaluation } from '@/app/lib/evaluation';
import { supabase } from '@/app/supabaseClient';
import type {
  StoryBeat,
  StoryConversationHistoryItem,
  StoryConversationResult,
  StoryHintCue,
} from '@/app/types/storyConversation';

type Phase = 'intro' | 'ready' | 'recording' | 'thinking' | 'response' | 'complete' | 'error';
type ErrorKind = 'mic' | 'ai';

const FIRST_PROMPT = {
  en: 'Tell me the story you remember.',
  ko: '기억나는 이야기를 영어로 들려주세요.',
};
const MAX_RECORDING_MS = 45_000;

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

function audioExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function cueIndexFor(cues: StoryRecallCue[], hint: StoryHintCue, turns: number): number {
  if (cues.length <= 1) return 0;
  if (hint === 'begin') return 0;
  if (hint === 'end') return cues.length - 1;
  if (hint === 'middle') return Math.floor((cues.length - 1) / 2);
  if (turns === 0) return 0;
  if (turns === 1) return Math.floor((cues.length - 1) / 2);
  return cues.length - 1;
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
  const [storyContext, setStoryContext] = useState('');
  const [recallCues, setRecallCues] = useState<StoryRecallCue[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState(0);
  const [cueNonce, setCueNonce] = useState(0);
  const [cuePlaying, setCuePlaying] = useState(false);
  const [showSceneHint, setShowSceneHint] = useState(false);
  const [history, setHistory] = useState<StoryConversationHistoryItem[]>([]);
  const [result, setResult] = useState<StoryConversationResult | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [aiTurnCount, setAiTurnCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [coveredBeats, setCoveredBeats] = useState<StoryBeat[]>([]);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorKind, setErrorKind] = useState<ErrorKind>('mic');
  const [saving, setSaving] = useState(false);
  const [completedWithoutMic, setCompletedWithoutMic] = useState(false);
  const [showKoreanHelp, setShowKoreanHelp] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const secondTimerRef = useRef<number | null>(null);

  const activeCue = recallCues[activeCueIndex] || null;
  const nextHref = nextChapterHref(movieId);

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
        setStoryContext(buildStoryContext(lesson));
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
          setAiTurnCount(Math.max(0, Number(existing.aiTurnCount ?? existing.turnCount ?? 0)));
          setHintCount(Math.max(0, Number(existing.hintCount || 0)));
          setCoveredBeats(Array.from({ length: Math.max(0, Number(existing.coveredBeatCount || 0)) }, () => 'unknown' as StoryBeat));
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [releaseRecorder]
  );

  const startStory = () => {
    if (!consentChecked) return;
    setCuePlaying(false);
    setShowSceneHint(false);
    setShowKoreanHelp(false);
    setErrorMessage('');
    setPhase('ready');
    window.setTimeout(() => speakPrompt(FIRST_PROMPT.en), 80);
  };

  const playSceneHint = useCallback((requestedHint?: StoryHintCue) => {
    if (recallCues.length === 0) return;
    const index = cueIndexFor(recallCues, requestedHint ?? result?.hintCue ?? null, history.length);
    setActiveCueIndex(index);
    setShowSceneHint(true);
    setCuePlaying(true);
    setCueNonce((value) => value + 1);
    setHintCount((value) => value + 1);
  }, [history.length, recallCues, result?.hintCue]);

  const sendStoryTurn = useCallback(async (blob: Blob, duration: number) => {
    setTurnCount((value) => value + 1);
    setSpeakingSeconds((value) => value + Math.round(duration));
    setCuePlaying(false);
    setShowSceneHint(false);
    setShowKoreanHelp(false);
    setPhase('thinking');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('로그인이 만료됐어요. 다시 로그인해 주세요.');

      const formData = new FormData();
      formData.append('audio', blob, `story.${audioExtension(blob.type)}`);
      formData.append('storyContext', storyContext);
      formData.append('history', JSON.stringify(history.slice(-6)));

      const response = await fetch('/api/story-conversation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<StoryConversationResult> & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Mimic과 연결하지 못했어요.');
      if (!payload.replyEn || !payload.storyBeat) throw new Error('Mimic의 답을 읽지 못했어요.');

      const nextResult = payload as StoryConversationResult;
      setResult(nextResult);
      setHistory((items) => [...items, {
        heardText: nextResult.heardText,
        replyEn: nextResult.replyEn,
        storyBeat: nextResult.storyBeat,
      }]);
      setAiTurnCount((value) => value + 1);
      setCoveredBeats(nextResult.coveredBeats.filter((beat) => beat !== 'unknown'));
      setPhase('response');
      window.setTimeout(() => speakPrompt(nextResult.replyEn), 100);
    } catch (error) {
      setErrorKind('ai');
      setErrorMessage(error instanceof Error ? error.message : 'Mimic과 연결하지 못했어요.');
      setPhase('error');
    }
  }, [history, speakPrompt, storyContext]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage('');
    setCuePlaying(false);
    setShowSceneHint(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorKind('mic');
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
          setPhase(result ? 'response' : 'ready');
          return;
        }
        void sendStoryTurn(blob, duration);
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
      setErrorKind('mic');
      setErrorMessage('마이크 권한을 허용한 뒤 다시 시도해 주세요.');
      setPhase('error');
    }
  }, [releaseRecorder, result, sendStoryTurn, stopRecording]);

  const finishStory = useCallback(async (usedFallback = false) => {
    if (saving) return;
    setSaving(true);
    const completedAt = new Date().toISOString();
    setCompletedWithoutMic(usedFallback);
    setHistory([]);
    setResult(null);
    const saved = await saveStoryRetellProgress(progressLesson, {
      version: 2,
      completed: true,
      turnCount,
      speakingSeconds,
      questionCount: aiTurnCount,
      usedFallback,
      aiTurnCount,
      hintCount,
      coveredBeatCount: coveredBeats.length,
      completedAt,
    });
    if (!saved) {
      setErrorKind('ai');
      setErrorMessage('완료 기록을 저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.');
      setPhase('error');
      setSaving(false);
      return;
    }
    setPhase('complete');
    setSaving(false);
  }, [aiTurnCount, coveredBeats.length, hintCount, progressLesson, saving, speakingSeconds, turnCount]);

  const restart = () => {
    setHistory([]);
    setResult(null);
    setTurnCount(0);
    setAiTurnCount(0);
    setHintCount(0);
    setCoveredBeats([]);
    setSpeakingSeconds(0);
    setErrorMessage('');
    setCompletedWithoutMic(false);
    setShowKoreanHelp(false);
    setShowSceneHint(false);
    setConsentChecked(false);
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
    <LessonShell hideHeader compactStage stageClassName={`learning-stage learning-stage-retell ${isBookLesson ? 'learning-content-book' : 'learning-content-movie'}`}>
      <div className="retell-board">
        <section className="retell-scene watch-frame" aria-label="장면 힌트">
          {showSceneHint && activeCue ? (
            <div className="absolute inset-0">
              <VideoPlayer
                src={media.src}
                poster={media.poster}
                startTime={activeCue.start}
                endTime={activeCue.end}
                muted={!showSceneHint}
                showText={false}
                text=""
                playNonce={cueNonce}
                playing={cuePlaying}
                onEndedSegment={() => setCuePlaying(false)}
                hidePauseOverlay
              />
            </div>
          ) : (
            <div className="retell-no-cue" aria-hidden />
          )}
          <div className={`retell-memory-cover ${showSceneHint ? 'is-open' : ''}`}>
            {!showSceneHint && (
              <div><span>NO HINT YET</span><strong>먼저 기억으로 이야기해요</strong><small>막히면 그때 한 장면만 보여줄게요.</small></div>
            )}
          </div>
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
            <span>CHAPTER FINALE · MY STORY</span>
            <h2>{formatChapterLabel(pack, contentLesson)} · 내가 기억한 이야기</h2>
            {showSceneHint && (
              <button type="button" className="retell-hint-replay" onClick={() => playSceneHint(result?.hintCue)}>
                <span aria-hidden>▶</span> 장면 힌트 다시 보기
              </button>
            )}
          </div>
        </section>

        <section className="retell-dialogue" aria-live="polite">
          {phase === 'intro' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">MIMIC · STORY PARTNER</p>
              <h1>기억나는 이야기부터 들려줘</h1>
              <p className="retell-lead">AI가 네 말의 뜻을 듣고 다음 질문을 이어가요. 정답·문법·발음 점수는 없어요.</p>
              <label className="retell-consent">
                <input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} />
                <span><strong>AI 음성 분석에 동의해요</strong><small>녹음은 OpenAI API로 전송해 분석하며, Mimic은 원음과 전사문을 저장하지 않아요.</small></span>
              </label>
              <button type="button" className="retell-primary" disabled={!consentChecked} onClick={startStory}>동의하고 이야기 시작</button>
            </div>
          )}

          {phase === 'ready' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">YOUR STORY · 1</p>
              <h1 lang="en">{FIRST_PROMPT.en}</h1>
              <button type="button" className="retell-listen-question" onClick={() => speakPrompt(FIRST_PROMPT.en)}><span aria-hidden>▶</span> 질문 다시 듣기</button>
              <button type="button" className="retell-help-toggle" onClick={() => setShowKoreanHelp((value) => !value)} aria-expanded={showKoreanHelp}>한국어 뜻 보기</button>
              {showKoreanHelp && <p className="retell-help">{FIRST_PROMPT.ko}</p>}
              {errorMessage && <p className="retell-error">{errorMessage}</p>}
              <button type="button" className="retell-mic" onClick={() => void startRecording()} aria-label="말하기 시작"><span className="retell-mic-icon" aria-hidden /></button>
              <p className="retell-mic-label">눌러서 이야기하기</p>
              {recallCues.length > 0 && <button type="button" className="retell-stuck" onClick={() => playSceneHint(null)}>막혔나요? 장면 힌트 보기</button>}
            </div>
          )}

          {phase === 'recording' && (
            <div className="retell-copy-block">
              <p className="retell-kicker is-recording">MIMIC IS LISTENING · {recordingSeconds}s</p>
              <h1>기억나는 대로 계속 말해요</h1>
              <div className="retell-wave" aria-hidden>{[18, 34, 54, 28, 66, 42, 58, 24, 48].map((height, index) => <span key={index} style={{ height, animationDelay: `${index * 80}ms` }} />)}</div>
              <button type="button" className="retell-stop" onClick={stopRecording}>말하기 끝</button>
            </div>
          )}

          {phase === 'thinking' && (
            <div className="retell-copy-block">
              <div className="retell-thinking-orbit" aria-hidden><span /></div>
              <p className="retell-kicker">MIMIC IS THINKING</p>
              <h1>네 이야기의 뜻을 생각하고 있어요</h1>
              <p className="retell-lead">문장이 완벽하지 않아도 괜찮아요.</p>
            </div>
          )}

          {phase === 'response' && result && (
            <div className="retell-copy-block">
              <p className="retell-kicker">MIMIC SAYS</p>
              <h1 lang="en">{result.replyEn}</h1>
              <button type="button" className="retell-listen-question" onClick={() => speakPrompt(result.replyEn)}><span aria-hidden>▶</span> 질문 다시 듣기</button>
              <button type="button" className="retell-help-toggle" onClick={() => setShowKoreanHelp((value) => !value)} aria-expanded={showKoreanHelp}>한국어 뜻 보기</button>
              {showKoreanHelp && <p className="retell-help">{result.replyKo}</p>}
              {result.needsSceneHint && recallCues.length > 0 && !showSceneHint && (
                <button type="button" className="retell-hint-suggestion" onClick={() => playSceneHint(result.hintCue)}><span>SCENE HINT</span>막힌 부분을 장면으로 떠올려 볼까요?</button>
              )}
              <button type="button" className="retell-mic retell-mic-next" onClick={() => void startRecording()} aria-label="대답하기"><span className="retell-mic-icon" aria-hidden /></button>
              <p className="retell-mic-label">대답하기</p>
              <div className="retell-response-footer">
                {!result.needsSceneHint && recallCues.length > 0 && <button type="button" className="retell-stuck" onClick={() => playSceneHint(null)}>막혔나요? 장면 힌트</button>}
                <button type="button" className={result.canFinish ? 'retell-finish is-ready' : 'retell-finish'} disabled={saving} onClick={() => void finishStory(false)}>{saving ? '기록하는 중…' : '이야기 마치기'}</button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">{errorKind === 'ai' ? 'CONNECTION CHECK' : 'MIC CHECK'}</p>
              <h1>{errorMessage}</h1>
              <p className="retell-lead">{errorKind === 'ai' ? 'AI인 척 가짜 답을 만들지는 않을게요. 다시 연결하거나 장면을 보고 직접 이어갈 수 있어요.' : '마이크 권한을 확인한 뒤 다시 이야기해요.'}</p>
              <div className="retell-actions">
                <button type="button" className="retell-secondary" onClick={() => setPhase(result ? 'response' : 'ready')}>다시 시도</button>
                {recallCues.length > 0 && <button type="button" className="retell-secondary" onClick={() => { playSceneHint(null); setPhase(result ? 'response' : 'ready'); }}>장면 힌트</button>}
                <button type="button" className="retell-primary" disabled={saving} onClick={() => void finishStory(true)}>직접 말하고 완료</button>
              </div>
            </div>
          )}

          {phase === 'complete' && (
            <div className="retell-copy-block">
              <p className="retell-kicker">CHAPTER COMPLETE</p>
              <h1>내 말로 이야기를 완성했어요</h1>
              <div className="retell-proof">
                <div><strong>{completedWithoutMic ? '직접' : aiTurnCount}</strong><span>{completedWithoutMic ? '말하기로 완료' : 'AI 대화'}</span></div>
                <div><strong>{speakingSeconds}s</strong><span>내 목소리</span></div>
                <div><strong>{hintCount}</strong><span>장면 힌트</span></div>
              </div>
              <p className="retell-lead">원음과 전사문은 남기지 않고, 완료 지표만 학습 과정에 표시돼요.</p>
              <div className="retell-actions">
                <button type="button" className="retell-secondary" onClick={restart}>다시 이야기</button>
                <button type="button" className="retell-primary" onClick={() => { window.location.href = nextHref; }}>다음 학습으로</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .learning-stage-retell { --retell-green: #60D96C; }
        .retell-board { position: relative; min-height: 0; height: 100%; overflow: hidden; background: #050605; }
        .retell-scene { position: absolute; inset: 0; min-height: 0; overflow: hidden; background: #000; }
        .retell-scene-shade { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.52), transparent 27%, rgba(0,0,0,.94) 100%); }
        .retell-memory-cover { position: absolute; z-index: 1; display: grid; inset: 0; place-items: center; background: radial-gradient(circle at 50% 34%, rgba(32,64,37,.5), rgba(4,6,4,.96) 60%); transition: opacity .35s ease; }
        .retell-memory-cover.is-open { pointer-events: none; opacity: 0; }
        .retell-memory-cover > div { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .retell-memory-cover span { color: var(--retell-green); font: 900 .72rem/1 "Encode Sans", sans-serif; letter-spacing: .2em; }
        .retell-memory-cover strong { margin-top: .65rem; color: #fff; font: 900 clamp(1.15rem, 2vw, 1.8rem)/1.2 "Encode Sans", sans-serif; }
        .retell-memory-cover small { margin-top: .45rem; color: #a1a1aa; font-weight: 700; }
        .retell-scene-copy { position: absolute; z-index: 3; top: clamp(4.2rem, 8vh, 6rem); left: clamp(1rem, 2.4vw, 2rem); right: clamp(1rem, 2.4vw, 2rem); max-width: min(48rem, 62%); }
        .retell-scene-copy > span, .retell-kicker { color: var(--retell-green); font: 900 clamp(.7rem, 1.1vw, .9rem)/1 "Encode Sans", sans-serif; letter-spacing: .17em; }
        .retell-scene-copy h2 { margin-top: .45rem; color: #fff; font: 900 clamp(1.35rem, 2.5vw, 2.65rem)/1.08 "Encode Sans Semi Condensed", "Encode Sans", sans-serif; }
        .retell-hint-replay { display: inline-flex; align-items: center; gap: .4rem; margin-top: .8rem; border: 1px solid rgba(255,255,255,.38); border-radius: 999px; background: rgba(0,0,0,.68); padding: .65rem .9rem; color: #fff; font-size: .76rem; font-weight: 900; backdrop-filter: blur(8px); }
        .retell-no-cue { display: grid; position: absolute; inset: 0; place-items: center; color: #a1a1aa; font-weight: 800; background: radial-gradient(circle at 50% 34%, #172d1a, #050605 66%); }
        .retell-dialogue { position: absolute; z-index: 12; display: flex; right: clamp(.6rem, 1.4vw, 1rem); bottom: clamp(.6rem, 1.4vw, 1rem); left: clamp(.6rem, 1.4vw, 1rem); max-height: min(62%, 34rem); min-height: 20rem; overflow-x: hidden; overflow-y: auto; align-items: center; justify-content: center; border: 2px solid rgba(96,217,108,.44); border-radius: clamp(1rem, 2vw, 1.6rem); background: radial-gradient(circle at 85% 0%, rgba(96,217,108,.13), transparent 30%), rgba(24,24,24,.95); padding: clamp(1rem, 2vw, 1.7rem); box-shadow: 0 1.4rem 4rem rgba(0,0,0,.52); backdrop-filter: blur(16px); -webkit-overflow-scrolling: touch; }
        .retell-copy-block { position: relative; z-index: 1; width: 100%; max-width: 46rem; padding-block: .2rem; text-align: center; }
        .retell-copy-block h1 { margin: .8rem auto 0; max-width: 34rem; color: #fff; font: 900 clamp(1.55rem, 2.6vw, 2.7rem)/1.14 "Encode Sans Semi Condensed", "Encode Sans", sans-serif; word-break: keep-all; }
        .retell-lead { margin: .8rem auto 0; max-width: 31rem; color: #d4d4d8; font: 650 clamp(.9rem, 1.2vw, 1.08rem)/1.5 "Encode Sans", sans-serif; word-break: keep-all; }
        .retell-consent { display: flex; max-width: 34rem; align-items: flex-start; gap: .75rem; margin: 1rem auto 0; border: 1px solid rgba(255,255,255,.14); border-radius: 1rem; background: rgba(0,0,0,.24); padding: .85rem 1rem; text-align: left; cursor: pointer; }
        .retell-consent input { width: 1.15rem; height: 1.15rem; flex: 0 0 auto; margin-top: .1rem; accent-color: var(--retell-green); }
        .retell-consent span { display: flex; flex-direction: column; gap: .18rem; }
        .retell-consent strong { color: #fff; font-size: .86rem; }
        .retell-consent small { color: #a1a1aa; font-size: .72rem; line-height: 1.45; }
        .retell-primary, .retell-secondary, .retell-stop, .retell-listen-question, .retell-finish { min-height: 3rem; border-radius: 999px; padding: .72rem 1.2rem; font-family: "Encode Sans", sans-serif; font-weight: 900; transition: transform .15s ease, filter .15s ease; }
        .retell-primary { margin-top: 1.1rem; border: 0; background: var(--retell-green); color: #071208; }
        .retell-primary:hover:not(:disabled), .retell-secondary:hover, .retell-listen-question:hover, .retell-finish:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .retell-primary:disabled { cursor: not-allowed; opacity: .38; }
        .retell-secondary { margin-top: 1rem; border: 1px solid rgba(255,255,255,.28); background: transparent; color: #fff; }
        .retell-listen-question { margin-top: .9rem; border: 1px solid rgba(96,217,108,.42); background: rgba(96,217,108,.08); color: #c8f5cd; }
        .retell-help-toggle, .retell-stuck { display: block; margin: .58rem auto 0; border: 0; background: transparent; color: #a1a1aa; font-size: .76rem; font-weight: 800; text-decoration: underline; text-underline-offset: .2rem; }
        .retell-stuck { margin-top: .75rem; color: #d4d4d8; }
        .retell-help { margin: .45rem auto 0; color: #d4d4d8; font-size: .86rem; font-weight: 700; }
        .retell-mic { display: grid; width: clamp(5rem, 8vw, 6.5rem); aspect-ratio: 1; place-items: center; margin: 1.2rem auto 0; border: clamp(6px, .7vw, 9px) solid rgba(96,217,108,.25); border-radius: 50%; background: var(--retell-green); box-shadow: 0 0 0 .5rem rgba(96,217,108,.08), 0 .9rem 2.5rem rgba(0,0,0,.3); }
        .retell-mic-next { width: clamp(4.5rem, 7vw, 5.7rem); margin-top: 1rem; }
        .retell-mic-icon { position: relative; display: block; width: 1.35rem; height: 2rem; border: .21rem solid #09230d; border-radius: 1rem; }
        .retell-mic-icon::before { content: ''; position: absolute; left: 50%; bottom: -.82rem; width: 2.2rem; height: 1.12rem; translate: -50% 0; border: .21rem solid #09230d; border-top: 0; border-radius: 0 0 1.3rem 1.3rem; }
        .retell-mic-icon::after { content: ''; position: absolute; left: 50%; bottom: -1.24rem; width: .21rem; height: .52rem; translate: -50% 0; background: #09230d; }
        .retell-mic-label { margin-top: .85rem; color: #fff; font-weight: 800; }
        .retell-error { margin: .75rem auto -.35rem; color: #fda4af; font-size: .86rem; font-weight: 800; }
        .retell-kicker.is-recording { color: #fb7185; }
        .retell-wave { display: flex; height: 4.8rem; align-items: center; justify-content: center; gap: .34rem; margin-top: 1rem; }
        .retell-wave span { width: .42rem; border-radius: 999px; background: var(--retell-green); animation: retell-wave 850ms ease-in-out infinite alternate; }
        .retell-stop { margin-top: .8rem; border: 1px solid rgba(255,255,255,.34); background: #fff; color: #191919; }
        .retell-thinking-orbit { position: relative; width: 4rem; height: 4rem; margin: 0 auto 1.1rem; border: 1px solid rgba(96,217,108,.25); border-radius: 50%; }
        .retell-thinking-orbit::before, .retell-thinking-orbit span { content: ''; position: absolute; inset: .72rem; border-radius: 50%; background: var(--retell-green); box-shadow: 0 0 2.3rem rgba(96,217,108,.55); }
        .retell-thinking-orbit span { inset: -.2rem; border: 2px solid transparent; border-top-color: var(--retell-green); background: none; box-shadow: none; animation: retell-spin 1s linear infinite; }
        .retell-hint-suggestion { display: flex; max-width: 26rem; flex-direction: column; gap: .28rem; margin: .85rem auto 0; border: 1px solid rgba(96,217,108,.5); border-radius: .9rem; background: rgba(96,217,108,.1); padding: .75rem 1rem; color: #fff; font-weight: 850; }
        .retell-hint-suggestion span { color: var(--retell-green); font-size: .65rem; letter-spacing: .15em; }
        .retell-response-footer { display: flex; align-items: center; justify-content: center; gap: .6rem; margin-top: .55rem; }
        .retell-response-footer .retell-stuck { margin: 0; }
        .retell-finish { border: 1px solid rgba(255,255,255,.24); background: transparent; color: #d4d4d8; }
        .retell-finish.is-ready { border-color: rgba(96,217,108,.55); color: #d7ffdc; }
        .retell-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .6rem; }
        .retell-proof { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; margin: 1.15rem auto 0; max-width: 29rem; }
        .retell-proof div { display: flex; min-height: 5rem; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.13); border-radius: 1rem; background: rgba(0,0,0,.24); }
        .retell-proof strong { color: var(--retell-green); font-size: clamp(1.3rem, 2.4vw, 2rem); }
        .retell-proof span { margin-top: .2rem; color: #a1a1aa; font-size: .72rem; font-weight: 800; }
        @keyframes retell-wave { from { transform: scaleY(.55); opacity: .6; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes retell-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .retell-scene-copy { max-width: calc(100% - 2rem); } .retell-dialogue { max-height: 66%; min-height: 19rem; border-radius: 1.25rem; padding: 1rem 1rem max(1rem, env(safe-area-inset-bottom)); } }
        @media (max-width: 540px) and (max-height: 700px) {
          .retell-dialogue { max-height: 69%; min-height: 0; justify-content: flex-start; padding: .65rem .75rem max(.65rem, env(safe-area-inset-bottom)); }
          .retell-copy-block { padding-block: .2rem .35rem; } .retell-scene-copy { top: 3.6rem; } .retell-scene-copy h2 { font-size: 1.1rem; }
          .retell-copy-block h1 { margin-top: .4rem; font-size: 1.4rem; } .retell-lead { margin-top: .45rem; font-size: .8rem; line-height: 1.38; }
          .retell-consent { margin-top: .55rem; padding: .58rem .7rem; }
          .retell-primary, .retell-secondary, .retell-stop, .retell-listen-question, .retell-finish { min-height: 2.45rem; margin-top: .58rem; padding: .5rem .85rem; font-size: .8rem; }
          .retell-help-toggle, .retell-stuck { margin-top: .38rem; font-size: .7rem; } .retell-help { margin-top: .25rem; font-size: .76rem; }
          .retell-mic, .retell-mic-next { width: 4.25rem; margin-top: .65rem; border-width: 5px; } .retell-mic-icon { scale: .78; } .retell-mic-label { margin-top: .5rem; font-size: .78rem; }
          .retell-hint-suggestion { margin-top: .55rem; padding: .55rem .7rem; font-size: .78rem; }
        }
        @media (orientation: landscape) and (max-height: 540px) {
          .retell-scene-copy { top: 3.6rem; max-width: 54%; } .retell-dialogue { top: .5rem; right: .5rem; bottom: .5rem; left: auto; width: min(44vw, 32rem); max-height: none; min-height: 0; border-radius: 1rem; padding: .7rem; }
          .retell-copy-block h1 { margin-top: .35rem; font-size: clamp(1.1rem, 4.8vh, 1.55rem); } .retell-lead { margin-top: .4rem; font-size: .75rem; line-height: 1.28; }
          .retell-consent { margin-top: .45rem; padding: .48rem .6rem; } .retell-primary, .retell-secondary, .retell-stop, .retell-listen-question, .retell-finish { min-height: 2.15rem; margin-top: .45rem; padding: .38rem .72rem; font-size: .72rem; }
          .retell-mic, .retell-mic-next { width: 3.35rem; margin-top: .45rem; border-width: 4px; } .retell-mic-icon { scale: .68; } .retell-mic-label { margin-top: .35rem; font-size: .68rem; }
          .retell-wave { height: 2.6rem; margin-top: .35rem; scale: .68; } .retell-hint-suggestion { margin-top: .4rem; padding: .4rem .6rem; font-size: .72rem; }
          .retell-proof { margin-top: .5rem; } .retell-proof div { min-height: 2.8rem; }
        }
        @media (prefers-reduced-motion: reduce) { .retell-wave span, .retell-thinking-orbit span { animation: none; } }
      `}</style>
    </LessonShell>
  );
}

export default function StoryRetellExperience() {
  return <Suspense fallback={<div className="min-h-screen bg-black" />}><StoryRetellContent /></Suspense>;
}
