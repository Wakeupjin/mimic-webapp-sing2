const LOCAL_ORIGIN = "https://mimic.local";

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
