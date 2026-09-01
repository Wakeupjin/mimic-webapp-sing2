'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  canAccessMode,
  fetchOwnProgress,
  isMasterRole,
  type LearnMode,
} from './progressGate';
import { lessonSelectHref } from './lessonMedia';

type RequireModeAccessOptions = {
  redirectOnDenied?: boolean;
};

export function useRequireModeAccess(
  lessonNumber: number,
  mode: LearnMode,
  movieId = '001:1',
  { redirectOnDenied = true }: RequireModeAccessOptions = {}
) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  // 로그인 사용자는 진도 확인이 끝날 때까지 보호 화면을 유지한다.
  // profile이 늦게 도착하는 1.5초 대기 구간에도 잠긴 학습 화면이 번쩍이면 안 된다.
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const isMaster = isMasterRole(profile?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || isMaster) {
      setAccessDenied(false);
      setChecking(false);
      return;
    }
    if (lessonNumber < 1) {
      setAccessDenied(false);
      setChecking(false);
      return;
    }

    let cancelled = false;
    const waitForProfile = profile ? 0 : 1500;
    setChecking(true);
    setAccessDenied(false);

    const run = () => {
      if (cancelled) return;
      if (isMasterRole(profile?.role)) {
        setAccessDenied(false);
        setChecking(false);
        return;
      }
      fetchOwnProgress()
        .then((rows) => {
          if (cancelled) return;
          if (!canAccessMode(rows, lessonNumber, mode)) {
            if (redirectOnDenied) {
              router.replace(lessonSelectHref(movieId));
              return;
            }
            setAccessDenied(true);
            setChecking(false);
            return;
          }
          setChecking(false);
        })
        .catch(() => {
          if (!cancelled) {
            setAccessDenied(false);
            setChecking(false);
          }
        });
    };

    const timer = window.setTimeout(run, waitForProfile);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, user, isMaster, profile, lessonNumber, mode, movieId, redirectOnDenied, router]);

  return { isMaster, checking: loading || checking, accessDenied };
}
