import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearUserBadgeCache } from "@/components/UserBadges";

export type VipTier = {
  id: string;
  slug: string;
  name: string;
  rank: number;
  is_vip: boolean;
  color: string | null;
} | null;

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  specialties: string[] | null;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  phone?: string | null;
  has_whatsapp?: boolean | null;
  global_subscription_tier_id?: string | null;
  subscription_tier?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  vipTier: VipTier;
  isVip: boolean;
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
  const [vipTier, setVipTier] = useState<VipTier>(null);
  const [loading, setLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const [{ data: prof, error: profileError }, { data: roleRow, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      ]);

      if (activeUserIdRef.current !== userId) return;
      if (profileError) console.error("Failed to load profile", profileError);
      if (roleError) console.error("Failed to load user role", roleError);

      const p = (prof as Profile | null) ?? null;
      setProfile(p);
      setIsAdmin(!!roleRow);

      // Fetch the global VIP tier (single source of truth)
      const tierId = (p as { global_subscription_tier_id?: string | null } | null)?.global_subscription_tier_id;
      if (tierId) {
        const { data: tier } = await supabase
          .from("subscription_tiers")
          .select("id, slug, name, rank, is_vip, color")
          .eq("id", tierId)
          .maybeSingle();
        if (activeUserIdRef.current === userId) setVipTier((tier as VipTier) ?? null);
      } else {
        setVipTier(null);
      }

      // Shadow Entitlement Layer (Phase 2): run SSoT resolver + divergence
      // detection in parallel with legacy auth state. Fire-and-forget;
      // never affects auth context value or render.
      void import("@/lib/entitlements").then(({ compareEntitlements }) =>
        compareEntitlements(userId),
      ).catch(() => {});

    } catch (error) {
      if (activeUserIdRef.current !== userId) return;
      console.error("Failed to sync authenticated user", error);
      setProfile(null);
      setIsAdmin(false);
      setVipTier(null);
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
        setLoading(true);
        const userId = newSession.user.id;
        setTimeout(async () => {
          try {
            await loadProfile(userId);
            // Track last login (fire-and-forget)
            supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId).then(() => {});
            // Award daily-login points once per UTC day per browser session.
            // The DB has a partial unique index that enforces real dedup; this
            // sessionStorage gate just avoids spamming the RPC on reloads.
            try {
              const today = new Date().toISOString().slice(0, 10);
              const key = `points:daily_login:${userId}:${today}`;
              if (typeof window !== "undefined" && !window.sessionStorage.getItem(key)) {
                window.sessionStorage.setItem(key, "1");
                (supabase as any)
                  .rpc("award_points_for_event", {
                    _user_id: userId,
                    _event_key: "daily_login",
                    _reference_type: "daily_login",
                    _reference_id: today,
                    _notes: null,
                  })
                  .then(() => {});
              }
            } catch {
              /* non-fatal */
            }
          } finally {
            if (active && activeUserIdRef.current === userId) {
              setLoading(false);
            }
          }
        }, 0);
      } else {
        activeUserIdRef.current = null;
        setProfile(null);
        setIsAdmin(false);
        setVipTier(null);
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

  // Realtime: subscribe to profile_sync_events and invalidate caches when this user's profile changes anywhere
  useEffect(() => {
    const channel = supabase
      .channel("profile-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profile_sync_events" },
        (payload) => {
          const changedUserId = (payload.new as { user_id?: string } | null)?.user_id;
          if (!changedUserId) return;
          // If this user's profile changed, refresh local state + caches
          if (changedUserId === activeUserIdRef.current) {
            void loadProfile(changedUserId);
          }
          clearUserBadgeCache(changedUserId);
          // Invalidate any query that references this user's profile data
          queryClient.invalidateQueries({ predicate: (q) => {
            const k = q.queryKey as unknown[];
            return k.includes(changedUserId) || k.includes("profile") || k.includes("public-profile");
          }});
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadProfile, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, vipTier, isVip: !!vipTier?.is_vip, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
