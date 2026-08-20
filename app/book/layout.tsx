'use client';

import { Suspense } from 'react';
import LearningSessionTracker from '../components/LearningSessionTracker';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <LearningSessionTracker />
      </Suspense>
      {children}
    </>
  );
}
