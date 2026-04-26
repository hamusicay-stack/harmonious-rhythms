import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "user" | "member" | "premium" | "vip" | "admin";

const cache = new Map<string, Promise<{ roles: AppRole[]; perms: Set<string> }>>();

async function fetchAccess(userId: string | null) {
  const key = userId ?? "_anon";
  if (cache.has(key)) return cache.get(key)!;
  const p = (async () => {
    const roles: AppRole[] = userId ? [] : ["user"];
    if (userId) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const list = ((data ?? []) as { role: AppRole }[]).map(r => r.role);
      roles.push(...(list.length ? list : ["user"]));
    }
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission_key, role, enabled")
      .in("role", roles);
    const set = new Set<string>();
    for (const p of (perms ?? []) as { permission_key: string; enabled: boolean }[]) {
      if (p.enabled) set.add(p.permission_key);
    }
    return { roles, perms: set };
  })();
  cache.set(key, p);
  return p;
}

export function clearPermissionCache() { cache.clear(); }

/** Returns true/false/null (loading) for a single permission key. Admin always true. */
export function usePermission(key: string): boolean | null {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    fetchAccess(user?.id ?? null).then(({ roles, perms }) => {
      if (!active) return;
      setAllowed(roles.includes("admin") || perms.has(key));
    }).catch(() => active && setAllowed(false));
    return () => { active = false; };
  }, [user?.id, key]);
  return allowed;
}

/** Returns the user's effective roles. */
export function useUserRoles(): AppRole[] | null {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  useEffect(() => {
    let active = true;
    fetchAccess(user?.id ?? null).then(({ roles }) => {
      if (active) setRoles(roles);
    });
    return () => { active = false; };
  }, [user?.id]);
  return roles;
}

export function useIsPremium(): boolean {
  const roles = useUserRoles();
  if (!roles) return false;
  return roles.includes("premium") || roles.includes("vip") || roles.includes("admin");
}
