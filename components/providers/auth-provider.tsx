"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthError, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isRateLimitedAuthError(error: AuthError): boolean {
  const lower = error.message.toLowerCase();
  return (
    error.status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  );
}

/** Clear stale local tokens without an extra Auth API round-trip. */
async function clearStaleLocalSession(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best-effort — local storage may already be empty.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = createClient();
      supabaseRef.current = supabase;

      // One server-validated check on mount — avoids redirect loops from stale sessions.
      if (!initialCheckDone.current) {
        initialCheckDone.current = true;

        supabase.auth.getUser().then(async ({ data: { user: verifiedUser }, error }) => {
          if (error || !verifiedUser) {
            if (error && !isRateLimitedAuthError(error)) {
              await clearStaleLocalSession(supabase);
            }
            setUser(null);
            setSession(null);
            setLoading(false);
            return;
          }

          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();

          setUser(verifiedUser);
          setSession(currentSession);
          setLoading(false);
        });
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        // Trust the session from auth events — no extra getUser() per change.
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

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
