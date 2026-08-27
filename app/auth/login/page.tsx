'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudentProfile, signIn } from '../../lib/auth';
import { placementStorageKey } from '../../lib/placement';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auth = await signIn(email, password);
      const user = auth.user;
      if (!user) throw new Error('계정 정보를 불러오지 못했습니다.');

      const profile = await getStudentProfile(user.id);
      const storageKey = placementStorageKey(user.id);
      const isAlwaysNewStudent =
        profile?.role === 'student' && profile.nickname?.trim() === '강진(학생)';

      if (isAlwaysNewStudent) window.localStorage.removeItem(storageKey);

      const hasPlacement = window.localStorage.getItem(storageKey);
      const requestedNext = new URLSearchParams(window.location.search).get('next');
      const shouldRunPlacement =
        profile?.role !== 'academy' &&
        (isAlwaysNewStudent || requestedNext === '/placement' || !hasPlacement);
      router.push(shouldRunPlacement ? '/placement' : '/');
    } catch (err: any) {
      setError(err.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#60D96C] sm:text-3xl">
          로그인
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#60D96C]"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-white">비밀번호</label>
              <Link href="/auth/forgot-password" className="text-sm text-[#60D96C] hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#60D96C]"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-mimic font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/signup" className="text-[#60D96C] hover:underline">
            계정이 없으신가요? 회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
