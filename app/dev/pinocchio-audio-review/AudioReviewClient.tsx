"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./audio-review.module.css";

type FileReceipt = {
  path: string;
  sha256: string;
  bytes: number;
};

type ChapterReceipt = {
  chapter: number;
  contentId: string;
  files: { master: FileReceipt; timeline: FileReceipt };
  mimicAssetSetSha256: string;
  boundarySafety: {
    compilerVersion: string;
    pendingBoundaryIds: string[];
  };
};

type ReleaseReceipt = {
  schemaVersion: string;
  contentPack: string;
  compilerVersion: string;
  payloadSha256: string;
  chapters: ChapterReceipt[];
};

type ApprovalEvidence = {
  qaStatus: "human-listen-pass";
  masterSha256: string;
  boundaryId: string;
  cut: number;
  compilerVersion: string;
  leftAudioSha256: string;
  rightAudioSha256: string;
};

type MimicItem = {
  id: string;
  text: string;
  audio: string;
  audioSha256: string;
};

type Boundary = {
  id: string;
  leftId: string;
  rightId: string;
  cut: number;
  needsHumanReview: boolean;
  humanApprovalEvidence?: ApprovalEvidence;
};

type Timeline = {
  contentChecksum: string;
  mimicItems: MimicItem[];
  boundarySafety: {
    version: string;
    masterSha256: string;
    boundaries: Boundary[];
    pendingBoundaryIds: string[];
  };
};

type BoundaryCard = {
  key: string;
  chapter: number;
  order: number;
  boundaryId: string;
  cut: number;
  left: MimicItem;
  right: MimicItem;
  leftUrl: string;
  rightUrl: string;
  masterUrl: string;
  evidence: ApprovalEvidence;
};

type BoundaryVerdict = "pass" | "needs-recut";

type BoundaryReview = {
  verdict: BoundaryVerdict;
  reviewedAt: string;
  note: string;
};

type ChapterReview = {
  reviewedAt: string;
};

type HeardState = Record<string, { left: boolean; right: boolean; context: boolean }>;

type ChapterPlayback = {
  duration: number;
  heardSeconds: number[];
  reachedNaturalEnd: boolean;
};

type StoredReview = {
  reviewer: string;
  boundaryReviews: Record<string, BoundaryReview>;
  chapterReviews: Record<string, ChapterReview>;
  heardBoundaries: HeardState;
  chapterPlayback: Record<string, ChapterPlayback>;
  startedAt: string;
};

type PlaybackStep = {
  url: string;
  label: string;
  boundaryKey?: string;
  side?: "left" | "right";
};

type ActivePlaybackStep = PlaybackStep & {
  token: number;
  resolvedUrl: string;
};

type ContextPlayback = {
  boundaryKey: string;
  token: number;
  stopAt: number;
};

const RECEIPT_URL = "/prototype-audio/pinocchio-v2/release-receipt.json";
const STORAGE_PREFIX = "mimic:pinocchio-human-review";
const TARGET_SCHEMA_VERSION = "pinocchio-human-review-targets/1.0.0";
const EXPORT_SCHEMA_VERSION = "pinocchio-human-review/1.0.0";
const REQUIRED_CHAPTER_COVERAGE = 0.98;

function publicUrl(path: string) {
  return path.startsWith("public/") ? `/${path.slice("public/".length)}` : `/${path}`;
}

function assetUrlFromTimeline(timelinePath: string, relativePath: string) {
  const timeline = publicUrl(timelinePath);
  return `${timeline.slice(0, timeline.lastIndexOf("/") + 1)}${relativePath}`;
}

async function sha256Text(value: string) {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copyFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export default function AudioReviewClient() {
  const [receipt, setReceipt] = useState<ReleaseReceipt | null>(null);
  const [boundaries, setBoundaries] = useState<BoundaryCard[]>([]);
  const [reviewer, setReviewer] = useState("");
  const [boundaryReviews, setBoundaryReviews] = useState<Record<string, BoundaryReview>>({});
  const [chapterReviews, setChapterReviews] = useState<Record<string, ChapterReview>>({});
  const [heardBoundaries, setHeardBoundaries] = useState<HeardState>({});
  const [chapterPlayback, setChapterPlayback] = useState<Record<string, ChapterPlayback>>({});
  const [chapterChecksums, setChapterChecksums] = useState<Record<string, string>>({});
  const [reviewTargetSetSha256, setReviewTargetSetSha256] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "pass" | "needs-recut">("open");
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playbackLabel, setPlaybackLabel] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<PlaybackStep[]>([]);
  const activeStepRef = useRef<ActivePlaybackStep | null>(null);
  const contextPlaybackRef = useRef<ContextPlayback | null>(null);
  const chapterLastTimeRef = useRef<Record<string, number | null>>({});
  const playbackTokenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReviewData() {
      try {
        const receiptResponse = await fetch(RECEIPT_URL, { cache: "no-store" });
        if (!receiptResponse.ok) throw new Error(`Release receipt returned ${receiptResponse.status}`);
        const nextReceipt = await receiptResponse.json() as ReleaseReceipt;
        if (!Array.isArray(nextReceipt.chapters) || nextReceipt.chapters.length !== 12) {
          throw new Error("Release receipt does not contain 12 chapters");
        }

        const chapterIds = new Set(nextReceipt.chapters.map((chapter) => chapter.chapter));
        if (chapterIds.size !== 12 || !Array.from({ length: 12 }, (_, index) => index + 1).every((chapter) => chapterIds.has(chapter))) {
          throw new Error("Release receipt chapter IDs are incomplete or duplicated");
        }

        const timelines = await Promise.all(nextReceipt.chapters.map(async (chapter) => {
          const response = await fetch(publicUrl(chapter.files.timeline.path), { cache: "no-store" });
          if (!response.ok) throw new Error(`Chapter ${chapter.chapter} timeline returned ${response.status}`);
          return response.json() as Promise<Timeline>;
        }));

        const nextBoundaries: BoundaryCard[] = [];
        const nextChecksums: Record<string, string> = {};
        nextReceipt.chapters.forEach((chapter, chapterIndex) => {
          const timeline = timelines[chapterIndex];
          nextChecksums[String(chapter.chapter)] = timeline.contentChecksum;
          const pending = new Set(chapter.boundarySafety.pendingBoundaryIds);
          if (timeline.boundarySafety.version !== chapter.boundarySafety.compilerVersion
            || timeline.boundarySafety.masterSha256 !== chapter.files.master.sha256
            || JSON.stringify(timeline.boundarySafety.pendingBoundaryIds) !== JSON.stringify(chapter.boundarySafety.pendingBoundaryIds)) {
            throw new Error(`Chapter ${chapter.chapter} receipt and timeline are out of sync`);
          }
          timeline.boundarySafety.boundaries.forEach((boundary, index) => {
            if (!pending.has(boundary.id)) return;
            const left = timeline.mimicItems[index];
            const right = timeline.mimicItems[index + 1];
            const evidence = boundary.humanApprovalEvidence;
            if (!left || !right || !evidence
              || boundary.leftId !== left.id
              || boundary.rightId !== right.id
              || evidence.boundaryId !== boundary.id
              || evidence.cut !== boundary.cut
              || evidence.masterSha256 !== chapter.files.master.sha256
              || evidence.compilerVersion !== chapter.boundarySafety.compilerVersion
              || evidence.leftAudioSha256 !== left.audioSha256
              || evidence.rightAudioSha256 !== right.audioSha256) {
              throw new Error(`Chapter ${chapter.chapter} boundary ${boundary.id} is incomplete`);
            }
            nextBoundaries.push({
              key: `${chapter.chapter}:${boundary.id}`,
              chapter: chapter.chapter,
              order: index + 1,
              boundaryId: boundary.id,
              cut: boundary.cut,
              left,
              right,
              leftUrl: assetUrlFromTimeline(chapter.files.timeline.path, left.audio),
              rightUrl: assetUrlFromTimeline(chapter.files.timeline.path, right.audio),
              masterUrl: publicUrl(chapter.files.master.path),
              evidence,
            });
          });
        });

        const targetManifest = {
          schemaVersion: TARGET_SCHEMA_VERSION,
          contentPack: nextReceipt.contentPack,
          compilerVersion: nextReceipt.compilerVersion,
          baseReleaseReceiptPayloadSha256: nextReceipt.payloadSha256,
          boundaries: nextBoundaries.map((card) => ({ chapter: card.chapter, ...card.evidence })),
          chapters: nextReceipt.chapters.map((chapter, index) => ({
            chapter: chapter.chapter,
            masterSha256: chapter.files.master.sha256,
            compilerVersion: chapter.boundarySafety.compilerVersion,
            mimicAssetSetSha256: chapter.mimicAssetSetSha256,
            contentChecksum: timelines[index].contentChecksum,
          })),
        };
        const nextTargetHash = await sha256Text(JSON.stringify(targetManifest));

        if (cancelled) return;
        setReceipt(nextReceipt);
        setBoundaries(nextBoundaries);
        setChapterChecksums(nextChecksums);
        setReviewTargetSetSha256(nextTargetHash);

        const storageKey = `${STORAGE_PREFIX}:${nextReceipt.payloadSha256}`;
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<StoredReview>;
            const boundaryKeys = new Set(nextBoundaries.map((item) => item.key));
            const validBoundaryReviews = Object.fromEntries(Object.entries(parsed.boundaryReviews ?? {}).filter(([key, review]) => (
              boundaryKeys.has(key)
              && (review.verdict === "pass" || review.verdict === "needs-recut")
              && Number.isFinite(Date.parse(review.reviewedAt))
            )));
            const validChapterReviews = Object.fromEntries(Object.entries(parsed.chapterReviews ?? {}).filter(([key, review]) => (
              Number(key) >= 1 && Number(key) <= 12 && Number.isFinite(Date.parse(review.reviewedAt))
            )));
            setReviewer(typeof parsed.reviewer === "string" ? parsed.reviewer : "");
            setBoundaryReviews(validBoundaryReviews);
            setChapterReviews(validChapterReviews);
            setHeardBoundaries(Object.fromEntries(Object.entries(parsed.heardBoundaries ?? {}).filter(([key]) => boundaryKeys.has(key))));
            setChapterPlayback(parsed.chapterPlayback ?? {});
            setStartedAt(typeof parsed.startedAt === "string" && Number.isFinite(Date.parse(parsed.startedAt))
              ? parsed.startedAt
              : new Date().toISOString());
          } catch {
            window.localStorage.removeItem(storageKey);
            setStartedAt(new Date().toISOString());
          }
        } else {
          setStartedAt(new Date().toISOString());
        }
        setIsHydrated(true);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "검수 데이터를 불러오지 못했습니다.");
        }
      }
    }

    void loadReviewData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!receipt || !isHydrated) return;
    const stored: StoredReview = {
      reviewer,
      boundaryReviews,
      chapterReviews,
      heardBoundaries,
      chapterPlayback,
      startedAt,
    };
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}:${receipt.payloadSha256}`, JSON.stringify(stored));
    } catch {
      setExportMessage("이 기기의 임시 저장 공간을 사용할 수 없습니다. JSON을 자주 내려받아 주세요.");
    }
  }, [boundaryReviews, chapterPlayback, chapterReviews, heardBoundaries, isHydrated, receipt, reviewer, startedAt]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return;
      audioRef.current?.pause();
      document.querySelectorAll<HTMLAudioElement>("audio[data-chapter-audio]").forEach((audio) => audio.pause());
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const pauseChapterAudio = () => {
    document.querySelectorAll<HTMLAudioElement>("audio[data-chapter-audio]").forEach((audio) => audio.pause());
  };

  const markHeard = (step: PlaybackStep) => {
    if (!step.boundaryKey || !step.side) return;
    setHeardBoundaries((current) => ({
      ...current,
      [step.boundaryKey!]: {
        left: current[step.boundaryKey!]?.left ?? false,
        right: current[step.boundaryKey!]?.right ?? false,
        context: current[step.boundaryKey!]?.context ?? false,
        [step.side!]: true,
      },
    }));
  };

  const markContextHeard = (boundaryKey: string) => {
    setHeardBoundaries((current) => ({
      ...current,
      [boundaryKey]: {
        left: current[boundaryKey]?.left ?? false,
        right: current[boundaryKey]?.right ?? false,
        context: true,
      },
    }));
  };

  const playStep = (step: PlaybackStep) => {
    const audio = audioRef.current;
    if (!audio) return;
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    pauseChapterAudio();
    contextPlaybackRef.current = null;
    activeStepRef.current = {
      ...step,
      token,
      resolvedUrl: new URL(step.url, window.location.href).href,
    };
    audio.src = step.url;
    audio.currentTime = 0;
    setPlaybackLabel(step.label);
    setPlaybackError(null);
    void audio.play().catch(() => {
      if (token !== playbackTokenRef.current) return;
      activeStepRef.current = null;
      setPlaybackLabel(null);
      setPlaybackError("재생이 막혔습니다. 다시 눌러 주세요.");
    });
  };

  const playSteps = (steps: PlaybackStep[]) => {
    const [first, ...rest] = steps;
    if (!first) return;
    queueRef.current = rest;
    playStep(first);
  };

  const playContext = async (card: BoundaryCard) => {
    const audio = audioRef.current;
    if (!audio) return;
    const playbackToken = playbackTokenRef.current + 1;
    playbackTokenRef.current = playbackToken;
    pauseChapterAudio();
    queueRef.current = [];
    activeStepRef.current = null;
    contextPlaybackRef.current = null;
    audio.pause();
    const contextStart = Math.max(0, card.cut - 1.35);
    const requestedContextEnd = card.cut + 1.35;
    audio.src = `${card.masterUrl}#t=${contextStart},${requestedContextEnd}`;
    setPlaybackLabel(`Chapter ${card.chapter} · 경계 앞뒤 문맥`);
    setPlaybackError(null);
    try {
      const metadataPromise = audio.readyState < 1
        ? new Promise<void>((resolve, reject) => {
          const handleLoaded = () => {
            audio.removeEventListener("error", handleError);
            resolve();
          };
          const handleError = () => {
            audio.removeEventListener("loadedmetadata", handleLoaded);
            reject(new Error("audio load failed"));
          };
          audio.addEventListener("loadedmetadata", handleLoaded, { once: true });
          audio.addEventListener("error", handleError, { once: true });
        })
        : Promise.resolve();
      audio.load();
      try { audio.currentTime = contextStart; } catch { /* Metadata can arrive after this user gesture. */ }
      const playPromise = audio.play();
      await metadataPromise;
      if (playbackToken !== playbackTokenRef.current) return;
      audio.currentTime = contextStart;
      contextPlaybackRef.current = {
        boundaryKey: card.key,
        token: playbackToken,
        stopAt: Math.min(audio.duration || requestedContextEnd, requestedContextEnd),
      };
      await playPromise;
    } catch {
      if (playbackToken !== playbackTokenRef.current) return;
      contextPlaybackRef.current = null;
      setPlaybackLabel(null);
      setPlaybackError("원본 문맥을 재생하지 못했습니다.");
    }
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    const context = contextPlaybackRef.current;
    if (audio && context && context.token === playbackTokenRef.current && audio.currentTime >= context.stopAt - 0.08) {
      markContextHeard(context.boundaryKey);
      contextPlaybackRef.current = null;
      setPlaybackLabel(null);
      return;
    }
    const completed = activeStepRef.current;
    const completedCurrentSource = Boolean(audio && completed
      && completed.token === playbackTokenRef.current
      && audio.ended
      && audio.currentSrc.split("#")[0] === completed.resolvedUrl.split("#")[0]);
    if (completed && !completedCurrentSource) return;
    if (completed && completedCurrentSource) {
      markHeard(completed);
    }
    const next = queueRef.current.shift();
    if (next) {
      playStep(next);
      return;
    }
    activeStepRef.current = null;
    setPlaybackLabel(null);
  };

  const handleBoundaryAudioError = () => {
    queueRef.current = [];
    activeStepRef.current = null;
    contextPlaybackRef.current = null;
    setPlaybackLabel(null);
    setPlaybackError("음원을 불러오지 못했습니다. 네트워크를 확인하고 다시 눌러 주세요.");
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    const context = contextPlaybackRef.current;
    if (!audio || !context || context.token !== playbackTokenRef.current || audio.currentTime < context.stopAt) return;
    audio.pause();
    markContextHeard(context.boundaryKey);
    contextPlaybackRef.current = null;
    setPlaybackLabel(null);
  };

  const reviewBoundary = (card: BoundaryCard, verdict: BoundaryVerdict) => {
    const heard = heardBoundaries[card.key];
    if (!reviewer.trim() || !heard?.left || !heard?.right || !heard?.context) return;
    setBoundaryReviews((current) => ({
      ...current,
      [card.key]: {
        verdict,
        reviewedAt: new Date().toISOString(),
        note: current[card.key]?.note ?? "",
      },
    }));
    setExportMessage(null);
  };

  const updateNote = (key: string, note: string) => {
    setBoundaryReviews((current) => {
      const existing = current[key];
      if (!existing) return current;
      return { ...current, [key]: { ...existing, note } };
    });
  };

  const chapterCoverage = (chapter: number) => {
    const playback = chapterPlayback[String(chapter)];
    if (!playback?.duration) return 0;
    return Math.min(1, playback.heardSeconds.length / Math.max(1, Math.ceil(playback.duration)));
  };

  const chapterCanApprove = (chapter: number) => {
    const playback = chapterPlayback[String(chapter)];
    return Boolean(playback?.reachedNaturalEnd && chapterCoverage(chapter) >= REQUIRED_CHAPTER_COVERAGE);
  };

  const handleChapterPlay = (chapter: number, element: HTMLAudioElement) => {
    document.querySelectorAll<HTMLAudioElement>("audio[data-chapter-audio]").forEach((audio) => {
      if (audio !== element) audio.pause();
    });
    playbackTokenRef.current += 1;
    queueRef.current = [];
    activeStepRef.current = null;
    contextPlaybackRef.current = null;
    audioRef.current?.pause();
    setPlaybackLabel(null);
    chapterLastTimeRef.current[String(chapter)] = element.currentTime;
  };

  const handleChapterSeeking = (chapter: number) => {
    chapterLastTimeRef.current[String(chapter)] = null;
  };

  const handleChapterTimeUpdate = (chapter: number, element: HTMLAudioElement) => {
    const key = String(chapter);
    const previous = chapterLastTimeRef.current[key];
    const current = element.currentTime;
    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    chapterLastTimeRef.current[key] = current;
    if (previous === null || previous === undefined || current < previous || current - previous > 1.5) return;
    const first = Math.max(0, Math.floor(previous));
    const last = Math.max(first, Math.floor(current));
    setChapterPlayback((existing) => {
      const record = existing[key] ?? { duration, heardSeconds: [], reachedNaturalEnd: false };
      const heard = new Set(record.heardSeconds);
      for (let second = first; second <= last; second += 1) heard.add(second);
      return {
        ...existing,
        [key]: {
          ...record,
          duration: duration || record.duration,
          heardSeconds: Array.from(heard).sort((left, right) => left - right),
        },
      };
    });
  };

  const handleChapterEnded = (chapter: number, element: HTMLAudioElement) => {
    handleChapterTimeUpdate(chapter, element);
    const key = String(chapter);
    setChapterPlayback((existing) => ({
      ...existing,
      [key]: {
        duration: element.duration || existing[key]?.duration || 0,
        heardSeconds: existing[key]?.heardSeconds ?? [],
        reachedNaturalEnd: true,
      },
    }));
  };

  const approveChapter = (chapter: number) => {
    if (chapterReviews[String(chapter)]) {
      setChapterReviews((current) => {
        const next = { ...current };
        delete next[String(chapter)];
        return next;
      });
      setExportMessage("Chapter 승인을 취소했습니다.");
      return;
    }
    if (!reviewer.trim() || !chapterCanApprove(chapter)) return;
    setChapterReviews((current) => ({
      ...current,
      [String(chapter)]: { reviewedAt: new Date().toISOString() },
    }));
    setExportMessage(null);
  };

  const visibleBoundaries = useMemo(() => boundaries.filter((card) => {
    const verdict = boundaryReviews[card.key]?.verdict;
    if (filter === "open") return !verdict;
    if (filter === "pass") return verdict === "pass";
    if (filter === "needs-recut") return verdict === "needs-recut";
    return true;
  }), [boundaries, boundaryReviews, filter]);

  const reviewedCount = Object.keys(boundaryReviews).length;
  const passedCount = Object.values(boundaryReviews).filter((item) => item.verdict === "pass").length;
  const recutCount = Object.values(boundaryReviews).filter((item) => item.verdict === "needs-recut").length;
  const chapterCount = Object.keys(chapterReviews).length;

  const buildExport = () => {
    if (!receipt) return null;
    const name = reviewer.trim();
    if (!name || reviewedCount + chapterCount === 0) return null;
    const boundaryByKey = new Map(boundaries.map((item) => [item.key, item]));
    const rejections = Object.entries(boundaryReviews)
      .filter(([, review]) => review.verdict === "needs-recut")
      .map(([key, review]) => {
        const card = boundaryByKey.get(key);
        if (!card) throw new Error(`Unknown review boundary ${key}`);
        return {
          chapter: card.chapter,
          boundaryId: card.boundaryId,
          issueCode: "boundary-needs-recut",
          note: review.note.trim(),
          reviewedAt: review.reviewedAt,
        };
      });
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      contentPack: receipt.contentPack,
      compilerVersion: receipt.compilerVersion,
      sourceReceiptPayloadSha256: receipt.payloadSha256,
      reviewTargetSetSha256,
      reviewer: name,
      startedAt,
      completedAt: passedCount === boundaries.length && chapterCount === 12 && recutCount === 0
        ? new Date().toISOString()
        : null,
      exportedAt: new Date().toISOString(),
      approvals: {
        boundaries: Object.entries(boundaryReviews)
          .filter(([, review]) => review.verdict === "pass")
          .map(([key, review]) => {
        const card = boundaryByKey.get(key);
        if (!card) throw new Error(`Unknown review boundary ${key}`);
        return {
          ...card.evidence,
          chapter: card.chapter,
          reviewer: name,
          reviewedAt: review.reviewedAt,
          note: review.note.trim(),
          reviewTargetSetSha256,
        };
          }),
        chapterListenThroughs: receipt.chapters
          .filter((chapter) => chapterReviews[String(chapter.chapter)])
          .map((chapter) => ({
            qaStatus: "human-listen-pass",
            chapter: chapter.chapter,
            masterSha256: chapter.files.master.sha256,
            compilerVersion: chapter.boundarySafety.compilerVersion,
            mimicAssetSetSha256: chapter.mimicAssetSetSha256,
            contentChecksum: chapterChecksums[String(chapter.chapter)],
            reviewer: name,
            reviewedAt: chapterReviews[String(chapter.chapter)].reviewedAt,
            reviewTargetSetSha256,
          })),
      },
      rejections,
      audit: {
        boundaryPlayback: Object.fromEntries(boundaries.map((card) => [card.key, {
          leftNaturalEof: Boolean(heardBoundaries[card.key]?.left),
          rightNaturalEof: Boolean(heardBoundaries[card.key]?.right),
          contextCrossedCut: Boolean(heardBoundaries[card.key]?.context),
        }])),
        chapterPlayback: Object.fromEntries(receipt.chapters.map((chapter) => [String(chapter.chapter), {
          coverageRatio: chapterCoverage(chapter.chapter),
          reachedNaturalEnd: Boolean(chapterPlayback[String(chapter.chapter)]?.reachedNaturalEnd),
        }])),
      },
    };
  };

  const copyExport = async () => {
    const payload = buildExport();
    if (!payload) {
      setExportMessage("검수자 이름과 최소 한 개의 결과가 필요합니다.");
      return;
    }
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copyFallback(text);
    }
    setExportMessage("검수 결과를 복사했습니다. Codex 채팅에 그대로 붙여 넣어 주세요.");
  };

  const downloadExport = () => {
    const payload = buildExport();
    if (!payload) {
      setExportMessage("검수자 이름과 최소 한 개의 결과가 필요합니다.");
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pinocchio-human-review-${receipt?.payloadSha256.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportMessage("JSON 파일을 저장했습니다.");
  };

  if (loadError) {
    return (
      <main className={styles.page}>
        <section className={styles.errorCard}>
          <span>REVIEW DATA ERROR</span>
          <h1>검수실을 열지 못했습니다.</h1>
          <p>{loadError}</p>
          <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button>
        </section>
      </main>
    );
  }

  if (!receipt || !isHydrated) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}><i /> 12장 검수 데이터를 준비하고 있어요.</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleBoundaryAudioError}
      />

      <header className={styles.header}>
        <a href="/" className={styles.logo} aria-label="MimiC 홈">MimiC</a>
        <div className={styles.headerTitle}>
          <span>HUMAN AUDIO QA · 12 CHAPTERS</span>
          <strong>피노키오 사람 귀 검수실</strong>
        </div>
        <div className={styles.receiptBadge}><i /> 음원 해시 고정</div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>기계가 애매한 곳만, 사람이 마지막 판단</p>
          <h1>붙어 있는 두 소리를<br /><em>귀로 딱 잘라냅니다.</em></h1>
          <p className={styles.lead}>왼쪽과 오른쪽을 끝까지 들은 뒤 양쪽 발음이 온전한지만 판정하세요. 결과는 지금 음원의 해시에 묶여 다음 버전에 재사용되지 않습니다.</p>
        </div>
        <aside className={styles.scoreCard}>
          <span>RELEASE GATE</span>
          <strong>{passedCount}<small> / {boundaries.length}</small></strong>
          <p>경계 승인</p>
          <div><b style={{ width: `${boundaries.length ? (reviewedCount / boundaries.length) * 100 : 0}%` }} /></div>
          <small>{recutCount > 0 ? `${recutCount}곳 재컷 필요` : "아직 운영 배포 잠김"}</small>
          <label className={styles.reviewerQuickInput}>
            검수자
            <input
              value={reviewer}
              disabled={reviewedCount + chapterCount > 0}
              onChange={(event) => setReviewer(event.target.value)}
              placeholder="먼저 이름 입력"
              autoComplete="name"
            />
          </label>
        </aside>
      </section>

      <nav className={styles.sectionNav} aria-label="검수 구역">
        <a href="#boundaries">01 · 경계 {boundaries.length}개</a>
        <a href="#chapters">02 · 전체 낭독 12장</a>
        <a href="#export">03 · 결과 내보내기</a>
      </nav>

      <section id="boundaries" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>01 · COARTICULATED CUTS</span>
            <h2>경계 {boundaries.length}개 듣기</h2>
            <p>양쪽 파일을 모두 끝까지 들으면 판정 버튼이 열립니다.</p>
          </div>
          <div className={styles.filterTabs} aria-label="경계 검수 필터">
            {([
              ["open", `미검수 ${boundaries.length - reviewedCount}`],
              ["all", `전체 ${boundaries.length}`],
              ["pass", `통과 ${passedCount}`],
              ["needs-recut", `재컷 ${recutCount}`],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </div>

        {playbackLabel && <div className={styles.nowPlaying} role="status" aria-live="polite"><i /> 재생 중 · {playbackLabel}</div>}
        {playbackError && <div className={styles.playbackError} role="alert">{playbackError}</div>}

        <div className={styles.boundaryGrid}>
          {visibleBoundaries.map((card) => {
            const heard = heardBoundaries[card.key] ?? { left: false, right: false, context: false };
            const review = boundaryReviews[card.key];
            const canReview = heard.left && heard.right && heard.context;
            return (
              <article key={card.key} className={`${styles.boundaryCard} ${review ? styles[`verdict_${review.verdict.replace("-", "_")}`] : ""}`}>
                <header>
                  <div><span>CH {String(card.chapter).padStart(2, "0")}</span><strong>{String(card.order).padStart(2, "0")} ↔ {String(card.order + 1).padStart(2, "0")}</strong></div>
                  <small>{card.boundaryId}</small>
                </header>

                <div className={styles.phrasePair}>
                  <button type="button" onClick={() => playSteps([{ url: card.leftUrl, label: `Chapter ${card.chapter} · 왼쪽`, boundaryKey: card.key, side: "left" }])}>
                    <span>LEFT {heard.left ? "✓" : "▶"}</span>
                    <strong>{card.left.text}</strong>
                  </button>
                  <button type="button" onClick={() => playSteps([{ url: card.rightUrl, label: `Chapter ${card.chapter} · 오른쪽`, boundaryKey: card.key, side: "right" }])}>
                    <span>RIGHT {heard.right ? "✓" : "▶"}</span>
                    <strong>{card.right.text}</strong>
                  </button>
                </div>

                <div className={styles.playActions}>
                  <button type="button" onClick={() => playSteps([
                    { url: card.leftUrl, label: `Chapter ${card.chapter} · 연결 듣기 1/2`, boundaryKey: card.key, side: "left" },
                    { url: card.rightUrl, label: `Chapter ${card.chapter} · 연결 듣기 2/2`, boundaryKey: card.key, side: "right" },
                  ])}>▶ 연결해서 듣기</button>
                  <button type="button" className={heard.context ? styles.heardAction : ""} onClick={() => void playContext(card)}>
                    ◎ 원본 앞뒤 듣기 {heard.context ? "✓" : ""}
                  </button>
                </div>

                <div className={styles.verdictActions}>
                  <button type="button" disabled={!canReview || !reviewer.trim()} aria-pressed={review?.verdict === "pass"} onClick={() => reviewBoundary(card, "pass")}>양쪽 발음 온전함</button>
                  <button type="button" disabled={!canReview || !reviewer.trim()} aria-pressed={review?.verdict === "needs-recut"} onClick={() => reviewBoundary(card, "needs-recut")}>다시 잘라야 함</button>
                </div>
                {(!canReview || !reviewer.trim()) && (
                  <p className={styles.hint}>
                    {!reviewer.trim() ? "먼저 상단에 검수자 이름을 입력하세요." : "LEFT·RIGHT 자연 종료와 원본 경계를 모두 들으면 판정할 수 있어요."}
                  </p>
                )}
                {review && (
                  <textarea aria-label={`${card.boundaryId} 검수 메모`} value={review.note} onChange={(event) => updateNote(card.key, event.target.value)} placeholder="선택 사항 · 들린 문제를 짧게 기록" />
                )}
              </article>
            );
          })}
        </div>
        {visibleBoundaries.length === 0 && <div className={styles.empty}>이 필터에 남은 경계가 없습니다.</div>}
      </section>

      <section id="chapters" className={`${styles.section} ${styles.chapterSection}`}>
        <div className={styles.sectionHeading}>
          <div>
            <span>02 · FULL MASTER LISTEN-THROUGH</span>
            <h2>12장 전체 낭독 듣기</h2>
            <p>감정·발음·호흡을 처음부터 끝까지 듣고 Chapter를 승인하세요.</p>
          </div>
          <strong className={styles.chapterCount}>{chapterCount} / 12</strong>
        </div>

        <div className={styles.chapterGrid}>
          {receipt.chapters.map((chapter) => {
            const approved = Boolean(chapterReviews[String(chapter.chapter)]);
            const coverage = chapterCoverage(chapter.chapter);
            const reachedEnd = Boolean(chapterPlayback[String(chapter.chapter)]?.reachedNaturalEnd);
            const canApprove = chapterCanApprove(chapter.chapter) || approved;
            return (
              <article key={chapter.chapter} className={approved ? styles.chapterApproved : ""}>
                <header><span>CHAPTER</span><strong>{String(chapter.chapter).padStart(2, "0")}</strong></header>
                <audio
                  data-chapter-audio
                  controls
                  preload="none"
                  aria-label={`Pinocchio Chapter ${chapter.chapter} 전체 낭독`}
                  src={publicUrl(chapter.files.master.path)}
                  onPlay={(event) => handleChapterPlay(chapter.chapter, event.currentTarget)}
                  onSeeking={() => handleChapterSeeking(chapter.chapter)}
                  onTimeUpdate={(event) => handleChapterTimeUpdate(chapter.chapter, event.currentTarget)}
                  onEnded={(event) => handleChapterEnded(chapter.chapter, event.currentTarget)}
                />
                <div className={styles.coverageLine}>
                  <span>실제 청취 {Math.floor(coverage * 100)}%</span>
                  <span>{reachedEnd ? "자연 종료 ✓" : "끝까지 재생 필요"}</span>
                </div>
                <div className={styles.coverageTrack}><b style={{ width: `${coverage * 100}%` }} /></div>
                <button type="button" disabled={!canApprove || (!approved && !reviewer.trim())} aria-pressed={approved} onClick={() => approveChapter(chapter.chapter)}>
                  {approved ? "승인됨 ✓ · 누르면 취소" : canApprove ? "전체 듣기 승인" : "98% 이상 듣고 끝까지 도달"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section id="export" className={`${styles.section} ${styles.exportSection}`}>
        <div>
          <span>03 · BOUND REVIEW RECEIPT</span>
          <h2>검수 결과 내보내기</h2>
          <p>이름과 검수 시각, 현재 마스터·컷·양쪽 음원 해시가 함께 저장됩니다.</p>
        </div>
        <div className={styles.exportPanel}>
          <label>
            검수자 이름
            <input
              value={reviewer}
              disabled={reviewedCount + chapterCount > 0}
              onChange={(event) => setReviewer(event.target.value)}
              placeholder="예: 이강진"
              autoComplete="name"
            />
          </label>
          <div className={styles.exportSummary}>
            <span>경계 판정 <b>{reviewedCount} / {boundaries.length}</b></span>
            <span>전체 낭독 <b>{chapterCount} / 12</b></span>
            <span>재컷 필요 <b>{recutCount}</b></span>
          </div>
          <p className={styles.importRule}>
            운영 반영은 <b>경계 {boundaries.length}/{boundaries.length} 통과 + 전체 낭독 12/12 + 재컷 0</b>일 때만 가능합니다.
          </p>
          <div className={styles.exportActions}>
            <button type="button" onClick={() => void copyExport()}>검수 결과 복사</button>
            <button type="button" onClick={downloadExport}>JSON 파일 저장</button>
          </div>
          {exportMessage && <p className={styles.exportMessage} role="status" aria-live="polite">{exportMessage}</p>}
          <small>
            영수증 {receipt.payloadSha256.slice(0, 12)}… · 대상 {reviewTargetSetSha256.slice(0, 12)}… · 다른 음원 버전에는 적용 불가
          </small>
        </div>
      </section>

      <footer className={styles.footer}>MIMIC INTERNAL QA · PREVIEW ONLY · PRODUCTION LOCKED</footer>
    </main>
  );
}
