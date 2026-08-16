import { supabase } from '../supabaseClient';

export type AcademyRole = 'student' | 'academy';

export type StudentProfileRow = {
  id: string;
  email: string | null;
  nickname: string | null;
  role?: AcademyRole | null;
};

export type ProgressRow = {
  student_id: string;
  lesson_number: number;
  mode: string;
  completed: boolean | null;
  updated_at: string | null;
};

export type SessionRow = {
  student_id: string;
  lesson_number: number;
  mode: string;
  started_at: string;
  duration_seconds: number | null;
  last_heartbeat_at: string | null;
};

export type ResultRow = {
  student_id: string;
  lesson_number: number;
  mode: string;
  score: number | null;
  correct_count: number | null;
  total_count: number | null;
  time_spent: number | null;
  created_at: string | null;
};

export type StudentDashboardRow = {
  id: string;
  nickname: string;
  email: string;
  lastActiveAt: string | null;
  weekMinutes: number;
  totalMinutes: number;
  completedCount: number;
  progressByLesson: Record<number, Record<string, boolean>>;
  latestScores: { lesson: number; mode: string; score: number | null }[];
  evaluations: Record<string, Record<string, unknown>>;
};

const MODES = ['watching', 'mimicking', 'guessing', 'word'] as const;
const TOTAL_SLOTS = 12 * MODES.length;

function startOfLocalWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

export async function fetchAcademyDashboard(): Promise<{
  students: StudentDashboardRow[];
  errorMessage: string | null;
}> {
  const [profilesRes, progressRes, sessionsRes, resultsRes, evalRes] = await Promise.all([
    supabase.from('student_profiles').select('id, email, nickname, role'),
    supabase
      .from('learning_progress')
      .select('student_id, lesson_number, mode, completed, updated_at'),
    supabase
      .from('learning_sessions')
      .select('student_id, lesson_number, mode, started_at, duration_seconds, last_heartbeat_at'),
    supabase
      .from('learning_results')
      .select('student_id, lesson_number, mode, score, correct_count, total_count, time_spent, created_at'),
    supabase
      .from('learning_evaluations')
      .select('student_id, lesson_number, mode, payload'),
  ]);

  const firstError =
    profilesRes.error?.message ||
    progressRes.error?.message ||
    sessionsRes.error?.message ||
    resultsRes.error?.message ||
    evalRes.error?.message ||
    null;

  if (firstError) {
    return { students: [], errorMessage: firstError };
  }

  const weekStart = startOfLocalWeek().getTime();
  const profiles = (profilesRes.data || []) as StudentProfileRow[];
  const progress = (progressRes.data || []) as ProgressRow[];
  const sessions = (sessionsRes.data || []) as SessionRow[];
  const results = (resultsRes.data || []) as ResultRow[];
  const evalRows = (evalRes.data || []) as {
    student_id: string;
    lesson_number: number;
    mode: string;
    payload: Record<string, unknown> | null;
  }[];

  const students = profiles
    .map((p) => {
      const myProgress = progress.filter((row) => row.student_id === p.id);
      const mySessions = sessions.filter((row) => row.student_id === p.id);
      const myResults = results.filter((row) => row.student_id === p.id);
      const myEvals = evalRows.filter((row) => row.student_id === p.id);
      const evaluations: Record<string, Record<string, unknown>> = {};
      myEvals.forEach((row) => {
        evaluations[`${row.lesson_number}:${row.mode}`] = row.payload || {};
      });

      const progressByLesson: Record<number, Record<string, boolean>> = {};
      for (let lesson = 1; lesson <= 12; lesson += 1) {
        progressByLesson[lesson] = {};
        for (const mode of MODES) {
          progressByLesson[lesson][mode] = false;
        }
      }

      let completedCount = 0;
      myProgress.forEach((row) => {
        if (!progressByLesson[row.lesson_number]) return;
        const done = Boolean(row.completed);
        progressByLesson[row.lesson_number][row.mode] = done;
        if (done) completedCount += 1;
      });

      const totalSeconds = mySessions.reduce(
        (sum, row) => sum + (row.duration_seconds || 0),
        0
      );
      const weekSeconds = mySessions.reduce((sum, row) => {
        if (new Date(row.started_at).getTime() < weekStart) return sum;
        return sum + (row.duration_seconds || 0);
      }, 0);

      const lastTimes = [
        ...mySessions.map((s) => s.last_heartbeat_at || s.started_at),
        ...myProgress.map((r) => r.updated_at),
        ...myResults.map((r) => r.created_at),
      ].filter(Boolean) as string[];

      lastTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      const latestScores = [...myResults]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 6)
        .map((r) => ({
          lesson: r.lesson_number,
          mode: r.mode,
          score: r.score,
        }));

      return {
        id: p.id,
        nickname:
          (p.nickname || '이름 없음') +
          ((p.role || 'student') === 'academy' ? ' (원장)' : ''),
        email: p.email || '',
        lastActiveAt: lastTimes[0] || null,
        weekMinutes: Math.round(weekSeconds / 60),
        totalMinutes: Math.round(totalSeconds / 60),
        completedCount,
        progressByLesson,
        latestScores,
        evaluations,
      };
    })
    .sort((a, b) => {
      const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return bt - at;
    });

  return { students, errorMessage: null };
}

export { MODES, TOTAL_SLOTS };
