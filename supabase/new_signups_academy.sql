-- 지금부터 새로 만들어지는 프로필의 기본 역할 = academy
-- Supabase Dashboard → SQL Editor → Run 한 번

ALTER TABLE public.student_profiles
  ALTER COLUMN role SET DEFAULT 'academy';
