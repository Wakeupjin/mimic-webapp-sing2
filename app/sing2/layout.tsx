'use client';

import { Suspense } from 'react';
import LearningSessionTracker from '../components/LearningSessionTracker';

export default function Sing2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <LearningSessionTracker />
      </Suspense>
      {children}
    </>
  );
}
