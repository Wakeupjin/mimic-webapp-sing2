#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).parent
src = json.loads((ROOT / "public/movies/sing2/lesson-1.json").read_text())


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def to_seconds(time_str: str) -> int:
    hours, minutes, rest = time_str.split(":")
    seconds, millis = rest.split(",")
    total = int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000
    return int(total)


watch_start = to_seconds(src["watching"]["start"])
watch_end = to_seconds(src["watching"]["end"])
mimic = json.dumps(src["mimicking"], ensure_ascii=False)
guessing = json.dumps(src["guessing"], ensure_ascii=False)
word = json.dumps(src["word"], ensure_ascii=False)

sql = f"""INSERT INTO lessons (video_id, lesson_number, watch_start_sec, watch_end_sec, mimic_data, guessing_data, word_data)
SELECT 1, 1, {watch_start}, {watch_end}, E'{sql_escape(mimic)}', E'{sql_escape(guessing)}', E'{sql_escape(word)}'
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE lesson_number = 1
);
"""

out = ROOT / "public/movies/sing2/insert_lesson_1.sql"
out.write_text(sql)
print(f"Wrote {out}")
