"use client";

import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import LessonShell from "../../components/LessonShell";
import PlaybackControls from "../../components/PlaybackControls";
import { FullscreenIcon, HeaderCloseLink, HeaderIconButton } from "../../components/HeaderIcons";
import SceneList from "../../components/SceneList";
import GuessingResultScreen from "../../components/GuessingResultScreen";
import ControlTriangle from "../../components/ControlTriangle";

const SCENES = Array.from({ length: 8 }, (_, i) => ({
  startTime: i,
  endTime: i + 2,
  text: `Line ${i + 1}`,
}));

function VideoStub({ label, skip = true }: { label: string; skip?: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#141414] text-sm text-gray-400" style={{ fontFamily: "Encode Sans, sans-serif" }}>
      <span>{label}</span>
      <button type="button" className="watch-back absolute left-3 top-3 z-20 sm:left-4 sm:top-4" aria-label="뒤로">
        <img src="/home/back.svg" alt="" className="h-full w-full" />
      </button>
      <div className="lesson-top-actions absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        <HeaderIconButton label="전체화면" onClick={() => undefined}>
          <FullscreenIcon />
        </HeaderIconButton>
        {skip ? <button type="button" className="watch-skip">SKIP</button> : null}
      </div>
    </div>
  );
}

function LabWatching() {
  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-watch learning-content-movie"
      footer={<p className="watch-chapter">CHAPTER 1</p>}
      video={<VideoStub label="Watching video" />}
      controls={
        <div className="watch-progress-control relative z-50 w-full overflow-visible">
          <div className="watch-bar">
            <div className="watch-bar-track">
              <div className="watch-bar-fill" style={{ width: "35%" }} />
            </div>
            <div className="watch-bar-thumb" style={{ left: "35%" }} />
            <span className="watch-time" style={{ left: "35%" }}>00:12 / 00:34</span>
          </div>
        </div>
      }
    />
  );
}

function LabMimicking() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);
  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-mimic learning-content-movie"
      onAsideDismiss={() => setOpen(false)}
      video={<VideoStub label="Mimicking video" />}
      controls={
        <div className="lesson-dock mimic-dock">
          <PlaybackControls variant="cinema" onPrev={() => undefined} onNext={() => undefined} onPlay={() => undefined} activeIndex={2} />
          <button type="button" className="mimic-count" onClick={() => setOpen((v) => !v)}>
            <span>03 / </span><span className="mimic-count-total">30</span>
            <img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
          </button>
        </div>
      }
      aside={
        open ? (
          <div className="flex h-full flex-col rounded-lg bg-[#1a1a1a] p-3">
            <h3 className="mb-3 text-sm font-semibold text-[#60D96C]">SCENES</h3>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SceneList scenes={SCENES} currentIndex={2} onSceneClick={() => undefined} isSequenceRunning={false} />
            </div>
          </div>
        ) : null
      }
    />
  );
}

function LabGuessing() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);
  return (
    <LessonShell
      hideHeader
      stageClassName="learning-stage learning-stage-guess learning-content-movie"
      onAsideDismiss={() => setOpen(false)}
      video={<VideoStub label="Guessing video" />}
      controls={
        <div className="lesson-dock guess-dock">
          <div className="guess-abc">
            <ControlTriangle direction="left" label="이전" onClick={() => undefined} />
            {["A", "B", "C"].map((label) => (
              <button
                key={label}
                type="button"
                className="guess-opt"
              >
                {label}
              </button>
            ))}
            <ControlTriangle direction="right" label="다음" onClick={() => undefined} />
          </div>
          <button type="button" className="mimic-count" onClick={() => setOpen((v) => !v)}>
            <span>02 / </span><span className="mimic-count-total">10</span>
            <img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
          </button>
        </div>
      }
      aside={
        open ? (
          <div className="flex h-full flex-col rounded-lg bg-[#1a1a1a] p-3">
            <h3 className="mb-3 text-sm font-semibold text-[#60D96C]">QUESTIONS</h3>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`mb-2 rounded px-3 py-3 text-sm ${i === 1 ? "bg-[#60D96C] text-black" : "bg-[#2a2a2a] text-gray-400"}`}>
                Q{i + 1}
              </div>
            ))}
          </div>
        ) : null
      }
    />
  );
}

function LabWord() {
  const words = ["ordinary", "school", "girl", "discovers", "world", "stage", "dream", "moon", "theater", "show"];
  return (
    <LessonShell
      hideHeader
      compactStage
      stageClassName="learning-stage learning-stage-word learning-content-movie"
    >
      <div className="word-board is-arranging">
        <div className="word-chips-side">
          {words.slice(0, 5).map((word) => (
            <button key={word} type="button" className="word-chip">
              {word}
            </button>
          ))}
        </div>
        <div className="word-main-stack flex min-h-0 flex-1 flex-col items-center">
          <div className="flex w-full shrink-0 items-center justify-center md:min-h-0 md:flex-1">
            <div className="word-video watch-frame relative aspect-video w-full overflow-hidden md:h-full md:aspect-auto">
              <VideoStub label="Word video" skip={false} />
            </div>
          </div>
          <div className="word-chips-mobile">
            {words.map((word) => (
              <button key={word} type="button" className="word-chip is-compact">
                {word}
              </button>
            ))}
          </div>
          <div className="lesson-dock word-dock relative z-20 w-full justify-center overflow-x-auto pt-1">
            <div className="word-bar">
              <ControlTriangle direction="left" label="이전" onClick={() => undefined} />
              <div className="flex shrink-0 items-center justify-center rounded-[10px]" style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)", background: "#60D96C" }}>
                <span className="ctrl-play-icon" />
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-[10px]" style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)", background: "#666666" }}>
                <span className="ctrl-play-icon" />
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-[10px]" style={{ width: "var(--ctrl-size)", height: "var(--ctrl-size)", background: "#666666" }}>
                <span className="ctrl-mute-letter">m</span>
              </div>
              <ControlTriangle direction="right" label="다음" onClick={() => undefined} />
            </div>
            <button type="button" className="mimic-count">
              <span>01 / </span><span className="mimic-count-total">10</span>
              <img src="/home/chevron.svg" alt="" className="mimic-count-chevron" />
            </button>
          </div>
          <button type="button" className="word-submit is-ready relative z-20 mb-1 mt-1 shrink-0" aria-label="문장 완성">
            <img src="/Subject.png" alt="" />
          </button>
        </div>
        <div className="word-chips-side">
          {words.slice(5).map((word) => (
            <button key={word} type="button" className="word-chip">
              {word}
            </button>
          ))}
        </div>
      </div>
    </LessonShell>
  );
}

const modeButtonClass =
  "rounded-2xl border-4 border-gray-300 px-4 py-4 text-lg font-bold text-black transition-all duration-200 sm:text-xl lg:border-8 lg:px-8 lg:py-5 lg:text-2xl";

function LabSelecting() {
  return (
    <main className="flex min-h-dvh flex-col px-4 py-4" style={{ backgroundColor: "#000" }}>
      <div className="mb-6 flex items-center justify-between md:mb-8">
        <h1 className="text-xl font-semibold text-[#60D96C]" style={{ fontFamily: "Encode Sans, sans-serif" }}>
          SING 2
        </h1>
        <div className="flex items-center gap-1.5">
          <HeaderIconButton label="전체화면" onClick={() => undefined}>
            <FullscreenIcon />
          </HeaderIconButton>
          <HeaderCloseLink />
        </div>
      </div>
      <div className="mb-6 flex justify-center md:mb-8">
        <div className="w-full max-w-xs rounded-xl bg-[#201E1E] px-6 py-3 text-center text-white sm:max-w-sm">Lesson 1</div>
      </div>
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4 lg:flex lg:max-w-none lg:justify-center lg:gap-6">
          {["Watch", "Mimic", "Guess", "Word"].map((label) => (
            <button key={label} type="button" className={modeButtonClass} style={{ backgroundColor: "white", fontFamily: "Encode Sans, sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function LabHome() {
  return (
    <main className="min-h-dvh bg-black px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-8 rounded-full bg-[#60D96C]" />
        <div className="h-8 w-20 rounded-full bg-[#60D96C]" />
      </div>
      <div className="flex justify-center">
        <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-lg border-4 border-[#555] sm:border-8 md:w-[75%] lg:w-[70%]">
          <div className="flex h-full items-center justify-center bg-[#222] text-gray-400">SING 2 poster</div>
        </div>
      </div>
    </main>
  );
}

function LabLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#60D96C] sm:text-3xl">로그인</h1>
        <div className="space-y-4">
          <div className="h-12 rounded-lg bg-gray-800" />
          <div className="h-12 rounded-lg bg-gray-800" />
          <div className="h-12 rounded-lg bg-[#60D96C]" />
        </div>
      </div>
    </main>
  );
}

function LabSignup() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#60D96C] sm:text-3xl">회원가입</h1>
        <div className="space-y-4">
          <div className="h-12 rounded-lg bg-gray-800" />
          <div className="h-12 rounded-lg bg-gray-800" />
          <div className="h-12 rounded-lg bg-gray-800" />
          <div className="h-12 rounded-lg bg-[#60D96C]" />
        </div>
      </div>
    </main>
  );
}

function LabAdmin() {
  return (
    <main className="min-h-dvh bg-black p-4 text-white sm:p-6 md:p-10">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">진도 · 학습 시간</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-800">
            <tr>
              {["닉네임", "이메일", "이번 주", "누적", "완료"].map((h) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-800">
              <td className="p-3">미믹 (원장)</td>
              <td className="p-3">user@mail.com</td>
              <td className="p-3">12분</td>
              <td className="p-3">40분</td>
              <td className="p-3">8/48</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}

function LabContent() {
  const searchParams = useSearchParams();
  const screen = searchParams.get("screen") || "watching";
  switch (screen) {
    case "home":
      return <LabHome />;
    case "login":
      return <LabLogin />;
    case "signup":
      return <LabSignup />;
    case "selecting":
      return <LabSelecting />;
    case "watching":
      return <LabWatching />;
    case "mimicking":
      return <LabMimicking />;
    case "guessing":
      return <LabGuessing />;
    case "word":
      return <LabWord />;
    case "guess-result":
      return (
        <GuessingResultScreen
          movieTitle="SING 2"
          correctAnswers={8}
          totalQuestions={10}
          isFullscreen={false}
          toggleFullscreen={() => undefined}
          onStopAllMedia={() => undefined}
          onNext={() => undefined}
        />
      );
    case "admin":
      return <LabAdmin />;
    default:
      return <LabWatching />;
  }
}

export default function LayoutLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <LabContent />
    </Suspense>
  );
}
