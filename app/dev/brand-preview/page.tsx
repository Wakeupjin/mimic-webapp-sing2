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
import styles from "./brand-preview.module.css";

type Language = "ko" | "en";

type BrandPreviewPageProps = {
  bookReleaseBadge?: string | null;
};

const copy = {
  ko: {
    nav: ["미믹의 공간", "이번 달", "학습 방식", "교육 철학"],
    login: "로그인",
    heroStamp: "ONLINE + OFFLINE · ENGLISH IMMERSION",
    heroTop: "아이가 영어에",
    heroAccent: "빠져드는 공간.",
    heroBody: ["영화 속 목소리를 따라 하고, 책 속 이야기를 내 목소리로.", "미믹의 공간에서, 그리고 집에서도."],
    createAccount: "계정 만들고 레벨 찾기",
    createAccountHint: "가입 후 5분 만에 시작 단계를 정해요.",
    findLevel: "내 시작 단계 찾기",
    findLevelHint: "5분이면 나에게 맞는 첫 학습을 찾을 수 있어요.",
    startCourse: "SING 2로 시작하기",
    startCourseHint: "영화 장면부터 첫 학습을 시작해요.",
    resume: "이어서 학습하기",
    browse: "미믹의 두 공간 보기",
    loadingAction: "학습 위치 불러오는 중",
    openingSignup: "가입 화면 여는 중",
    openingPage: "화면 여는 중",
    spacesTitle: ["영어로 이어지는,", "우리의 두 공간."],
    spacesBody: "함께 빠져드는 이야기. 혼자서도 이어가는 목소리. 영어와 만나는 환경을 만듭니다.",
    offlineOrder: "함께 몰입하는 공간 · 01 / OFFLINE",
    offlineLabel: "미믹의 공간",
    offlineTitle: "문을 열면, 이야기 속으로.",
    offlineBody: "커다란 화면과 생생한 소리. 아이가 영어에 몰입하고, 함께 따라 말하는 공간을 설계합니다.",
    offlineCta: "이 공간에서 어떻게 배울까요?",
    offlineAlt: "큰 영화 화면과 초록 좌석이 놓인 미믹의 극장형 공간 콘셉트",
    onlineOrder: "일상으로 이어지는 공간 · 02 / ONLINE",
    onlineLabel: "집에서도 미믹",
    onlineTitle: "다음 장면은, 내 목소리로.",
    onlineBody: "영화에서 만난 소리, 원서에서 펼쳐지는 이야기. 온라인에서도 나의 속도로 듣고, 따라 말합니다.",
    onlineCta: "이번 달 콘텐츠 보기",
    onlineBadge: "THE STORY GOES ON.",
    movieOrder: "1단계 · 영화",
    bookOrder: "2단계 · 원서",
    monthly: "이번 달,",
    monthlyAccent: "두 작품을 깊게.",
    monthlyBody: "영화에서 소리와 리듬을 익히고, 원서에서 이야기를 내 목소리로 확장해요.",
    movieLabel: "이번 달 영화",
    movieBody: "12개의 장면에서 등장인물의 목소리와 리듬을 익혀요.",
    movieCta: "영화로 학습하기",
    bookLabel: "이번 달 원서",
    bookBody: "먼저 듣고, 한 문장씩 따라 말하며 이야기를 내 목소리로 익혀요.",
    bookCta: "원서로 학습하기",
    methodTop: "화면 속 목소리를,",
    methodAccent: "내 목소리로.",
    steps: [
      ["WATCH", "이야기에 빠져들고.", "인물의 표정과 행동을 보며, 장면 속 영어 소리에 귀 기울입니다."],
      ["MIMIC", "주인공처럼 말하고.", "들었던 소리와 리듬을 내 목소리로 따라 말합니다."],
      ["GUESS", "장면 속 뜻을 찾고.", "상황을 떠올리며, 그 장면에 어울리는 표현을 찾아봅니다."],
      ["WORD", "나의 문장으로.", "듣고 말했던 표현을 단어로 다시 연결해 완성합니다."],
    ],
    bookFlow: "원서에서는 먼저 듣고, 문장을 따라 읽고, 단어로 다시 완성해요.",
    rootsTitle: "처음 말을 배우던 그 과정에서.",
    rootsBody: "익숙한 목소리를 듣고, 상황과 의미를 연결하고, 소리를 따라 해보는 경험. 미믹은 모국어 습득 과정에서 영어의 시작을 찾습니다.",
    roots: [
      ["정찬용 박사 · 저서", "영어공부 절대로 하지마라", "listen first!", "미믹 교육 철학의 출발점."],
      ["정찬용 박사 · 저서", "사실은 넌 영어바보가 아니야", "your own voice", "영어를 배우는 방식을 다시 바라보다."],
      ["토스에듀케이션", "모국어를 익히는 과정에서", "see. hear. mimic.", "듣고 따라 말하는 경험을 영어 환경으로."],
    ],
    rootsCaption: "미믹은 정찬용 박사의 저서와 토스에듀케이션의 교육 철학을 바탕으로, 아이들이 영어에 몰입할 수 있는 온·오프라인 환경을 만듭니다.",
    trustTop: "좋아하는",
    trustMiddle: "이야기가,",
    trustAccent: "아이의 일상으로.",
    trustBody: "재미있는 장면은 다시 보고 싶어지고, 좋아하는 목소리는 따라 해보고 싶으니까. 미믹은 그 마음에서 시작합니다.",
    trustItems: ["영화에서 소리와 리듬을 만나고", "원서에서 이야기를 내 목소리로", "미믹의 공간에서, 그리고 집에서도"],
    placement: "우리 아이 시작 단계 찾기",
    footer: ["남의 목소리로 시작해", "내 목소리로 끝내는 영어."],
  },
  en: {
    nav: ["Mimic spaces", "This month", "How it works", "Our roots"],
    login: "Log in",
    heroStamp: "ONLINE + OFFLINE · ENGLISH IMMERSION",
    heroTop: "A PLACE TO",
    heroAccent: "FALL INTO ENGLISH.",
    heroBody: ["Follow voices from the screen and retell stories in your own voice.", "At a Mimic space, and at home."],
    createAccount: "Create an account",
    createAccountHint: "Find your starting point in 5 minutes.",
    findLevel: "Find my starting level",
    findLevelHint: "Five minutes to place your first lesson.",
    startCourse: "Start with SING 2",
    startCourseHint: "Begin with your first movie scene.",
    resume: "Continue learning",
    browse: "Meet the two Mimic spaces",
    loadingAction: "Finding your last lesson",
    openingSignup: "Opening sign-up",
    openingPage: "Opening",
    spacesTitle: ["TWO SPACES,", "ONE ENGLISH WORLD."],
    spacesBody: "Stories to fall into together. A voice to keep growing at home. We create the environment where English becomes part of everyday life.",
    offlineOrder: "IMMERSION TOGETHER · 01 / OFFLINE",
    offlineLabel: "MIMIC SPACE",
    offlineTitle: "OPEN THE DOOR. ENTER THE STORY.",
    offlineBody: "A big screen, vivid sound, and room to speak together. A physical space designed for children to fall into English.",
    offlineCta: "See how learning works",
    offlineAlt: "Mimic theater concept with a large movie screen and green seats",
    onlineOrder: "KEEP IT GOING · 02 / ONLINE",
    onlineLabel: "MIMIC AT HOME",
    onlineTitle: "THE NEXT SCENE, IN YOUR VOICE.",
    onlineBody: "Sounds from film open into stories on the page. Online, every child can listen and speak at their own pace.",
    onlineCta: "See this month’s stories",
    onlineBadge: "THE STORY GOES ON.",
    movieOrder: "STEP 1 · FIRST",
    bookOrder: "STEP 2 · NEXT",
    monthly: "THIS MONTH,",
    monthlyAccent: "TWO STORIES. DEEPLY.",
    monthlyBody: "Start with sound and rhythm on screen, then carry the story into your own voice on the page.",
    movieLabel: "This month’s movie",
    movieBody: "Borrow the voices and rhythms of the characters across twelve scenes.",
    movieCta: "Open movie course",
    bookLabel: "This month’s book",
    bookBody: "Listen first, then find the story’s voice one sentence at a time.",
    bookCta: "Open book course",
    methodTop: "VOICES FROM THE SCREEN,",
    methodAccent: "INTO YOUR OWN.",
    steps: [
      ["WATCH", "Fall into the story.", "Read faces and actions while listening closely to the English inside the scene."],
      ["MIMIC", "Speak like the character.", "Borrow the sound and rhythm you heard, then say it back in your own voice."],
      ["GUESS", "Find meaning in the scene.", "Recall the situation and choose the expression that belongs there."],
      ["WORD", "Make the line your own.", "Reconnect the words you heard and spoke to complete the sentence."],
    ],
    bookFlow: "In books: listen first, read the sentence aloud, then rebuild it word by word.",
    rootsTitle: "THE WAY WE FIRST LEARNED TO SPEAK.",
    rootsBody: "We heard familiar voices, connected sound with meaning, and tried the sounds ourselves. Mimic brings that first-language process into English.",
    roots: [
      ["DR. CHAN-YONG JUNG · BOOK", "영어공부 절대로 하지마라", "listen first!", "A starting point for Mimic’s learning philosophy."],
      ["DR. CHAN-YONG JUNG · BOOK", "사실은 넌 영어바보가 아니야", "your own voice", "A different way to see how English is learned."],
      ["TOSS EDUCATION", "THE WAY A FIRST LANGUAGE GROWS", "see. hear. mimic.", "Turning listen-and-repeat experience into an English environment."],
    ],
    rootsCaption: "Built on Dr. Chan-yong Jung’s books and the learning philosophy of Toss Education, Mimic creates online and offline environments where children can immerse themselves in English.",
    trustTop: "STORIES THEY LOVE",
    trustMiddle: "BECOME PART OF",
    trustAccent: "EVERYDAY LIFE.",
    trustBody: "A fun scene invites another watch. A favorite voice makes children want to say it back. Mimic begins with that impulse.",
    trustItems: ["Meet sound and rhythm through film", "Carry the story into their own voice through books", "Keep English going at a Mimic space and at home"],
    placement: "Find my starting level",
    footer: ["Start with someone else’s voice.", "Finish with your own."],
  },
} as const;

const rootTones = ["paper", "yellow", "pink"] as const;
const navTargets = ["#spaces", "#monthly", "#method", "#philosophy"] as const;

type HomeProgressRow = ProgressRow & { updated_at?: string | null };
type ResumeTarget = { href: string; ko: string; en: string };

function getResumeTarget(rows: HomeProgressRow[]): ResumeTarget | null {
  if (!rows.length) return null;
  const latest = [...rows].sort((a, b) => {
    const byTime = Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "");
    if (Number.isFinite(byTime) && byTime !== 0) return byTime;
    return b.lesson_number - a.lesson_number;
  })[0];
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

  if (latest.lesson_number >= 401 && latest.lesson_number <= 412) {
    if (lessonNumber > 412) return null;
    const chapter = lessonNumber - 400;
    const modeLabel = mode.toUpperCase();
    const position = !latest.completed && Number(latest.current_position) > 0 && mode !== "watching"
      ? ` · LINE ${Math.floor(Number(latest.current_position)) + 1}`
      : "";
    return {
      href: `/book/pinocchio/${chapter}/${mode}`,
      ko: `PINOCCHIO · CHAPTER ${chapter} · ${modeLabel}${position}`,
      en: `PINOCCHIO · CHAPTER ${chapter} · ${modeLabel}${position}`,
    };
  }

  const pack = lessonNumber >= 300 ? 3 : lessonNumber >= 200 ? 2 : 1;
  const lesson = pack === 1 ? lessonNumber : lessonNumber % 100;
  const movieId = formatMovieId(pack, Math.max(1, lesson));
  const content = pack >= 3 ? "PINOCCHIO" : "SING 2";
  const chapterKo = pack >= 3 ? `SCENE ${lesson}` : pack === 2 ? `HARD ${lesson}` : `CHAPTER ${lesson}`;
  const modeLabel = mode === "watching" && pack >= 3 ? "LISTEN" : mode === "watching" ? "WATCH" : mode.toUpperCase();
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
    <main id="top" className={styles.page + " home-stage-v2"} lang={language}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="Mimic home">MimiC</Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {t.nav.map((label, index) => <a href={navTargets[index]} key={navTargets[index]}>{label}</a>)}
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

      <div className={styles.menuOverlay + (menuOpen ? " " + styles.menuIsOpen : "")} aria-hidden={!menuOpen} onClick={() => setMenuOpen(false)}>
        <aside className={styles.menuPanel} onClick={(event) => event.stopPropagation()}>
          <div className={styles.menuPanelHead}>
            <span className={styles.logo}>MimiC</span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
          </div>
          <nav aria-label="Site menu">
            {t.nav.map((label, index) => (
              <a href={navTargets[index]} key={navTargets[index]} onClick={() => setMenuOpen(false)}>
                <span>0{index + 1}</span>{label}<b>↘</b>
              </a>
            ))}
          </nav>
          <div className={styles.menuCourses}>
            <button type="button" disabled={Boolean(pendingAction)} onClick={() => openCourse("menu-movie", "/sing2/selecting?id=001:1")}>SING 2 <span>MOVIE →</span></button>
            <button type="button" disabled={Boolean(pendingAction)} onClick={() => openCourse("menu-book", "/book/pinocchio/1")}>PINOCCHIO <span>BOOK →</span></button>
          </div>
          <p>SOUND → STORY → MY VOICE</p>
        </aside>
      </div>

      <section className={styles.hero} id="intro" aria-labelledby="hero-title">
        <div className={styles.heroStamp}>{t.heroStamp}</div>
        <h1 id="hero-title" className={language === "en" ? styles.englishDisplay : ""}>
          <span>{t.heroTop}</span>
          <em>{t.heroAccent}</em>
        </h1>
        <div className={styles.heroBottom}>
          <p>{t.heroBody[0]}<br /><br />{t.heroBody[1]}</p>
          <div className={styles.heroConversion}>
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryCta} onClick={handlePrimaryAction} disabled={primaryAction.disabled || Boolean(pendingAction)} aria-busy={pendingAction === "primary"}>
                <span className={styles.primaryCtaCopy}>
                  <strong>{pendingAction === "primary" ? (user ? t.openingPage : t.openingSignup) : primaryAction.label}</strong>
                  {pendingAction !== "primary" && primaryAction.hint ? <small>{primaryAction.hint}</small> : null}
                </span>
                {pendingAction === "primary" ? <i className={styles.buttonSpinner} aria-hidden="true" /> : <b>→</b>}
              </button>
              <a className={styles.secondaryCta} href="#spaces">{t.browse} ↓</a>
            </div>
            <Sing2Preview language={language} compact />
          </div>
        </div>
        <div className={styles.heroScribble} aria-hidden="true">SEE IT.<br />FEEL IT.<br />SAY IT!</div>
      </section>

      <section className={styles.marquee} aria-label="Mimic principles">
        <div>WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY · WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY ·</div>
      </section>

      <section className={styles.monthly} id="spaces" aria-labelledby="spaces-title">
        <div className={styles.sectionIntro}>
          <span>MIMIC PLACES</span>
          <h2 id="spaces-title" className={language === "en" ? styles.englishDisplay : ""}>{t.spacesTitle[0]}<br />{t.spacesTitle[1]}</h2>
          <p>{t.spacesBody}</p>
        </div>

        <article className={styles.featureCard + " " + styles.movieCard}>
          <div className={styles.cardNumber}>{t.offlineOrder}</div>
          <figure className={styles.spacePhoto}>
            <Image src="/home/mimic-space.png" alt={t.offlineAlt} fill sizes="(max-width: 640px) 92vw, 58vw" />
            <figcaption>OUR OWN LITTLE CINEMA</figcaption>
          </figure>
          <div className={styles.cardCaption}>
            <div><span>{t.offlineLabel}</span><h3>{t.offlineTitle}</h3></div>
            <p>{t.offlineBody}</p>
            <a href="#method">{t.offlineCta} <b>↓</b></a>
          </div>
          <span className={styles.photoNote}>MIMIC SPACE CONCEPT</span>
        </article>

        <article className={styles.featureCard}>
          <div className={styles.cardNumber}>{t.onlineOrder}</div>
          <div className={styles.bookCover + " " + styles.introBook}>
            <Image src="/pinocchio-mimic-cover.png" alt="Mimic Pinocchio story cover" fill sizes="(max-width: 760px) 86vw, 33vw" />
            <span className={styles.bookTape} aria-hidden="true" />
            <strong className={styles.bookReleaseBadge}>{bookReleaseBadge || t.onlineBadge}</strong>
          </div>
          <div className={styles.cardCaption}>
            <div><span>{t.onlineLabel}</span><h3>{t.onlineTitle}</h3></div>
            <p>{t.onlineBody}</p>
            <a href="#monthly">{t.onlineCta} <b>↓</b></a>
          </div>
        </article>
      </section>

      <section className={styles.monthly} id="monthly" aria-labelledby="monthly-title">
        <div className={styles.sectionIntro}>
          <span>THIS MONTH / 08</span>
          <h2 id="monthly-title" className={language === "en" ? styles.englishDisplay : ""}>{t.monthly}<br />{t.monthlyAccent}</h2>
          <p>{t.monthlyBody}</p>
        </div>

        <article className={styles.featureCard + " " + styles.movieCard}>
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
            <Image src="/pinocchio-mimic-cover.png" alt="Mimic Pinocchio story cover" fill sizes="(max-width: 760px) 86vw, 33vw" />
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

      <section className={styles.method} id="method" aria-labelledby="method-title">
        <div className={styles.methodHeading}>
          <p>HOW MIMIC WORKS</p>
          <h2 id="method-title" className={language === "en" ? styles.englishDisplay : ""}>{t.methodTop}<br /><i>{t.methodAccent}</i></h2>
          <Image src="/home/chameleon.png" alt="" width={112} height={78} className={styles.guide} />
        </div>
        <div className={styles.steps}>
          {t.steps.map((step, index) => (
            <article key={step[0]} className={styles.step + " " + styles.introStep}>
              <span>0{index + 1}</span><h3>{step[0]}</h3><p>{step[1]}</p><div className={styles.stepDetail}>{step[2]}</div>
            </article>
          ))}
        </div>
        <p className={styles.bookFlow}>BOOK · <strong>LISTEN → MIMIC → WORD.</strong> {t.bookFlow}</p>
      </section>

      <section className={styles.library} id="philosophy" aria-labelledby="philosophy-title">
        <div className={styles.libraryHead}>
          <span>OUR ROOTS</span>
          <h2 id="philosophy-title" className={language === "en" ? styles.englishDisplay : ""}>{t.rootsTitle}</h2>
          <p>{t.rootsBody}</p>
        </div>
        <div className={styles.noteGrid}>
          {t.roots.map((note, index) => (
            <article key={note[1]} className={styles.note + " " + styles[rootTones[index]] + " " + styles.rootNote}>
              <span>{note[0]}</span><h3>{note[1]}</h3>
              <div className={styles.noteDoodle} aria-hidden="true">{note[2]}</div>
              <p>{note[3]}</p>
            </article>
          ))}
        </div>
        <p className={styles.rootsCaption}>{t.rootsCaption}</p>
      </section>

      <section className={styles.trust} id="parents" aria-labelledby="closing-title">
        <div>
          <span>MAKE ENGLISH PART OF THEIR WORLD.</span>
          <h2 id="closing-title" className={language === "en" ? styles.englishDisplay : ""}>{t.trustTop}<br />{t.trustMiddle}<br /><em>{t.trustAccent}</em></h2>
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
        <a className={styles.footerLogo} href="#top" aria-label="Mimic home">MimiC</a>
        <p>{t.footer[0]}<br />{t.footer[1]}</p>
        <div className={styles.footerLinks}>
          {t.nav.map((label, index) => <a href={navTargets[index]} key={navTargets[index]}>{label}</a>)}
          <Link href="/auth/login">{t.login}</Link>
        </div>
        <small>© 2026 MIMIC · SOUND → STORY → MY VOICE</small>
      </footer>
    </main>
  );
}
