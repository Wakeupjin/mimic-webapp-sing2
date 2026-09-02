import { redirect } from "next/navigation";
import { legacyBookChapter, modeHref } from "../../dev/pinocchio-chapters/lessonData";

export default async function LegacyBookMimicRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  redirect(modeHref(legacyBookChapter(id), "mimicking"));
}
