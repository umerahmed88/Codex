// ============================================================================
// AuthProvider — React Context that holds the current session and exposes the
// auth actions (sign up, log in, log out, reset password, social sign-in).
//
// Any screen can call `useAuth()` to know if someone is logged in and to act
// on it. The session is restored automatically on app start (Supabase reads it
// from SecureStore), which is what keeps the user logged in across restarts.
// ============================================================================
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { identifyUser, resetUser } from './posthog';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Restore any existing session on startup (persistence across restarts).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 2. Keep our state in sync with every future auth change (login/logout).
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Analytics identity follows auth: opaque user id on login, detached on
      // logout so the next user on this device isn't mislabeled (Phase 15).
      if (event === 'SIGNED_IN' && newSession) identifyUser(newSession.user.id);
      if (event === 'SIGNED_OUT') resetUser();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: displayName ? { display_name: displayName } : undefined },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// The hook every screen uses. Throws if used outside the provider — a common
// mistake we want to catch immediately, not silently.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
