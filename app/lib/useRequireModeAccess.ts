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

export function useRequireModeAccess(lessonNumber: number, mode: LearnMode, movieId = '001:1') {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const isMaster = isMasterRole(profile?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || isMaster) {
      setChecking(false);
      return;
    }
    if (lessonNumber < 1) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    const waitForProfile = profile ? 0 : 1500;

    const run = () => {
      if (cancelled) return;
      if (isMasterRole(profile?.role)) {
        setChecking(false);
        return;
      }
      setChecking(true);
      fetchOwnProgress()
        .then((rows) => {
          if (cancelled) return;
          if (!canAccessMode(rows, lessonNumber, mode)) {
            router.replace(lessonSelectHref(movieId));
            return;
          }
          setChecking(false);
        })
        .catch(() => {
          if (!cancelled) setChecking(false);
        });
    };

    const timer = window.setTimeout(run, waitForProfile);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, user, isMaster, profile, lessonNumber, mode, movieId, router]);

  return { isMaster, checking: loading || checking };
}
