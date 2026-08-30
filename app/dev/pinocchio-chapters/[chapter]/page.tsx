import { notFound } from "next/navigation";
import { getChapterPack, TOTAL_CHAPTERS } from "../data";
import { parseChapterNumber } from "../lessonData";
import ChapterSelectClient from "./ChapterSelectClient";

export function generateStaticParams() {
  return Array.from({ length: TOTAL_CHAPTERS }, (_, index) => ({ chapter: String(index + 1) }));
}

export default async function PinocchioChapterSelecting({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const chapterNumber = parseChapterNumber(chapter);
  if (!chapterNumber) notFound();

  const pack = getChapterPack(chapterNumber);
  if (!pack) notFound();

  return (
    <ChapterSelectClient
      chapterNumber={chapterNumber}
      totalChapters={TOTAL_CHAPTERS}
      titleEn={pack.story.titleEn}
      titleKo={pack.story.titleKo}
    />
  );
}
