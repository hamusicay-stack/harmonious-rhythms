import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  metadata: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Failed to load notifications", error);
      setItems([]);
    } else {
      setItems((data as any) ?? []);
    }
    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (authLoading || !user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    await supabase.from("notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: now }));
    await supabase.from("notifications" as any).update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications" as any).delete().eq("id", id);
  }, []);

  return { items, loading, unreadCount, markRead, markAllRead, remove, reload: load };
}
