"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUp(email, password, nickname);
      alert("회원가입이 완료됐어요. 이메일 확인이 필요하면 받은 편지를 확인해주세요.");
      router.push("/auth/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="첫 장면을 시작해요"
      description="가입 후 5분 레벨 찾기로 내 시작점을 정합니다."
      footer={<Link href="/auth/login">이미 계정이 있나요? <strong>로그인</strong></Link>}
    >
      {error ? <div className="auth-alert-v2 is-error">{error}</div> : null}
      <form onSubmit={handleSubmit} className="auth-form-v2">
        <label>
          <span>이름</span>
          <input type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="학습자 이름" required />
        </label>
        <label>
          <span>이메일</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
        </label>
        <label>
          <span>비밀번호</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6자 이상" required minLength={6} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={loading} className="auth-submit-v2">
          {loading ? "계정 만드는 중…" : "계정 만들고 레벨 찾기"}
        </button>
      </form>
    </AuthShell>
  );
}
