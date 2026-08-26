"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "../../lib/auth";

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
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-gray-900 p-6 sm:p-8">
        <h1 className="text-center text-2xl font-bold text-[#60D96C] sm:text-3xl">비밀번호 찾기</h1>
        <p className="mt-3 text-center text-sm leading-6 text-gray-400">
          가입한 이메일로 비밀번호 재설정 링크를 보내드려요.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-[#60D96C]/40 bg-[#60D96C]/10 p-4 text-sm leading-6 text-[#9AF2A3]">
            메일을 보냈습니다. 받은 편지함과 스팸함을 확인해주세요.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <p className="rounded-lg border border-red-500 bg-red-500/20 p-3 text-sm text-red-400">{error}</p>}
            <label className="block text-white">
              <span className="mb-2 block">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#60D96C]"
              />
            </label>
            <button type="submit" disabled={loading} className="btn-mimic w-full rounded-lg py-3 font-bold disabled:opacity-50">
              {loading ? "보내는 중…" : "재설정 메일 보내기"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-[#60D96C] hover:underline">로그인으로 돌아가기</Link>
        </div>
      </section>
    </main>
  );
}
