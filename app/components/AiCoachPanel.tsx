'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/app/supabaseClient';
import type { AiCoachResult } from '@/app/types/aiCoach';

type CoachState = 'idle' | 'recording' | 'replaying' | 'analyzing' | 'result' | 'error';

type AiCoachPanelProps = {
  lineNumber: number;
  targetText: string;
  targetDuration: number;
  onResult: (result: AiCoachResult, attempt: number) => void;
  onContinue: (result: AiCoachResult) => void;
  onFallback: () => void;
  eyebrow?: string;
  promptText?: string;
  targetPreview?: string;
  continueLabel?: string;
  fallbackLabel?: string;
  showScore?: boolean;
  showTranscript?: boolean;
  mimicCue?: {
    src: string;
    start: number;
    end: number;
  };
};

const MAX_RECORDING_MS = 12_000;

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export default function AiCoachPanel({
  lineNumber,
  targetText,
  targetDuration,
  onResult,
  onContinue,
  onFallback,
  eyebrow,
  promptText = '방금 들은 소리를 그대로 따라 말해 보세요.',
  targetPreview,
  continueLabel = '다음 문장',
  fallbackLabel = '이번에는 건너뛰기',
  showScore = true,
  showTranscript = true,
  mimicCue,
}: AiCoachPanelProps) {
  const [state, setState] = useState<CoachState>('idle');
  const [result, setResult] = useState<AiCoachResult | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(1);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const playbackDoneRef = useRef<(() => void) | null>(null);
  const cueVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cueMode, setCueMode] = useState<'idle' | 'muted' | 'sound'>('idle');

  const playCue = useCallback(
    async (withSound: boolean) => {
      const video = cueVideoRef.current;
      if (!video || !mimicCue) return;

      video.pause();
      video.muted = !withSound;
      video.currentTime = mimicCue.start;
      setCueMode(withSound ? 'sound' : 'muted');

      try {
        await video.play();
      } catch {
        setCueMode('idle');
      }
    },
    [mimicCue]
  );

  const handleCueTimeUpdate = useCallback(() => {
    const video = cueVideoRef.current;
    if (!video || !mimicCue || video.currentTime < mimicCue.end) return;
    video.pause();
    video.currentTime = mimicCue.start;
    setCueMode('idle');
  }, [mimicCue]);

  useEffect(() => {
    const video = cueVideoRef.current;
    if (!video || !mimicCue || (state !== 'idle' && state !== 'recording')) return;

    const startMutedCue = () => void playCue(false);
    video.addEventListener('loadedmetadata', startMutedCue);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) startMutedCue();

    return () => video.removeEventListener('loadedmetadata', startMutedCue);
  }, [mimicCue, playCue, state]);

  const releaseRecorder = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    const finish = playbackDoneRef.current;
    if (finish) {
      finish();
      return;
    }
    playbackRef.current?.pause();
    playbackRef.current = null;
    setIsReplayPlaying(false);
  }, []);

  const clearRecording = useCallback(() => {
    stopPlayback();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
    setRecordingUrl(null);
  }, [stopPlayback]);

  const saveRecording = useCallback((audio: Blob): string => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    const url = URL.createObjectURL(audio);
    recordingUrlRef.current = url;
    setRecordingUrl(url);
    return url;
  }, []);

  const playRecording = useCallback(
    (url: string): Promise<void> => {
      stopPlayback();
      return new Promise((resolve) => {
        const player = new Audio(url);
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          player.pause();
          player.currentTime = 0;
          player.onended = null;
          player.onerror = null;
          if (playbackRef.current === player) playbackRef.current = null;
          if (playbackDoneRef.current === finish) playbackDoneRef.current = null;
          setIsReplayPlaying(false);
          resolve();
        };

        playbackRef.current = player;
        playbackDoneRef.current = finish;
        player.onended = finish;
        player.onerror = finish;
        setIsReplayPlaying(true);
        void player.play().catch(finish);
      });
    },
    [stopPlayback]
  );

  useEffect(
    () => () => {
      releaseRecorder();
      cueVideoRef.current?.pause();
      playbackDoneRef.current?.();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    },
    [releaseRecorder]
  );

  const analyze = useCallback(
    async (audio: Blob, recordedDuration: number): Promise<AiCoachResult> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('로그인이 만료됐어요.');

      const mimeType = audio.type || 'audio/webm';
      const formData = new FormData();
      formData.append(
        'audio',
        new File([audio], `mimic-line-${lineNumber}.${extensionForMimeType(mimeType)}`, {
          type: mimeType,
        })
      );
      formData.append('targetText', targetText);
      formData.append('recordedDuration', String(recordedDuration));
      formData.append('targetDuration', String(targetDuration));

      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const payload = (await response.json()) as AiCoachResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || '음성을 분석하지 못했어요.');

      return payload;
    },
    [lineNumber, targetDuration, targetText]
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    setResult(null);
    clearRecording();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('이 브라우저에서는 음성 녹음을 사용할 수 없어요.');
      setState('error');
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
      const [audioTrack] = stream.getAudioTracks();
      if (audioTrack) audioTrack.contentHint = 'speech';
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Math.max(0.1, (performance.now() - startedAtRef.current) / 1000);
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = saveRecording(audio);
        releaseRecorder();
        setState('replaying');
        setError('');

        void Promise.all([
          analyze(audio, duration).then(
            (payload) => ({ payload, error: null }),
            (caught) => ({ payload: null, error: caught })
          ),
          playRecording(url).then(() => {
            setState((current) => (current === 'replaying' ? 'analyzing' : current));
          }),
        ]).then(([analysis]) => {
          if (analysis.error || !analysis.payload) {
            setError(
              analysis.error instanceof Error ? analysis.error.message : '음성을 분석하지 못했어요.'
            );
            setState('error');
            return;
          }
          setResult(analysis.payload);
          setState('result');
          onResult(analysis.payload, attempt);
        });
      };

      startedAtRef.current = performance.now();
      recorder.start();
      setState('recording');
      void playCue(false);
      stopTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      releaseRecorder();
      setError('마이크 권한을 허용한 뒤 다시 시도해 주세요.');
      setState('error');
    }
  }, [analyze, attempt, clearRecording, onResult, playCue, playRecording, releaseRecorder, saveRecording, stopRecording]);

  const retry = useCallback(() => {
    clearRecording();
    setAttempt((value) => value + 1);
    setResult(null);
    setError('');
    setState('idle');
  }, [clearRecording]);

  const cuePlayer = mimicCue ? (
    <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-white/15 bg-black">
      <video
        ref={cueVideoRef}
        src={mimicCue.src}
        playsInline
        preload="metadata"
        muted
        className="h-full w-full object-contain"
        onTimeUpdate={handleCueTimeUpdate}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-black tracking-[0.12em] text-white">
        {cueMode === 'sound' ? 'SOUND' : 'MUTE'}
      </span>
    </div>
  ) : null;

  return (
    <div className="absolute inset-0 z-40 flex overflow-y-auto bg-black/75 px-4 py-6">
      <div className="m-auto w-full max-w-xl rounded-2xl border border-white/20 bg-[#201e1e]/95 p-5 text-center shadow-2xl backdrop-blur sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#60D96C]">
          {eyebrow || `AI Coach · Line ${String(lineNumber).padStart(2, '0')}`}
        </p>

        {state === 'idle' && (
          <>
            <p className="mt-3 text-lg font-bold text-white sm:text-2xl">
              {promptText}
            </p>
            {targetPreview && (
              <p className="mt-4 rounded-xl border border-white/15 bg-black/30 px-4 py-4 text-lg font-bold leading-snug text-white sm:text-xl">
                {targetPreview}
              </p>
            )}
            {cuePlayer}
            {mimicCue && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={() => void playCue(false)}
                >
                  무음 장면 다시 보기
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={() => void playCue(true)}
                >
                  소리 다시 듣기
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500">녹음은 분석에만 사용되며 Mimic에 저장되지 않아요.</p>
            <button
              type="button"
              className="mt-5 rounded-full bg-[#60D96C] px-7 py-3 font-bold text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => void startRecording()}
            >
              녹음 시작
            </button>
          </>
        )}

        {state === 'recording' && (
          <>
            {cuePlayer}
            <div className="mx-auto mt-5 h-4 w-4 animate-pulse rounded-full bg-red-500" />
            <p className="mt-3 font-semibold text-white">장면에 맞춰 말해 보세요…</p>
            {targetPreview && <p className="mt-3 text-lg font-bold text-white">{targetPreview}</p>}
            <button
              type="button"
              className="mt-4 rounded-full border border-white/30 px-7 py-3 font-bold text-white hover:bg-white/10"
              onClick={stopRecording}
            >
              말하기 끝
            </button>
          </>
        )}

        {state === 'replaying' && (
          <div className="py-7">
            <div className="mx-auto flex h-12 items-end justify-center gap-1" aria-hidden>
              {[5, 9, 12, 7, 11, 6, 10].map((height, index) => (
                <span
                  key={index}
                  className="w-1 animate-pulse rounded-full bg-[#60D96C]"
                  style={{ height: `${height * 3}px`, animationDelay: `${index * 90}ms` }}
                />
              ))}
            </div>
            <p className="mt-4 font-bold text-white">내 목소리를 듣는 중…</p>
            <p className="mt-1 text-xs text-zinc-500">AI 분석도 함께 진행하고 있어요.</p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-zinc-300 underline-offset-4 hover:text-white hover:underline"
              onClick={stopPlayback}
            >
              건너뛰기
            </button>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="py-7">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#60D96C] border-t-transparent" />
            <p className="mt-4 text-sm text-zinc-300">말한 내용을 분석하고 있어요…</p>
          </div>
        )}

        {state === 'result' && result && (
          <>
            {showScore ? (
              <>
                <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#60D96C] text-2xl font-black text-white">
                  {result.overallScore}
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">따라 말하기 점수</p>
              </>
            ) : (
              <p className="mt-5 text-2xl font-black text-white">분석이 끝났어요</p>
            )}
            {showTranscript && (
              <div className="mt-4 rounded-xl border border-white/15 bg-black/25 px-4 py-4 text-left">
                <p className="text-xs font-bold text-[#60D96C]">AI가 이렇게 들었어요</p>
                <p className="mt-2 text-lg font-bold text-white sm:text-xl">
                  {result.heardText || '음성을 인식하지 못했어요'}
                </p>
              </div>
            )}
            {recordingUrl && (
              <button
                type="button"
                className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                onClick={() => {
                  if (isReplayPlaying) {
                    stopPlayback();
                    return;
                  }
                  void playRecording(recordingUrl);
                }}
              >
                {isReplayPlaying ? '재생 멈추기' : '내 목소리 다시 듣기'}
              </button>
            )}
            <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white sm:text-base">
              {result.feedback}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white hover:bg-white/10"
                onClick={retry}
              >
                다시 말하기
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#60D96C] px-4 py-3 font-bold text-black hover:brightness-110"
                onClick={() => onContinue(result)}
              >
                {continueLabel}
              </button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#60D96C] px-5 py-3 font-bold text-black"
              onClick={() => setState('idle')}
            >
              다시 시도
            </button>
          </>
        )}

        {(state === 'idle' || state === 'error') && (
          <button
            type="button"
            className="mt-4 block w-full text-xs font-semibold text-zinc-400 underline-offset-4 hover:text-white hover:underline"
            onClick={onFallback}
          >
            {fallbackLabel}
          </button>
        )}
      </div>
    </div>
  );
}
