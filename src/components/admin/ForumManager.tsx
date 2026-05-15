import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FolderTree, MessageSquare, Flag, Trophy, Pin, Lock, Trash2, Plus, Save, Loader2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Category = {
  id: string; name: string; slug: string; description: string | null;
  icon: string | null; color: string | null; display_order: number;
};
type Board = {
  id: string; category_id: string; name: string; slug: string;
  description: string | null; icon: string | null; display_order: number;
  topic_count: number; post_count: number;
};
type Topic = {
  id: string; board_id: string; author_id: string; title: string; slug: string;
  is_locked: boolean; is_pinned: boolean; is_deleted: boolean;
  reply_count: number; view_count: number; created_at: string; last_post_at: string | null;
};
type Report = {
  id: string; reporter_id: string; target_type: string; target_id: string;
  reason: string; status: string; created_at: string;
};
type PointsRule = {
  id: string; event_key: string; label: string | null; points: number; enabled: boolean;
};

const FORUM_EVENT_KEYS = [
  "forum_topic_create",
  "forum_post_create",
  "forum_received_upvote",
  "forum_solution_accepted",
];

export function ForumManager() {
  return (
    <Tabs defaultValue="structure" dir="rtl" className="w-full">
      <div className="w-full overflow-x-auto">
        <TabsList className="inline-flex w-max gap-1 md:grid md:w-full md:grid-cols-4">
          <TabsTrigger value="structure"><FolderTree className="ml-1 h-4 w-4" />קטגוריות ולוחות</TabsTrigger>
          <TabsTrigger value="threads"><MessageSquare className="ml-1 h-4 w-4" />ניהול דיונים</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="ml-1 h-4 w-4" />תוכן שדווח</TabsTrigger>
          <TabsTrigger value="points"><Trophy className="ml-1 h-4 w-4" />נקודות פורום</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="structure" className="mt-6"><StructureTab /></TabsContent>
      <TabsContent value="threads" className="mt-6"><ThreadsTab /></TabsContent>
      <TabsContent value="reports" className="mt-6"><ReportsTab /></TabsContent>
      <TabsContent value="points" className="mt-6"><PointsTab /></TabsContent>
    </Tabs>
  );
}

/* ------------------------- Structure (Categories + Boards) ------------------------- */
function StructureTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialog, setCatDialog] = useState<Category | null>(null);
  const [boardDialog, setBoardDialog] = useState<Partial<Board> | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      supabase.from("forum_categories").select("*").order("display_order"),
      supabase.from("forum_boards").select("*").order("display_order"),
    ]);
    if (c.data) setCats(c.data as Category[]);
    if (b.data) setBoards(b.data as Board[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCat = async (c: Partial<Category>) => {
    const payload = {
      name: c.name?.trim(),
      slug: c.slug?.trim(),
      description: c.description ?? null,
      icon: c.icon ?? null,
      color: c.color ?? null,
      display_order: c.display_order ?? 0,
    };
    if (!payload.name || !payload.slug) return toast.error("שם וסלאג חובה");
    const res = c.id
      ? await supabase.from("forum_categories").update(payload as any).eq("id", c.id)
      : await supabase.from("forum_categories").insert(payload as any);
    if (res.error) return toast.error(res.error.message);
    toast.success("נשמר"); setCatDialog(null); load();
  };
  const delCat = async (id: string) => {
    if (!confirm("למחוק קטגוריה? כל הלוחות שתחתיה יימחקו אם הוגדר cascade.")) return;
    const res = await supabase.from("forum_categories").delete().eq("id", id);
    if (res.error) return toast.error(res.error.message);
    toast.success("נמחק"); load();
  };

  const saveBoard = async (b: Partial<Board>) => {
    const payload = {
      category_id: b.category_id,
      name: b.name?.trim(),
      slug: b.slug?.trim(),
      description: b.description ?? null,
      icon: b.icon ?? null,
      display_order: b.display_order ?? 0,
    };
    if (!payload.name || !payload.slug || !payload.category_id) return toast.error("שם, סלאג וקטגוריה חובה");
    const res = b.id
      ? await supabase.from("forum_boards").update(payload).eq("id", b.id)
      : await supabase.from("forum_boards").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("נשמר"); setBoardDialog(null); load();
  };
  const delBoard = async (id: string) => {
    if (!confirm("למחוק לוח?")) return;
    const res = await supabase.from("forum_boards").delete().eq("id", id);
    if (res.error) return toast.error(res.error.message);
    toast.success("נמחק"); load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>קטגוריות ראשיות</CardTitle>
          <Button size="sm" onClick={() => setCatDialog({ id: "", name: "", slug: "", description: null, icon: null, color: null, display_order: cats.length } as Category)}>
            <Plus className="ml-1 h-4 w-4" />קטגוריה חדשה
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cats.map((c) => {
              const catBoards = boards.filter((b) => b.category_id === c.id);
              return (
                <div key={c.id} className="rounded-lg border border-border/50 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">{c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span></div>
                      {c.description && <div className="text-xs text-muted-foreground mt-1">{c.description}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setBoardDialog({ category_id: c.id, name: "", slug: "", display_order: catBoards.length })}>
                        <Plus className="ml-1 h-3 w-3" />לוח
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCatDialog(c)}>עריכה</Button>
                      <Button size="sm" variant="ghost" onClick={() => delCat(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {catBoards.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {catBoards.map((b) => (
                        <div key={b.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{b.name}</span>
                            <span className="text-xs text-muted-foreground mr-2">/{b.slug}</span>
                            <Badge variant="secondary" className="mr-2 text-xs">{b.topic_count} דיונים</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setBoardDialog(b)}>עריכה</Button>
                            <Button size="sm" variant="ghost" onClick={() => delBoard(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {cats.length === 0 && <div className="text-center text-muted-foreground py-8">אין קטגוריות עדיין</div>}
          </div>
        </CardContent>
      </Card>

      {catDialog && (
        <CategoryDialog cat={catDialog} onClose={() => setCatDialog(null)} onSave={saveCat} />
      )}
      {boardDialog && (
        <BoardDialog board={boardDialog} cats={cats} onClose={() => setBoardDialog(null)} onSave={saveBoard} />
      )}
    </div>
  );
}

function CategoryDialog({ cat, onClose, onSave }: { cat: Category; onClose: () => void; onSave: (c: Partial<Category>) => void }) {
  const [s, setS] = useState<Category>(cat);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{cat.id ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>שם</Label><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
          <div><Label>סלאג (URL)</Label><Input value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value })} /></div>
          <div><Label>תיאור</Label><Textarea value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>אייקון (lucide)</Label><Input value={s.icon ?? ""} onChange={(e) => setS({ ...s, icon: e.target.value })} /></div>
            <div><Label>סדר</Label><Input type="number" value={s.display_order} onChange={(e) => setS({ ...s, display_order: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={() => onSave(s)}><Save className="ml-1 h-4 w-4" />שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BoardDialog({ board, cats, onClose, onSave }: { board: Partial<Board>; cats: Category[]; onClose: () => void; onSave: (b: Partial<Board>) => void }) {
  const [s, setS] = useState<Partial<Board>>(board);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{board.id ? "עריכת לוח" : "לוח חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>קטגוריה</Label>
            <Select value={s.category_id} onValueChange={(v) => setS({ ...s, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>שם</Label><Input value={s.name ?? ""} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
          <div><Label>סלאג</Label><Input value={s.slug ?? ""} onChange={(e) => setS({ ...s, slug: e.target.value })} /></div>
          <div><Label>תיאור</Label><Textarea value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>אייקון</Label><Input value={s.icon ?? ""} onChange={(e) => setS({ ...s, icon: e.target.value })} /></div>
            <div><Label>סדר</Label><Input type="number" value={s.display_order ?? 0} onChange={(e) => setS({ ...s, display_order: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={() => onSave(s)}><Save className="ml-1 h-4 w-4" />שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Threads ------------------------- */
function ThreadsTab() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [t, b] = await Promise.all([
      supabase.from("forum_topics").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("forum_boards").select("*"),
    ]);
    if (t.data) setTopics(t.data as Topic[]);
    if (b.data) setBoards(b.data as Board[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      if (boardFilter !== "all" && t.board_id !== boardFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [topics, search, boardFilter]);

  const toggle = async (t: Topic, field: "is_pinned" | "is_locked" | "is_deleted") => {
    const res = await supabase.from("forum_topics").update({ [field]: !t[field] }).eq("id", t.id);
    if (res.error) return toast.error(res.error.message);
    toast.success("עודכן"); load();
  };
  const remove = async (t: Topic) => {
    if (!confirm("למחוק לצמיתות?")) return;
    const res = await supabase.from("forum_topics").delete().eq("id", t.id);
    if (res.error) return toast.error(res.error.message);
    toast.success("נמחק"); load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>כל הדיונים</CardTitle>
        <div className="flex gap-2 flex-wrap mt-3">
          <Input placeholder="חיפוש כותרת" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={boardFilter} onValueChange={setBoardFilter}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הלוחות</SelectItem>
              {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>כותרת</TableHead>
              <TableHead>לוח</TableHead>
              <TableHead>תגובות</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const board = boards.find((b) => b.id === t.board_id);
              return (
                <TableRow key={t.id} className={t.is_deleted ? "opacity-50" : ""}>
                  <TableCell>
                    <Link to={"/forum/topic/$slug" as any} params={{ slug: t.slug }} className="hover:underline">
                      {t.title} <ExternalLink className="inline h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{board?.name ?? "—"}</TableCell>
                  <TableCell>{t.reply_count}</TableCell>
                  <TableCell className="space-x-1 space-x-reverse">
                    {t.is_pinned && <Badge variant="default">נעוץ</Badge>}
                    {t.is_locked && <Badge variant="secondary">נעול</Badge>}
                    {t.is_deleted && <Badge variant="destructive">מחוק</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant={t.is_pinned ? "default" : "ghost"} onClick={() => toggle(t, "is_pinned")} title="נעיצה"><Pin className="h-4 w-4" /></Button>
                      <Button size="sm" variant={t.is_locked ? "default" : "ghost"} onClick={() => toggle(t, "is_locked")} title="נעילה"><Lock className="h-4 w-4" /></Button>
                      <Button size="sm" variant={t.is_deleted ? "default" : "ghost"} onClick={() => toggle(t, "is_deleted")} title="הסתרה"><Trash2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(t)} title="מחיקה לצמיתות"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-8">אין דיונים</div>}
      </CardContent>
    </Card>
  );
}

/* ------------------------- Reports ------------------------- */
function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("forum_reports").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const r = await q;
    if (r.data) setReports(r.data as Report[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (r: Report, status: string) => {
    const res = await supabase.from("forum_reports").update({
      status, reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (res.error) return toast.error(res.error.message);
    toast.success("עודכן"); load();
  };

  const removeTarget = async (r: Report) => {
    if (!confirm("למחוק את התוכן המדווח?")) return;
    const table = r.target_type === "topic" ? "forum_topics" : "forum_posts";
    const res = await supabase.from(table).update({ is_deleted: true }).eq("id", r.target_id);
    if (res.error) return toast.error(res.error.message);
    await setStatus(r, "resolved");
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>תוכן שדווח</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="max-w-xs mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="resolved">טופל</SelectItem>
            <SelectItem value="dismissed">נדחה</SelectItem>
            <SelectItem value="all">הכל</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>סוג</TableHead>
              <TableHead>סיבה</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.target_type}</TableCell>
                <TableCell className="max-w-md truncate">{r.reason}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("he-IL")}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="destructive" onClick={() => removeTarget(r)}>מחק תוכן</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "dismissed")}>דחה</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r, "resolved")}>סמן טופל</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {reports.length === 0 && <div className="text-center text-muted-foreground py-8">אין דיווחים</div>}
      </CardContent>
    </Card>
  );
}

/* ------------------------- Points ------------------------- */
function PointsTab() {
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await supabase.from("points_rules").select("*").in("event_key", FORUM_EVENT_KEYS);
    if (r.data) setRules(r.data as PointsRule[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (r: PointsRule, patch: Partial<PointsRule>) => {
    const res = await supabase.from("points_rules").update(patch).eq("id", r.id);
    if (res.error) return toast.error(res.error.message);
    setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>נקודות לפעולות פורום</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">הגדר כמה נקודות יוענקו לכל פעולה. מתעדכן ב‑user_points אוטומטית.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3">
            <div className="flex-1">
              <div className="font-medium">{r.label ?? r.event_key}</div>
              <div className="text-xs text-muted-foreground">{r.event_key}</div>
            </div>
            <Input
              type="number"
              value={r.points}
              onChange={(e) => update(r, { points: Number(e.target.value) })}
              className="w-24"
            />
            <div className="flex items-center gap-2">
              <Switch checked={r.enabled} onCheckedChange={(v) => update(r, { enabled: v })} />
              <Label className="text-xs">פעיל</Label>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="text-center text-muted-foreground py-4">אין כללים מוגדרים</div>}
      </CardContent>
    </Card>
  );
}
