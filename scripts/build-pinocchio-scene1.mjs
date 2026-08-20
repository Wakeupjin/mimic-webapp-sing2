import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "public", "books", "pinocchio");
const WORK = join(ROOT, "scripts", ".pinocchio-build");
const VOICE = "Samantha";
const RATE = "160";
const GAP_SEC = 0.4;

const SENTENCES = [
  "Once upon a time there was a piece of wood.",
  "It was not a fine piece of wood.",
  "It was just an ordinary piece.",
  "A carpenter found it in his shop.",
  "His name was Master Cherry.",
  "He wanted to make a table leg.",
  "Then he heard a little voice.",
  "Please do not hit me so hard.",
  "The carpenter looked around the room.",
  "There was nobody there.",
  "He looked under the bench.",
  "He looked inside the cupboard.",
  "Who is speaking to me?",
  "Then he gave the wood to Geppetto.",
  "Geppetto lived in a tiny room.",
  "He wanted to make a puppet.",
  "I will call him Pinocchio.",
  "He took his tools and began to work.",
  "First he made the hair.",
  "Then he made the forehead.",
  "Then he made two little eyes.",
  "The eyes looked right at him.",
  "Then he made the nose.",
  "The nose began to grow.",
  "Then he made the mouth.",
  "The mouth started to laugh.",
  "Stop laughing, said Geppetto.",
  "The puppet kicked him in the shin.",
  "You are a naughty wooden boy.",
  "And that is how Pinocchio began.",
];

const WORD_INDEXES = [0, 1, 3, 4, 5, 7, 10, 16, 19, 27];
const GUESS_INDEXES = [0, 2, 5, 8, 11, 14, 17, 20, 23, 26];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toSrt(seconds) {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(msTotal / 3600000);
  const minutes = Math.floor((msTotal % 3600000) / 60000);
  const secs = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)},${String(ms).padStart(3, "0")}`;
}

function durationOf(path) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { encoding: "utf8" }
  );
  const n = Number.parseFloat(out.trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Could not read duration for ${path}`);
  }
  return n;
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

run("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "anullsrc=r=44100:cl=mono",
  "-t",
  String(GAP_SEC),
  join(WORK, "silence.wav"),
]);

const clips = [];
let cursor = 0;

for (let i = 0; i < SENTENCES.length; i += 1) {
  const aiff = join(WORK, `line-${pad2(i + 1)}.aiff`);
  const wav = join(WORK, `line-${pad2(i + 1)}.wav`);
  run("say", ["-v", VOICE, "-r", RATE, "-o", aiff, SENTENCES[i]]);
  run("ffmpeg", ["-y", "-i", aiff, "-ar", "44100", "-ac", "1", wav]);
  const dur = durationOf(wav);
  clips.push({
    text: SENTENCES[i],
    start: cursor,
    end: cursor + dur,
  });
  cursor += dur;
  if (i < SENTENCES.length - 1) {
    cursor += GAP_SEC;
  }
}

const listPath = join(WORK, "concat.txt");
const listLines = [];
clips.forEach((_, i) => {
  listLines.push(`file '${join(WORK, `line-${pad2(i + 1)}.wav`)}'`);
  if (i < clips.length - 1) {
    listLines.push(`file '${join(WORK, "silence.wav")}'`);
  }
});
writeFileSync(listPath, `${listLines.join("\n")}\n`);

const m4aPath = join(OUT_DIR, "scene-1.m4a");
run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listPath,
  "-c:a",
  "aac",
  "-b:a",
  "96k",
  m4aPath,
]);

function distractorsFor(index) {
  const others = clips
    .map((clip, i) => i)
    .filter((i) => i !== index);
  return [others[(index * 3) % others.length], others[(index * 7 + 5) % others.length]];
}

const labels = ["A", "B", "C"];
const guessing = GUESS_INDEXES.map((index, q) => {
  const [d1, d2] = distractorsFor(index);
  const order = [index, d1, d2];
  const rotate = q % 3;
  const rotated = order.slice(rotate).concat(order.slice(0, rotate));
  const options = rotated.map((clipIndex, i) => ({
    label: labels[i],
    text: clips[clipIndex].text,
    start: toSrt(clips[clipIndex].start),
    end: toSrt(clips[clipIndex].end),
  }));
  const correct = options.find((option) => option.text === clips[index].text);
  return {
    question: q + 1,
    correctAnswer: correct.label,
    options,
    video: {
      start: toSrt(clips[index].start),
      end: toSrt(clips[index].end),
    },
  };
});

const json = {
  watching: {
    start: toSrt(0),
    end: toSrt(clips[clips.length - 1].end),
  },
  mimicking: clips.map((clip) => ({
    start: toSrt(clip.start),
    end: toSrt(clip.end),
    text: clip.text,
  })),
  guessing,
  word: WORD_INDEXES.map((index, q) => ({
    question: q + 1,
    start: toSrt(clips[index].start),
    end: toSrt(clips[index].end),
    text: clips[index].text,
  })),
};

writeFileSync(join(OUT_DIR, "scene-1.json"), `${JSON.stringify(json, null, 2)}\n`);
rmSync(WORK, { recursive: true, force: true });

console.log(`Wrote ${m4aPath}`);
console.log(`Listen length ${clips[clips.length - 1].end.toFixed(1)}s, ${clips.length} lines`);
