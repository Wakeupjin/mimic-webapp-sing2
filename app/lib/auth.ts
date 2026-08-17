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

  // Insert profile data into student_profiles table
  if (data.user) {
    const { error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        nickname,
        role: 'academy',
      });
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
