"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountMenu from "../../components/AccountMenu";
import { useAuth } from "../../contexts/AuthContext";
import { placementStorageKey } from "../../lib/placement";
import styles from "./brand-preview.module.css";

type Language = "ko" | "en";

const copy = {
  ko: {
    nav: ["이번 달", "학습 방식", "콘텐츠", "부모·선생님"],
    login: "로그인",
    heroTop: "영어를 외우지 말고",
    heroAccent: "장면 속으로.",
    heroBody: ["화면 속 목소리를 따라 하고, 책 속 이야기를 다시 말하며", "내 영어를 만들어갑니다."],
    heroCta: "이번 달 장면 보기",
    monthly: "이번 달엔",
    monthlyAccent: "두 작품을 깊게.",
    monthlyBody: "많이 보여주지 않습니다. 영화 한 편과 원서 한 권을 보고, 듣고, 따라 말해 내 것으로 만듭니다.",
    movieLabel: "이번 달 영화",
    movieBody: "12개의 장면에서 등장인물의 목소리와 리듬을 익혀요.",
    movieCta: "영화 코스 열기",
    bookLabel: "이번 달 원서",
    bookBody: "먼저 듣고, 한 문장씩 따라 말하며 이야기의 목소리를 찾아요.",
    bookCta: "원서 코스 열기",
    methodTop: "문제 풀이 대신",
    methodAccent: "장면 리허설.",
    steps: [
      ["WATCH", "장면 전체를 본다"],
      ["MIMIC", "소리와 리듬을 따라 한다"],
      ["GUESS", "들린 표현을 골라낸다"],
      ["WORD", "단어를 문장으로 완성한다"],
    ],
    libraryTitle: "영어가 내 말이 되는 순간.",
    libraryBody: "학습 기록과 장면 이야기, 아이가 실제로 달라지는 과정을 Mimic의 편집 노트에 담습니다.",
    notes: [
      ["MIMIC NOTE 01", "공부한 문장보다, 살아본 장면이 오래 남는다.", "들어보기 →"],
      ["OUR RULE", "한 달에 영화 한 편, 원서 한 권. 적게 보고 깊게 익힌다.", "원칙 보기 →"],
      ["FOR PARENTS", "몇 점인지보다, 다시 말할 수 있는지를 본다.", "기록 보기 →"],
    ],
    trustTop: "재미와 배움,",
    trustMiddle: "하나도 놓치지",
    trustAccent: "않도록.",
    trustBody: "아이에게는 이야기와 목소리를, 부모와 선생님에게는 과정과 변화를 보여줍니다.",
    trustItems: ["직접 말한 문장과 반복 기록", "영화에서 원서로 이어지는 월간 과정", "학년이 아닌 수행 기반 시작 단계"],
    placement: "5분 레벨 찾기",
    footer: ["남의 목소리로 시작해", "내 목소리로 끝내는 영어."],
  },
  en: {
    nav: ["This month", "How it works", "Stories", "For grown-ups"],
    login: "Log in",
    heroTop: "DON’T MEMORIZE ENGLISH.",
    heroAccent: "STEP INTO THE SCENE.",
    heroBody: ["Follow the voices on screen, retell the stories on the page,", "and make English sound like you."],
    heroCta: "See this month’s scene",
    monthly: "THIS MONTH,",
    monthlyAccent: "TWO STORIES. DEEPLY.",
    monthlyBody: "No endless catalog. One film and one book—watched, heard, repeated, and made your own.",
    movieLabel: "This month’s movie",
    movieBody: "Borrow the voices and rhythms of the characters across twelve scenes.",
    movieCta: "Open movie course",
    bookLabel: "This month’s book",
    bookBody: "Listen first, then find the story’s voice one sentence at a time.",
    bookCta: "Open book course",
    methodTop: "LESS TEST PREP.",
    methodAccent: "MORE REHEARSAL.",
    steps: [
      ["WATCH", "See the whole scene"],
      ["MIMIC", "Follow sound and rhythm"],
      ["GUESS", "Catch what you heard"],
      ["WORD", "Build the line yourself"],
    ],
    libraryTitle: "WHEN ENGLISH SOUNDS LIKE YOU.",
    libraryBody: "Field notes on practice, stories, and the small changes that prove real learning is happening.",
    notes: [
      ["MIMIC NOTE 01", "A scene you lived stays longer than a line you studied.", "Listen →"],
      ["OUR RULE", "One film. One book. Less content, learned more deeply.", "Read our rule →"],
      ["FOR PARENTS", "Not just the score. Can they tell it again?", "See the record →"],
    ],
    trustTop: "FUN ENOUGH TO START.",
    trustMiddle: "REAL ENOUGH",
    trustAccent: "TO LEARN.",
    trustBody: "Stories and voices for learners. Clear progress and evidence for parents and teachers.",
    trustItems: ["Lines spoken and repetitions completed", "A monthly path from movie to book", "A starting level based on performance, not age"],
    placement: "Find your level in 5 minutes",
    footer: ["Start with someone else’s voice.", "Finish with your own."],
  },
} as const;

const tones = ["green", "yellow", "blue", "pink"] as const;
const noteTones = ["paper", "green", "blue"] as const;

export default function BrandPreviewPage() {
  const [language, setLanguage] = useState<Language>("ko");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasPlacement, setHasPlacement] = useState(false);
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("mimic-language");
    if (savedLanguage === "ko" || savedLanguage === "en") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setHasPlacement(false);
      return;
    }
    setHasPlacement(Boolean(window.localStorage.getItem(placementStorageKey(user.id))));
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const chooseLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("mimic-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
  };

  const openCourse = (href: string) => {
    if (!user) {
      router.push("/auth/login?next=/placement");
      return;
    }
    if (profile?.role !== "academy" && !hasPlacement) {
      router.push("/placement");
      return;
    }
    router.push(href);
  };

  const openPlacement = () => {
    router.push(user ? "/placement" : "/auth/login?next=/placement");
  };

  return (
    <main className={`${styles.page} home-stage-v2`} lang={language}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/dev/brand-preview" aria-label="Mimic home">MimiC</Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="#monthly">{t.nav[0]}</a>
          <a href="#method">{t.nav[1]}</a>
          <a href="#library">{t.nav[2]}</a>
          <a href="#parents">{t.nav[3]}</a>
        </nav>
        <div className={styles.headerActions}>
          <div className={styles.languageSwitch} aria-label="언어 선택">
            <button type="button" className={language === "ko" ? styles.isActive : ""} onClick={() => chooseLanguage("ko")} aria-pressed={language === "ko"}>KR</button>
            <span>/</span>
            <button type="button" className={language === "en" ? styles.isActive : ""} onClick={() => chooseLanguage("en")} aria-pressed={language === "en"}>EN</button>
          </div>
          {user ? (
            <AccountMenu onOpenAdmin={profile?.role === "academy" ? () => router.push("/admin") : undefined} />
          ) : (
            <Link href="/auth/login" className={styles.login}>{loading ? "…" : t.login}</Link>
          )}
          <button className={styles.menu} type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span /><span /></button>
        </div>
      </header>

      <div className={`${styles.menuOverlay} ${menuOpen ? styles.menuIsOpen : ""}`} aria-hidden={!menuOpen} onClick={() => setMenuOpen(false)}>
        <aside className={styles.menuPanel} onClick={(event) => event.stopPropagation()}>
          <div className={styles.menuPanelHead}>
            <span className={styles.logo}>MimiC</span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
          </div>
          <nav aria-label="Site menu">
            <a href="#monthly" onClick={() => setMenuOpen(false)}><span>01</span>{t.nav[0]}<b>↘</b></a>
            <a href="#method" onClick={() => setMenuOpen(false)}><span>02</span>{t.nav[1]}<b>↘</b></a>
            <a href="#library" onClick={() => setMenuOpen(false)}><span>03</span>{t.nav[2]}<b>↘</b></a>
            <a href="#parents" onClick={() => setMenuOpen(false)}><span>04</span>{t.nav[3]}<b>↘</b></a>
          </nav>
          <div className={styles.menuCourses}>
            <button type="button" onClick={() => openCourse("/sing2/selecting?id=001:1")}>SING 2 <span>MOVIE →</span></button>
            <button type="button" onClick={() => openCourse("/book/selecting?id=003:1")}>PINOCCHIO <span>BOOK →</span></button>
          </div>
          <p>SOUND → STORY → MY VOICE</p>
        </aside>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroStamp}>SOUND → STORY → MY VOICE</div>
        <h1 className={language === "en" ? styles.englishDisplay : ""}>
          <span>{t.heroTop}</span>
          <em>{t.heroAccent}</em>
        </h1>
        <div className={styles.heroBottom}>
          <p>{t.heroBody[0]}<br className={styles.desktopOnly} /> {t.heroBody[1]}</p>
          <a className={styles.primaryCta} href="#monthly">{t.heroCta} <span>↘</span></a>
        </div>
        <div className={styles.heroScribble} aria-hidden="true">SAY IT<br />LIKE YOU<br />MEAN IT!</div>
      </section>

      <section className={styles.marquee} aria-label="Mimic principles">
        <div>WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY · WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY ·</div>
      </section>

      <section className={styles.monthly} id="monthly">
        <div className={styles.sectionIntro}>
          <span>THIS MONTH / 08</span>
          <h2 className={language === "en" ? styles.englishDisplay : ""}>{t.monthly}<br />{t.monthlyAccent}</h2>
          <p>{t.monthlyBody}</p>
        </div>

        <article className={`${styles.featureCard} ${styles.movieCard}`}>
          <div className={styles.cardNumber}>01 / MOVIE</div>
          <div className={styles.posterFrame}><Image src="/sing2Poster.jpg" alt="Sing 2 movie poster" fill priority sizes="(max-width: 760px) 92vw, 55vw" /></div>
          <div className={styles.cardCaption}>
            <div><span>{t.movieLabel}</span><h3>SING 2</h3></div>
            <p>{t.movieBody}</p>
            <button type="button" className={styles.courseLink} onClick={() => openCourse("/sing2/selecting?id=001:1")}>{t.movieCta} <b>→</b></button>
          </div>
        </article>

        <article className={`${styles.featureCard} ${styles.bookCard}`}>
          <div className={styles.cardNumber}>02 / BOOK</div>
          <div className={styles.bookCover}>
            <Image src="/pinocchio.jpeg" alt="Pinocchio book cover" fill sizes="(max-width: 760px) 86vw, 33vw" />
            <span className={styles.bookTape} aria-hidden="true" />
          </div>
          <div className={styles.cardCaption}>
            <div><span>{t.bookLabel}</span><h3>PINOCCHIO</h3></div>
            <p>{t.bookBody}</p>
            <button type="button" className={styles.courseLink} onClick={() => openCourse("/book/selecting?id=003:1")}>{t.bookCta} <b>→</b></button>
          </div>
        </article>
      </section>

      <section className={styles.method} id="method">
        <div className={styles.methodHeading}>
          <p>HOW MIMIC WORKS</p>
          <h2 className={language === "en" ? styles.englishDisplay : ""}>{t.methodTop}<br /><i>{t.methodAccent}</i></h2>
          <Image src="/home/chameleon.png" alt="" width={112} height={78} className={styles.guide} />
        </div>
        <div className={styles.steps}>
          {t.steps.map((step, index) => (
            <article key={step[0]} className={`${styles.step} ${styles[tones[index]]}`}>
              <span>0{index + 1}</span><h3>{step[0]}</h3><p>{step[1]}</p><b aria-hidden="true">↗</b>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.library} id="library">
        <div className={styles.libraryHead}>
          <span>FIELD NOTES</span>
          <h2 className={language === "en" ? styles.englishDisplay : ""}>{t.libraryTitle}</h2>
          <p>{t.libraryBody}</p>
        </div>
        <div className={styles.noteGrid}>
          {t.notes.map((note, index) => (
            <article key={note[0]} className={`${styles.note} ${styles[noteTones[index]]}`}>
              <span>{note[0]}</span><h3>{note[1]}</h3>
              <div className={styles.noteDoodle} aria-hidden="true">{index === 0 ? "listen!" : index === 1 ? "1 + 1" : "not a score"}</div>
              <a href="#parents">{note[2]}</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.trust} id="parents">
        <div>
          <span>FOR GROWN-UPS</span>
          <h2 className={language === "en" ? styles.englishDisplay : ""}>{t.trustTop}<br />{t.trustMiddle}<br /><em>{t.trustAccent}</em></h2>
        </div>
        <div className={styles.trustCopy}>
          <p>{t.trustBody}</p>
          <ul>{t.trustItems.map((item, index) => <li key={item}><b>0{index + 1}</b>{item}</li>)}</ul>
          <button type="button" className={styles.placementLink} onClick={openPlacement}>{t.placement} <span>→</span></button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>MimiC</div>
        <p>{t.footer[0]}<br />{t.footer[1]}</p>
        <div className={styles.footerLinks}>
          <a href="#monthly">{t.nav[0]}</a><a href="#method">{t.nav[1]}</a><a href="#parents">{t.nav[3]}</a><Link href="/auth/login">{t.login}</Link>
        </div>
        <small>© 2026 MIMIC · BRAND STUDY PREVIEW</small>
      </footer>
    </main>
  );
}
