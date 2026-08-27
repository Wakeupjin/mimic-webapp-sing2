"use client";

import Image from "next/image";
import { MONTH_FEATURES, MONTH_LABEL_EN } from "../lib/monthCatalog";

type FeatureId = (typeof MONTH_FEATURES)[number]["id"];

type HomeHeroProps = {
  coverSrc: string;
  coverAlt: string;
  hint: string;
  selectedId: FeatureId;
  onSelect: (id: FeatureId) => void;
  onStart: () => void;
  startLabel: string;
  onLogin: () => void;
  onMenu: () => void;
  loginLabel: string;
  onAdmin?: () => void;
};

function pickLabel(item: (typeof MONTH_FEATURES)[number]) {
  return item.kind === "book" ? `원서 ${item.title}` : `영화 ${item.title}`;
}

export default function HomeHero({
  coverSrc,
  coverAlt,
  hint,
  selectedId,
  onSelect,
  onStart,
  startLabel,
  onLogin,
  onMenu,
  loginLabel,
  onAdmin,
}: HomeHeroProps) {
  return (
    <section className="home-stage">
      <header className="home-header relative z-20 flex items-start justify-between px-[clamp(1rem,2.1vw,2.5rem)] pt-[clamp(0.6rem,1.4vw,1rem)]">
        <p className="home-logo">MimiC</p>
        <div className="home-actions flex items-center gap-[clamp(0.6rem,1.6vw,2.4rem)]">
          {onAdmin ? (
            <button type="button" onClick={onAdmin} className="cinema-pill">
              학생 현황
            </button>
          ) : null}
          <button type="button" onClick={onLogin} className="home-login">
            {loginLabel}
          </button>
          <button type="button" onClick={onMenu} className="home-menu" aria-label="메뉴 열기">
            <img src="/home/menu.svg" alt="" className="h-full w-full" />
          </button>
        </div>
      </header>

      <h1 className="home-month pointer-events-none z-10 text-center">
        {MONTH_LABEL_EN}
      </h1>

      <div className="home-cover">
        <div className="home-poster relative" aria-label={coverAlt} role="img">
          <Image
            key={coverSrc}
            src={coverSrc}
            alt={coverAlt}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 90vw, 1000px"
          />
        </div>

        <div className="home-picks" role="tablist" aria-label="이번 달 콘텐츠">
          {MONTH_FEATURES.map((item) => {
            const on = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`cinema-pill ${on ? "is-on" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                {pickLabel(item)}
              </button>
            );
          })}
        </div>

        <p className="max-w-md text-center text-sm text-zinc-400 sm:text-base">{hint}</p>

        <button type="button" onClick={onStart} className="home-start-button">
          {startLabel}
        </button>
      </div>
    </section>
  );
}
