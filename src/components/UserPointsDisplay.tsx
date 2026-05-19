import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Compact navbar pill showing the user's points balance. Links to /points.
 * Silently hides for anonymous users or while loading.
 */
export function UserPointsDisplay({ className }: { className?: string }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setBalance(null);
      return;
    }
    let alive = true;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      setBalance(Number(data?.total_points ?? 0));
    };
    load();

    const channel = supabase
      .channel(`user-points-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_points", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (!user || balance === null) return null;

  return (
    <Link
      to="/points"
      aria-label={`היתרה שלך: ${balance} נקודות`}
      className={cn(
        "group hidden md:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-500/20 hover:text-amber-400",
        className,
      )}
    >
      <Coins className="h-3.5 w-3.5" />
      <span className="tabular-nums">{balance.toLocaleString("he-IL")}</span>
    </Link>
  );
}
