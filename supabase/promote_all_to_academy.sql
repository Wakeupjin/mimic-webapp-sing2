-- 지금까지 가입한 student_profiles 전원 원장(academy)
-- Supabase Dashboard → SQL Editor → Run

UPDATE public.student_profiles
SET role = 'academy';

SELECT nickname, email, role
FROM public.student_profiles
ORDER BY email;
