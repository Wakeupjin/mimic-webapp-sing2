import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = path.join(projectRoot, "app/dev/pinocchio-levels/content.json");
const outputRoot = path.join(projectRoot, "public/prototype-audio/pinocchio-levels");

const envPaths = [path.join(projectRoot, ".env.local")];

try {
  const commonGitDir = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: projectRoot, encoding: "utf8" }
  ).trim();
  envPaths.push(path.join(path.dirname(commonGitDir), ".env.local"));
} catch {
  // The local generator can still use its own .env.local outside a Git worktree.
}

for (const envPath of new Set(envPaths)) {
  if (!process.env.ELEVENLABS_API_KEY) delete process.env.ELEVENLABS_API_KEY;
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (process.env.ELEVENLABS_API_KEY) break;
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const modelId = "eleven_v3";
const outputFormat = "mp3_44100_128";
const modeArg = process.argv.find((argument) => argument.startsWith("--mode="));
const variantArg = process.argv.find((argument) => argument.startsWith("--variant="));
const levelArg = process.argv.find((argument) => argument.startsWith("--level="));
const mode = modeArg?.split("=")[1] || "samples";
const requestedVariant = variantArg?.split("=")[1] || "lily-american";
const requestedLevel = levelArg?.split("=")[1] || "all";

const variants = [
  {
    id: "george",
    name: "George",
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    gender: "male",
    accent: "British",
    accentTag: "[British accent]",
    tone: "Warm storyteller",
    seed: 1107,
  },
  {
    id: "lily-british",
    name: "Lily",
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    gender: "female",
    accent: "British",
    accentTag: "[British accent]",
    tone: "Warm, intimate actress",
    seed: 2411,
  },
  {
    id: "lily-american",
    name: "Lily",
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    gender: "female",
    accent: "American",
    accentTag: "[American accent]",
    tone: "Warm, intimate actress",
    seed: 2411,
  },
  {
    id: "jessica",
    name: "Jessica",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    gender: "female",
    accent: "American",
    accentTag: "[American accent]",
    tone: "Playful and bright",
    seed: 3919,
  },
];

const performanceCues = {
  foundation: new Map([
    [0, "[warmly]"],
    [6, "[curious]"],
    [7, "[startled]"],
    [11, "[mischievously]"],
    [12, "[in disbelief]"],
  ]),
  core: new Map([
    [0, "[warmly]"],
    [4, "[curious]"],
    [7, "[startled]"],
    [12, "[mischievously]"],
    [13, "[in disbelief]"],
  ]),
  studio: new Map([
    [0, "[warmly]"],
    [3, "[with quiet suspense]"],
    [6, "[startled]"],
    [12, "[mischievously]"],
    [13, "[in disbelief]"],
  ]),
};

if (!apiKey) {
  console.error(
    "ELEVENLABS_API_KEY is missing. Add it to .env.local or your local shell environment, then run this script again."
  );
  process.exit(1);
}

const content = JSON.parse(await readFile(contentPath, "utf8"));

function findVariant(id) {
  const variant = variants.find((item) => item.id === id);
  if (!variant) {
    throw new Error(`Unknown variant "${id}". Choose one of: ${variants.map((item) => item.id).join(", ")}`);
  }
  return variant;
}

function makePerformanceText(level, variant) {
  const cues = performanceCues[level.id] || new Map();
  const passages = level.lines.map((line, index) => {
    const cue = cues.get(index);
    return cue ? `${cue} ${line}` : line;
  });
  return `${variant.accentTag}\n${passages.join("\n")}`;
}

async function createSpeech({ voiceId, text, seed, withTimestamps = false }) {
  const suffix = withTimestamps ? "/with-timestamps" : "";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}${suffix}?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        seed,
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs returned ${response.status}: ${detail}`);
  }

  if (!withTimestamps) return { audio: Buffer.from(await response.arrayBuffer()) };

  const result = await response.json();
  return {
    audio: Buffer.from(result.audio_base64, "base64"),
    alignment: result.alignment,
  };
}

function timedCharacterRange(alignment, from, to) {
  let start = null;
  let end = null;

  for (let index = from; index < to; index += 1) {
    const characterStart = alignment.character_start_times_seconds[index];
    const characterEnd = alignment.character_end_times_seconds[index];
    if (Number.isFinite(characterStart) && start === null) start = characterStart;
    if (Number.isFinite(characterEnd)) end = characterEnd;
  }

  if (start === null || end === null) {
    throw new Error(`Alignment did not contain timestamps for characters ${from}-${to}.`);
  }

  return { start, end };
}

function buildTimeline(level, alignment) {
  if (!alignment?.characters?.length) throw new Error("ElevenLabs did not return character alignment.");

  const alignedText = alignment.characters.join("");
  let searchFrom = 0;
  const spoken = level.lines.map((line, index) => {
    const offset = alignedText.indexOf(line, searchFrom);
    if (offset < 0) {
      throw new Error(`Could not find line ${index + 1} in ElevenLabs alignment.`);
    }
    searchFrom = offset + line.length;
    return {
      index,
      text: line,
      ...timedCharacterRange(alignment, offset, offset + line.length),
    };
  });

  const boundaries = spoken.slice(0, -1).map((line, index) => {
    const nextLine = spoken[index + 1];
    return Number(((line.end + nextLine.start) / 2).toFixed(3));
  });

  return spoken.map((line, index) => ({
    index,
    text: line.text,
    start: Number((index === 0 ? Math.max(0, line.start - 0.08) : boundaries[index - 1]).toFixed(3)),
    end: Number((index === spoken.length - 1 ? line.end + 0.18 : boundaries[index]).toFixed(3)),
  }));
}

function publicVariant(variant) {
  const { voiceId: _voiceId, accentTag: _accentTag, ...safeVariant } = variant;
  return safeVariant;
}

async function generateVariantSample(variantId) {
  const variant = findVariant(variantId);
  const core = content.levels.find((level) => level.id === "core");
  if (!core) throw new Error("Core level is missing from content.json.");

  const sampleLevel = { ...core, lines: core.lines.slice(0, 4) };
  const text = makePerformanceText(sampleLevel, variant);
  const result = await createSpeech({
    voiceId: variant.voiceId,
    text,
    seed: variant.seed,
    withTimestamps: true,
  });
  const variantDir = path.join(outputRoot, "voices", variant.id);
  await mkdir(variantDir, { recursive: true });
  await writeFile(path.join(variantDir, "opening.mp3"), result.audio);
  await writeFile(
    path.join(variantDir, "opening.timeline.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        variant: publicVariant(variant),
        modelId,
        outputFormat,
        characters: text.length,
        lines: buildTimeline(sampleLevel, result.alignment),
      },
      null,
      2
    )}\n`
  );
  console.log(`Generated ${variant.id}/opening.mp3 (${text.length} characters)`);
}

async function generateComparisonSamples() {
  for (const variant of variants) await generateVariantSample(variant.id);
}

async function generateMasters(variantId, levelId) {
  const variant = findVariant(variantId);
  const selectedLevels = levelId === "all"
    ? content.levels
    : content.levels.filter((level) => level.id === levelId);

  if (!selectedLevels.length) {
    throw new Error(`Unknown level "${levelId}". Choose foundation, core, studio, or all.`);
  }

  const variantDir = path.join(outputRoot, "voices", variant.id);
  await mkdir(variantDir, { recursive: true });

  for (const level of selectedLevels) {
    const text = makePerformanceText(level, variant);
    const result = await createSpeech({
      voiceId: variant.voiceId,
      text,
      seed: variant.seed + content.levels.indexOf(level),
      withTimestamps: true,
    });
    const timeline = buildTimeline(level, result.alignment);
    await writeFile(path.join(variantDir, `${level.id}.master.mp3`), result.audio);
    await writeFile(
      path.join(variantDir, `${level.id}.timeline.json`),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          variant: publicVariant(variant),
          modelId,
          outputFormat,
          characters: text.length,
          duration: timeline.at(-1)?.end || 0,
          lines: timeline,
        },
        null,
        2
      )}\n`
    );
    console.log(`Generated ${variant.id}/${level.id}.master.mp3 (${text.length} characters)`);
  }
}

if (mode === "sample") {
  await generateVariantSample(requestedVariant);
} else if (mode === "samples") {
  await generateComparisonSamples();
} else if (mode === "master") {
  await generateMasters(requestedVariant, requestedLevel);
} else {
  throw new Error("Unknown mode. Use --mode=sample, --mode=samples, or --mode=master.");
}
