import { supabase } from '../supabaseClient';

export type AcademyRole = 'student' | 'academy';

export type StudentProfile = {
  id: string;
  email: string | null;
  nickname: string | null;
  role: AcademyRole;
};

export async function signUp(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  if (error) throw error;

  // DB 자동 프로필 트리거로 전환하는 동안에도 신규 가입이 끊기지 않게 합니다.
  // 트리거가 이미 프로필을 만들었다면 충돌 없이 그대로 사용합니다.
  if (data.user) {
    const { error: profileError } = await supabase
      .from('student_profiles')
      .upsert(
        {
          id: data.user.id,
          email: data.user.email,
          nickname,
          role: 'student',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function updateOwnAccount({
  userId,
  nickname,
  password,
}: {
  userId: string;
  nickname: string;
  password?: string;
}) {
  const cleanNickname = nickname.trim();
  if (!cleanNickname) throw new Error('이름을 입력해주세요.');

  const { error: profileError } = await supabase
    .from('student_profiles')
    .update({ nickname: cleanNickname })
    .eq('id', userId);
  if (profileError) throw profileError;

  const authPayload: { data: { nickname: string }; password?: string } = {
    data: { nickname: cleanNickname },
  };
  if (password) authPayload.password = password;

  const { error: authError } = await supabase.auth.updateUser(authPayload);
  if (authError) throw authError;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? null,
    nickname: data.nickname ?? null,
    role: data.role === 'academy' ? 'academy' : 'student',
  };
}
