#!/usr/bin/env python3
"""SRT에서 대화 문장을 골라 12회차 lesson JSON을 만든다.

시간으로 영화를 12등분하지 않고, 쓸 만한 대사를 시간순으로 모은 뒤
30개씩 12묶음으로 나눈다.
"""

from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRT_PATH = ROOT / "public/movies/sing2/sing2.srt"
OUT_DIR = ROOT / "public/movies/sing2"

LESSON_COUNT = 12
MIMIC_PER_LESSON = 30
GUESSING_PER_LESSON = 10
WORD_PER_LESSON = 10
NEEDED = LESSON_COUNT * MIMIC_PER_LESSON

MIN_WORDS = 3
MAX_WORDS = 12
MIN_DURATION = 1.2
MAX_DURATION = 6.0

WATERMARK = re.compile(
    r"downloaded from|opensubtitles|subscene|rarbg|yify|advertisement",
    re.I,
)
HTML_TAG = re.compile(r"<[^>]+>")
SFX = re.compile(r"[\[\(].+[\]\)]")
MULTI_SPEAKER = re.compile(r"(^\-\s*.+\s+\-\s+)|(\s\-\s+.+\s\-\s)")


def time_to_seconds(value: str) -> float:
    hours, minutes, rest = value.split(":")
    seconds, millis = rest.replace(".", ",").split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000


def parse_srt(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", raw.strip())
    cues = []
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue
        time_line = next((line for line in lines if "-->" in line), None)
        if not time_line:
            continue
        start_str, end_str = [part.strip() for part in time_line.split("-->")]
        text = " ".join(lines[lines.index(time_line) + 1 :])
        text = HTML_TAG.sub("", text)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        cues.append(
            {
                "start": start_str.replace(".", ","),
                "end": end_str.replace(".", ","),
                "text": text,
            }
        )
    return cues


def word_count(text: str) -> int:
    cleaned = re.sub(r"[^\w'\-]+", " ", text, flags=re.UNICODE)
    return len([w for w in cleaned.split() if w])


def is_usable_dialogue(cue: dict) -> bool:
    text = cue["text"]
    if "♪" in text or WATERMARK.search(text):
        return False
    if SFX.search(text) and word_count(re.sub(r"[\[\(].+[\]\)]", "", text)) < MIN_WORDS:
        return False
    if text.count(" - ") >= 1 and text.lstrip().startswith("-"):
        return False
    if MULTI_SPEAKER.search(text):
        return False
    letters = re.sub(r"[^A-Za-z]", "", text)
    if not letters:
        return False
    first = letters[0]
    if first.islower():
        return False
    stripped = text.rstrip()
    if stripped.endswith((",", "...", "…", "-")):
        return False
    if not re.search(r'[.?!]"?$', stripped):
        return False
    if re.search(r"\b(and|or|like|to|the|a|of)$", stripped.rstrip(".?!'\""), re.I):
        return False
    words = word_count(text)
    if words < MIN_WORDS or words > MAX_WORDS:
        return False
    duration = time_to_seconds(cue["end"]) - time_to_seconds(cue["start"])
    if duration < MIN_DURATION or duration > MAX_DURATION:
        return False
    return True


def even_pick(items: list, count: int) -> list:
    if len(items) <= count:
        return items
    last = len(items) - 1
    indexes = sorted({round(i * last / (count - 1)) for i in range(count)})
    while len(indexes) < count:
        for i, item in enumerate(items):
            if i not in indexes:
                indexes.append(i)
            if len(indexes) == count:
                break
    return [items[i] for i in sorted(indexes)[:count]]


def make_guessing(mimicking: list[dict], rng: random.Random) -> list[dict]:
    selected = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29]
    questions = []
    for q_num, correct_idx in enumerate(selected, 1):
        correct = mimicking[correct_idx]
        distractor_idxs = rng.sample(
            [i for i in range(len(mimicking)) if i != correct_idx], 2
        )
        labels = ["A", "B", "C"]
        rng.shuffle(labels)
        options = []
        lines = [correct] + [mimicking[i] for i in distractor_idxs]
        for label, line in zip(labels, lines):
            options.append(
                {
                    "label": label,
                    "text": line["text"],
                    "start": line["start"],
                    "end": line["end"],
                }
            )
        questions.append(
            {
                "question": q_num,
                "correctAnswer": labels[0],
                "options": options,
                "video": {"start": correct["start"], "end": correct["end"]},
            }
        )
    return questions


def make_word(mimicking: list[dict], guessing: list[dict]) -> list[dict]:
    used = {(q["video"]["start"], q["video"]["end"]) for q in guessing}
    leftover = [line for line in mimicking if (line["start"], line["end"]) not in used]
    picked = even_pick(leftover, WORD_PER_LESSON)
    return [
        {
            "question": i + 1,
            "start": line["start"],
            "end": line["end"],
            "text": line["text"],
        }
        for i, line in enumerate(picked)
    ]


def subtitles_in_range(cues: list[dict], start: str, end: str) -> list[dict]:
    start_s = time_to_seconds(start)
    end_s = time_to_seconds(end)
    result = []
    for cue in cues:
        cue_start = time_to_seconds(cue["start"])
        if start_s <= cue_start <= end_s:
            result.append({"start": cue["start"], "end": cue["end"], "text": cue["text"]})
    return result


def main() -> None:
    cues = parse_srt(SRT_PATH)
    dialogue = [cue for cue in cues if is_usable_dialogue(cue)]
    print(f"SRT cues: {len(cues)}")
    print(f"Usable dialogue: {len(dialogue)}")
    if len(dialogue) < NEEDED:
        raise SystemExit(f"Need {NEEDED} sentences, only found {len(dialogue)}")

    picked = even_pick(dialogue, NEEDED)
    rng = random.Random(2)

    for lesson_num in range(1, LESSON_COUNT + 1):
        start_i = (lesson_num - 1) * MIMIC_PER_LESSON
        mimicking = picked[start_i : start_i + MIMIC_PER_LESSON]
        if lesson_num == 1:
            watch_start = "00:00:00,000"
        else:
            watch_start = mimicking[0]["start"]
        watch_end = mimicking[-1]["end"]
        full = subtitles_in_range(cues, watch_start, watch_end)
        if lesson_num == 1 and full:
            full[0]["text"] = "Mimicking is Fun"
        guessing = make_guessing(mimicking, rng)
        word = make_word(mimicking, guessing)
        payload = {
            "watching": {"start": watch_start, "end": watch_end},
            "fullSubtitles": full,
            "mimicking": mimicking,
            "guessing": guessing,
            "word": word,
        }
        out = OUT_DIR / f"lesson-{lesson_num}.json"
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(
            f"lesson-{lesson_num}: {watch_start} → {watch_end} | "
            f"mimic {len(mimicking)} | subtitles {len(full)}"
        )
        print("  e.g.", mimicking[0]["text"], "/", mimicking[14]["text"])


if __name__ == "__main__":
    main()
