import { useEffect, useState, useCallback } from "react";
import { Loader2, Flag, Eye, Check, Trash2, Ban, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";

type UnifiedReport = {
  id: string;
  source: "forum" | "marketplace";
  reporter_id: string;
  reporter_name: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  // forum
  target_type?: string;
  target_id?: string;
  content_snippet?: string;
  content_link?: string;
  content_author_id?: string | null;
  // marketplace
  listing_id?: string;
  listing_title?: string;
  seller_id?: string | null;
};

const REASON_LABELS: Record<string, string> = {
  scam: "הונאה",
  inappropriate: "תוכן לא ראוי",
  duplicate: "כפול",
  wrong_category: "קטגוריה שגויה",
  sold: "כבר נמכר",
  spam: "ספאם",
  harassment: "הטרדה",
  other: "אחר",
};

const STATUS_LABELS: Record<string, string> = {
  open: "פתוח",
  reviewed: "טופל",
  dismissed: "נדחה",
};

export function ModerationHub() {
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "forum" | "marketplace">("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "reviewed" | "dismissed" | "all">("open");
  const [search, setSearch] = useState("");
  const [banDialog, setBanDialog] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, mr] = await Promise.all([
        supabase.from("forum_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("marketplace_reports").select("*").order("created_at", { ascending: false }),
      ]);
      const forumRows = (fr.data ?? []) as any[];
      const marketRows = (mr.data ?? []) as any[];

      const reporterIds = Array.from(new Set([
        ...forumRows.map((r) => r.reporter_id),
        ...marketRows.map((r) => r.reporter_id),
      ]));
      const postIds = forumRows.filter((r) => r.target_type === "post").map((r) => r.target_id);
      const topicIds = forumRows.filter((r) => r.target_type === "topic").map((r) => r.target_id);
      const forumUserIds = forumRows.filter((r) => r.target_type === "user").map((r) => r.target_id);
      const listingIds = marketRows.map((r) => r.listing_id);

      const [profilesRes, postsRes, topicsRes, listingsRes, forumUsersRes] = await Promise.all([
        reporterIds.length ? supabase.from("profiles").select("id, display_name, email").in("id", reporterIds) : Promise.resolve({ data: [] }),
        postIds.length ? supabase.from("forum_posts").select("id, topic_id, body_md, author_id, is_deleted").in("id", postIds) : Promise.resolve({ data: [] }),
        topicIds.length ? supabase.from("forum_topics").select("id, title, slug, author_id, is_deleted").in("id", topicIds) : Promise.resolve({ data: [] }),
        listingIds.length ? supabase.from("marketplace_listings").select("id, title, seller_id, status").in("id", listingIds) : Promise.resolve({ data: [] }),
        forumUserIds.length ? supabase.from("profiles").select("id, display_name, username").in("id", forumUserIds) : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const postMap = new Map<string, any>((postsRes.data ?? []).map((p: any) => [p.id, p]));
      const topicMap = new Map<string, any>((topicsRes.data ?? []).map((t: any) => [t.id, t]));
      const listingMap = new Map<string, any>((listingsRes.data ?? []).map((l: any) => [l.id, l]));
      const forumUserMap = new Map<string, any>((forumUsersRes.data ?? []).map((u: any) => [u.id, u]));

      // For post reports we need topic slug to build a link
      const referencedTopicIds = Array.from(new Set(
        (postsRes.data ?? []).map((p: any) => p.topic_id).filter(Boolean)
      ));
      const missing = referencedTopicIds.filter((id) => !topicMap.has(id));
      if (missing.length) {
        const extra = await supabase.from("forum_topics").select("id, title, slug, author_id").in("id", missing);
        for (const t of (extra.data ?? []) as any[]) topicMap.set(t.id, t);
      }

      const unified: UnifiedReport[] = [];

      for (const r of forumRows) {
        const reporter = profileMap.get(r.reporter_id);
        let snippet = "";
        let link = "/forum";
        let authorId: string | null = null;
        if (r.target_type === "post") {
          const p = postMap.get(r.target_id);
          if (p) {
            snippet = (p.body_md || "").slice(0, 160);
            authorId = p.author_id;
            const t = topicMap.get(p.topic_id);
            if (t) link = `/forum/topic/${t.slug}`;
          } else {
            snippet = "(הודעה לא נמצאה)";
          }
        } else if (r.target_type === "topic") {
          const t = topicMap.get(r.target_id);
          if (t) {
            snippet = t.title;
            authorId = t.author_id;
            link = `/forum/topic/${t.slug}`;
          }
        } else if (r.target_type === "user") {
          const u = forumUserMap.get(r.target_id);
          snippet = `משתמש: ${u?.display_name || u?.username || r.target_id.slice(0, 8)}`;
          authorId = r.target_id;
          link = u?.username ? `/forum/user/${u.username}` : "/forum";
        }
        unified.push({
          id: r.id,
          source: "forum",
          reporter_id: r.reporter_id,
          reporter_name: reporter?.display_name || reporter?.email || r.reporter_id.slice(0, 8),
          reason: r.reason,
          details: null,
          status: r.status,
          created_at: r.created_at,
          target_type: r.target_type,
          target_id: r.target_id,
          content_snippet: snippet,
          content_link: link,
          content_author_id: authorId,
        });
      }

      for (const r of marketRows) {
        const reporter = profileMap.get(r.reporter_id);
        const l = listingMap.get(r.listing_id);
        unified.push({
          id: r.id,
          source: "marketplace",
          reporter_id: r.reporter_id,
          reporter_name: reporter?.display_name || reporter?.email || r.reporter_id.slice(0, 8),
          reason: r.reason,
          details: r.details,
          status: r.status,
          created_at: r.created_at,
          listing_id: r.listing_id,
          listing_title: l?.title || `(נמחקה — ${r.listing_id.slice(0, 8)})`,
          seller_id: l?.seller_id ?? null,
          content_snippet: l?.title || "",
          content_link: l ? `/marketplace/${l.id}` : undefined,
          content_author_id: l?.seller_id ?? null,
        });
      }

      unified.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setReports(unified);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = async (r: UnifiedReport) => {
    const table = r.source === "forum" ? "forum_reports" : "marketplace_reports";
    const { error } = await supabase.from(table).update({
      status: "dismissed",
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("הדיווח נדחה");
    load();
  };

  const markReviewed = async (r: UnifiedReport) => {
    const table = r.source === "forum" ? "forum_reports" : "marketplace_reports";
    const { error } = await supabase.from(table).update({
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("סומן כטופל");
    load();
  };

  const deleteContent = async (r: UnifiedReport) => {
    if (!confirm("למחוק את התוכן הפוגעני? פעולה זו לא ניתנת לביטול.")) return;
    try {
      if (r.source === "marketplace" && r.listing_id) {
        const { error } = await supabase.from("marketplace_listings").delete().eq("id", r.listing_id);
        if (error) throw error;
      } else if (r.source === "forum") {
        if (r.target_type === "post") {
          const { error } = await supabase.from("forum_posts").update({ is_deleted: true }).eq("id", r.target_id!);
          if (error) throw error;
        } else if (r.target_type === "topic") {
          const { error } = await supabase.from("forum_topics").update({ is_deleted: true }).eq("id", r.target_id!);
          if (error) throw error;
        } else {
          toast.info("לדיווח על משתמש – בצע חסימה במקום מחיקה");
          return;
        }
      }
      await supabase.from(r.source === "forum" ? "forum_reports" : "marketplace_reports")
        .update({ status: "reviewed", reviewed_at: new Date().toISOString() }).eq("id", r.id);
      toast.success("התוכן נמחק והדיווח סומן כטופל");
      load();
    } catch (e: any) {
      toast.error(friendlyError(e));
    }
  };

  const openBan = (r: UnifiedReport) => {
    const userId = r.content_author_id;
    if (!userId) return toast.error("לא נמצא משתמש לחסימה");
    setBanReason("");
    setBanDialog({ userId, name: r.content_snippet || userId.slice(0, 8) });
  };

  const confirmBan = async () => {
    if (!banDialog) return;
    const { error } = await supabase.rpc("admin_set_user_ban", {
      _user_id: banDialog.userId,
      _banned: true,
      _reason: banReason || undefined,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success("המשתמש נחסם");
    setBanDialog(null);
    load();
  };

  const filtered = reports.filter((r) => {
    if (tab !== "all" && r.source !== tab) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(
        (r.reporter_name || "").toLowerCase().includes(s) ||
        (r.content_snippet || "").toLowerCase().includes(s) ||
        (r.reason || "").toLowerCase().includes(s)
      )) return false;
    }
    return true;
  });

  const counts = {
    all: reports.filter((r) => r.status === "open").length,
    forum: reports.filter((r) => r.source === "forum" && r.status === "open").length,
    marketplace: reports.filter((r) => r.source === "marketplace" && r.status === "open").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <ShieldAlert className="h-6 w-6 text-rose-500" />
        <h1 className="text-2xl font-bold">מרכז ניהול דיווחים ומודרציה</h1>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">הכל ({counts.all})</TabsTrigger>
            <TabsTrigger value="forum">פורום ({counts.forum})</TabsTrigger>
            <TabsTrigger value="marketplace">יד 2 ({counts.marketplace})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="open">פתוחים</TabsTrigger>
            <TabsTrigger value="reviewed">טופלו</TabsTrigger>
            <TabsTrigger value="dismissed">נדחו</TabsTrigger>
            <TabsTrigger value="all">הכל</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="חיפוש…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={load}>רענן</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מקור</TableHead>
                <TableHead>סיבה</TableHead>
                <TableHead>תוכן מדווח</TableHead>
                <TableHead>מדווח</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">אין דיווחים</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={`${r.source}-${r.id}`}>
                  <TableCell>
                    <Badge variant={r.source === "forum" ? "secondary" : "outline"}>
                      {r.source === "forum" ? "פורום" : "יד 2"}
                    </Badge>
                    {r.source === "forum" && r.target_type && (
                      <div className="text-xs text-muted-foreground mt-1">{r.target_type}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="gap-1"><Flag className="h-3 w-3" />{REASON_LABELS[r.reason] || r.reason}</Badge>
                    {r.details && <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{r.details}</div>}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="text-sm truncate" title={r.content_snippet}>{r.content_snippet || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.reporter_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "open" ? "default" : "outline"}>{STATUS_LABELS[r.status] || r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {r.content_link && (
                        <a href={r.content_link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" title="צפה בתוכן"><Eye className="h-3 w-3" /></Button>
                        </a>
                      )}
                      {r.status === "open" && (
                        <Button size="sm" variant="ghost" onClick={() => markReviewed(r)} title="סמן כטופל">
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      {r.status === "open" && (
                        <Button size="sm" variant="ghost" onClick={() => dismiss(r)} title="התעלם">
                          ✕
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => deleteContent(r)} title="מחק תוכן">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {r.content_author_id && (
                        <Button size="sm" variant="destructive" onClick={() => openBan(r)} title="חסום משתמש">
                          <Ban className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!banDialog} onOpenChange={(o) => !o && setBanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>חסימת משתמש</DialogTitle>
            <DialogDescription>
              החסימה תחסום את {banDialog?.name} מפעולות כתיבה ותנתק את הסשנים הפעילים שלו.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="סיבת החסימה (אופציונלי)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog(null)}>ביטול</Button>
            <Button variant="destructive" onClick={confirmBan}>חסום</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
