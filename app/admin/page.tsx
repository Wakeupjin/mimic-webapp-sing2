'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';
import { fetchAcademyDashboard, MODES, TOTAL_SLOTS, type StudentDashboardRow } from '../lib/academy';

const MODE_LABEL: Record<string, string> = {
  watching: '워칭',
  mimicking: '미믹',
  guessing: '게싱',
  word: '워드',
};

function formatWhen(iso: string | null) {
  if (!iso) return '기록 없음';
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatInvested(sec: unknown) {
  const n = Math.max(0, Math.round(Number(sec || 0)));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}분 ${s}초`;
}

function EvaluationDetail({
  mode,
  payload,
}: {
  mode: string;
  payload: Record<string, unknown> | undefined;
}) {
  if (!payload || Object.keys(payload).length === 0) {
    return (
      <p className="text-sm text-gray-400 mt-3">
        아직 이 칸의 평가 기록이 없습니다. 학습한 뒤에 쌓입니다.
      </p>
    );
  }

  const attempts = Array.isArray(payload.attempts)
    ? (payload.attempts as Record<string, unknown>[])
    : [];
  const playCounts = (payload.playCounts as Record<string, number>) || {};
  const replayTotal = Object.values(playCounts).reduce((sum, n) => sum + Number(n || 0), 0);

  if (mode === 'watching') {
    return (
      <div className="mt-3 text-sm text-gray-200 space-y-1">
        <p>본 비율: {Number(payload.maxPercent || 0)}%</p>
        <p>투자 시간: {formatInvested(payload.investedSeconds)}</p>
        <p>재생 횟수: {playCounts.play || replayTotal || 0}회</p>
      </div>
    );
  }

  if (mode === 'mimicking') {
    return (
      <div className="mt-3 text-sm text-gray-200 space-y-1">
        <p>
          문장: {Number(payload.sentencesPlayed || Object.keys(playCounts).length)} /{' '}
          {Number(payload.totalSentences || 0)}
        </p>
        <p>투자 시간: {formatInvested(payload.investedSeconds)}</p>
        <p>반복(문장별 재생):</p>
        <ul className="text-gray-400 max-h-40 overflow-y-auto">
          {Object.entries(playCounts).map(([key, count]) => (
            <li key={key}>
              문장 {key}: {count}회
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (mode === 'guessing') {
    const wrong = attempts.filter((a) => !a.isCorrect).length;
    return (
      <div className="mt-3 text-sm text-gray-200 space-y-2">
        <p>
          시도 {attempts.length}회 · 틀림 {wrong}회 · 투자 {formatInvested(payload.investedSeconds)}
        </p>
        <ul className="space-y-1 text-gray-300 max-h-56 overflow-y-auto">
          {attempts.map((a, idx) => (
            <li key={idx}>
              {Number(a.question)}번: 선택 {String(a.selected)} / 정답 {String(a.correct)}{' '}
              {a.isCorrect ? '맞음' : '틀림'}
              {a.replayCount ? ` · 반복 ${String(a.replayCount)}` : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const wrong = attempts.filter((a) => !a.isCorrect).length;
  return (
    <div className="mt-3 text-sm text-gray-200 space-y-2">
      <p>
        시도 {attempts.length}회 · 틀림 {wrong}회 · 투자 {formatInvested(payload.investedSeconds)}
      </p>
      <ul className="space-y-2 text-gray-300 max-h-56 overflow-y-auto">
        {attempts.map((a, idx) => (
          <li key={idx}>
            {Number(a.question)}번 {a.isCorrect ? '맞음' : '틀림'}
            {a.replayCount ? ` · 반복 ${String(a.replayCount)}` : ''}
            <div className="text-gray-500">
              제출: {Array.isArray(a.submitted) ? a.submitted.join(' ') : '-'}
            </div>
            <div className="text-gray-500">
              정답: {Array.isArray(a.correct) ? a.correct.join(' ') : '-'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [rows, setRows] = useState<StudentDashboardRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudentDashboardRow | null>(null);
  const [openCell, setOpenCell] = useState<{ lesson: number; mode: string } | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (profile?.role === 'academy') return;
    if (!profile) {
      const timer = window.setTimeout(() => {
        router.replace('/');
      }, 2000);
      return () => window.clearTimeout(timer);
    }
    router.replace('/');
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user || profile?.role !== 'academy') return;

    const load = async () => {
      setBusy(true);
      const result = await fetchAcademyDashboard();
      setRows(result.students);
      setErrorMessage(result.errorMessage);
      setBusy(false);
    };

    void load();
  }, [user, profile]);

  if (loading || !user || profile?.role !== 'academy') {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        확인 중...
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[#60D96C] text-sm mb-1">학생 현황</p>
            <h1 className="text-2xl font-bold sm:text-3xl">진도 · 학습 시간</h1>
            <p className="text-gray-400 mt-2 text-sm">
              홈에서 원장도 학생처럼 공부할 수 있습니다. 여기에는 워칭·미믹·게싱·워드에 머문 시간만 모입니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white"
            >
              홈
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/auth/login');
              }}
              className="px-4 py-2 rounded-lg bg-[#60D96C] text-black font-bold"
            >
              로그아웃
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-200 text-sm whitespace-pre-wrap">
            데이터를 못 읽었습니다. Supabase SQL Editor에서{' '}
            <code className="text-white">supabase/academy_master.sql</code> 또는{' '}
            <code className="text-white">supabase/learning_evaluations.sql</code> 을 실행했는지 확인하세요.
            {'\n'}
            {errorMessage}
          </div>
        )}

        {busy ? (
          <p className="text-gray-400">불러오는 중...</p>
        ) : rows.length === 0 && !errorMessage ? (
          <p className="text-gray-400">아직 학생 계정이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="px-4 py-3">닉네임</th>
                  <th className="px-4 py-3">이메일</th>
                  <th className="px-4 py-3">마지막 학습</th>
                  <th className="px-4 py-3">이번 주</th>
                  <th className="px-4 py-3">누적</th>
                  <th className="px-4 py-3">완료</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-800 hover:bg-gray-900/70 cursor-pointer"
                    onClick={() => {
                      setSelected(row);
                      setOpenCell(null);
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{row.nickname}</td>
                    <td className="px-4 py-3 text-gray-400">{row.email}</td>
                    <td className="px-4 py-3">{formatWhen(row.lastActiveAt)}</td>
                    <td className="px-4 py-3">{row.weekMinutes}분</td>
                    <td className="px-4 py-3">{row.totalMinutes}분</td>
                    <td className="px-4 py-3">
                      {row.completedCount}/{TOTAL_SLOTS}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selected.nickname}</h2>
                  <p className="text-gray-400 text-sm">{selected.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-white"
                >
                  닫기
                </button>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                이번 주 {selected.weekMinutes}분 · 누적 {selected.totalMinutes}분
                <span className="text-gray-500"> · 칸을 누르면 평가 상세</span>
              </p>

              <div className="space-y-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((lesson) => (
                  <div key={lesson}>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-gray-400">레슨 {lesson}</span>
                      <div className="flex flex-wrap gap-2">
                        {MODES.map((mode) => {
                          const done = selected.progressByLesson[lesson]?.[mode];
                          const isOpen = openCell?.lesson === lesson && openCell?.mode === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                setOpenCell(isOpen ? null : { lesson, mode })
                              }
                              className={`px-2 py-1 rounded-md ${
                                done
                                  ? 'bg-[#60D96C] text-black'
                                  : 'bg-gray-800 text-gray-400'
                              } ${isOpen ? 'ring-2 ring-white' : ''}`}
                            >
                              {MODE_LABEL[mode]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {openCell?.lesson === lesson && (
                      <EvaluationDetail
                        mode={openCell.mode}
                        payload={selected.evaluations[`${lesson}:${openCell.mode}`]}
                      />
                    )}
                  </div>
                ))}
              </div>

              {selected.latestScores.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold mb-2">최근 점수</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {selected.latestScores.map((s, idx) => (
                      <li key={`${s.lesson}-${s.mode}-${idx}`}>
                        레슨 {s.lesson} {MODE_LABEL[s.mode] || s.mode}{' '}
                        {s.score == null ? '-' : `${s.score}점`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
