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
    <main className="status-stage-v2">
      <div className="status-head-v2">
        <a href="/" className="select-brand-v2">MimiC</a>
        <HeaderCloseLink href="/book/selecting?id=003:1" />
      </div>

      <section className="status-card-v2">
        <p>{BOOK_MONTH.title} · SCENE {scene}</p>
        <span className="status-number-v2">{String(scene).padStart(2, "0")}</span>
        <h1>{MODE_LABEL[mode] || "Listen"}</h1>
        <strong>이 장면은 준비 중이에요.</strong>
        <small>문장과 오디오가 검수되면 자동으로 학습 단계가 열립니다.</small>
        <a href="/book/selecting?id=003:1">다른 장면 선택하기 <span>→</span></a>
      </section>
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
