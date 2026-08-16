'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  endLearningSession,
  heartbeatLearningSession,
  parseLessonNumber,
  parseTrackedMode,
  startLearningSession,
} from '../lib/sessions';

/**
 * 학습 화면 UI는 그대로 두고, 뒤에서만 체류 시간을 기록합니다.
 */
export default function LearningSessionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id');
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    const mode = parseTrackedMode(pathname || '');
    const lessonNumber = parseLessonNumber(movieId);
    let cancelled = false;

    const close = async () => {
      const id = sessionIdRef.current;
      const started = startedAtRef.current;
      sessionIdRef.current = null;
      startedAtRef.current = null;
      if (id && started) {
        await endLearningSession(id, started);
      }
    };

    if (!mode) {
      void close();
      return;
    }

    const boot = async () => {
      await close();
      if (cancelled) return;
      const startedAt = new Date().toISOString();
      const id = await startLearningSession(lessonNumber, mode);
      if (cancelled) {
        if (id) await endLearningSession(id, startedAt);
        return;
      }
      sessionIdRef.current = id;
      startedAtRef.current = startedAt;
    };

    void boot();

    const tick = () => {
      const id = sessionIdRef.current;
      const started = startedAtRef.current;
      if (id && started) {
        void heartbeatLearningSession(id, started);
      }
    };

    const interval = window.setInterval(tick, 15000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') tick();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', tick);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', tick);
      void close();
    };
  }, [pathname, movieId]);

  return null;
}
