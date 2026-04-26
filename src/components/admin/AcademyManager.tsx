import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Megaphone, Key, GraduationCap, Layers, Video, Mic, ClipboardCheck, FolderOpen, Download, Gift, BarChart3, ChevronDown, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAcademyRealtime } from "@/hooks/useAcademyRealtime";
import { SortableList } from "@/components/academy/SortableList";
import { CourseGiftDialog } from "./CourseGiftDialog";
import { AcademyAnalytics } from "./AcademyAnalytics";

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  price: number;
  level: string;
  status: string;
  is_featured: boolean;
  enrollments_count: number;
  meta_title: string | null;
  meta_description: string | null;
  total_lessons: number;
  duration_minutes: number;
};

type Module = { id: string; course_id: string; title: string; display_order: number };
type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  is_preview: boolean;
  display_order: number;
};

export function AcademyManager() {
  return (
    <Tabs defaultValue="courses" dir="rtl" className="space-y-4">
      <TabsList className="flex w-full h-auto gap-1 overflow-x-auto md:grid md:grid-cols-6">
        <TabsTrigger value="courses"><GraduationCap className="ml-1 h-4 w-4" />קורסים</TabsTrigger>
        <TabsTrigger value="codes"><Key className="ml-1 h-4 w-4" />קודי גישה</TabsTrigger>
        <TabsTrigger value="broadcasts"><Megaphone className="ml-1 h-4 w-4" />ברודקאסט</TabsTrigger>
        <TabsTrigger value="podcasts"><Mic className="ml-1 h-4 w-4" />פודקאסטים</TabsTrigger>
        <TabsTrigger value="quizzes"><ClipboardCheck className="ml-1 h-4 w-4" />מבחנים</TabsTrigger>
        <TabsTrigger value="analytics"><BarChart3 className="ml-1 h-4 w-4" />אנליטיקס</TabsTrigger>
      </TabsList>
      <TabsContent value="courses"><CoursesManager /></TabsContent>
      <TabsContent value="codes"><AccessCodesManager /></TabsContent>
      <TabsContent value="broadcasts"><BroadcastsManager /></TabsContent>
      <TabsContent value="podcasts"><PodcastsManager /></TabsContent>
      <TabsContent value="quizzes"><QuizzesManager /></TabsContent>
      <TabsContent value="analytics"><AcademyAnalytics /></TabsContent>
    </Tabs>
  );
}

function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [open, setOpen] = useState(false);
  const [builderCourse, setBuilderCourse] = useState<Course | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("academy_courses").select("*").order("display_order").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setCourses((data ?? []) as Course[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />קורסים</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="ml-1 h-4 w-4" />קורס חדש</Button>
          </DialogTrigger>
          <CourseDialog course={editing} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">אין קורסים. צור קורס ראשון.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((c) => (
              <Card key={c.id} className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.subtitle || c.description}</p>
                    </div>
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.total_lessons} שיעורים</span>
                    <span>·</span>
                    <span>₪{c.price}</span>
                    <span>·</span>
                    <span>{c.enrollments_count} נרשמו</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setBuilderCourse(c)}>
                      <Layers className="ml-1 h-3.5 w-3.5" />עריכת תוכן
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`למחוק את "${c.title}"?`)) return;
                      const { error } = await supabase.from("academy_courses").delete().eq("id", c.id);
                      if (error) toast.error(error.message); else { toast.success("נמחק"); load(); }
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {builderCourse && (
          <Dialog open={!!builderCourse} onOpenChange={(v) => !v && setBuilderCourse(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader><DialogTitle>תוכן הקורס: {builderCourse.title}</DialogTitle></DialogHeader>
              <CourseBuilder course={builderCourse} onChange={load} />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function CourseDialog({ course, onSaved }: { course: Course | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    slug: course?.slug ?? "",
    title: course?.title ?? "",
    subtitle: course?.subtitle ?? "",
    description: course?.description ?? "",
    cover_url: course?.cover_url ?? "",
    price: course?.price ?? 0,
    level: course?.level ?? "beginner",
    status: course?.status ?? "draft",
    is_featured: course?.is_featured ?? false,
    meta_title: course?.meta_title ?? "",
    meta_description: course?.meta_description ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = { ...form, price: Number(form.price) };
    const { error } = course
      ? await supabase.from("academy_courses").update(payload).eq("id", course.id)
      : await supabase.from("academy_courses").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
      <DialogHeader><DialogTitle>{course ? "עריכת קורס" : "קורס חדש"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>כותרת</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} /></div>
        </div>
        <div><Label>כותרת משנה</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
        <div><Label>תיאור</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>תמונת שער (URL)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></div>
          <div><Label>מחיר ₪</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
          <div>
            <Label>רמה</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">מתחילים</SelectItem>
                <SelectItem value="intermediate">בינוני</SelectItem>
                <SelectItem value="advanced">מתקדם</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="published">פורסם</SelectItem>
                <SelectItem value="archived">בארכיון</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <input id="featured" type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="featured">קורס מומלץ</Label>
          </div>
        </div>
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <h4 className="font-medium text-sm">SEO</h4>
          <div><Label className="text-xs">Meta Title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></div>
          <div><Label className="text-xs">Meta Description</Label><Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.title || !form.slug}>{saving && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}שמירה</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CourseBuilder({ course, onChange }: { course: Course; onChange: () => void }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: mods } = await supabase.from("academy_modules").select("*").eq("course_id", course.id).order("display_order");
    const { data: lsns } = await supabase.from("academy_lessons").select("*").eq("course_id", course.id).order("display_order");
    setModules((mods ?? []) as Module[]);
    const grouped: Record<string, Lesson[]> = {};
    (lsns ?? []).forEach((l) => {
      const lesson = l as Lesson;
      if (!grouped[lesson.module_id]) grouped[lesson.module_id] = [];
      grouped[lesson.module_id].push(lesson);
    });
    setLessons(grouped);
    // Update course total_lessons
    await supabase.from("academy_courses").update({ total_lessons: lsns?.length ?? 0 }).eq("id", course.id);
    onChange();
    setLoading(false);
  }, [course.id, onChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    const { error } = await supabase.from("academy_modules").insert({
      course_id: course.id, title: newModuleTitle, display_order: modules.length,
    });
    if (error) toast.error(error.message);
    else { setNewModuleTitle(""); refresh(); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="שם פרק חדש" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
        <Button onClick={addModule}><Plus className="ml-1 h-4 w-4" />פרק</Button>
      </div>
      {modules.map((m) => (
        <ModuleSection
          key={m.id}
          module={m}
          lessons={lessons[m.id] ?? []}
          courseId={course.id}
          onChange={refresh}
        />
      ))}
    </div>
  );
}

function ModuleSection({ module, lessons, courseId, onChange }: { module: Module; lessons: Lesson[]; courseId: string; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", video_url: "", duration_seconds: 0, is_preview: false });

  const addLesson = async () => {
    if (!newLesson.title) return;
    const { error } = await supabase.from("academy_lessons").insert({
      module_id: module.id, course_id: courseId,
      title: newLesson.title, video_url: newLesson.video_url,
      duration_seconds: newLesson.duration_seconds, is_preview: newLesson.is_preview,
      display_order: lessons.length,
    });
    if (error) toast.error(error.message);
    else { setNewLesson({ title: "", video_url: "", duration_seconds: 0, is_preview: false }); setAdding(false); onChange(); }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{module.title}</h4>
        <Button size="sm" variant="ghost" onClick={async () => {
          if (!confirm("למחוק פרק וכל שיעוריו?")) return;
          await supabase.from("academy_modules").delete().eq("id", module.id);
          onChange();
        }}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
      </div>
      <div className="space-y-1">
        {lessons.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm bg-muted/40 rounded p-2">
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{l.title}</span>
              {l.is_preview && <Badge variant="outline" className="text-[10px]">תצוגה מקדימה</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!confirm(`למחוק "${l.title}"?`)) return;
              await supabase.from("academy_lessons").delete().eq("id", l.id);
              onChange();
            }}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="space-y-2 rounded border p-2 bg-muted/20">
          <Input placeholder="שם השיעור" value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} />
          <Input placeholder="לינק וידאו (URL מ-Storage או חיצוני)" value={newLesson.video_url} onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" placeholder="משך בשניות" value={newLesson.duration_seconds || ""} onChange={(e) => setNewLesson({ ...newLesson, duration_seconds: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newLesson.is_preview} onChange={(e) => setNewLesson({ ...newLesson, is_preview: e.target.checked })} />
              תצוגה מקדימה
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addLesson}>הוסף</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>ביטול</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="ml-1 h-3.5 w-3.5" />הוסף שיעור</Button>
      )}
    </div>
  );
}

function AccessCodesManager() {
  const [codes, setCodes] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: "", course_id: "", max_uses: 1, notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: ac }] = await Promise.all([
      supabase.from("academy_courses").select("id,title,slug").order("title"),
      supabase.from("academy_access_codes").select("*").order("created_at", { ascending: false }),
    ]);
    setCourses((c ?? []) as Course[]);
    setCodes(ac ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.code || !form.course_id) return toast.error("חסר שדה");
    const { error } = await supabase.from("academy_access_codes").insert({
      code: form.code.toUpperCase(), course_id: form.course_id,
      max_uses: form.max_uses, notes: form.notes,
    });
    if (error) toast.error(error.message);
    else { toast.success("קוד נוצר"); setForm({ code: "", course_id: "", max_uses: 1, notes: "" }); load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" />קודי גישה</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-5 rounded-lg border p-3 bg-muted/20">
          <Input placeholder="קוד" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
            <SelectTrigger><SelectValue placeholder="קורס" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="שימושים" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
          <Input placeholder="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={create}><Plus className="ml-1 h-4 w-4" />צור</Button>
        </div>
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין קודים פעילים.</p>
        ) : (
          <div className="space-y-1">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border rounded p-2">
                <div className="flex items-center gap-3">
                  <code className="font-mono font-bold text-primary">{c.code}</code>
                  <span className="text-muted-foreground">{c.used_count}/{c.max_uses} שימושים</span>
                  {c.notes && <span className="text-xs text-muted-foreground">— {c.notes}</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={async () => {
                  await supabase.from("academy_access_codes").delete().eq("id", c.id);
                  load();
                }}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BroadcastsManager() {
  const [form, setForm] = useState({ title: "", body: "", link: "/academy", audience: "all" });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("academy_broadcasts").select("*").order("created_at", { ascending: false }).limit(20);
    setHistory(data ?? []);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const send = async () => {
    if (!form.title || !form.body) return toast.error("חסר תוכן");
    if (!confirm(`לשלוח התראה לכל המשתמשים? (${form.audience})`)) return;
    setSending(true);
    try {
      // Determine recipients
      let userIds: string[] = [];
      if (form.audience === "all") {
        const { data } = await supabase.from("profiles").select("id").limit(10000);
        userIds = (data ?? []).map((p: any) => p.id);
      } else if (form.audience === "students") {
        const { data } = await supabase.from("academy_enrollments").select("user_id").eq("status", "active");
        userIds = Array.from(new Set((data ?? []).map((e: any) => e.user_id)));
      }

      if (userIds.length === 0) { toast.error("לא נמצאו נמענים"); setSending(false); return; }

      // Insert in-app notifications in batches
      const BATCH = 200;
      for (let i = 0; i < userIds.length; i += BATCH) {
        const chunk = userIds.slice(i, i + BATCH);
        const rows = chunk.map((uid) => ({
          user_id: uid, type: "broadcast",
          title: form.title, body: form.body, link: form.link, metadata: { source: "academy" },
        }));
        await supabase.from("notifications").insert(rows);
      }

      await supabase.from("academy_broadcasts").insert({
        title: form.title, body: form.body, link: form.link, audience: form.audience,
        sent_count: userIds.length, status: "sent", sent_at: new Date().toISOString(),
      });

      toast.success(`נשלח ל-${userIds.length} משתמשים`);
      setForm({ title: "", body: "", link: "/academy", audience: "all" });
      loadHistory();
    } catch (err: any) {
      toast.error(err?.message ?? "שגיאה");
    }
    setSending(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />ברודקאסט</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
          <Input placeholder="כותרת" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea rows={2} placeholder="תוכן ההתראה" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="לינק (לדוגמה /academy)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המשתמשים</SelectItem>
                <SelectItem value="students">תלמידי האקדמיה בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={send} disabled={sending} className="w-full">
            {sending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            <Megaphone className="ml-1 h-4 w-4" />שלח עכשיו
          </Button>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-2">היסטוריה</h4>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין שליחות עדיין.</p>
          ) : (
            <div className="space-y-1">
              {history.map((b) => (
                <div key={b.id} className="text-xs border rounded p-2 flex justify-between">
                  <div><strong>{b.title}</strong> — {b.body?.slice(0, 60)}</div>
                  <div className="text-muted-foreground">{b.sent_count} · {new Date(b.created_at).toLocaleDateString("he-IL")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Podcasts Manager =============
function getYoutubeVideoId(url: string) {
  return url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;
}

function getYoutubePlaylistId(url: string) {
  return url.match(/[?&]list=([\w-]+)/)?.[1] ?? null;
}

function PodcastsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: "", description: "", kind: "youtube", source_url: "", thumbnail_url: "", audio_url: "", series_id: "none", episode_number: "", is_active: true, sort_order: 0 });
  const [seriesForm, setSeriesForm] = useState({ title: "", description: "", host_name: "", cover_url: "", playlist_url: "" });
  const [importingSeriesId, setImportingSeriesId] = useState<string | null>(null);
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);

  const reorderEpisodes = async (seriesId: string, ordered: any[]) => {
    // Optimistic update
    const others = items.filter((p) => p.series_id !== seriesId);
    const updated = ordered.map((ep, idx) => ({ ...ep, sort_order: idx, episode_number: idx + 1 }));
    setItems([...others, ...updated]);
    // Persist
    const updates = await Promise.all(
      updated.map((ep) =>
        supabase.from("academy_podcasts").update({ sort_order: ep.sort_order, episode_number: ep.episode_number }).eq("id", ep.id),
      ),
    );
    if (updates.some((u) => u.error)) toast.error("שמירה חלקית של הסדר");
    else toast.success("הסדר נשמר");
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [podcastsRes, seriesRes] = await Promise.all([
      supabase.from("academy_podcasts").select("*").order("series_id", { nullsFirst: false }).order("episode_number", { nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("academy_podcast_series").select("*").order("sort_order").order("created_at", { ascending: false }),
    ]);
    if (podcastsRes.error) toast.error(podcastsRes.error.message); else setItems(podcastsRes.data ?? []);
    if (seriesRes.error) toast.error(seriesRes.error.message); else setSeries(seriesRes.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useAcademyRealtime(["academy_podcasts", "academy_podcast_series"], load);

  const startEdit = (p: any) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description ?? "", kind: p.kind, source_url: p.source_url, thumbnail_url: p.thumbnail_url ?? "", audio_url: p.audio_url ?? "", series_id: p.series_id ?? "none", episode_number: p.episode_number?.toString() ?? "", is_active: p.is_active, sort_order: p.sort_order ?? 0 });
    setOpen(true);
  };
  const startNew = () => { setEditing(null); setForm({ title: "", description: "", kind: "youtube", source_url: "", thumbnail_url: "", audio_url: "", series_id: "none", episode_number: "", is_active: true, sort_order: 0 }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.source_url.trim()) return toast.error("כותרת וקישור חובה");
    const videoId = form.kind === "youtube" ? getYoutubeVideoId(form.source_url) : null;
    const playlistId = form.kind === "youtube" ? getYoutubePlaylistId(form.source_url) : null;
    if (!videoId && playlistId) {
      const targetSeriesId = form.series_id !== "none" ? form.series_id : await createSeriesFromPodcastForm();
      if (targetSeriesId) await importPlaylist(targetSeriesId, form.source_url);
      setOpen(false);
      return;
    }
    const payload: any = {
      title: form.title,
      description: form.description || null,
      kind: form.kind,
      source_url: form.source_url,
      thumbnail_url: form.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null),
      audio_url: form.audio_url || null,
      audio_status: form.audio_url ? "manual" : "none",
      series_id: form.series_id === "none" ? null : form.series_id,
      episode_number: form.episode_number ? Number(form.episode_number) : null,
      youtube_video_id: videoId,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    const { error } = editing
      ? await supabase.from("academy_podcasts").update(payload).eq("id", editing.id)
      : await supabase.from("academy_podcasts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("נשמר"); setOpen(false); load();
  };

  const uploadAudio = async (file: File) => {
    if (!editing?.id) return toast.error("קודם שמור את הפרק ואז העלה MP3 בעריכה");
    const ext = file.name.split(".").pop() || "mp3";
    const path = `episodes/${editing.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("podcast-audio").upload(path, file, { contentType: file.type || "audio/mpeg", upsert: false });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("podcast-audio").getPublicUrl(path);
    setForm({ ...form, audio_url: data.publicUrl });
    await supabase.from("academy_podcasts").update({ audio_url: data.publicUrl, audio_status: "manual", audio_generated_at: new Date().toISOString() }).eq("id", editing.id);
    toast.success("קובץ ה-MP3 נשמר לפרק");
    load();
  };

  const createSeries = async () => {
    if (!seriesForm.title.trim()) return toast.error("שם סדרה חובה");
    const { data, error } = await supabase.from("academy_podcast_series").insert({
      title: seriesForm.title,
      description: seriesForm.description || null,
      host_name: seriesForm.host_name || null,
      cover_url: seriesForm.cover_url || null,
    } as any).select("*").single();
    if (error) return toast.error(error.message);
    toast.success("הסדרה נוצרה");
    setSeriesOpen(false);
    setSeriesForm({ title: "", description: "", host_name: "", cover_url: "", playlist_url: "" });
    load();
    if (seriesForm.playlist_url.trim()) await importPlaylist(data.id, seriesForm.playlist_url.trim());
  };

  const createSeriesFromPodcastForm = async () => {
    const { data, error } = await supabase.from("academy_podcast_series").insert({
      title: form.title || "סדרה חדשה",
      description: form.description || null,
      cover_url: form.thumbnail_url || null,
    } as any).select("id").single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.info("נפתחה סדרה חדשה — נסיים לסנכרן את הפרקים");
    return data.id as string;
  };

  const importPlaylist = async (seriesId: string, playlistUrl?: string) => {
    const url = playlistUrl ?? prompt("הדבק קישור פלייליסט ציבורי מיוטיוב") ?? "";
    if (!url.trim()) return;
    setImportingSeriesId(seriesId);
    const { data, error } = await supabase.functions.invoke("import-youtube-playlist", {
      body: { series_id: seriesId, playlist_url: url.trim() },
    });
    setImportingSeriesId(null);
    if (error || data?.error) return toast.error(error?.message ?? data.error);
    toast.success(`יובאו ${data.imported} פרקים`);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("למחוק?")) return;
    const { error } = await supabase.from("academy_podcasts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("נמחק"); load(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <h3 className="font-semibold">פודקאסטים וסדרות</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setSeriesOpen(true)}><FolderOpen className="ml-1 h-4 w-4" />סדרה חדשה</Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={startNew}><Plus className="ml-1 h-4 w-4" />פרק חדש</Button>
        </div>
      </div>
      {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="space-y-4">
          {series.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">סדרות</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {series.map((s) => {
                  const seriesEpisodes = items
                    .filter((p) => p.series_id === s.id)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.episode_number ?? 0) - (b.episode_number ?? 0));
                  const isExpanded = expandedSeriesId === s.id;
                  return (
                    <Card key={s.id} className="border-border/60 md:col-span-2">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSeriesId(isExpanded ? null : s.id)}
                            className="flex min-w-0 items-center gap-3 flex-1 text-right"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
                            {s.cover_url ? <img src={s.cover_url} alt={s.title} className="h-12 w-12 rounded-md object-cover shrink-0" /> : <FolderOpen className="h-10 w-10 text-primary shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-sm">{s.title}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {s.host_name && `${s.host_name} · `}{seriesEpisodes.length} פרקים
                              </div>
                            </div>
                          </button>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => importPlaylist(s.id)} disabled={importingSeriesId === s.id} title="ייבא פלייליסט">
                              {importingSeriesId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!confirm(`למחוק את הסדרה "${s.title}" ואת כל הפרקים שבתוכה?`)) return;
                              const { error: episodesError } = await supabase.from("academy_podcasts").delete().eq("series_id", s.id);
                              if (episodesError) return toast.error(episodesError.message);
                              const { error: seriesError } = await supabase.from("academy_podcast_series").delete().eq("id", s.id);
                              if (seriesError) return toast.error(seriesError.message);
                              toast.success("הסדרה וכל הפרקים נמחקו");
                              load();
                            }}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                          </div>
                        </div>
                        {isExpanded && seriesEpisodes.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <p className="mb-2 text-[11px] text-muted-foreground">גרור לסידור הפרקים בתוך הסדרה</p>
                            <SortableList items={seriesEpisodes} onReorder={(reordered) => reorderEpisodes(s.id, reordered)}>
                              {(ep, handle) => (
                                <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                                  {handle}
                                  <span className="w-6 text-center text-xs font-mono text-muted-foreground">{ep.episode_number ?? "-"}</span>
                                  {ep.thumbnail_url && <img src={ep.thumbnail_url} alt="" className="h-8 w-12 rounded object-cover" />}
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{ep.title}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {ep.views_count} צפיות{!ep.is_active && " · מושבת"}{ep.audio_url && " · 🎧"}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => startEdit(ep)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => del(ep.id)}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
                                </div>
                              )}
                            </SortableList>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {items.some((p) => !p.series_id) && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">פרקים בודדים</h4>
              {items.filter((p) => !p.series_id).map((p) => (
                <Card key={p.id}><CardContent className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.kind} · {p.views_count} צפיות{p.series_id && ` · ${series.find((s) => s.id === p.series_id)?.title ?? "סדרה"}`}{p.episode_number && ` · פרק ${p.episode_number}`}{!p.is_active && " · מושבת"}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}
      <Dialog open={seriesOpen} onOpenChange={setSeriesOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>סדרת פודקאסט חדשה</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>שם הסדרה</Label><Input value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} /></div>
            <div><Label>שם העורך / המנחה</Label><Input value={seriesForm.host_name} onChange={(e) => setSeriesForm({ ...seriesForm, host_name: e.target.value })} /></div>
            <div><Label>תיאור</Label><Textarea value={seriesForm.description} onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} /></div>
            <div><Label>תמונת תיקייה (URL)</Label><Input value={seriesForm.cover_url} onChange={(e) => setSeriesForm({ ...seriesForm, cover_url: e.target.value })} /></div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Label className="text-xs">פלייליסט YouTube לייבוא מיידי (אופציונלי)</Label>
              <Input dir="ltr" value={seriesForm.playlist_url} onChange={(e) => setSeriesForm({ ...seriesForm, playlist_url: e.target.value })} placeholder="https://www.youtube.com/playlist?list=..." />
              <p className="text-[11px] text-muted-foreground">אם לא תמלא שם / תמונה — נשאב אוטומטית מיוטיוב</p>
            </div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setSeriesOpen(false)}>ביטול</Button><Button onClick={createSeries}>צור</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "ערוך פרק" : "פרק / פודקאסט חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>שייך לסדרה</Label>
              <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא סדרה (פרק בודד)</SelectItem>
                  {series.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>כותרת</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>תיאור</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>סוג</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube (סרטון או פלייליסט)</SelectItem>
                  <SelectItem value="audio">אודיו (MP3)</SelectItem>
                  <SelectItem value="video">וידאו (MP4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>קישור</Label>
              <Input dir="ltr" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
              <p className="mt-1 text-[11px] text-muted-foreground">אם תדביק קישור פלייליסט — הוא ייובא אוטומטית כסדרה חדשה</p>
            </div>
            <div><Label>תמונת כיסוי (URL)</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Label>קובץ MP3 לפרק</Label>
              <Input dir="ltr" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} placeholder="https://... או העלאה" />
              <Input type="file" accept="audio/mpeg,audio/mp3" disabled={!editing} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAudio(file); }} />
              <p className="text-[11px] text-muted-foreground">אחרי שמירת פרק YouTube ניתן להעלות MP3 שישויך לאותו פרק וינוגן ברקע באתר.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>מספר פרק</Label><Input type="number" value={form.episode_number} onChange={(e) => setForm({ ...form, episode_number: e.target.value })} /></div>
              <div><Label>סדר</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />פעיל</label>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button><Button onClick={save}>שמור</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= Quizzes Manager =============
function QuizzesManager() {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [modules, setModules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("academy_courses").select("id,title").order("title");
    setCourses(data ?? []);
  })(); }, []);

  useEffect(() => { if (!courseId) return; (async () => {
    const [{ data: ms }, { data: qs }] = await Promise.all([
      supabase.from("academy_modules").select("id,title").eq("course_id", courseId).order("display_order"),
      supabase.from("academy_quizzes").select("*").eq("course_id", courseId).order("created_at"),
    ]);
    setModules(ms ?? []); setQuizzes(qs ?? []); setActiveQuiz(null); setQuestions([]);
  })(); }, [courseId]);

  const loadQuestions = async (q: any) => {
    setActiveQuiz(q);
    const { data } = await supabase.from("academy_quiz_questions").select("*").eq("quiz_id", q.id).order("display_order");
    setQuestions(data ?? []);
  };

  const addQuiz = async () => {
    const title = prompt("שם המבחן");
    if (!title) return;
    const moduleId = modules[0]?.id ?? null;
    const { error } = await supabase.from("academy_quizzes").insert({ course_id: courseId, module_id: moduleId, title });
    if (error) toast.error(error.message); else setCourseId(courseId);
  };

  const addQuestion = async () => {
    if (!activeQuiz) return;
    const q = prompt("שאלה?"); if (!q) return;
    const a1 = prompt("תשובה 1") ?? "";
    const a2 = prompt("תשובה 2") ?? "";
    const a3 = prompt("תשובה 3") ?? "";
    const a4 = prompt("תשובה 4") ?? "";
    const correct = Number(prompt("מספר תשובה נכונה (1-4)") ?? "1") - 1;
    const { error } = await supabase.from("academy_quiz_questions").insert({
      quiz_id: activeQuiz.id, question: q, choices: [a1, a2, a3, a4].filter(Boolean),
      correct_index: correct, display_order: questions.length,
    });
    if (error) toast.error(error.message); else loadQuestions(activeQuiz);
  };

  const delQ = async (id: string) => {
    if (!confirm("למחוק שאלה?")) return;
    await supabase.from("academy_quiz_questions").delete().eq("id", id);
    if (activeQuiz) loadQuestions(activeQuiz);
  };

  return (
    <div className="space-y-3">
      <Select value={courseId} onValueChange={setCourseId}>
        <SelectTrigger><SelectValue placeholder="בחר קורס" /></SelectTrigger>
        <SelectContent>
          {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {courseId && (
        <>
          <div className="flex justify-between"><h4 className="font-semibold">מבחנים בקורס</h4><Button size="sm" onClick={addQuiz}><Plus className="ml-1 h-4 w-4" />מבחן</Button></div>
          {quizzes.map((q) => (
            <Card key={q.id} className={activeQuiz?.id === q.id ? "border-primary" : ""}>
              <CardContent className="p-3 flex items-center justify-between">
                <button onClick={() => loadQuestions(q)} className="text-right flex-1">{q.title}</button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("למחוק מבחן?")) return;
                  await supabase.from("academy_quizzes").delete().eq("id", q.id);
                  setCourseId(courseId);
                }}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}

          {activeQuiz && (
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between">
                  <h5 className="font-semibold">שאלות ({questions.length})</h5>
                  <Button size="sm" onClick={addQuestion}><Plus className="ml-1 h-4 w-4" />שאלה</Button>
                </div>
                {questions.map((q, i) => (
                  <div key={q.id} className="flex justify-between border-t pt-2 text-sm">
                    <div>
                      <div className="font-medium">{i + 1}. {q.question}</div>
                      <div className="text-xs text-muted-foreground">תשובה: {q.choices[q.correct_index]}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => delQ(q.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
