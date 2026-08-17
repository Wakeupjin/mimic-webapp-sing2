"use client";

import Link from "next/link";
import { ReactNode } from "react";

function glyph(active: boolean) {
  return active ? "#111111" : "#F3F4F6";
}

function Chip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill={active ? "#60D96C" : "#3F3F46"} />
      {children}
    </svg>
  );
}

export function CaptionsIcon({ active = false }: { active?: boolean }) {
  const c = glyph(active);
  return (
    <Chip active={active}>
      <rect x="7.5" y="10" width="17" height="12" rx="2.5" stroke={c} strokeWidth="1.7" />
      <path d="M11 16.2h3.2M17.8 16.2H21" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </Chip>
  );
}

export function FullscreenIcon({ active = false }: { active?: boolean }) {
  const c = glyph(active);
  return (
    <Chip active={active}>
      {active ? (
        <path
          d="M13.2 9.5v3.3H9.9M18.8 9.5v3.3h3.3M13.2 22.5v-3.3H9.9M18.8 22.5v-3.3h3.3"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M10 13.2V9.9h3.3M22 13.2V9.9h-3.3M10 18.8v3.3h3.3M22 18.8v3.3h-3.3"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Chip>
  );
}

export function ListIcon({ active = false }: { active?: boolean }) {
  const c = glyph(active);
  return (
    <Chip active={active}>
      <path
        d="M10 11.5h12M10 16h12M10 20.5h12"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Chip>
  );
}

export function CloseIcon() {
  return (
    <Chip active>
      <path
        d="M11 11l10 10M21 11L11 21"
        stroke="#111111"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </Chip>
  );
}

const buttonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-150 hover:scale-105 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60D96C]";

export function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={buttonClass} aria-label={label} title={label}>
      {children}
    </button>
  );
}

export function HeaderCloseLink({
  href = "/",
  onClick,
}: {
  href?: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={buttonClass} aria-label="닫기" title="닫기">
      <CloseIcon />
    </Link>
  );
}
