"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "재설정 메일을 보내지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="비밀번호를 다시 설정해요"
      description="가입한 이메일로 안전한 재설정 링크를 보내드릴게요."
      footer={<Link href="/auth/login">기억났나요? <strong>로그인으로 돌아가기</strong></Link>}
    >
      {sent ? (
        <div className="auth-alert-v2 is-success">메일을 보냈습니다. 받은 편지함과 스팸함을 확인해주세요.</div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form-v2">
          {error ? <div className="auth-alert-v2 is-error">{error}</div> : null}
          <label>
            <span>이메일</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
          </label>
          <button type="submit" disabled={loading} className="auth-submit-v2">
            {loading ? "보내는 중…" : "재설정 메일 보내기"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
