import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelEnvironment = process.env.VERCEL_ENV;
if (process.env.VERCEL === "1"
  && !["production", "preview", "development"].includes(vercelEnvironment ?? "")) {
  console.error("Pinocchio release gate cannot determine the Vercel environment; refusing to build.");
  process.exit(1);
}
const releaseBuild = process.env.VERCEL_ENV === "production"
  || process.env.MIMIC_RELEASE_BUILD === "1";

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(
  releaseBuild
    ? "Pinocchio release gate: strict production validation"
    : "Pinocchio release gate: structural preview validation"
);

runNode(
  path.join(root, "scripts", "validate-pinocchio-deploy-receipt.mjs"),
  releaseBuild ? [] : ["--allow-blocked"]
);
// The 720 mirrored Mimic assets can stall Turbopack's filesystem graph in CI.
// Next's stable production builder handles the same route set deterministically.
runNode(path.join(root, "node_modules", "next", "dist", "bin", "next"), ["build"]);
