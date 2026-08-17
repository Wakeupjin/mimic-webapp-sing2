#!/usr/bin/env python3
"""어려운 테스트 1회차: 짧은 추임새 대신 긴 대사를 고른다."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_lessons_from_srt import (
    MAX_DURATION,
    SRT_PATH,
    even_pick,
    is_usable_dialogue,
    make_guessing,
    make_word,
    parse_srt,
    subtitles_in_range,
    time_to_seconds,
    word_count,
)

OUT = Path(__file__).resolve().parents[1] / "public/movies/sing2/hard/lesson-1.json"

EASY_FILLER = re_compile = __import__("re").compile(
    r"^(yeah|yes|okay|ok|oh|uh|huh|right|thanks|thank you|i know|of course|come on|let's go|got it|uh-huh)\b",
    __import__("re").I,
)


def is_hard(cue: dict) -> bool:
    if not is_usable_dialogue(cue):
        return False
    text = cue["text"]
    words = word_count(text)
    duration = time_to_seconds(cue["end"]) - time_to_seconds(cue["start"])
    if words < 8 or duration < 3.0:
        return False
    if words > 18 or duration > 8.0:
        return False
    if EASY_FILLER.search(text.strip().lstrip('"').lstrip("-").strip()):
        return False
    return True


def main() -> None:
    cues = parse_srt(SRT_PATH)
    hard = [cue for cue in cues if is_hard(cue)]
    print(f"hard candidates: {len(hard)}")
    if len(hard) < 30:
        raise SystemExit("not enough hard sentences")

    best = hard[:30]
    best_span = time_to_seconds(best[-1]["end"]) - time_to_seconds(best[0]["start"])
    for i in range(0, len(hard) - 29):
        window = hard[i : i + 30]
        span = time_to_seconds(window[-1]["end"]) - time_to_seconds(window[0]["start"])
        if span < best_span:
            best = window
            best_span = span
    mimicking = best
    watch_start = mimicking[0]["start"]
    watch_end = mimicking[-1]["end"]
    guessing = make_guessing(mimicking, random.Random(7))
    word = make_word(mimicking, guessing)
    full = subtitles_in_range(cues, watch_start, watch_end)
    payload = {
        "watching": {"start": watch_start, "end": watch_end},
        "fullSubtitles": full,
        "mimicking": mimicking,
        "guessing": guessing,
        "word": word,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    print(f"watch {watch_start} → {watch_end}")
    for i, line in enumerate(mimicking, 1):
        print(f"{i:2}. {word_count(line['text']):2}w  {line['text']}")


if __name__ == "__main__":
    main()
