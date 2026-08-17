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

export function useRequireModeAccess(lessonNumber: number, mode: LearnMode) {
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
            router.replace('/sing2/selecting');
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
  }, [loading, user, isMaster, profile, lessonNumber, mode, router]);

  return { isMaster, checking: loading || checking };
}
