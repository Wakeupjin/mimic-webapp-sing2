import { redirect } from "next/navigation";
import { chapterRoot, legacyBookChapter } from "../../dev/pinocchio-chapters/lessonData";

export default async function BookSelectingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  redirect(chapterRoot(legacyBookChapter(id)));
}
