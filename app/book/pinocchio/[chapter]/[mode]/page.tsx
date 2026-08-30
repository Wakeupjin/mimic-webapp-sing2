import Link from "next/link";
import { notFound } from "next/navigation";
import PinocchioLessonModeClient from "@/app/components/pinocchio/PinocchioLessonModeClient";
import { MODE_ORDER, parseChapterNumber } from "../../../../dev/pinocchio-chapters/lessonData";
import type { LessonMode } from "../../../../dev/pinocchio-chapters/types";
import {
  loadPinocchioV3FoundationChapter,
  PINOCCHIO_TOTAL_CHAPTERS,
  PINOCCHIO_V3_LESSON_NUMBER_BASE,
  PINOCCHIO_V3_PROGRESS_SCOPE,
  productionPinocchioRelease,
} from "../../../../lib/pinocchioStoryPack.server";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: PINOCCHIO_TOTAL_CHAPTERS }, (_, chapterIndex) =>
    MODE_ORDER.map((mode) => ({ chapter: String(chapterIndex + 1), mode })),
  ).flat();
}

export default async function PinocchioProductionLesson({
  params,
}: {
  params: Promise<{ chapter: string; mode: string }>;
}) {
  if (productionPinocchioRelease() === "v2") {
    return <PinocchioLessonModeClient />;
  }

  const { chapter, mode: rawMode } = await params;
  const chapterNumber = parseChapterNumber(chapter);
  const mode = rawMode as LessonMode;
  if (!chapterNumber || !MODE_ORDER.includes(mode)) notFound();

  const release = await loadPinocchioV3FoundationChapter(chapterNumber);
  if (!release.mediaReady || !release.timeline) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-[#60D96C]/50 bg-[#171717] p-7 text-center shadow-2xl">
          <p className="text-xs font-black tracking-[0.2em] text-[#60D96C]">FOUNDATION · 초급</p>
          {release.releaseBadge ? <p className="mt-2 text-xs font-black tracking-[0.16em] text-amber-300">{release.releaseBadge}</p> : null}
          <h1 className="mt-3 text-3xl font-black">CHAPTER {chapterNumber} 준비 중</h1>
          <p className="mx-auto mt-4 max-w-md text-sm font-bold leading-6 text-white/70">
            {release.mediaMessage} 검증된 v3 음원이 준비되기 전에는 이전 v2 음원으로 대신 재생하지 않습니다.
          </p>
          <Link
            href={`/book/pinocchio/${chapterNumber}`}
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#60D96C] px-7 font-black text-black"
          >
            Chapter 선택으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <PinocchioLessonModeClient
      initialChapterNumber={chapterNumber}
      initialMode={mode}
      initialPack={release.pack}
      initialTimeline={release.timeline}
      initialMedia={release.media}
      progressScope={PINOCCHIO_V3_PROGRESS_SCOPE}
      lessonNumberBase={PINOCCHIO_V3_LESSON_NUMBER_BASE}
      releaseBadge={release.releaseBadge}
    />
  );
}
