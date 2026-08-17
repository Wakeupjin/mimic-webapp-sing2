import { useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { TrackedMode } from './sessions';

export type EvaluationPayload = Record<string, unknown>;

export async function fetchEvaluation(
  lessonNumber: number,
  mode: TrackedMode
): Promise<EvaluationPayload> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('learning_evaluations')
    .select('payload')
    .eq('student_id', user.id)
    .eq('lesson_number', lessonNumber)
    .eq('mode', mode)
    .maybeSingle();

  if (error) {
    console.warn('[evaluation] load skipped:', error.message);
    return {};
  }
  return (data?.payload as EvaluationPayload) || {};
}

export async function saveEvaluation(
  lessonNumber: number,
  mode: TrackedMode,
  payload: EvaluationPayload
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('learning_evaluations').upsert(
    {
      student_id: user.id,
      lesson_number: lessonNumber,
      mode,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_number,mode' }
  );

  if (error) {
    console.warn('[evaluation] save skipped:', error.message);
  }
}

export function useEvaluationLog(
  lessonNumber: number,
  mode: TrackedMode,
  active: boolean
) {
  const payloadRef = useRef<EvaluationPayload>({});
  const loadedRef = useRef(false);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!lessonNumber || !loadedRef.current || flushingRef.current) return;
    flushingRef.current = true;
    try {
      await saveEvaluation(lessonNumber, mode, payloadRef.current);
    } finally {
      flushingRef.current = false;
    }
  }, [lessonNumber, mode]);

  const patch = useCallback(
    (partial: EvaluationPayload) => {
      payloadRef.current = { ...payloadRef.current, ...partial };
    },
    []
  );

  const addAttempt = useCallback((attempt: Record<string, unknown>) => {
    const prev = Array.isArray(payloadRef.current.attempts)
      ? (payloadRef.current.attempts as Record<string, unknown>[])
      : [];
    payloadRef.current = {
      ...payloadRef.current,
      attempts: [...prev, attempt],
    };
  }, []);

  const bumpPlay = useCallback((key: string) => {
    const counts = {
      ...((payloadRef.current.playCounts as Record<string, number>) || {}),
    };
    counts[key] = (counts[key] || 0) + 1;
    payloadRef.current = { ...payloadRef.current, playCounts: counts };
  }, []);

  useEffect(() => {
    loadedRef.current = false;
    payloadRef.current = {};
    if (!lessonNumber) return;

    let cancelled = false;
    fetchEvaluation(lessonNumber, mode).then((existing) => {
      if (cancelled) return;
      payloadRef.current = existing;
      loadedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [lessonNumber, mode]);

  useEffect(() => {
    if (!active || !lessonNumber) return;

    const tick = window.setInterval(() => {
      const invested = Number(payloadRef.current.investedSeconds || 0) + 1;
      payloadRef.current = { ...payloadRef.current, investedSeconds: invested };
    }, 1000);

    const persist = window.setInterval(() => {
      void flush();
    }, 8000);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(persist);
      void flush();
    };
  }, [active, lessonNumber, flush]);

  return useMemo(
    () => ({ patch, addAttempt, bumpPlay, flush, payloadRef }),
    [patch, addAttempt, bumpPlay, flush]
  );
}
