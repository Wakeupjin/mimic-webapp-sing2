'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getCurrentUser, getStudentProfile, type StudentProfile } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (nextUser: User | null) => {
      if (!nextUser) {
        setProfile(null);
        return;
      }
      try {
        const nextProfile = await getStudentProfile(nextUser.id);
        setProfile(nextProfile);
      } catch (error) {
        console.error('Profile load error:', error);
        setProfile(null);
      }
    };

    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        await loadProfile(currentUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const nextUser = session?.user ?? null;
          setUser(nextUser);
          await loadProfile(nextUser);
        } catch (error) {
          console.error('Auth state change error:', error);
          setUser(null);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
