"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountMenu from "../../components/AccountMenu";
import Sing2Preview from "../../components/Sing2Preview";
import { useAuth } from "../../contexts/AuthContext";
import { formatMovieId } from "../../dataService";
import { signupPath } from "../../lib/authRedirect";
import { lessonPath } from "../../lib/lessonMedia";
import { placementStorageKey } from "../../lib/placement";
import { fetchOwnProgress, MODE_ORDER, type LearnMode, type ProgressRow } from "../../lib/progressGate";
import { ALL_PINOCCHIO_MODES, BOOK_FLOW_MODES } from "../pinocchio-chapters/lessonData";
import type { LessonMode as PinocchioLessonMode } from "../pinocchio-chapters/types";
import styles from "./brand-preview.module.css";

type Language = "ko" | "en";

type BrandPreviewPageProps = {
  bookReleaseBadge?: string | null;
};

const copy = {
  ko: {
    nav: ["이번 달", "학습 방식", "콘텐츠", "부모·선생님"],
    login: "로그인",
    heroTop: "영어를 외우지 말고",
    heroAccent: "장면 속으로.",
    heroBody: ["화면 속 목소리를 따라 하고, 책 속 이야기를 다시 말하며", "내 영어를 만들어 가요."],
    createAccount: "계정 만들고 레벨 찾기",
    createAccountHint: "가입 후 5분 만에 시작 단계를 정해요.",
    findLevel: "내 시작 단계 찾기",
    findLevelHint: "5분이면 나에게 맞는 첫 학습을 찾을 수 있어요.",
    startCourse: "SING 2로 시작하기",
    startCourseHint: "영화 장면부터 첫 학습을 시작해요.",
    resume: "이어서 학습하기",
    browse: "이번 달 콘텐츠 보기",
    loadingAction: "학습 위치 불러오는 중",
    openingSignup: "가입 화면 여는 중",
    openingPage: "화면 여는 중",
    movieOrder: "1단계 · 영화",
    bookOrder: "2단계 · 원서",
    monthly: "이번 달,",
    monthlyAccent: "두 작품을 깊게.",
    monthlyBody: "영화에서 소리와 리듬을 익히고, 원서에서 이야기를 내 목소리로 확장해요.",
    movieLabel: "이번 달 영화",
    movieBody: "12개의 장면에서 등장인물의 목소리와 리듬을 익혀요.",
    movieCta: "영화로 학습하기",
    bookLabel: "이번 달 원서",
    bookBody: "듣고, 문장을 보며 따라 읽고, 낱말로 다시 완성해요.",
    bookCta: "원서로 학습하기",
    methodTop: "문제 풀이 대신",
    methodAccent: "장면 리허설.",
    steps: [
      ["WATCH", "장면 전체 보기"],
      ["MIMIC", "소리와 리듬 따라 말하기"],
      ["GUESS", "알맞은 표현 고르기"],
      ["WORD", "단어로 문장 완성하기"],
    ],
    libraryTitle: "영어가 내 말이 되는 순간.",
    libraryBody: "어떤 장면을 연습했고 어떻게 달라졌는지, 아이의 학습 과정을 기록해요.",
    notes: [
      ["MIMIC NOTE 01", "외운 문장보다, 직접 말해 본 장면이 오래 남는다.", "들어보기 →"],
      ["OUR RULE", "한 달에 영화 한 편, 원서 한 권. 적게 보고 깊게 익힌다.", "원칙 보기 →"],
      ["FOR PARENTS", "몇 점인지보다, 다시 말할 수 있는지를 본다.", "기록 보기 →"],
    ],
    trustTop: "재미와 배움,",
    trustMiddle: "하나도 놓치지",
    trustAccent: "않도록.",
    trustBody: "아이에게는 이야기와 목소리를, 부모와 선생님에게는 과정과 변화를 보여줘요.",
    trustItems: ["직접 말한 문장과 반복 기록", "영화에서 원서로 이어지는 월간 과정", "학년이 아닌 수행 기반 시작 단계"],
    placement: "5분 레벨 테스트",
    footer: ["남의 목소리로 시작해", "내 목소리로 끝내는 영어."],
  },
  en: {
    nav: ["This month", "How it works", "Stories", "For grown-ups"],
    login: "Log in",
    heroTop: "DON’T MEMORIZE ENGLISH.",
    heroAccent: "STEP INTO THE SCENE.",
    heroBody: ["Follow the voices on screen, retell the stories on the page,", "and make English sound like you."],
    createAccount: "Create an account",
    createAccountHint: "Find your starting point in 5 minutes.",
    findLevel: "Find my starting level",
    findLevelHint: "Five minutes to place your first lesson.",
    startCourse: "Start with SING 2",
    startCourseHint: "Begin with your first movie scene.",
    resume: "Continue learning",
    browse: "Browse this month",
    loadingAction: "Finding your last lesson",
    openingSignup: "Opening sign-up",
    openingPage: "Opening",
    movieOrder: "STEP 1 · FIRST",
    bookOrder: "STEP 2 · NEXT",
    monthly: "THIS MONTH,",
    monthlyAccent: "TWO STORIES. DEEPLY.",
    monthlyBody: "Start with sound and rhythm on screen, then carry the story into your own voice on the page.",
    movieLabel: "This month’s movie",
    movieBody: "Borrow the voices and rhythms of the characters across twelve scenes.",
    movieCta: "Open movie course",
    bookLabel: "This month’s book",
    bookBody: "Listen, mimic with the sentence in view, then rebuild it word by word.",
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

type HomeProgressRow = ProgressRow & { updated_at?: string | null };
type ResumeTarget = { href: string; ko: string; en: string };

function getResumeTarget(rows: HomeProgressRow[]): ResumeTarget | null {
  if (!rows.length) return null;
  const latest = [...rows].sort((a, b) => {
    const byTime = Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "");
    if (Number.isFinite(byTime) && byTime !== 0) return byTime;
    return b.lesson_number - a.lesson_number;
  })[0];

  if (latest.lesson_number >= 401 && latest.lesson_number <= 412) {
    const rawMode = latest.mode as PinocchioLessonMode;
    if (!ALL_PINOCCHIO_MODES.includes(rawMode)) return null;

    let lessonNumber = latest.lesson_number;
    const chapterRows = rows.filter((row) => row.lesson_number === lessonNumber);
    const completedModes = new Set(
      chapterRows
        .filter((row) => row.completed && BOOK_FLOW_MODES.includes(row.mode as PinocchioLessonMode))
        .map((row) => row.mode as PinocchioLessonMode),
    );
    let mode = BOOK_FLOW_MODES.find((candidate) => !completedModes.has(candidate));
    if (!mode) {
      lessonNumber += 1;
      mode = "watching";
    }

    if (lessonNumber > 412) return null;
    const chapter = lessonNumber - 400;
    const modeLabel = mode === "watching" ? "LISTEN" : mode.toUpperCase();
    const modeRow = chapterRows.find((row) => row.mode === mode);
    const position = modeRow && !modeRow.completed && Number(modeRow.current_position) > 0 && mode !== "watching"
      ? ` · LINE ${Math.floor(Number(modeRow.current_position)) + 1}`
      : "";
    return {
      href: `/book/pinocchio/${chapter}/${mode}`,
      ko: `PINOCCHIO · CHAPTER ${chapter} · ${modeLabel}${position}`,
      en: `PINOCCHIO · CHAPTER ${chapter} · ${modeLabel}${position}`,
    };
  }

  if (latest.lesson_number >= 300 && latest.lesson_number < 400) {
    const finishedChapter = latest.completed && latest.mode === "word";
    const chapter = Math.max(1, latest.lesson_number % 100) + (finishedChapter ? 1 : 0);
    if (chapter > 12) return null;
    return {
      href: `/book/pinocchio/${chapter}`,
      ko: `PINOCCHIO · CHAPTER ${chapter}`,
      en: `PINOCCHIO · CHAPTER ${chapter}`,
    };
  }

  if (!MODE_ORDER.includes(latest.mode as LearnMode)) return null;

  let lessonNumber = latest.lesson_number;
  let mode = latest.mode as LearnMode;
  if (latest.completed) {
    const nextMode = MODE_ORDER[MODE_ORDER.indexOf(mode) + 1];
    if (nextMode) mode = nextMode;
    else {
      lessonNumber += 1;
      mode = "watching";
    }
  }

  const pack = lessonNumber >= 200 ? 2 : 1;
  const lesson = pack === 1 ? lessonNumber : lessonNumber % 100;
  const movieId = formatMovieId(pack, Math.max(1, lesson));
  const content = "SING 2";
  const chapterKo = pack === 2 ? `HARD ${lesson}` : `CHAPTER ${lesson}`;
  const modeLabel = mode === "watching" ? "WATCH" : mode.toUpperCase();
  const position = !latest.completed && Number(latest.current_position) > 0 && mode !== "watching"
    ? ` · LINE ${Math.floor(Number(latest.current_position)) + 1}`
    : "";

  return {
    href: lessonPath(movieId, mode),
    ko: `${content} · ${chapterKo} · ${modeLabel}${position}`,
    en: `${content} · ${chapterKo} · ${modeLabel}${position}`,
  };
}

export default function BrandPreviewPage({ bookReleaseBadge = null }: BrandPreviewPageProps = {}) {
  const [language, setLanguage] = useState<Language>("ko");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasPlacement, setHasPlacement] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<ResumeTarget | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
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
      setResumeTarget(null);
      setProgressLoaded(true);
      return;
    }
    setHasPlacement(Boolean(window.localStorage.getItem(placementStorageKey(user.id))));
    setProgressLoaded(false);
    void fetchOwnProgress().then((rows) => {
      setResumeTarget(getResumeTarget(rows as HomeProgressRow[]));
      setProgressLoaded(true);
    });
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

  const navigate = (key: string, href: string) => {
    if (pendingAction) return;
    setPendingAction(key);
    window.requestAnimationFrame(() => router.push(href));
  };

  const openCourse = (key: string, href: string) => {
    if (!user) {
      navigate(key, signupPath(href));
      return;
    }
    if (profile?.role !== "academy" && !hasPlacement) {
      navigate(key, "/placement");
      return;
    }
    navigate(key, href);
  };

  const openPlacement = () => {
    navigate("placement", user ? "/placement" : signupPath("/placement"));
  };

  const primaryAction = loading || (user && !progressLoaded)
    ? { label: t.loadingAction, hint: "", disabled: true }
    : !user
      ? { label: t.createAccount, hint: t.createAccountHint, disabled: false }
      : profile?.role !== "academy" && !hasPlacement
        ? { label: t.findLevel, hint: t.findLevelHint, disabled: false }
        : resumeTarget
          ? { label: t.resume, hint: language === "ko" ? resumeTarget.ko : resumeTarget.en, disabled: false }
          : { label: t.startCourse, hint: t.startCourseHint, disabled: false };

  const handlePrimaryAction = () => {
    if (primaryAction.disabled || pendingAction) return;
    if (!user) {
      navigate("primary", signupPath("/placement"));
      return;
    }
    if (profile?.role !== "academy" && !hasPlacement) {
      navigate("primary", "/placement");
      return;
    }
    navigate("primary", resumeTarget?.href || "/sing2/selecting?id=001:1");
  };

  return (
    <main className={`${styles.page} home-stage-v2`} lang={language}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="Mimic home">MimiC</Link>
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
            <button type="button" disabled={Boolean(pendingAction)} onClick={() => openCourse("menu-movie", "/sing2/selecting?id=001:1")}>SING 2 <span>MOVIE →</span></button>
            <button type="button" disabled={Boolean(pendingAction)} onClick={() => openCourse("menu-book", "/book/pinocchio/1")}>PINOCCHIO <span>BOOK →</span></button>
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
          <div className={styles.heroConversion}>
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryCta} onClick={handlePrimaryAction} disabled={primaryAction.disabled || Boolean(pendingAction)} aria-busy={pendingAction === "primary"}>
                <span className={styles.primaryCtaCopy}>
                  <strong>{pendingAction === "primary" ? (user ? t.openingPage : t.openingSignup) : primaryAction.label}</strong>
                  {pendingAction !== "primary" && primaryAction.hint ? <small>{primaryAction.hint}</small> : null}
                </span>
                {pendingAction === "primary" ? <i className={styles.buttonSpinner} aria-hidden="true" /> : <b>→</b>}
              </button>
              <a className={styles.secondaryCta} href="#monthly">{t.browse} ↓</a>
            </div>
            <Sing2Preview language={language} compact />
          </div>
        </div>
        <div className={styles.heroScribble} aria-hidden="true">SAY IT<br />LIKE YOU<br />MEAN IT!</div>
      </section>

      <section className={styles.marquee} aria-label="Mimic principles">
        <div>WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY · WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY ·</div>
      </section>

      <section className={styles.monthly} id="monthly">
        <div className={styles.sectionIntro}>
          <span>THIS MONTH / 08</span>
          <h2 className={language === "en" ? styles.englishDisplay : ""}>{t.monthly} <br />{t.monthlyAccent}</h2>
          <p>{t.monthlyBody}</p>
        </div>

        <article className={`${styles.featureCard} ${styles.movieCard}`}>
          <div className={styles.cardNumber}>{t.movieOrder} · 01 / MOVIE</div>
          <div className={styles.coursePoster}>
            <Image src="/sing2Poster.jpg" alt="Sing 2 scene" fill sizes="(max-width: 640px) 90vw, 58vw" />
            <span>WATCH → MIMIC</span>
          </div>
          <div className={styles.cardCaption}>
            <div><span>{t.movieLabel}</span><h3>SING 2</h3></div>
            <p>{t.movieBody}</p>
            <button type="button" className={styles.courseLink} disabled={Boolean(pendingAction)} onClick={() => openCourse("movie", "/sing2/selecting?id=001:1")}>
              {pendingAction === "movie" ? (user ? t.openingPage : t.openingSignup) : t.movieCta} <b>{pendingAction === "movie" ? "…" : "→"}</b>
            </button>
          </div>
        </article>

        <article className={styles.featureCard}>
          <div className={styles.cardNumber}>{t.bookOrder} · 02 / BOOK</div>
          <div className={styles.bookCover}>
            <Image src="/pinocchio-mimic-cover.png" alt="Mimic 오리지널 피노키오 커버" fill sizes="(max-width: 760px) 86vw, 33vw" />
            <span className={styles.bookTape} aria-hidden="true" />
            {bookReleaseBadge ? <strong className={styles.bookReleaseBadge}>{bookReleaseBadge}</strong> : null}
          </div>
          <div className={styles.cardCaption}>
            <div><span>{t.bookLabel}</span><h3>PINOCCHIO</h3></div>
            <p>{t.bookBody}</p>
            <button type="button" className={styles.courseLink} disabled={Boolean(pendingAction)} onClick={() => openCourse("book", "/book/pinocchio/1")}>
              {pendingAction === "book" ? (user ? t.openingPage : t.openingSignup) : t.bookCta} <b>{pendingAction === "book" ? "…" : "→"}</b>
            </button>
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
          <button type="button" className={styles.placementLink} disabled={Boolean(pendingAction)} onClick={openPlacement}>
            {pendingAction === "placement" ? (user ? t.openingPage : t.openingSignup) : t.placement} <span>{pendingAction === "placement" ? "…" : "→"}</span>
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>MimiC</div>
        <p>{t.footer[0]}<br />{t.footer[1]}</p>
        <div className={styles.footerLinks}>
          <a href="#monthly">{t.nav[0]}</a><a href="#method">{t.nav[1]}</a><a href="#parents">{t.nav[3]}</a><Link href="/auth/login">{t.login}</Link>
        </div>
        <small>© 2026 MIMIC · SOUND → STORY → MY VOICE</small>
      </footer>
    </main>
  );
}
