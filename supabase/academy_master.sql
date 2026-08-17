-- =============================================================================
-- Mimicking 학생 현황 + 학습 체류 시간
-- Supabase Dashboard → SQL Editor 에 붙여넣고 Run
-- 이미 한 번 실행했어도 다시 Run 해도 되도록 작성함
-- 학습 화면(watching/mimicking/guessing/word) 과 무관합니다.
-- =============================================================================

-- 1) 역할: student | academy
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'academy';

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_role_check;

ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_role_check
  CHECK (role IN ('student', 'academy'));

-- 2) 학습 화면 체류 시간 (하트비트)
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL,
  mode text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_sessions_student_idx
  ON public.learning_sessions (student_id, started_at DESC);

CREATE INDEX IF NOT EXISTS learning_sessions_week_idx
  ON public.learning_sessions (started_at);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

-- 3) 테이블 권한 (없으면 permission denied)
GRANT SELECT, INSERT, UPDATE ON public.learning_sessions TO authenticated;
GRANT SELECT ON public.student_profiles TO authenticated;
GRANT SELECT ON public.learning_progress TO authenticated;
GRANT SELECT ON public.learning_results TO authenticated;

-- 4) 학원 판별
-- LANGUAGE sql 은 inlining 때문에 student_profiles RLS 재귀가 납니다. 반드시 plpgsql.
CREATE OR REPLACE FUNCTION public.is_academy()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.student_profiles
    WHERE id = auth.uid()
      AND role = 'academy'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_academy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_academy() TO authenticated;

-- 5) 로그인한 사람은 자기 프로필을 읽는다 (없으면 앱이 0줄 / PGRST116)
DROP POLICY IF EXISTS "students select own profile" ON public.student_profiles;
CREATE POLICY "students select own profile"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 6) 세션: 학생은 본인만 쓰기, 학원은 전체 읽기
DROP POLICY IF EXISTS "students insert own sessions" ON public.learning_sessions;
CREATE POLICY "students insert own sessions"
  ON public.learning_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students update own sessions" ON public.learning_sessions;
CREATE POLICY "students update own sessions"
  ON public.learning_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students select own sessions" ON public.learning_sessions;
CREATE POLICY "students select own sessions"
  ON public.learning_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "academy select all sessions" ON public.learning_sessions;
CREATE POLICY "academy select all sessions"
  ON public.learning_sessions FOR SELECT
  TO authenticated
  USING (public.is_academy());

-- 7) 학원은 모든 학생 프로필·진도·결과 조회
DROP POLICY IF EXISTS "academy select all profiles" ON public.student_profiles;
CREATE POLICY "academy select all profiles"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (public.is_academy());

DROP POLICY IF EXISTS "academy select all progress" ON public.learning_progress;
CREATE POLICY "academy select all progress"
  ON public.learning_progress FOR SELECT
  TO authenticated
  USING (public.is_academy());

DROP POLICY IF EXISTS "academy select all results" ON public.learning_results;
CREATE POLICY "academy select all results"
  ON public.learning_results FOR SELECT
  TO authenticated
  USING (public.is_academy());

-- 8) Auth 에만 있고 프로필이 없는 계정 채우기
INSERT INTO public.student_profiles (id, email, nickname, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)),
  'academy'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.student_profiles p WHERE p.id = u.id
);

-- =============================================================================
-- 학원 계정 승격 (이메일을 바꿔서 실행)
-- 학원 계정도 홈에서 학습 가능. /admin 은 「학생 현황」
-- =============================================================================
-- UPDATE public.student_profiles
-- SET role = 'academy'
-- WHERE email = 'your-email@example.com';

-- 9) 평가 상세 (워칭/미믹/게싱/워드)
-- 이미 운영 중이면 supabase/learning_evaluations.sql 만 따로 Run 해도 됩니다.
CREATE TABLE IF NOT EXISTS public.learning_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL,
  mode text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_number, mode)
);

ALTER TABLE public.learning_evaluations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.learning_evaluations TO authenticated;

DROP POLICY IF EXISTS "students upsert own evaluations" ON public.learning_evaluations;
CREATE POLICY "students upsert own evaluations"
  ON public.learning_evaluations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students update own evaluations" ON public.learning_evaluations;
CREATE POLICY "students update own evaluations"
  ON public.learning_evaluations FOR UPDATE TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students select own evaluations" ON public.learning_evaluations;
CREATE POLICY "students select own evaluations"
  ON public.learning_evaluations FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "academy select all evaluations" ON public.learning_evaluations;
CREATE POLICY "academy select all evaluations"
  ON public.learning_evaluations FOR SELECT TO authenticated
  USING (public.is_academy());
