import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AudioReviewClient from "./AudioReviewClient";

export const metadata: Metadata = {
  title: "Pinocchio Audio Review · MimiC",
  description: "Pinocchio 12장 음원 경계 사람 귀 검수실",
  robots: { index: false, follow: false },
};

export default function PinocchioAudioReviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <AudioReviewClient />;
}
