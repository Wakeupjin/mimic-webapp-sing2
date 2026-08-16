-- 학생 평가 로그 (워칭/미믹/게싱/워드 상세)
-- Supabase SQL Editor에서 Run
-- 학습 화면 모양은 그대로이고, 뒤에서만 쌓입니다.

CREATE TABLE IF NOT EXISTS public.learning_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL,
  mode text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_number, mode)
);

CREATE INDEX IF NOT EXISTS learning_evaluations_student_idx
  ON public.learning_evaluations (student_id, lesson_number);

ALTER TABLE public.learning_evaluations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.learning_evaluations TO authenticated;

DROP POLICY IF EXISTS "students upsert own evaluations" ON public.learning_evaluations;
CREATE POLICY "students upsert own evaluations"
  ON public.learning_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students update own evaluations" ON public.learning_evaluations;
CREATE POLICY "students update own evaluations"
  ON public.learning_evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "students select own evaluations" ON public.learning_evaluations;
CREATE POLICY "students select own evaluations"
  ON public.learning_evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "academy select all evaluations" ON public.learning_evaluations;
CREATE POLICY "academy select all evaluations"
  ON public.learning_evaluations FOR SELECT
  TO authenticated
  USING (public.is_academy());
