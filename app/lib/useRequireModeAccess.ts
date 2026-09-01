'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  canAccessLesson,
  canAccessMode,
  isMasterRole,
  type LearnMode,
  type ProgressRow,
} from './progressGate';
import { getProgress } from './progress';
import { lessonSelectHref } from './lessonMedia';

type RequireModeAccessOptions = {
  redirectOnDenied?: boolean;
  reportAccessError?: boolean;
};

type ModeAccessDeniedReason = 'previous-lesson' | 'previous-mode' | null;

export function useRequireModeAccess(
  lessonNumber: number,
  mode: LearnMode,
  movieId = '001:1',
  {
    redirectOnDenied = true,
    reportAccessError = false,
  }: RequireModeAccessOptions = {}
) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);
  const [deniedReason, setDeniedReason] = useState<ModeAccessDeniedReason>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessAttempt, setAccessAttempt] = useState(0);
  const isMaster = isMasterRole(profile?.role);

  const retryAccess = useCallback(() => {
    setAccessError(null);
    setChecking(true);
    setAccessAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || isMaster) {
      setDenied(false);
      setDeniedReason(null);
      setAccessError(null);
      setChecking(false);
      return;
    }
    if (lessonNumber < 1) {
      setDenied(false);
      setDeniedReason(null);
      setAccessError(null);
      setChecking(false);
      return;
    }

    let cancelled = false;
    const waitForProfile = profile ? 0 : 1500;
    setChecking(true);

    const run = () => {
      if (cancelled) return;
      if (isMasterRole(profile?.role)) {
        setDenied(false);
        setDeniedReason(null);
        setAccessError(null);
        setChecking(false);
        return;
      }
      setDenied(false);
      setDeniedReason(null);
      setAccessError(null);
      getProgress()
        .then((rows) => {
          if (cancelled) return;
          const progressRows = rows as ProgressRow[];
          if (!canAccessMode(progressRows, lessonNumber, mode)) {
            setDenied(true);
            setDeniedReason(
              canAccessLesson(progressRows, lessonNumber)
                ? 'previous-mode'
                : 'previous-lesson'
            );
            if (redirectOnDenied) {
              router.replace(lessonSelectHref(movieId));
              return;
            }
            setChecking(false);
            return;
          }
          setDenied(false);
          setDeniedReason(null);
          setChecking(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (!reportAccessError) {
            router.replace(lessonSelectHref(movieId));
            return;
          }
          setDenied(false);
          setDeniedReason(null);
          setAccessError('학습 진도를 확인하지 못했어요.');
          setChecking(false);
        });
    };

    const timer = window.setTimeout(run, waitForProfile);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, user, isMaster, profile, lessonNumber, mode, movieId, redirectOnDenied, reportAccessError, router, accessAttempt]);

  return {
    isMaster,
    checking: loading || checking,
    denied,
    deniedReason,
    accessError,
    retryAccess,
  };
}
