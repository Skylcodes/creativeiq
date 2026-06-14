"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = createClient();
      supabaseRef.current = supabase;

      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        }
      );

      subscription = data.subscription;
    } catch {
      queueMicrotask(() => setLoading(false));
    }

    return () => subscription?.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    }
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
