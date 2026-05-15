import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * beforeLoad guard: redirects to /auth if no session.
 * Runs before component bundle loads.
 */
export async function requireAuth({ location }: { location: { href: string } }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  }
}

/**
 * beforeLoad guard: requires session + admin role. Non-admins redirected to /.
 */
export async function requireAdmin({ location }: { location: { href: string } }) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) {
    throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  }
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", sess.session.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    throw redirect({ to: "/" });
  }
}
