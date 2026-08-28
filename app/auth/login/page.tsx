"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStudentProfile, signIn } from "../../lib/auth";
import { getSafeNextPath, signupPath } from "../../lib/authRedirect";
import { placementStorageKey } from "../../lib/placement";
import AuthShell from "../../components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("");

  useEffect(() => {
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    setNextPath(getSafeNextPath(requestedNext, ""));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const auth = await signIn(email, password);
      const user = auth.user;
      if (!user) throw new Error("계정 정보를 불러오지 못했어요.");

      const profile = await getStudentProfile(user.id);
      const storageKey = placementStorageKey(user.id);
      const isAlwaysNewStudent =
        profile?.role === "student" && profile.nickname?.trim() === "강진(학생)";

      if (isAlwaysNewStudent) window.localStorage.removeItem(storageKey);

      const hasPlacement = window.localStorage.getItem(storageKey);
      const shouldRunPlacement =
        profile?.role !== "academy" &&
        (isAlwaysNewStudent || !hasPlacement);
      router.replace(nextPath || (shouldRunPlacement ? "/placement" : "/"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="다시 만나서 반가워요"
      description="계속할 장면이 기다리고 있어요."
      footer={<Link href={signupPath(nextPath || "/placement")}>처음이신가요? <strong>학생 계정 만들기</strong></Link>}
    >
      {error ? <div className="auth-alert-v2 is-error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="auth-form-v2">
        <label>
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          <span className="auth-label-row-v2">
            비밀번호
            <Link href="/auth/forgot-password">비밀번호 찾기</Link>
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={loading} className="auth-submit-v2">
          {loading ? "로그인 중…" : "로그인하고 이어하기"}
        </button>
      </form>
    </AuthShell>
  );
}
