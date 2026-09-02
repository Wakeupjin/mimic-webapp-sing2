import { notFound, redirect } from "next/navigation";
import { chapterRoot, parseChapterNumber } from "../../../../dev/pinocchio-chapters/lessonData";

export default async function RemovedPinocchioGuessRedirect({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const chapterNumber = parseChapterNumber(chapter);
  if (!chapterNumber) notFound();
  redirect(chapterRoot(chapterNumber));
}
