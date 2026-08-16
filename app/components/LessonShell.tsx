"use client";

import Link from "next/link";
import { ReactNode } from "react";

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 58 58" fill="none" aria-hidden>
      <circle cx="29" cy="29" r="29" fill="#60D96C" />
      <path d="M16 16L42 42" stroke="black" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 16L16 42" stroke="black" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

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
  children,
}: LessonShellProps) {
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
        <div className="flex shrink-0 items-center gap-2">
          {extraActions ? <div className="hidden items-center gap-2 md:flex">{extraActions}</div> : null}
          <Link href={onCloseHref} onClick={onClose} className="flex h-7 w-7 items-center justify-center" aria-label="닫기">
            <CloseIcon />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children ? (
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          ) : (
            <>
              <section className="flex min-h-0 flex-1 items-center justify-center">
                <div
                  className={`relative h-full w-full overflow-hidden rounded-xl border-4 md:mx-auto md:aspect-video md:h-auto md:w-[min(70%,56rem)] md:rounded-2xl md:border-[10px] ${
                    videoHighlight ? "border-[#60D96C]" : "border-[#201E1E]"
                  }`}
                >
                  <div className="absolute inset-0 bg-black">{video}</div>
                </div>
              </section>
              {controls ? <div className="shrink-0 pt-2 md:pt-3">{controls}</div> : null}
            </>
          )}
        </div>
        {aside ? <div className="hidden min-h-0 w-[150px] shrink-0 overflow-hidden lg:block">{aside}</div> : null}
      </div>
    </main>
  );
}
