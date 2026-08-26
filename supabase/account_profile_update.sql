-- 로그인한 사용자가 자신의 닉네임만 수정할 수 있게 허용합니다.
-- role, email 등 다른 프로필 열은 클라이언트에서 수정할 수 없습니다.

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE ON public.student_profiles FROM authenticated;
GRANT UPDATE (nickname) ON public.student_profiles TO authenticated;

DROP POLICY IF EXISTS "users update own nickname" ON public.student_profiles;
CREATE POLICY "users update own nickname"
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
