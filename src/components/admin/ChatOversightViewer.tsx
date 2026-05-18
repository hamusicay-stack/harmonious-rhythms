import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MarketThread = {
  id: string; listing_id: string; buyer_id: string; seller_id: string;
  last_message_at: string; last_message_preview: string | null;
};
type ProThread = {
  id: string; pro_id: string; pro_user_id: string; sender_id: string;
  last_message_at: string; last_message_preview: string | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string };

function formatDate(d: string) {
  return new Date(d).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

export function ChatOversightViewer() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <strong className="text-amber-600 dark:text-amber-400">צפייה שקטה:</strong> הצדדים בשיחה לא יודעים שצופים בהם, וההודעות לא מסומנות כנקראות בשמם.
      </div>
      <Tabs defaultValue="marketplace">
        <TabsList>
          <TabsTrigger value="marketplace">שיחות יד 2</TabsTrigger>
          <TabsTrigger value="pros">שיחות מוזיקאים</TabsTrigger>
        </TabsList>
        <TabsContent value="marketplace" className="mt-4"><MarketplaceChats /></TabsContent>
        <TabsContent value="pros" className="mt-4"><ProChats /></TabsContent>
      </Tabs>
    </div>
  );
}

function MarketplaceChats() {
  const [threads, setThreads] = useState<MarketThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null }>>({});
  const [listings, setListings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<MarketThread | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("marketplace_chat_threads")
        .select("id,listing_id,buyer_id,seller_id,last_message_at,last_message_preview")
        .order("last_message_at", { ascending: false })
        .limit(200);
      const list = (data as MarketThread[]) ?? [];
      setThreads(list);

      const userIds = Array.from(new Set(list.flatMap((t) => [t.buyer_id, t.seller_id])));
      const listingIds = Array.from(new Set(list.map((t) => t.listing_id)));
      const [{ data: profs }, { data: lst }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id,display_name,email").in("id", userIds) : Promise.resolve({ data: [] }),
        listingIds.length ? supabase.from("marketplace_listings").select("id,title").in("id", listingIds) : Promise.resolve({ data: [] }),
      ]);
      const pmap: Record<string, { name: string; email: string | null }> = {};
      (profs as { id: string; display_name: string | null; email: string | null }[] | null)?.forEach((p) => {
        pmap[p.id] = { name: p.display_name ?? "—", email: p.email };
      });
      setProfiles(pmap);
      const lmap: Record<string, string> = {};
      (lst as { id: string; title: string }[] | null)?.forEach((l) => { lmap[l.id] = l.title; });
      setListings(lmap);
      setLoading(false);
    })();
  }, []);

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      profiles[t.buyer_id]?.name?.toLowerCase().includes(s) ||
      profiles[t.seller_id]?.name?.toLowerCase().includes(s) ||
      profiles[t.buyer_id]?.email?.toLowerCase().includes(s) ||
      listings[t.listing_id]?.toLowerCase().includes(s)
    );
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>שיחות יד 2 ({filtered.length})</CardTitle>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש משתמש/מודעה..." className="max-w-sm" />
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActive(t)}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{profiles[t.buyer_id]?.name ?? "קונה"}</Badge>
                <span className="text-muted-foreground">↔</span>
                <Badge variant="outline">{profiles[t.seller_id]?.name ?? "מוכר"}</Badge>
                <span className="text-xs text-muted-foreground">· {listings[t.listing_id] ?? "מודעה"}</span>
              </div>
              {t.last_message_preview && <div className="mt-1 truncate text-xs text-muted-foreground">{t.last_message_preview}</div>}
              <div className="text-[10px] text-muted-foreground">{formatDate(t.last_message_at)}</div>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">אין שיחות</div>}
      </CardContent>
      {active && (
        <ThreadViewer
          open={!!active}
          onClose={() => setActive(null)}
          table="marketplace_chat_messages"
          threadId={active.id}
          title={`${profiles[active.buyer_id]?.name ?? "קונה"} ↔ ${profiles[active.seller_id]?.name ?? "מוכר"}`}
          profiles={profiles}
        />
      )}
    </Card>
  );
}

function ProChats() {
  const [threads, setThreads] = useState<ProThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null }>>({});
  const [pros, setPros] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ProThread | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pro_chat_threads")
        .select("id,pro_id,pro_user_id,sender_id,last_message_at,last_message_preview")
        .order("last_message_at", { ascending: false })
        .limit(200);
      const list = (data as ProThread[]) ?? [];
      setThreads(list);

      const userIds = Array.from(new Set(list.flatMap((t) => [t.pro_user_id, t.sender_id])));
      const proIds = Array.from(new Set(list.map((t) => t.pro_id)));
      const [{ data: profs }, { data: pp }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id,display_name,email").in("id", userIds) : Promise.resolve({ data: [] }),
        proIds.length ? supabase.from("music_pros").select("id,display_name").in("id", proIds) : Promise.resolve({ data: [] }),
      ]);
      const pmap: Record<string, { name: string; email: string | null }> = {};
      (profs as { id: string; display_name: string | null; email: string | null }[] | null)?.forEach((p) => {
        pmap[p.id] = { name: p.display_name ?? "—", email: p.email };
      });
      setProfiles(pmap);
      const prosMap: Record<string, string> = {};
      (pp as { id: string; display_name: string }[] | null)?.forEach((x) => { prosMap[x.id] = x.display_name; });
      setPros(prosMap);
      setLoading(false);
    })();
  }, []);

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      pros[t.pro_id]?.toLowerCase().includes(s) ||
      profiles[t.sender_id]?.name?.toLowerCase().includes(s) ||
      profiles[t.sender_id]?.email?.toLowerCase().includes(s)
    );
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>שיחות מוזיקאים ({filtered.length})</CardTitle>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש מוזיקאי/משתמש..." className="max-w-sm" />
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActive(t)}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{profiles[t.sender_id]?.name ?? "משתמש"}</Badge>
                <span className="text-muted-foreground">↔</span>
                <Badge variant="outline">🎵 {pros[t.pro_id] ?? "מוזיקאי"}</Badge>
              </div>
              {t.last_message_preview && <div className="mt-1 truncate text-xs text-muted-foreground">{t.last_message_preview}</div>}
              <div className="text-[10px] text-muted-foreground">{formatDate(t.last_message_at)}</div>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">אין שיחות</div>}
      </CardContent>
      {active && (
        <ThreadViewer
          open={!!active}
          onClose={() => setActive(null)}
          table="pro_chat_messages"
          threadId={active.id}
          title={`${profiles[active.sender_id]?.name ?? "משתמש"} ↔ ${pros[active.pro_id] ?? "מוזיקאי"}`}
          profiles={profiles}
        />
      )}
    </Card>
  );
}

function ThreadViewer({
  open, onClose, table, threadId, title, profiles,
}: {
  open: boolean; onClose: () => void;
  table: "marketplace_chat_messages" | "pro_chat_messages";
  threadId: string; title: string;
  profiles: Record<string, { name: string; email: string | null }>;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from(table).select("id,sender_id,body,created_at").eq("thread_id", threadId).order("created_at", { ascending: true });
      setMsgs((data as Msg[]) ?? []);
      setLoading(false);
    })();
  }, [open, table, threadId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 flex flex-col h-[80vh] sm:h-[600px]">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-right text-base">
            <MessageCircle className="h-4 w-4" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : msgs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">אין הודעות בשיחה</div>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold">{profiles[m.sender_id]?.name ?? m.sender_id.slice(0, 8)}</span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
