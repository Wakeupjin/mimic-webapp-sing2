'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';
import { fetchAcademyDashboard, MODES, TOTAL_SLOTS, type StudentDashboardRow } from '../lib/academy';
import { CloseIcon, HeaderCloseLink, HeaderIconButton } from '../components/HeaderIcons';

const MODE_LABEL: Record<string, string> = {
  watching: 'Watch',
  mimicking: 'Mimic',
  guessing: 'Guess',
  retelling: 'Story',
  word: 'Word',
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
      <p className="admin-eval mt-3">
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
      <div className="admin-eval mt-3 space-y-1">
        <p>본 비율: {Number(payload.maxPercent || 0)}%</p>
        <p>투자 시간: {formatInvested(payload.investedSeconds)}</p>
        <p>재생 횟수: {playCounts.play || replayTotal || 0}회</p>
      </div>
    );
  }

  if (mode === 'mimicking') {
    return (
      <div className="admin-eval mt-3 space-y-1">
        <p>
          문장: {Number(payload.sentencesPlayed || Object.keys(playCounts).length)} /{' '}
          {Number(payload.totalSentences || 0)}
        </p>
        <p>투자 시간: {formatInvested(payload.investedSeconds)}</p>
        <p>반복(문장별 재생):</p>
        <ul className="max-h-40 overflow-y-auto text-[#9ca3af]">
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
      <div className="admin-eval mt-3 space-y-2">
        <p>
          시도 {attempts.length}회 · 틀림 {wrong}회 · 투자 {formatInvested(payload.investedSeconds)}
        </p>
        <ul className="max-h-56 space-y-1 overflow-y-auto text-[#d1d5db]">
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

  if (mode === 'retelling') {
    const usedFallback = Boolean(payload.usedFallback);
    return (
      <div className="admin-eval mt-3 space-y-1">
        <p>{usedFallback ? '마이크 없이 직접 말하기로 완료' : `자기 말로 이야기 ${Number(payload.turnCount || 0)}회 · 말하기 ${formatInvested(payload.speakingSeconds)}`}</p>
        <p>열린 질문: {Number(payload.questionCount || 0)}회</p>
        <p className="text-[#9ca3af]">
          녹음·받아쓰기는 저장하지 않음
        </p>
      </div>
    );
  }

  const wrong = attempts.filter((a) => !a.isCorrect).length;
  return (
    <div className="admin-eval mt-3 space-y-2">
      <p>
        시도 {attempts.length}회 · 틀림 {wrong}회 · 투자 {formatInvested(payload.investedSeconds)}
      </p>
      <ul className="max-h-56 space-y-2 overflow-y-auto text-[#d1d5db]">
        {attempts.map((a, idx) => (
          <li key={idx}>
            {Number(a.question)}번 {a.isCorrect ? '맞음' : '틀림'}
            {a.replayCount ? ` · 반복 ${String(a.replayCount)}` : ''}
            <div className="text-[#9ca3af]">
              제출: {Array.isArray(a.submitted) ? a.submitted.join(' ') : '-'}
            </div>
            <div className="text-[#9ca3af]">
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
      <main className="admin-stage items-center justify-center">
        <p className="admin-note">확인 중…</p>
      </main>
    );
  }

  return (
    <main className="admin-stage">
      <header className="admin-head">
        <p className="home-logo">MimiC</p>
        <div className="admin-head-actions">
          <button
            type="button"
            className="cinema-pill"
            onClick={() => {
              window.location.href = '/sing2/selecting?id=002:1';
            }}
          >
            Hard
          </button>
          <button
            type="button"
            className="home-login"
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
          >
            로그아웃
          </button>
          <HeaderCloseLink href="/" />
        </div>
      </header>

      <h1 className="admin-title">STUDENTS</h1>
      <p className="admin-sub">학생 현황</p>

      <section className="admin-frame custom-scrollbar">
        {errorMessage && (
          <div className="admin-alert">
            학생 데이터를 불러오지 못했어요. Supabase SQL Editor에서{' '}
            <code>supabase/academy_master.sql</code> 또는{' '}
            <code>supabase/learning_evaluations.sql</code> 을 실행했는지 확인하세요.
            {'\n'}
            {errorMessage}
          </div>
        )}

        {busy ? (
          <p className="admin-note">불러오는 중…</p>
        ) : rows.length === 0 && !errorMessage ? (
          <p className="admin-note">아직 학생 계정이 없습니다.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`admin-row ${selected?.id === row.id ? 'is-on' : ''}`}
              onClick={() => {
                setSelected(row);
                setOpenCell(null);
              }}
            >
              <span>
                <span className="admin-name">{row.nickname}</span>
                <span className="admin-mail">{row.email}</span>
              </span>
              <span className="admin-when">{formatWhen(row.lastActiveAt)}</span>
              <span className="admin-stats">
                <span>이번 주 {row.weekMinutes}분</span>
                <span>누적 {row.totalMinutes}분</span>
                <span className="admin-done">
                  {row.completedCount}/{TOTAL_SLOTS}
                </span>
              </span>
            </button>
          ))
        )}
      </section>

      {selected && (
        <div className="admin-panel" onClick={() => setSelected(null)}>
          <div
            className="admin-sheet custom-scrollbar"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="admin-name">{selected.nickname}</p>
                <p className="admin-mail">{selected.email}</p>
              </div>
              <HeaderIconButton label="닫기" onClick={() => setSelected(null)}>
                <CloseIcon />
              </HeaderIconButton>
            </div>

            <p className="admin-eval mb-3">
              이번 주 {selected.weekMinutes}분 · 누적 {selected.totalMinutes}분
              <span style={{ color: '#9ca3af' }}> · 학습 칸을 누르면 자세한 기록을 볼 수 있어요</span>
            </p>

            {Array.from({ length: 12 }, (_, i) => i + 1).map((lesson) => (
              <div key={lesson}>
                <div className="admin-lesson">
                  <span className="admin-lesson-label">CHAPTER {lesson}</span>
                  {MODES.map((mode) => {
                    const done = selected.progressByLesson[lesson]?.[mode];
                    const isOn = openCell?.lesson === lesson && openCell?.mode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOpenCell(isOn ? null : { lesson, mode })}
                        className={`admin-mode ${done ? 'is-open' : ''} ${isOn ? 'is-on' : ''}`}
                      >
                        {MODE_LABEL[mode]}
                      </button>
                    );
                  })}
                </div>
                {openCell?.lesson === lesson && (
                  <EvaluationDetail
                    mode={openCell.mode}
                    payload={selected.evaluations[`${lesson}:${openCell.mode}`]}
                  />
                )}
              </div>
            ))}

            {selected.latestScores.length > 0 && (
              <div className="mt-5">
                <p className="admin-name mb-2">최근 점수</p>
                <ul className="admin-eval space-y-1">
                  {selected.latestScores.map((score, idx) => (
                    <li key={`${score.lesson}-${score.mode}-${idx}`}>
                      CHAPTER {score.lesson} {MODE_LABEL[score.mode] || score.mode}{' '}
                      {score.score == null ? '-' : `${score.score}점`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
