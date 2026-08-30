import { notFound } from "next/navigation";
import LegacyPinocchioChapterSelecting from "../../../dev/pinocchio-chapters/[chapter]/page";
import ChapterSelectClient from "../../../dev/pinocchio-chapters/[chapter]/ChapterSelectClient";
import { parseChapterNumber } from "../../../dev/pinocchio-chapters/lessonData";
import {
  foundationMediaAvailability,
  loadPinocchioV3FoundationChapter,
  PINOCCHIO_TOTAL_CHAPTERS,
  PINOCCHIO_V3_LESSON_NUMBER_BASE,
  PINOCCHIO_V3_LEVEL_LABEL,
  PINOCCHIO_V3_PROGRESS_SCOPE,
  productionPinocchioRelease,
} from "../../../lib/pinocchioStoryPack.server";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: PINOCCHIO_TOTAL_CHAPTERS }, (_, index) => ({ chapter: String(index + 1) }));
}

export default async function PinocchioChapterSelecting({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  if (productionPinocchioRelease() === "v2") {
    return <LegacyPinocchioChapterSelecting params={params} />;
  }

  const { chapter } = await params;
  const chapterNumber = parseChapterNumber(chapter);
  if (!chapterNumber) notFound();

  const [release, chapterAvailability] = await Promise.all([
    loadPinocchioV3FoundationChapter(chapterNumber),
    foundationMediaAvailability(),
  ]);

  return (
    <ChapterSelectClient
      chapterNumber={chapterNumber}
      totalChapters={PINOCCHIO_TOTAL_CHAPTERS}
      titleEn={release.pack.story.titleEn}
      titleKo={release.pack.story.titleKo}
      levelLabel={PINOCCHIO_V3_LEVEL_LABEL}
      mediaReady={release.mediaReady}
      mediaMessage={release.mediaMessage}
      chapterAvailability={chapterAvailability}
      progressScope={PINOCCHIO_V3_PROGRESS_SCOPE}
      lessonNumberBase={PINOCCHIO_V3_LESSON_NUMBER_BASE}
    />
  );
}
