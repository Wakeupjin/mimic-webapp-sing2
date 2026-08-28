"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { MONTH_FEATURES } from "../lib/monthCatalog";

type FeatureId = (typeof MONTH_FEATURES)[number]["id"];

type HomeHeroProps = {
  selectedId: FeatureId;
  onSelect: (id: FeatureId) => void;
  onStart: () => void;
  startLabel: string;
  onLogin: () => void;
  onMenu: () => void;
  loginLabel: string;
  accountSlot?: ReactNode;
  placementLabel?: string;
};

function pickLabel(item: (typeof MONTH_FEATURES)[number]) {
  return item.kind === "book" ? "원서" : "영화";
}

export default function HomeHero({
  selectedId,
  onSelect,
  onStart,
  startLabel,
  onLogin,
  onMenu,
  loginLabel,
  accountSlot,
  placementLabel,
}: HomeHeroProps) {
  const selected =
    MONTH_FEATURES.find((item) => item.id === selectedId) ?? MONTH_FEATURES[0];

  return (
    <section className="home-stage home-stage-v2">
      <header className="home-header-v2">
        <a href="/" className="home-brand" aria-label="MimiC 홈">
          MimiC
        </a>
        <div className="home-actions-v2">
          {accountSlot ?? (
            <button type="button" onClick={onLogin} className="home-login-v2">
              {loginLabel}
            </button>
          )}
          <button type="button" onClick={onMenu} className="home-menu-v2" aria-label="메뉴 열기">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="home-hero-v2">
        <div className="home-heading-v2">
          <p className="home-kicker-v2">AUGUST · MONTHLY COURSE</p>
          <h1>이번 달, 한 장면을<br />내 영어로 만드세요.</h1>
          <p>보고, 따라 하고, 맞히고, 직접 완성하는 하나의 학습 흐름.</p>
        </div>

        <section className="home-feature-v2" aria-label="이번 달 콘텐츠">
          <div className={`home-art-v2 is-${selected.kind}`}>
            <div className="home-art-backdrop" aria-hidden>
              <Image src={selected.coverSrc} alt="" fill sizes="(max-width: 760px) 94vw, 54vw" />
            </div>
            <Image
              key={selected.coverSrc}
              src={selected.coverSrc}
              alt={selected.coverAlt}
              fill
              className="home-art-image"
              priority
              sizes="(max-width: 760px) 94vw, 54vw"
            />
            <span className="home-art-label">{selected.kind === "book" ? "BOOK" : "MOVIE"}</span>
          </div>

          <div className="home-detail-v2">
            <div className="home-picks-v2" role="tablist" aria-label="이번 달 콘텐츠 선택">
              {MONTH_FEATURES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === selectedId}
                  className={item.id === selectedId ? "is-on" : ""}
                  onClick={() => onSelect(item.id)}
                >
                  <span>{pickLabel(item)}</span>
                  {item.title}
                </button>
              ))}
            </div>

            <div className="home-course-copy-v2">
              <p>{selected.caption}</p>
              <h2>{selected.title}</h2>
              <span>{selected.hint}</span>
            </div>

            <div className="home-route-v2" aria-label="학습 순서">
              {['Watch', 'Mimic', 'Guess', 'Word'].map((step, index) => (
                <span key={step}><b>{index + 1}</b>{step}</span>
              ))}
            </div>

            {placementLabel ? (
              <p className="home-level-v2"><span>내 추천 단계</span>{placementLabel}</p>
            ) : null}

            <button type="button" onClick={onStart} className="home-start-v2">
              <span>{startLabel}</span>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
