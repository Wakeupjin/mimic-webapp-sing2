const LOCAL_ORIGIN = "https://mimic.local";

function normalizeRemovedBookGuess(parsed: URL): string | null {
  const canonical = parsed.pathname.match(/^\/book\/pinocchio\/([1-9]|1[0-2])\/guessing\/?$/);
  if (canonical) return `/book/pinocchio/${canonical[1]}`;

  if (parsed.pathname !== "/book/guessing") return null;
  const legacyChapter = Number(parsed.searchParams.get("id")?.split(":").at(-1));
  const chapter = Number.isInteger(legacyChapter) && legacyChapter >= 1 && legacyChapter <= 12
    ? legacyChapter
    : 1;
  return `/book/pinocchio/${chapter}`;
}

export function getSafeNextPath(value: string | null | undefined, fallback = "/"): string {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN || parsed.pathname.startsWith("/auth/")) {
      return fallback;
    }
    const normalizedBookPath = normalizeRemovedBookGuess(parsed);
    if (normalizedBookPath) return normalizedBookPath;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function signupPath(nextPath: string): string {
  const safeNextPath = getSafeNextPath(nextPath, "/placement");
  return `/auth/signup?next=${encodeURIComponent(safeNextPath)}`;
}

export function loginPath(nextPath: string): string {
  const safeNextPath = getSafeNextPath(nextPath, "/");
  return `/auth/login?next=${encodeURIComponent(safeNextPath)}`;
}
