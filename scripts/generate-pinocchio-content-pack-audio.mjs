import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(root, "content-packs", "pinocchio", "v1");
const levelIds = ["foundation", "core", "studio"];

function argument(name, fallback = undefined) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function fail(message) {
  throw new Error(message);
}

const mode = argument("mode", "estimate");
const requestedChapters = argument("chapter", "all");
const requestedLevels = argument("level", "all");
const voiceId = argument("voice-id");
const voiceName = argument("voice-name");
const accentTag = argument("accent-tag", "[British accent]");
const outputFormat = argument("output-format", "mp3_44100_192");
const seed = Number(argument("seed", "2401"));
const paidPlanConfirmed = argument("confirm-commercial-paid-plan") === "yes";
const modelId = "eleven_v3";

function parseSelection(value, allowed, label) {
  if (value === "all") return allowed;
  const selected = value.split(",").map((item) => item.trim()).filter(Boolean);
  for (const item of selected) if (!allowed.includes(item)) fail(`Unknown ${label} "${item}".`);
  return selected;
}

const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));
const chapterNumbers = parseSelection(
  requestedChapters,
  manifest.chapters.map((chapter) => String(chapter.number)),
  "chapter"
).map(Number);
const selectedLevelIds = parseSelection(requestedLevels, levelIds, "level");

function makePerformanceText(pack, levelId) {
  const level = pack.levels[levelId];
  const cues = new Map();
  for (const beat of pack.livingStorybook.beats) {
    const [start] = beat.lineRanges[levelId];
    if (!cues.has(start)) cues.set(start, beat.performanceTag);
  }
  const passages = level.lines.map((line, index) => {
    const cue = cues.get(index);
    return cue ? `${cue} ${line.text}` : line.text;
  });
  return `${accentTag}\n${passages.join("\n")}`;
}

const jobs = [];
for (const chapterNumber of chapterNumbers) {
  const entry = manifest.chapters.find((chapter) => chapter.number === chapterNumber);
  const packPath = path.join(packRoot, entry.path);
  const pack = JSON.parse(await readFile(packPath, "utf8"));
  for (const levelId of selectedLevelIds) {
    const text = makePerformanceText(pack, levelId);
    if (text.length > 5000) fail(`Chapter ${chapterNumber} ${levelId} exceeds the 5,000-character request limit.`);
    jobs.push({ chapterNumber, entry, pack, packPath, levelId, text });
  }
}

const estimate = {
  chapters: chapterNumbers.length,
  levels: selectedLevelIds,
  continuousMasterRequests: jobs.length,
  billedCharactersEstimate: jobs.reduce((sum, job) => sum + job.text.length, 0),
  longestRequestCharacters: Math.max(...jobs.map((job) => job.text.length)),
};

if (mode === "estimate") {
  console.log(JSON.stringify(estimate, null, 2));
  process.exit(0);
}

if (mode !== "generate") fail("Use --mode=estimate or --mode=generate.");
if (!voiceId || !voiceName) fail("Generation requires --voice-id and --voice-name for a durable narrator.");
if (!paidPlanConfirmed) {
  fail("Generation is locked. Confirm a commercial paid plan with --confirm-commercial-paid-plan=yes.");
}

const envPaths = [path.join(root, ".env.local")];
try {
  const commonGitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  envPaths.push(path.join(path.dirname(commonGitDir), ".env.local"));
} catch {
  // A standalone checkout can still use its own .env.local.
}

for (const envPath of new Set(envPaths)) {
  if (process.env.ELEVENLABS_API_KEY) break;
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
if (!process.env.ELEVENLABS_API_KEY) fail("ELEVENLABS_API_KEY is missing from the local environment.");

async function createSpeech(job, jobIndex) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text: job.text, model_id: modelId, seed: seed + jobIndex }),
    }
  );
  if (!response.ok) fail(`ElevenLabs returned ${response.status}: ${await response.text()}`);
  const result = await response.json();
  return {
    audio: Buffer.from(result.audio_base64, "base64"),
    alignment: result.alignment || result.normalized_alignment,
    requestId: response.headers.get("request-id") || response.headers.get("x-request-id"),
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
  if (start === null || end === null) fail(`Alignment is missing characters ${from}-${to}.`);
  return { start, end };
}

function buildTimeline(job, alignment) {
  if (!alignment?.characters?.length) fail("ElevenLabs did not return character alignment.");
  const alignedText = alignment.characters.join("");
  let searchFrom = 0;
  const spoken = job.pack.levels[job.levelId].lines.map((line, index) => {
    const offset = alignedText.indexOf(line.text, searchFrom);
    if (offset < 0) fail(`Could not align chapter ${job.chapterNumber} ${job.levelId} line ${index + 1}.`);
    searchFrom = offset + line.text.length;
    return { id: line.id, text: line.text, ...timedCharacterRange(alignment, offset, offset + line.text.length) };
  });
  const boundaries = spoken.slice(0, -1).map((line, index) => (line.end + spoken[index + 1].start) / 2);
  return spoken.map((line, index) => ({
    id: line.id,
    text: line.text,
    start: Number((index === 0 ? Math.max(0, line.start - 0.08) : boundaries[index - 1]).toFixed(3)),
    end: Number((index === spoken.length - 1 ? line.end + 0.22 : boundaries[index]).toFixed(3)),
  }));
}

const provenanceByChapter = new Map();
for (const [jobIndex, job] of jobs.entries()) {
  const result = await createSpeech(job, jobIndex);
  const timeline = buildTimeline(job, result.alignment);
  const outputDir = path.join(path.dirname(job.packPath), "audio");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, `${job.levelId}.master.mp3`), result.audio);
  await writeFile(
    path.join(outputDir, `${job.levelId}.timeline.json`),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      contentId: job.pack.contentId,
      contentChecksum: job.pack.checksum,
      level: job.levelId,
      generatedAt: new Date().toISOString(),
      provider: "ElevenLabs",
      modelId,
      voice: { id: voiceId, name: voiceName },
      accentTag,
      outputFormat,
      seed: seed + jobIndex,
      requestId: result.requestId,
      billedCharactersEstimate: job.text.length,
      duration: timeline.at(-1)?.end || 0,
      source: "one-continuous-master",
      lines: timeline,
    }, null, 2)}\n`
  );
  if (!provenanceByChapter.has(job.chapterNumber)) provenanceByChapter.set(job.chapterNumber, []);
  provenanceByChapter.get(job.chapterNumber).push({
    level: job.levelId,
    master: `audio/${job.levelId}.master.mp3`,
    timeline: `audio/${job.levelId}.timeline.json`,
    requestId: result.requestId,
    billedCharactersEstimate: job.text.length,
  });
  console.log(`Generated chapter ${job.chapterNumber} ${job.levelId} as one continuous master.`);
}

for (const [chapterNumber, levels] of provenanceByChapter) {
  const entry = manifest.chapters.find((chapter) => chapter.number === chapterNumber);
  const outputDir = path.join(path.dirname(path.join(packRoot, entry.path)), "audio");
  await writeFile(
    path.join(outputDir, "provenance.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      chapter: chapterNumber,
      generatedAt: new Date().toISOString(),
      voice: { id: voiceId, name: voiceName },
      modelId,
      outputFormat,
      commercialPaidPlanConfirmed: true,
      qaStatus: "listen-through-pending",
      levels,
    }, null, 2)}\n`
  );
}

console.log(JSON.stringify({ ...estimate, generated: jobs.length }, null, 2));
