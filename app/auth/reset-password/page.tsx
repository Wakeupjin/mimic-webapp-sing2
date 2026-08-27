"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { updatePassword } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setComplete(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "비밀번호를 변경하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="새 비밀번호 설정" description="앞으로 사용할 비밀번호를 입력해주세요.">
      {complete ? (
        <div className="auth-complete-v2">
          <div className="auth-alert-v2 is-success">비밀번호가 변경됐습니다.</div>
          <Link href="/auth/login" className="auth-submit-v2">새 비밀번호로 로그인</Link>
        </div>
      ) : !ready ? (
        <div className="auth-check-v2">
          재설정 링크를 확인하고 있어요.<br />링크가 만료됐다면 새 메일을 요청해주세요.
          <Link href="/auth/forgot-password">메일 다시 받기</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form-v2">
          {error ? <div className="auth-alert-v2 is-error">{error}</div> : null}
          <label>
            <span>새 비밀번호</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required autoComplete="new-password" placeholder="6자 이상" />
          </label>
          <label>
            <span>새 비밀번호 확인</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required autoComplete="new-password" placeholder="한 번 더 입력" />
          </label>
          <button type="submit" disabled={loading} className="auth-submit-v2">
            {loading ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
