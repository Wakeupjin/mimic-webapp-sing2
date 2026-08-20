"use client";

import Image from "next/image";
import PlaybackControls from "./PlaybackControls";
import { MONTH_LABEL_EN } from "../lib/monthCatalog";

type HomeHeroProps = {
  coverSrc: string;
  coverAlt: string;
  hint: string;
  activeSlot: number;
  onOpen: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSlot: (muted: boolean, slotIndex: number) => void;
  onLogin: () => void;
  onMenu: () => void;
  loginLabel: string;
};

export default function HomeHero({
  coverSrc,
  coverAlt,
  hint,
  activeSlot,
  onOpen,
  onPrev,
  onNext,
  onSlot,
  onLogin,
  onMenu,
  loginLabel,
}: HomeHeroProps) {
  return (
    <section className="home-stage">
      <header className="relative z-20 flex items-start justify-between px-[clamp(1rem,2.1vw,2.5rem)] pt-[clamp(0.6rem,1.4vw,1rem)]">
        <p className="home-logo">MimiC</p>
        <div className="flex items-center gap-[clamp(0.6rem,1.6vw,2.4rem)]">
          <button type="button" onClick={onLogin} className="home-login">
            {loginLabel}
          </button>
          <button type="button" onClick={onMenu} className="home-menu" aria-label="메뉴 열기">
            <img src="/home/menu.svg" alt="" className="h-full w-full" />
          </button>
        </div>
      </header>

      <h1 className="home-month pointer-events-none absolute left-1/2 top-[clamp(0.2rem,0.4vw,0.4rem)] z-10 -translate-x-1/2 text-center">
        {MONTH_LABEL_EN}
      </h1>

      <div className="home-cover">
        <button
          type="button"
          onClick={onOpen}
          className="home-poster group relative"
          aria-label={`${coverAlt} 시작하기`}
        >
          <Image
            key={coverSrc}
            src={coverSrc}
            alt={coverAlt}
            fill
            className="object-cover transition-opacity duration-300 group-hover:opacity-85"
            priority
            sizes="(max-width: 768px) 90vw, 1000px"
          />
          <span
            className="absolute inset-0 flex items-center justify-center bg-black/35 px-4 text-center text-lg font-bold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:text-2xl"
            style={{ fontFamily: "Encode Sans, sans-serif" }}
          >
            {hint}
          </span>
        </button>

        <div className="home-mimic-bar relative z-20 -mt-[clamp(0.4rem,1vw,0.8rem)]">
          <PlaybackControls
            onPrev={onPrev}
            onNext={onNext}
            onPlay={onSlot}
            activeIndex={activeSlot}
            prevLabel="이전 콘텐츠"
            nextLabel="다음 콘텐츠"
          />
        </div>
      </div>

      <img
        src="/home/spotlight.png"
        alt=""
        className="home-spotlight left-[-4%] bottom-[-8%] origin-left -rotate-[28deg]"
        aria-hidden
      />
      <img
        src="/home/spotlight.png"
        alt=""
        className="home-spotlight right-[-4%] bottom-[-8%] origin-right scale-x-[-1] rotate-[28deg]"
        aria-hidden
      />
      <img
        src="/home/chameleon.png"
        alt=""
        className="home-chameleon bottom-[clamp(1.5rem,6vh,4.2rem)] left-[clamp(1.2rem,10vw,12rem)] -scale-x-100"
        aria-hidden
      />
      <img
        src="/home/chameleon.png"
        alt=""
        className="home-chameleon bottom-[clamp(1.5rem,6vh,4.2rem)] right-[clamp(1.2rem,10vw,12rem)]"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => {
          document.getElementById("home-start")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="home-scroll absolute bottom-[clamp(0.8rem,2.5vh,1.6rem)] left-1/2 z-20 -translate-x-1/2 transition hover:scale-105"
        aria-label="아래로 스크롤"
      >
        <img src="/home/scroll-down.svg" alt="" className="h-full w-full" />
      </button>
    </section>
  );
}
