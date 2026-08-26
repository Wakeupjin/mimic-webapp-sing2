-- 신규 인증 사용자는 DB가 학생 프로필로 자동 생성합니다.
-- 기존 사용자 역할은 변경하지 않습니다.

BEGIN;

ALTER TABLE public.student_profiles
  ALTER COLUMN role SET DEFAULT 'student';

CREATE OR REPLACE FUNCTION public.handle_new_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_profiles (id, email, nickname, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nickname', ''), split_part(NEW.email, '@', 1)),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_student_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_student_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student_profile();

REVOKE INSERT ON public.student_profiles FROM anon, authenticated;
DROP POLICY IF EXISTS profiles_insert_own ON public.student_profiles;

COMMIT;
