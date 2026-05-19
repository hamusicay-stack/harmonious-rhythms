import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Runtime guard: if a signed-in user's email is no longer on the allowlist
 * (e.g. revoked by an admin after signup), sign them out immediately.
 * The DB trigger blocks unauthorized signups, but this catches revocations.
 */
export function AccessGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user?.email) return;
    if (checkedRef.current === user.id) return;
    checkedRef.current = user.id;

    (async () => {
      const { data, error } = await supabase.rpc("is_email_allowed", { _email: user.email! });
      if (error) return; // fail-open on network errors; trigger still blocks signup
      if (data === false) {
        await supabase.auth.signOut();
        toast.error("הגישה לחשבונך הוסרה. פנה למנהל המערכת.");
        navigate({ to: "/auth" });
      }
    })();
  }, [user, loading, navigate]);

  return null;
}
