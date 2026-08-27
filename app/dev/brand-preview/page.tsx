import Image from "next/image";
import Link from "next/link";
import styles from "./brand-preview.module.css";

const steps = [
  { no: "01", name: "WATCH", ko: "장면을 통째로 본다", tone: "green" },
  { no: "02", name: "MIMIC", ko: "소리의 리듬을 훔친다", tone: "yellow" },
  { no: "03", name: "GUESS", ko: "들리는 표현을 잡는다", tone: "blue" },
  { no: "04", name: "WORD", ko: "내 문장으로 완성한다", tone: "pink" },
] as const;

const notes = [
  { title: "영어는 공부보다 장면으로 남는다.", tag: "MIMIC NOTE 01", tone: "paper" },
  { title: "한 달에 영화 하나, 원서 하나. 깊게 끝낸다.", tag: "OUR RULE", tone: "green" },
  { title: "점수보다 먼저, 내가 다시 말할 수 있는가.", tag: "FOR PARENTS", tone: "blue" },
] as const;

export default function BrandPreviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/dev/brand-preview" aria-label="Mimic 홈">
          MimiC
        </Link>
        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          <a href="#monthly">이번 달</a>
          <a href="#method">학습 방식</a>
          <a href="#library">콘텐츠</a>
          <a href="#parents">부모·선생님</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/auth/login" className={styles.login}>로그인</Link>
          <button className={styles.menu} type="button" aria-label="메뉴 열기">
            <span />
            <span />
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroStamp}>SOUND → STORY → MY VOICE</div>
        <h1>
          <span>영어, 외우지 말고</span>
          <em>장면 속으로.</em>
        </h1>
        <div className={styles.heroBottom}>
          <p>
            영화의 목소리를 따라가고, 원서의 이야기를 다시 말하며
            <br className={styles.desktopOnly} /> 내 영어가 되는 순간까지.
          </p>
          <a className={styles.primaryCta} href="#monthly">
            이번 달 장면 보기 <span>↘</span>
          </a>
        </div>
        <div className={styles.heroScribble} aria-hidden="true">SAY IT<br />LIKE YOU<br />MEAN IT!</div>
      </section>

      <section className={styles.marquee} aria-label="Mimic 학습 원칙">
        <div>WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY · WATCH IT · STEAL THE RHYTHM · TELL IT YOUR WAY ·</div>
      </section>

      <section className={styles.monthly} id="monthly">
        <div className={styles.sectionIntro}>
          <span>THIS MONTH / 08</span>
          <h2>이번 달에는<br />두 이야기를 깊게.</h2>
          <p>콘텐츠를 많이 넘기지 않습니다. 한 편을 보고, 듣고, 흉내 내고, 내 말로 끝냅니다.</p>
        </div>

        <article className={`${styles.featureCard} ${styles.movieCard}`}>
          <div className={styles.cardNumber}>01 / MOVIE</div>
          <div className={styles.posterFrame}>
            <Image src="/sing2Poster.jpg" alt="Sing 2 영화 포스터" fill priority sizes="(max-width: 760px) 92vw, 55vw" />
          </div>
          <div className={styles.cardCaption}>
            <div>
              <span>이번 달 영화</span>
              <h3>SING 2</h3>
            </div>
            <p>무대에 오르기 전, 먼저 목소리를 빌려보는 12개의 장면.</p>
            <Link href="/sing2/selecting?id=001:1">영화 코스 열기 <b>→</b></Link>
          </div>
        </article>

        <article className={`${styles.featureCard} ${styles.bookCard}`}>
          <div className={styles.cardNumber}>02 / BOOK</div>
          <div className={styles.bookCover}>
            <Image src="/pinocchio.jpeg" alt="Pinocchio 원서 표지" fill sizes="(max-width: 760px) 86vw, 33vw" />
            <span className={styles.bookTape} aria-hidden="true" />
          </div>
          <div className={styles.cardCaption}>
            <div>
              <span>이번 달 원서</span>
              <h3>PINOCCHIO</h3>
            </div>
            <p>활자를 읽기 전에 귀로 만나고, 한 문장씩 이야기의 목소리를 만든다.</p>
            <Link href="/book/selecting?id=003:1">원서 코스 열기 <b>→</b></Link>
          </div>
        </article>
      </section>

      <section className={styles.method} id="method">
        <div className={styles.methodHeading}>
          <p>HOW MIMIC WORKS</p>
          <h2>문제집이 아니라<br /><i>한 편의 리허설.</i></h2>
          <Image src="/home/chameleon.png" alt="" width={112} height={78} className={styles.guide} />
        </div>
        <div className={styles.steps}>
          {steps.map((step) => (
            <article key={step.no} className={`${styles.step} ${styles[step.tone]}`}>
              <span>{step.no}</span>
              <h3>{step.name}</h3>
              <p>{step.ko}</p>
              <b aria-hidden="true">↗</b>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.library} id="library">
        <div className={styles.libraryHead}>
          <span>FIELD NOTES</span>
          <h2>영어가 내 것이 되는 순간들.</h2>
          <p>학습 기록, 장면 이야기, 아이가 실제로 바뀌는 과정까지 Mimic의 편집 노트에 담습니다.</p>
        </div>
        <div className={styles.noteGrid}>
          {notes.map((note, index) => (
            <article key={note.tag} className={`${styles.note} ${styles[note.tone]}`}>
              <span>{note.tag}</span>
              <h3>{note.title}</h3>
              <div className={styles.noteDoodle} aria-hidden="true">{index === 0 ? "listen!" : index === 1 ? "1 + 1" : "not a score"}</div>
              <a href="#parents">읽어보기 →</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.trust} id="parents">
        <div>
          <span>FOR GROWN-UPS</span>
          <h2>재밌어 보이는 것과<br />실제로 배우는 것은<br /><em>둘 다 필요하니까.</em></h2>
        </div>
        <div className={styles.trustCopy}>
          <p>아이에게는 이야기와 목소리를, 부모와 선생님에게는 진도와 근거를 보여줍니다.</p>
          <ul>
            <li><b>01</b> 실제 말한 문장과 반복 기록</li>
            <li><b>02</b> 영화에서 원서로 이어지는 월간 과정</li>
            <li><b>03</b> 학년이 아닌 수행 기반 시작 단계</li>
          </ul>
          <Link href="/placement">5분 레벨 찾기 <span>→</span></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>MimiC</div>
        <p>빌린 목소리로 시작해<br />내 목소리로 끝내는 영어.</p>
        <div className={styles.footerLinks}>
          <a href="#monthly">이번 달</a>
          <a href="#method">학습 방식</a>
          <a href="#parents">부모·선생님</a>
          <Link href="/auth/login">로그인</Link>
        </div>
        <small>© 2026 MIMIC · BRAND STUDY PREVIEW</small>
      </footer>
    </main>
  );
}
