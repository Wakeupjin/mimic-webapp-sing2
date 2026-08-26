"use client";

import { usePathname } from "next/navigation";

const PLAY_ROUTES = new Set([
  "/sing2/watching",
  "/sing2/mimicking",
  "/sing2/guessing",
  "/sing2/word",
]);

export default function RotateGate() {
  const pathname = usePathname();

  if (!PLAY_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <div className="rotate-gate" role="alertdialog" aria-live="polite" aria-label="휴대폰을 가로로 돌려 주세요">
      <div className="rotate-gate-phone" aria-hidden="true" />
      <p className="rotate-gate-title">휴대폰을 가로로 돌려 주세요</p>
      <p className="rotate-gate-sub">가로로 돌리면 학습 화면이 바로 나타나요</p>
    </div>
  );
}
