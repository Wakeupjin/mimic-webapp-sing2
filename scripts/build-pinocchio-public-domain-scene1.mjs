import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SOURCE_AUDIO = join(
  ROOT,
  "content-sources",
  "pinocchio-original",
  "chapter-01.mp3",
);
const OUT_DIR = join(ROOT, "public", "books", "pinocchio");

// The LibriVox introduction/title runs from 00:00–00:38. The story ends at
// 04:58, immediately before “End of chapter 1”. Times below are from a local
// Whisper alignment, then the displayed text was corrected against Gutenberg
// ebook #500. Keep the 0.2 second pre-roll so the first word is not clipped.
const SOURCE_START_SECONDS = 37.8;
const SOURCE_END_SECONDS = 298.0;

const sourceLines = [
  [38, 44, "Centuries ago there lived—“A king!” my little readers will say immediately."],
  [44, 50, "No, children, you are mistaken. Once upon a time there was a piece of wood."],
  [50, 57, "It was not an expensive piece of wood. Far from it. Just a common block of firewood."],
  [57, 65, "One of those thick, solid logs that are put on the fire in winter to make cold rooms cozy and warm."],
  [65, 75, "I do not know how this really happened, yet the fact remains that one fine day this piece of wood found itself in the shop of an old carpenter."],
  [75, 81, "His real name was Mastro Antonio, but everyone called him Mastro Cherry."],
  [81, 88, "For the tip of his nose was so round and red and shiny that it looked like a ripe cherry."],
  [88, 98, "As soon as he saw that piece of wood, Mastro Cherry was filled with joy. Rubbing his hands together happily, he mumbled half to himself:"],
  [98, 104, "“This has come in the nick of time. I shall use it to make the leg of a table.”"],
  [104, 109, "He grasped the hatchet quickly to peel off the bark and shape the wood."],
  [109, 120, "But as he was about to give it the first blow, he stood still with arm uplifted, for he had heard a wee, little voice say in a beseeching tone:"],
  [120, 124, "“Please be careful! Do not hit me so hard!”"],
  [124, 132, "What a look of surprise shone on Mastro Cherry’s face! His funny face became still funnier."],
  [132, 141, "He turned frightened eyes about the room to find out where that wee, little voice had come from and he saw no one!"],
  [141, 150, "He looked under the bench—no one! He peeped inside the closet—no one! He searched among the shavings—no one!"],
  [150, 155, "He opened the door to look up and down the street—and still no one!"],
  [155, 168, "“Oh, I see!” he then said, laughing and scratching his wig. “It can easily be seen that I only thought I heard the tiny voice say the words! Well, well—to work once more.”"],
  [168, 176, "He struck a most solemn blow upon the piece of wood. “Oh, oh! You hurt!” cried the same far-away little voice."],
  [176, 186, "Mastro Cherry grew dumb, his eyes popped out of his head, his mouth opened wide, and his tongue hung down on his chin."],
  [186, 193, "As soon as he regained the use of his senses, he said, trembling and stuttering from fright:"],
  [193, 197, "“Where did that voice come from, when there is no one around?"],
  [197, 205, "Might it be that this piece of wood has learned to weep and cry like a child? I can hardly believe it."],
  [205, 216, "Here it is—a piece of common firewood, good only to burn in the stove, the same as any other. Yet—might someone be hidden in it?"],
  [216, 220, "If so, the worse for him. I’ll fix him!”"],
  [220, 226, "With these words, he grabbed the log with both hands and started to knock it about unmercifully."],
  [226, 232, "He threw it to the floor, against the walls of the room, and even up to the ceiling."],
  [232, 242, "He listened for the tiny voice to moan and cry. He waited two minutes—nothing; five minutes—nothing; ten minutes—nothing."],
  [242, 256, "“Oh, I see,” he said, trying bravely to laugh and ruffling up his wig with his hand. “It can easily be seen I only imagined I heard the tiny voice! Well, well—to work once more!”"],
  [256, 263, "The poor fellow was scared half to death, so he tried to sing a gay song in order to gain courage."],
  [263, 269, "He set aside the hatchet and picked up the plane to make the wood smooth and even,"],
  [269, 273, "but as he drew it to and fro, he heard the same tiny voice."],
  [273, 281, "This time it giggled as it spoke: “Stop it! Oh, stop it! Ha, ha, ha! You tickle my stomach.”"],
  [281, 290, "This time poor Mastro Cherry fell as if shot. When he opened his eyes, he found himself sitting on the floor."],
  [290, 298, "His face had changed; fright had turned even the tip of his nose from red to deepest purple."],
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toSrt(sourceSeconds) {
  const seconds = Math.max(0, sourceSeconds - SOURCE_START_SECONDS);
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(wholeSeconds)},${String(milliseconds).padStart(3, "0")}`;
}

const mimicking = sourceLines.map(([start, end, text]) => ({
  start: toSrt(start),
  end: toSrt(end),
  text,
}));

const wordIndexes = [1, 3, 5, 8, 11, 15, 20, 23, 28, 33];
const guessIndexes = [0, 4, 7, 10, 13, 17, 21, 25, 29, 32];
const labels = ["A", "B", "C"];

function distractorsFor(index) {
  const candidates = mimicking.map((_, i) => i).filter((i) => i !== index);
  return [candidates[(index * 5 + 3) % candidates.length], candidates[(index * 11 + 7) % candidates.length]];
}

const guessing = guessIndexes.map((index, questionIndex) => {
  const [distractor1, distractor2] = distractorsFor(index);
  const optionIndexes = [index, distractor1, distractor2];
  const rotateBy = questionIndex % optionIndexes.length;
  const rotated = optionIndexes.slice(rotateBy).concat(optionIndexes.slice(0, rotateBy));
  const options = rotated.map((lineIndex, optionIndex) => ({
    label: labels[optionIndex],
    text: mimicking[lineIndex].text,
    start: mimicking[lineIndex].start,
    end: mimicking[lineIndex].end,
  }));

  return {
    question: questionIndex + 1,
    correctAnswer: options.find((option) => option.text === mimicking[index].text).label,
    options,
    video: {
      start: mimicking[index].start,
      end: mimicking[index].end,
    },
  };
});

const lesson = {
  source: {
    title: "The Adventures of Pinocchio",
    author: "Carlo Collodi",
    translator: "Carol Della Chiesa",
    narrator: "Sherry Crowther",
    audio: "LibriVox / Project Gutenberg eBook #19516",
    text: "Project Gutenberg eBook #500",
  },
  watching: {
    start: toSrt(38),
    end: toSrt(298),
  },
  mimicking,
  guessing,
  word: wordIndexes.map((index, questionIndex) => ({
    question: questionIndex + 1,
    start: mimicking[index].start,
    end: mimicking[index].end,
    text: mimicking[index].text,
  })),
};

mkdirSync(OUT_DIR, { recursive: true });

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-ss",
    String(SOURCE_START_SECONDS),
    "-to",
    String(SOURCE_END_SECONDS),
    "-i",
    SOURCE_AUDIO,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    join(OUT_DIR, "scene-1.m4a"),
  ],
  { stdio: "inherit" },
);

writeFileSync(
  join(OUT_DIR, "scene-1.json"),
  `${JSON.stringify(lesson, null, 2)}\n`,
);

console.log(`Built Pinocchio Scene 1: ${mimicking.length} lines, ${guessing.length} guesses, ${wordIndexes.length} word puzzles.`);
