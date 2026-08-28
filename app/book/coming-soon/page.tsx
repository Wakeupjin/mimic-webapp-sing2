"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BOOK_MONTH, BOOK_SCENES } from "../../lib/monthCatalog";
import { HeaderCloseLink } from "../../components/HeaderIcons";

const MODE_LABEL: Record<string, string> = {
  listen: "Listen",
  mimicking: "Mimic",
  guessing: "Guess",
  word: "Word",
};

function BookComingSoonContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "listen";
  const scene = Math.max(1, Math.min(BOOK_SCENES.length, Number(searchParams.get("scene") || 1)));

  return (
    <main className="flex min-h-dvh flex-col px-4 py-4" style={{ backgroundColor: "#000000" }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          {BOOK_MONTH.title}
        </h1>
        <HeaderCloseLink href="/book/selecting?id=003:1" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-gray-400" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          Scene {scene}
        </p>
        <p className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          {MODE_LABEL[mode] || "Listen"}
        </p>
        <p className="max-w-md text-base text-gray-400 sm:text-lg" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          이 장면의 문장과 오디오를 준비하고 있어요. 준비가 끝나면 바로 학습할 수 있어요.
        </p>
        <a href="/book/selecting?id=003:1" className="cta-btn cta-primary mt-4 inline-block">
          장면으로 돌아가기
        </a>
      </div>
    </main>
  );
}

export default function BookComingSoonPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookComingSoonContent />
    </Suspense>
  );
}
