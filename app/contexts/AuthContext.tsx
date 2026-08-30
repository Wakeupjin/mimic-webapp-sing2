'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getCurrentUser, getStudentProfile, type StudentProfile } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileUserIdRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      profileUserIdRef.current = null;
      return;
    }
    const requestId = ++profileRequestIdRef.current;
    const nextProfile = await getStudentProfile(user.id);
    if (requestId === profileRequestIdRef.current) {
      setProfile(nextProfile);
      profileUserIdRef.current = user.id;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (nextUser: User | null) => {
      const requestId = ++profileRequestIdRef.current;
      if (!nextUser) {
        if (!cancelled) {
          setProfile(null);
          setProfileLoading(false);
          profileUserIdRef.current = null;
        }
        return;
      }
      const shouldBlock = profileUserIdRef.current !== nextUser.id;
      if (!cancelled && shouldBlock) setProfileLoading(true);
      try {
        const nextProfile = await getStudentProfile(nextUser.id);
        if (!cancelled && requestId === profileRequestIdRef.current) {
          setProfile(nextProfile);
          profileUserIdRef.current = nextUser.id;
        }
      } catch (error) {
        console.error('Profile load error:', error);
        if (!cancelled && requestId === profileRequestIdRef.current) setProfile(null);
      } finally {
        if (!cancelled && requestId === profileRequestIdRef.current && shouldBlock) {
          setProfileLoading(false);
        }
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
          setProfileLoading(false);
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
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
