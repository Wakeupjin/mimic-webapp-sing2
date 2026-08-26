"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { updatePassword } from "../../lib/auth";

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
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-gray-900 p-6 sm:p-8">
        <h1 className="text-center text-2xl font-bold text-[#60D96C] sm:text-3xl">새 비밀번호 설정</h1>

        {complete ? (
          <div className="mt-6">
            <p className="rounded-xl border border-[#60D96C]/40 bg-[#60D96C]/10 p-4 text-sm text-[#9AF2A3]">
              비밀번호가 변경됐습니다.
            </p>
            <Link href="/auth/login" className="btn-mimic mt-4 flex w-full justify-center rounded-lg py-3 font-bold">로그인하기</Link>
          </div>
        ) : !ready ? (
          <div className="mt-6 text-center text-sm leading-6 text-gray-400">
            재설정 링크를 확인하고 있습니다.<br />링크가 만료됐다면 새 메일을 요청해주세요.
            <div className="mt-4"><Link href="/auth/forgot-password" className="text-[#60D96C] hover:underline">메일 다시 받기</Link></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <p className="rounded-lg border border-red-500 bg-red-500/20 p-3 text-sm text-red-400">{error}</p>}
            <label className="block text-white">
              <span className="mb-2 block">새 비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required autoComplete="new-password" className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#60D96C]" />
            </label>
            <label className="block text-white">
              <span className="mb-2 block">새 비밀번호 확인</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required autoComplete="new-password" className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#60D96C]" />
            </label>
            <button type="submit" disabled={loading} className="btn-mimic w-full rounded-lg py-3 font-bold disabled:opacity-50">
              {loading ? "변경 중…" : "비밀번호 변경"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
