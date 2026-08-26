'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getCurrentUser, getStudentProfile, type StudentProfile } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const nextProfile = await getStudentProfile(user.id);
    setProfile(nextProfile);
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (nextUser: User | null) => {
      if (!nextUser) {
        if (!cancelled) setProfile(null);
        return;
      }
      try {
        const nextProfile = await getStudentProfile(nextUser.id);
        if (!cancelled) setProfile(nextProfile);
      } catch (error) {
        console.error('Profile load error:', error);
        if (!cancelled) setProfile(null);
      }
    };

    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;
        setUser(currentUser);
        setLoading(false);
        void loadProfile(currentUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setLoading(false);
        void loadProfile(nextUser);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
