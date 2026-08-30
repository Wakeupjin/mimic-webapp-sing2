import BrandHome from "./dev/brand-preview/page";
import { pinocchioV3ReleaseBadge } from "./lib/pinocchioStoryPack.server";

export default async function Home() {
  const bookReleaseBadge = await pinocchioV3ReleaseBadge();
  return <BrandHome bookReleaseBadge={bookReleaseBadge} />;
}
