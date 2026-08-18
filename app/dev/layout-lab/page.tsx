"use client";

import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import LessonShell from "../../components/LessonShell";
import PlaybackControls from "../../components/PlaybackControls";
import { CaptionsIcon, FullscreenIcon, HeaderCloseLink, HeaderIconButton, ListIcon } from "../../components/HeaderIcons";
import SceneList from "../../components/SceneList";
import GuessingResultScreen from "../../components/GuessingResultScreen";
import ControlTriangle from "../../components/ControlTriangle";

const SCENES = Array.from({ length: 8 }, (_, i) => ({
  startTime: i,
  endTime: i + 2,
  text: `Line ${i + 1}`,
}));

function VideoStub({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#141414] text-sm text-gray-400" style={{ fontFamily: "Encode Sans, sans-serif" }}>
      {label}
    </div>
  );
}

function LabWatching() {
  return (
    <LessonShell
      subtitle="Watch"
      extraActions={
        <>
          <HeaderIconButton label="자막" onClick={() => undefined}>
            <CaptionsIcon />
          </HeaderIconButton>
          <HeaderIconButton label="전체화면" onClick={() => undefined}>
            <FullscreenIcon />
          </HeaderIconButton>
        </>
      }
      video={<VideoStub label="Watching video" />}
      controls={
        <div className="w-full px-2 md:px-8">
          <div className="relative h-2 w-full rounded-full bg-gray-300">
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[#60D96C]" />
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
      subtitle="3/30"
      onAsideDismiss={() => setOpen(false)}
      extraActions={
        <>
          <HeaderIconButton label="자막" onClick={() => undefined}>
            <CaptionsIcon active />
          </HeaderIconButton>
          <HeaderIconButton label="목록" onClick={() => setOpen((v) => !v)}>
            <ListIcon active={open} />
          </HeaderIconButton>
          <HeaderIconButton label="전체화면" onClick={() => undefined}>
            <FullscreenIcon />
          </HeaderIconButton>
        </>
      }
      video={<VideoStub label="Mimicking video" />}
      controls={<PlaybackControls onPrev={() => undefined} onNext={() => undefined} onPlay={() => undefined} activeIndex={2} />}
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
      subtitle="2/10"
      onAsideDismiss={() => setOpen(false)}
      extraActions={
        <>
          <HeaderIconButton label="목록" onClick={() => setOpen((v) => !v)}>
            <ListIcon active={open} />
          </HeaderIconButton>
          <HeaderIconButton label="전체화면" onClick={() => undefined}>
            <FullscreenIcon />
          </HeaderIconButton>
        </>
      }
      video={<VideoStub label="Guessing video" />}
      controls={
        <div className="w-full overflow-x-auto">
          <div
            className="mx-auto flex w-max max-w-full items-center justify-center rounded-lg bg-[#201E1E] px-1 py-1 sm:px-2"
            style={{ gap: "var(--ctrl-gap)" }}
          >
            <ControlTriangle direction="left" label="이전" onClick={() => undefined} />
            {["A", "B", "C"].map((label) => (
              <button
                key={label}
                type="button"
                className="min-w-[2.6rem] rounded-xl border-4 border-gray-300 bg-white px-3 py-2 text-sm font-bold text-black sm:min-w-[3.5rem] sm:rounded-2xl sm:border-8 sm:px-6 sm:py-4 sm:text-lg"
                style={{ fontFamily: "Encode Sans, sans-serif" }}
              >
                {label}
              </button>
            ))}
            <ControlTriangle direction="right" label="다음" onClick={() => undefined} />
          </div>
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
      subtitle="1/10"
      extraActions={
        <HeaderIconButton label="전체화면" onClick={() => undefined}>
          <FullscreenIcon />
        </HeaderIconButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(5.5rem,0.9fr)_minmax(0,1.7fr)_minmax(5.5rem,0.9fr)] md:gap-3 lg:grid-cols-[minmax(7.5rem,1fr)_minmax(0,2.2fr)_minmax(7.5rem,1fr)]">
        <div className="hidden flex-col gap-2 overflow-y-auto md:flex">
          {words.slice(0, 5).map((word) => (
            <button key={word} type="button" className="w-full break-words rounded-xl border-4 border-gray-300 bg-white px-2 py-2 text-xs font-bold text-black lg:rounded-2xl lg:px-4 lg:py-4 lg:text-lg">
              {word}
            </button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center">
          <div className="flex w-full shrink-0 items-center justify-center md:min-h-0 md:flex-1">
            <div
              className="relative aspect-video w-full overflow-hidden rounded-xl border-4 border-[#201E1E] md:h-full md:aspect-auto md:rounded-3xl md:border-8"
            >
              <VideoStub label="Word video" />
            </div>
          </div>
          <div className="mt-2 flex max-h-[22vh] flex-wrap justify-center gap-1 overflow-y-auto md:hidden">
            {words.map((word) => (
              <button key={word} type="button" className="rounded-xl border-2 border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-black">
                {word}
              </button>
            ))}
          </div>
          <div className="relative z-50 mt-auto w-full overflow-x-auto pt-1">
            <div className="mx-auto flex w-max max-w-full items-center justify-center rounded-lg bg-[#201E1E] px-1 py-1" style={{ gap: "var(--ctrl-gap)" }}>
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
          </div>
        </div>
        <div className="hidden flex-col gap-2 overflow-y-auto md:flex">
          {words.slice(5).map((word) => (
            <button key={word} type="button" className="w-full break-words rounded-xl border-4 border-gray-300 bg-white px-2 py-2 text-xs font-bold text-black lg:rounded-2xl lg:px-4 lg:py-4 lg:text-lg">
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
