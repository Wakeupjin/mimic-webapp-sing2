import type { MimicSegment, PinocchioPack, Segment, Timeline } from "./types";

const TIMING_EPSILON_SECONDS = 0.005;
const MIN_PLAYBACK_SECONDS = 0.08;
const TIMELINE_SCHEMA_VERSION = "1.2.0";

type JsonObject = Record<string, unknown>;

export type TimelineValidationResult =
  | { ok: true; timeline: Timeline }
  | { ok: false; message: string };

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseSegment(
  value: unknown,
  expected: { id: string; text: string; sourceLineIndex?: number },
  duration: number,
  label: string,
  requireSpeechBounds = false,
  requireItemAudio = false,
): Segment | string {
  if (!isObject(value)) return `${label} 데이터 형식이 올바르지 않습니다.`;
  if (value.id !== expected.id || value.text !== expected.text) {
    return `${label}이 현재 Chapter 원문과 일치하지 않습니다.`;
  }
  if (!isFiniteNumber(value.start) || !isFiniteNumber(value.end)) {
    return `${label} 재생 시간이 숫자가 아닙니다.`;
  }
  if (value.start < 0 || value.end <= value.start || value.end > duration + TIMING_EPSILON_SECONDS) {
    return `${label} 재생 범위가 Chapter 오디오 길이를 벗어났습니다.`;
  }
  if (expected.sourceLineIndex !== undefined && value.sourceLineIndex !== expected.sourceLineIndex) {
    return `${label}의 원문 연결 정보가 현재 Chapter와 일치하지 않습니다.`;
  }

  const hasSpeechStart = value.speechStart !== undefined;
  const hasSpeechEnd = value.speechEnd !== undefined;
  if (requireSpeechBounds && (!hasSpeechStart || !hasSpeechEnd)) {
    return `${label}의 검수된 음성 경계가 없습니다.`;
  }
  if (hasSpeechStart !== hasSpeechEnd) {
    return `${label}의 음성 경계 정보가 일부만 존재합니다.`;
  }
  if (hasSpeechStart && hasSpeechEnd) {
    if (!isFiniteNumber(value.speechStart) || !isFiniteNumber(value.speechEnd)) {
      return `${label}의 음성 경계가 숫자가 아닙니다.`;
    }
    if (
      value.speechStart < 0
      || value.speechEnd <= value.speechStart
      || value.speechEnd > duration + TIMING_EPSILON_SECONDS
    ) {
      return `${label}의 음성 경계가 Chapter 오디오 길이를 벗어났습니다.`;
    }
    if (
      value.start > value.speechStart + TIMING_EPSILON_SECONDS
      || value.end + TIMING_EPSILON_SECONDS < value.speechEnd
    ) {
      return `${label}의 재생 구간이 자신의 음성을 온전히 포함하지 않습니다.`;
    }
  }

  if (requireItemAudio) {
    const expectedAudio = `mimic/core/${expected.id}.mp3`;
    if (value.audio !== expectedAudio) return `${label}의 독립 음원 경로가 올바르지 않습니다.`;
    if (typeof value.audioSha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.audioSha256)) {
      return `${label}의 음원 해시가 올바르지 않습니다.`;
    }
    if (!Number.isInteger(value.audioBytes) || (value.audioBytes as number) <= 0) {
      return `${label}의 독립 음원 파일 크기가 올바르지 않습니다.`;
    }
    if (!isFiniteNumber(value.duration) || value.duration < MIN_PLAYBACK_SECONDS) {
      return `${label}의 독립 음원 길이가 올바르지 않습니다.`;
    }
    if (
      Math.abs(value.start) > TIMING_EPSILON_SECONDS
      || Math.abs(value.end - value.duration) > TIMING_EPSILON_SECONDS
    ) {
      return `${label}은 독립 음원 전체를 재생하도록 설정되어 있지 않습니다.`;
    }
  }

  return {
    id: value.id,
    text: value.text,
    start: value.start,
    end: value.end,
    ...(expected.sourceLineIndex === undefined ? {} : { sourceLineIndex: expected.sourceLineIndex }),
    ...(requireItemAudio
      ? {
        audio: value.audio as string,
        audioSha256: value.audioSha256 as string,
        audioBytes: value.audioBytes as number,
        duration: value.duration as number,
      }
      : {}),
    ...(hasSpeechStart && hasSpeechEnd
      ? { speechStart: value.speechStart as number, speechEnd: value.speechEnd as number }
      : {}),
  };
}

function parseMimicSegment(
  value: unknown,
  expected: { id: string; text: string; sourceLineIndex: number },
  label: string,
): MimicSegment | string {
  if (!isObject(value) || !isFiniteNumber(value.duration)) {
    return `${label}의 독립 음원 길이가 없습니다.`;
  }
  const parsed = parseSegment(value, expected, value.duration, label, true, true);
  if (typeof parsed === "string") return parsed;
  if (
    parsed.sourceLineIndex === undefined
    || parsed.audio === undefined
    || parsed.audioSha256 === undefined
    || parsed.audioBytes === undefined
    || parsed.duration === undefined
    || parsed.speechStart === undefined
    || parsed.speechEnd === undefined
  ) {
    return `${label}의 독립 음원 검수 정보가 완전하지 않습니다.`;
  }
  return {
    ...parsed,
    sourceLineIndex: parsed.sourceLineIndex,
    audio: parsed.audio,
    audioSha256: parsed.audioSha256,
    audioBytes: parsed.audioBytes,
    duration: parsed.duration,
    speechStart: parsed.speechStart,
    speechEnd: parsed.speechEnd,
  };
}

/**
 * Treat a fetched timeline as untrusted release data. A lesson may start only
 * when its identity, text, item mapping, and playback bounds match the pack
 * bundled into this build.
 */
export function validateCanonicalTimeline(value: unknown, pack: PinocchioPack): TimelineValidationResult {
  if (!isObject(value)) return { ok: false, message: "타임라인 파일을 읽을 수 없습니다." };
  if (value.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
    return { ok: false, message: "지원하지 않는 Chapter 타임라인 형식입니다." };
  }
  if (value.contentId !== pack.contentId) {
    return { ok: false, message: "다른 Chapter의 타임라인이 연결되어 있습니다." };
  }
  if (value.contentChecksum !== pack.checksum) {
    return { ok: false, message: "Chapter 원문과 오디오 타임라인의 버전이 다릅니다." };
  }
  if (value.level !== "core" || value.source !== "one-continuous-master") {
    return { ok: false, message: "운영용 연속 낭독 타임라인이 아닙니다." };
  }
  if (
    !isObject(value.mimicAudio)
    || value.mimicAudio.strategy !== "independent-files"
    || value.mimicAudio.root !== "mimic/core"
    || value.mimicAudio.count !== pack.levels.core.activities.mimic.items.length
    || value.mimicAudio.extension !== "mp3"
  ) {
    return { ok: false, message: "검수된 Mimic 독립 음원 목록이 연결되어 있지 않습니다." };
  }
  if (
    !isObject(value.boundarySafety)
    || value.boundarySafety.playbackIsolation !== "independent-files"
    || value.boundarySafety.naturalEof !== true
    || value.boundarySafety.adjacentSpeechLeakagePrevented !== true
  ) {
    return { ok: false, message: "Mimic 문장 사이의 음성 분리 검증이 완료되지 않았습니다." };
  }
  if (!isFiniteNumber(value.duration) || value.duration <= 0) {
    return { ok: false, message: "Chapter 오디오 길이가 올바르지 않습니다." };
  }
  if (!Array.isArray(value.lines) || !Array.isArray(value.mimicItems)) {
    return { ok: false, message: "Chapter 문장 타임라인이 비어 있습니다." };
  }

  const expectedLines = pack.levels.core.lines;
  const expectedMimicItems = pack.levels.core.activities.mimic.items;
  if (value.lines.length !== expectedLines.length || value.mimicItems.length !== expectedMimicItems.length) {
    return { ok: false, message: "Chapter 원문과 오디오 문장 수가 다릅니다." };
  }

  const lines: Segment[] = [];
  for (let index = 0; index < expectedLines.length; index += 1) {
    const parsed = parseSegment(value.lines[index], expectedLines[index], value.duration, `원문 ${index + 1}`);
    if (typeof parsed === "string") return { ok: false, message: parsed };
    if (index > 0 && parsed.start + TIMING_EPSILON_SECONDS < lines[index - 1].start) {
      return { ok: false, message: `원문 ${index + 1}의 재생 순서가 뒤섞여 있습니다.` };
    }
    if (index > 0 && lines[index - 1].end > parsed.start + TIMING_EPSILON_SECONDS) {
      return { ok: false, message: `원문 ${index}과 ${index + 1}의 재생 구간이 겹칩니다.` };
    }
    lines.push(parsed);
  }

  const mimicItems: MimicSegment[] = [];
  for (let index = 0; index < expectedMimicItems.length; index += 1) {
    const expected = expectedMimicItems[index];
    const rawItem = value.mimicItems[index];
    const parsed = parseMimicSegment(rawItem, expected, `Mimic 문장 ${index + 1}`);
    if (typeof parsed === "string") return { ok: false, message: parsed };

    if (!lines[expected.sourceLineIndex]) return { ok: false, message: `Mimic 문장 ${index + 1}의 원문을 찾을 수 없습니다.` };
    mimicItems.push(parsed);
  }

  const maxLineEnd = Math.max(0, ...lines.map((segment) => segment.end));
  if (maxLineEnd > value.duration + TIMING_EPSILON_SECONDS) {
    return { ok: false, message: "원문 재생 시간이 Chapter 오디오 길이를 초과합니다." };
  }

  return {
    ok: true,
    timeline: {
      schemaVersion: typeof value.schemaVersion === "string" ? value.schemaVersion : undefined,
      contentId: value.contentId,
      contentChecksum: typeof value.contentChecksum === "string" ? value.contentChecksum : undefined,
      level: value.level,
      source: value.source,
      duration: value.duration,
      mimicAudio: {
        strategy: value.mimicAudio.strategy,
        root: value.mimicAudio.root,
        count: value.mimicAudio.count,
        extension: value.mimicAudio.extension,
      },
      lines,
      mimicItems,
      boundarySafety: {
        playbackIsolation: value.boundarySafety.playbackIsolation,
        naturalEof: value.boundarySafety.naturalEof,
        adjacentSpeechLeakagePrevented: value.boundarySafety.adjacentSpeechLeakagePrevented,
        releaseBlockedBoundaries: isFiniteNumber(value.boundarySafety.releaseBlockedBoundaries)
          ? value.boundarySafety.releaseBlockedBoundaries
          : undefined,
      },
    },
  };
}
