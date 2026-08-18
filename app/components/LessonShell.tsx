"use client";

import { ReactNode } from "react";
import { HeaderCloseLink } from "./HeaderIcons";

type LessonShellProps = {
  title?: string;
  subtitle?: string;
  extraActions?: ReactNode;
  onCloseHref?: string;
  onClose?: () => void;
  videoHighlight?: boolean;
  video?: ReactNode;
  controls?: ReactNode;
  aside?: ReactNode;
  onAsideDismiss?: () => void;
  children?: ReactNode;
};

export default function LessonShell({
  title = "SING 2",
  subtitle,
  extraActions,
  onCloseHref = "/",
  onClose,
  videoHighlight = false,
  video,
  controls,
  aside,
  onAsideDismiss,
  children,
}: LessonShellProps) {
  const frameClass = `relative overflow-hidden rounded-lg border-2 sm:rounded-xl sm:border-4 md:rounded-2xl md:border-8 ${
    videoHighlight ? "border-[#60D96C]" : "border-[#201E1E]"
  }`;

  return (
    <main
      className="flex flex-col overflow-hidden bg-[#0a0a0a] text-white"
      style={{
        height: "100dvh",
        paddingTop: "max(0.4rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.6rem, env(safe-area-inset-left))",
        paddingRight: "max(0.6rem, env(safe-area-inset-right))",
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1
            className="text-base font-semibold text-[#60D96C] md:text-xl"
            style={{ fontFamily: "Encode Sans, sans-serif" }}
          >
            {title}
          </h1>
          {subtitle ? (
            <span
              className="truncate text-xs text-gray-400 md:text-sm"
              style={{ fontFamily: "Encode Sans, sans-serif" }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {extraActions ? <div className="flex items-center gap-1.5">{extraActions}</div> : null}
          <HeaderCloseLink href={onCloseHref} onClick={onClose} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-2 md:gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children ? (
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          ) : (
            <>
              <section className="flex min-h-0 min-w-0 flex-1">
                <div className={`${frameClass} relative h-full min-h-0 w-full`}>
                  <div className="absolute inset-0 bg-black">{video}</div>
                </div>
              </section>
              {controls ? <div className="shrink-0 pt-1.5 md:pt-3">{controls}</div> : null}
            </>
          )}
        </div>
        {aside ? (
          <>
            <div className="hidden min-h-0 w-[min(22vw,11.5rem)] shrink-0 overflow-hidden lg:block">{aside}</div>
            <button
                type="button"
                aria-label="목록 닫기"
                className="fixed inset-0 z-40 bg-black/55 lg:hidden"
                onClick={onAsideDismiss}
              />
              <div className="fixed inset-y-0 right-0 z-50 w-[min(82vw,18rem)] overflow-hidden bg-[#0a0a0a] p-3 shadow-2xl lg:hidden">
                {aside}
              </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
