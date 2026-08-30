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
  hideHeader?: boolean;
  compactStage?: boolean;
  footer?: ReactNode;
  video?: ReactNode;
  controls?: ReactNode;
  aside?: ReactNode;
  onAsideDismiss?: () => void;
  children?: ReactNode;
  stageClassName?: string;
};

export default function LessonShell({
  title = "SING 2",
  subtitle,
  extraActions,
  onCloseHref = "/",
  onClose,
  videoHighlight = false,
  hideHeader = false,
  compactStage = false,
  footer,
  video,
  controls,
  aside,
  onAsideDismiss,
  children,
  stageClassName = "",
}: LessonShellProps) {
  const frameClass = `relative overflow-hidden ${
    hideHeader
      ? `watch-frame ${videoHighlight ? "is-live" : ""}`
      : `rounded-lg border-2 sm:rounded-xl sm:border-4 md:rounded-2xl md:border-8 ${
          videoHighlight ? "border-[#60D96C]" : "border-[#201E1E]"
        }`
  }`;

  return (
    <main
      className={`flex flex-col overflow-hidden bg-[#0a0a0a] text-white ${
        hideHeader ? (compactStage ? "watch-stage is-compact" : "watch-stage") : "lesson-stage"
      } ${stageClassName}`}
    >
      <header className={`flex shrink-0 items-center justify-between gap-2 py-1 ${hideHeader ? "hidden" : ""}`}>
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

      <div className="lesson-main flex min-h-0 flex-1 gap-2 md:gap-3">
        <div className="lesson-primary flex min-h-0 min-w-0 flex-1 flex-col">
          {children ? (
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          ) : (
            <>
              <section className="lesson-media flex min-h-0 min-w-0 flex-1">
                <div className={`${frameClass} relative h-full min-h-0 w-full`}>
                  <div className="absolute inset-0 bg-black">{video}</div>
                </div>
              </section>
              {controls ? <div className="watch-controls">{controls}</div> : null}
              {footer ? <div className="shrink-0 pb-1 pt-2">{footer}</div> : null}
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
