'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AiCoachPanel from '@/app/components/AiCoachPanel';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  evaluatePlacement,
  placementStorageKey,
  type PlacementGradeBand,
  type PlacementResult,
  type PlacementVoiceResult,
} from '@/app/lib/placement';
import type { AiCoachResult } from '@/app/types/aiCoach';

const VIDEO_URL = 'https://mimicsing2.b-cdn.net/sing2.mp4';
const SCENE = { start: 288.5, end: 342.66 };
const SCENE_DURATION = SCENE.end - SCENE.start;

const VOICE_TASKS = {
  easy: {
    lineNumber: 4,
    text: 'Yeah, look at you.',
    start: 290.608,
    end: 293.244,
  },
  long: {
    lineNumber: 5,
    text: 'I think we pretty much nailed it.',
    start: 297.682,
    end: 300.218,
  },
  reading: {
    lineNumber: 9,
    text: "Well, that's proof, right? She must like the show.",
    start: 340.291,
    end: 342.66,
  },
} as const;

type Step = 'intro' | 'watch' | 'easy' | 'long' | 'reading' | 'question' | 'result';
type VoiceTaskKey = 'easy' | 'long' | 'reading';

const STEP_ORDER: Step[] = ['intro', 'watch', 'easy', 'long', 'reading', 'question', 'result'];

const gradeBands: { value: PlacementGradeBand; label: string }[] = [
  { value: 'g1-3', label: '초1–3' },
  { value: 'g4-6', label: '초4–6' },
  { value: 'jh1-3', label: '중1–3' },
];

function voiceResult(result: AiCoachResult): PlacementVoiceResult {
  return {
    overallScore: result.overallScore,
    accuracyScore: result.accuracyScore,
    paceScore: result.paceScore,
  };
}

export default function PlacementPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeEndRef = useRef<number | null>(null);
  const sceneAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [gradeBand, setGradeBand] = useState<PlacementGradeBand>('g4-6');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const [sceneComplete, setSceneComplete] = useState(false);
  const [activeCoach, setActiveCoach] = useState<VoiceTaskKey | null>(null);
  const [scores, setScores] = useState<Record<VoiceTaskKey, PlacementVoiceResult>>({
    easy: null,
    long: null,
    reading: null,
  });
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (profile?.role === 'academy') router.replace('/');
  }, [loading, profile?.role, router, user]);

  useEffect(() => {
    return () => {
      if (videoRef.current) videoRef.current.pause();
      if (sceneAdvanceTimerRef.current) clearTimeout(sceneAdvanceTimerRef.current);
    };
  }, []);

  const playSegment = useCallback(async (start: number, end: number) => {
    const video = videoRef.current;
    if (!video) return;
    activeEndRef.current = end;
    video.currentTime = start;
    setIsPlaying(true);
    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const activeEnd = activeEndRef.current;
    if (!video || activeEnd === null) return;

    if (step === 'watch') {
      setSceneElapsed(Math.max(0, Math.min(SCENE_DURATION, video.currentTime - SCENE.start)));
    }

    if (video.currentTime < activeEnd) return;
    video.pause();
    activeEndRef.current = null;
    setIsPlaying(false);

    if (step === 'watch') {
      setSceneElapsed(SCENE_DURATION);
      setSceneComplete(true);
      sceneAdvanceTimerRef.current = setTimeout(() => goToVoiceTask('easy'), 900);
    }
  };

  const playScene = () => {
    if (sceneAdvanceTimerRef.current) clearTimeout(sceneAdvanceTimerRef.current);
    setSceneElapsed(0);
    setSceneComplete(false);
    void playSegment(SCENE.start, SCENE.end);
  };

  const goToVoiceTask = (task: VoiceTaskKey) => {
    setStep(task);
    setActiveCoach(null);
  };

  const beginCoach = (task: VoiceTaskKey) => {
    videoRef.current?.pause();
    setIsPlaying(false);
    setActiveCoach(task);
  };

  const continueAfterVoice = (task: VoiceTaskKey, resultValue: PlacementVoiceResult) => {
    setScores((current) => ({ ...current, [task]: resultValue }));
    setActiveCoach(null);
    if (task === 'easy') goToVoiceTask('long');
    if (task === 'long') goToVoiceTask('reading');
    if (task === 'reading') setStep('question');
  };

  const finishPlacement = () => {
    if (!user) return;
    const nextResult = evaluatePlacement({
      gradeBand,
      easyMimic: scores.easy,
      longMimic: scores.long,
      reading: scores.reading,
      comprehensionCorrect: answer === 'scout',
    });
    setResult(nextResult);
    setStep('result');
    window.localStorage.setItem(
      placementStorageKey(user.id),
      JSON.stringify({
        ...nextResult,
        gradeBand,
        completedAt: new Date().toISOString(),
      })
    );
  };

  const reset = () => {
    setStep('intro');
    setScores({ easy: null, long: null, reading: null });
    setAnswer(null);
    setResult(null);
    setActiveCoach(null);
    setSceneElapsed(0);
    setSceneComplete(false);
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = Math.max(0, Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100));
  const activeVoiceStep: VoiceTaskKey | null =
    step === 'easy' || step === 'long' || step === 'reading' ? step : null;
  const currentVoiceTask = activeVoiceStep ? VOICE_TASKS[activeVoiceStep] : null;
  const sceneRemaining = Math.max(0, Math.ceil(SCENE_DURATION - sceneElapsed));
  const sceneProgress = Math.min(100, (sceneElapsed / SCENE_DURATION) * 100);

  if (loading || !user || profile?.role === 'academy') {
    return <main className="placement-stage-v2 min-h-dvh bg-black" />;
  }

  return (
    <main className="placement-stage-v2 min-h-dvh bg-black px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col">
        <header className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
            onClick={() => router.push('/')}
          >
            나가기
          </button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#60D96C] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-zinc-500">약 5분</span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          {step === 'intro' && (
            <div className="mx-auto w-full max-w-2xl text-center">
              <p className="text-sm font-black tracking-[0.18em] text-[#60D96C]">MIMIC LEVEL CHECK</p>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">첫 장면으로<br />내 시작 단계 찾기</h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Sing 2 장면을 보고, 따라 말하고, 소리 내어 읽어요. 학년은 참고만 하고, 직접 듣고 말하는 모습을 바탕으로 시작 단계를 추천해요.
              </p>

              <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-white/10 bg-[#201e1e] p-5 text-left">
                <p className="text-sm font-bold text-zinc-300">현재 학년</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {gradeBands.map((band) => (
                    <button
                      key={band.value}
                      type="button"
                      className={`rounded-xl px-3 py-3 font-bold transition ${
                        gradeBand === band.value ? 'bg-[#60D96C] text-black' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                      onClick={() => setGradeBand(band.value)}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">학년은 참고만 해요. 듣기·말하기·읽기 결과를 함께 보고 추천해요.</p>
              </div>

              <button
                type="button"
                className="mt-7 w-full max-w-lg rounded-2xl bg-[#60D96C] px-6 py-4 text-lg font-black text-black hover:brightness-110"
                onClick={() => setStep('watch')}
              >
                레벨 테스트 시작
              </button>
              <p className="mt-3 text-xs text-zinc-600">마이크는 말하기 단계에서만 사용하고, 녹음은 저장하지 않아요.</p>
            </div>
          )}

          {step === 'watch' && (
            <div className="mx-auto w-full max-w-2xl">
              <p className="text-sm font-black text-[#60D96C]">1 · 장면 이해</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">먼저 장면을 편하게 보세요</h1>
              <p className="mt-3 text-zinc-400">장면이 끝나면 소리와 내용을 묻는 문제가 이어져요.</p>
              <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border-4 border-[#201e1e] bg-[#111]">
                <video
                  ref={videoRef}
                  src={VIDEO_URL}
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onPause={() => setIsPlaying(false)}
                />
                {!isPlaying && !sceneComplete && (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/35 text-center"
                    onClick={playScene}
                  >
                    <span className="rounded-full bg-[#60D96C] px-7 py-4 text-lg font-black text-black">
                      ▶ 장면 보기 · 55초
                    </span>
                  </button>
                )}
                {sceneComplete && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="rounded-full bg-[#60D96C] px-7 py-4 text-lg font-black text-black">✓ 다 봤어요</span>
                  </div>
                )}
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#201e1e] px-5 py-4">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#60D96C] transition-[width] duration-200"
                    style={{ width: `${sceneProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm font-bold">
                  <span className={sceneComplete ? 'text-[#60D96C]' : 'text-white'}>
                    {sceneComplete ? '장면을 다 봤어요. 다음 단계로 넘어가요.' : isPlaying ? '장면을 보고 있어요' : '재생하면 55초 동안 이어져요'}
                  </span>
                  <span className="shrink-0 text-zinc-500">
                    {sceneComplete ? '완료' : `${sceneRemaining}초 남음`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentVoiceTask && (
            <div className="mx-auto w-full max-w-2xl text-center">
              <p className="text-sm font-black text-[#60D96C]">
                {step === 'reading' ? '4 · 소리 내어 읽기' : step === 'easy' ? '2 · 짧게 따라 말하기' : '3 · 긴 문장 따라 말하기'}
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">
                {step === 'reading' ? '문장을 소리 내어 읽어 보세요' : '소리를 듣고 그대로 따라 말해 보세요'}
              </h1>
              {step === 'reading' ? (
                <div className="mt-8 rounded-2xl border border-white/15 bg-[#201e1e] px-5 py-8 text-2xl font-black leading-snug sm:text-4xl">
                  {currentVoiceTask.text}
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-8 rounded-full border border-white/20 bg-white/10 px-7 py-4 text-lg font-black hover:bg-white/15"
                  onClick={() => void playSegment(currentVoiceTask.start, currentVoiceTask.end)}
                >
                  {isPlaying ? '재생 중…' : '▶ 소리 듣기'}
                </button>
              )}
              <p className="mt-5 text-sm text-zinc-500">
                {step === 'reading' ? '준비되면 녹음을 시작해 보세요.' : '필요하면 여러 번 들어도 괜찮아요.'}
              </p>
              <button
                type="button"
                className="mt-5 w-full max-w-lg rounded-2xl bg-[#60D96C] px-6 py-4 text-lg font-black text-black"
                onClick={() => activeVoiceStep && beginCoach(activeVoiceStep)}
              >
                녹음 시작
              </button>
            </div>
          )}

          {step === 'question' && (
            <div className="mx-auto w-full max-w-2xl">
              <p className="text-sm font-black text-[#60D96C]">5 · 장면 이해</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">모두가 Suki를<br />신경 쓴 이유는?</h1>
              <div className="mt-7 space-y-3">
                {[
                  ['scout', '중요한 스카우트가 공연을 평가하고 있어서'],
                  ['friend', 'Moon의 오랜 친구가 놀러 와서'],
                  ['actor', '새 배우로 무대에 올라야 해서'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`w-full rounded-2xl border px-5 py-4 text-left font-bold transition ${
                      answer === value ? 'border-[#60D96C] bg-[#60D96C]/15 text-white' : 'border-white/15 bg-[#201e1e] text-zinc-300 hover:border-white/30'
                    }`}
                    onClick={() => setAnswer(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!answer}
                className="mt-6 w-full rounded-2xl bg-[#60D96C] px-6 py-4 text-lg font-black text-black disabled:opacity-30"
                onClick={finishPlacement}
              >
                추천 단계 보기
              </button>
            </div>
          )}

          {step === 'result' && result && (
            <div className="mx-auto w-full max-w-2xl text-center">
              <p className="text-sm font-black tracking-[0.18em] text-[#60D96C]">YOUR STARTING POINT</p>
              <div className="mx-auto mt-5 inline-flex rounded-3xl border-4 border-[#60D96C] bg-white px-8 py-5 text-4xl font-black text-black sm:text-6xl">
                {result.title}
              </div>
              <p className="mx-auto mt-6 max-w-xl text-lg font-bold leading-relaxed text-white sm:text-xl">{result.summary}</p>
              <div className="mt-7 rounded-2xl border border-white/10 bg-[#201e1e] p-5 text-left">
                <p className="text-sm font-black text-[#60D96C]">이렇게 추천했어요</p>
                <ul className="mt-3 space-y-3 text-sm text-zinc-300 sm:text-base">
                  {result.evidence.map((item) => (
                    <li key={item} className="flex gap-3"><span className="text-[#60D96C]">✓</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>
              {result.level === 'studio-ready' && (
                <p className="mt-4 text-sm text-zinc-500">Studio 단계는 선생님과 이야기를 직접 요약해 본 뒤 최종 확정해요.</p>
              )}
              <button
                type="button"
                className="mt-7 w-full rounded-2xl bg-[#60D96C] px-6 py-4 text-lg font-black text-black"
                onClick={() => router.push('/sing2/watching?id=001:1')}
              >
                첫 장면 학습 시작
              </button>
              <button type="button" className="mt-4 text-sm font-bold text-zinc-500 hover:text-white" onClick={reset}>
                다시 해보기
              </button>
            </div>
          )}
        </section>
      </div>

      <video
        ref={step === 'watch' ? undefined : videoRef}
        src={VIDEO_URL}
        playsInline
        preload="metadata"
        className="hidden"
        onTimeUpdate={handleTimeUpdate}
        onPause={() => setIsPlaying(false)}
      />

      {activeCoach && (
        <div className="fixed inset-0 z-[100]">
          <AiCoachPanel
            lineNumber={VOICE_TASKS[activeCoach].lineNumber}
            targetText={VOICE_TASKS[activeCoach].text}
            targetDuration={VOICE_TASKS[activeCoach].end - VOICE_TASKS[activeCoach].start}
            eyebrow={activeCoach === 'reading' ? 'READING CHECK' : 'MIMIC CHECK'}
            promptText={activeCoach === 'reading' ? '문장을 자연스럽게 소리 내어 읽어 보세요.' : undefined}
            targetPreview={activeCoach === 'reading' ? VOICE_TASKS.reading.text : undefined}
            continueLabel="다음으로"
            fallbackLabel="이번에는 건너뛰기"
            showScore={false}
            onResult={() => undefined}
            onContinue={(coachResult) => continueAfterVoice(activeCoach, voiceResult(coachResult))}
            onFallback={() => continueAfterVoice(activeCoach, null)}
          />
        </div>
      )}
    </main>
  );
}
