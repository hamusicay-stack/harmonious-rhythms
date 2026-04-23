import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  specialties: string[] | null;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const [{ data: prof, error: profileError }, { data: roleRow, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      ]);

      if (activeUserIdRef.current !== userId) return;
      if (profileError) console.error("Failed to load profile", profileError);
      if (roleError) console.error("Failed to load user role", roleError);

      setProfile((prof as Profile | null) ?? null);
      setIsAdmin(!!roleRow);
    } catch (error) {
      if (activeUserIdRef.current !== userId) return;
      console.error("Failed to sync authenticated user", error);
      setProfile(null);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const syncAuthState = (newSession: Session | null) => {
      if (!active) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        activeUserIdRef.current = newSession.user.id;
        setLoading(false);
        setTimeout(() => {
          void loadProfile(newSession.user.id);
        }, 0);
      } else {
        activeUserIdRef.current = null;
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      syncAuthState(newSession);
    });

    supabase.auth.getSession()
      .then(({ data: { session: existing } }) => {
        syncAuthState(existing);
      })
      .catch((error) => {
        console.error("Failed to restore auth session", error);
        if (!active) return;
        activeUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
