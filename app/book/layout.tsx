'use client';

import { Suspense } from 'react';
import LearningSessionTracker from '../components/LearningSessionTracker';
import AuthGate from '../components/AuthGate';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <LearningSessionTracker />
      </Suspense>
      <AuthGate>{children}</AuthGate>
    </>
  );
}
