#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [path.join(root, ".env.local")];
try {
  const commonGitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  candidates.push(path.join(path.dirname(commonGitDir), ".env.local"));
} catch {
  // Standalone checkouts use their own environment file.
}

for (const candidate of new Set(candidates)) {
  if (process.env.ELEVENLABS_API_KEY) break;
  try {
    process.loadEnvFile(candidate);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is missing.");

const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
});
if (!response.ok) {
  console.log(JSON.stringify({ available: false, httpStatus: response.status, reason: "Subscription read access is not enabled for this restricted key." }, null, 2));
  process.exit(0);
}

const subscription = await response.json();
const used = Number(subscription.character_count ?? 0);
const limit = Number(subscription.character_limit ?? 0);
console.log(JSON.stringify({
  available: true,
  tier: subscription.tier ?? null,
  usedCredits: used,
  creditLimit: limit,
  remainingCredits: Math.max(0, limit - used),
  nextResetUnix: subscription.next_character_count_reset_unix ?? null,
  canExtend: subscription.can_extend_character_limit ?? subscription.can_extend_voice_limit ?? null,
}, null, 2));
