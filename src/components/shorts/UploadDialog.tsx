import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, GraduationCap, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_SHORT_FILE_SIZE = 60 * 1024 * 1024;

export function UploadDialog({
  children, open, onOpenChange, onUploaded,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [courseLink, setCourseLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: roles }, { data: trusted }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("shorts_trusted_uploaders").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      const isTrusted = !!trusted;
      const tier = ((prof as { subscription_tier?: string } | null)?.subscription_tier ?? "free").toLowerCase();
      setIsPremiumUser(isAdmin || isTrusted || tier === "premium" || tier === "vip" || tier === "pro");
    })();
  }, [open, user]);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#+/, "").replace(/\s+/g, "_").slice(0, 30);
    if (!t) return;
    if (tags.length >= 10) { toast.error("עד 10 תגיות"); return; }
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };

  const handleFileChange = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    const allowed = isPremiumUser ? arr : arr.slice(0, 1);
    for (const f of allowed) {
      if (!f.type.startsWith("video/")) { toast.error(`${f.name}: לא קובץ וידאו`); return; }
      if (f.size > MAX_SHORT_FILE_SIZE) { toast.error(`${f.name}: מעל 60MB`); return; }
    }
    setFiles(isPremiumUser ? allowed : allowed.slice(0, 1));
  };

  const removeFileAt = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const tryAddMoreClick = () => {
    if (!isPremiumUser && files.length >= 1) { setShowUpsell(true); return false; }
    return true;
  };

  const checkQuota = async (): Promise<boolean> => {
    if (!user) return false;
    const [{ data: roles }, { data: trusted }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("shorts_trusted_uploaders").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const isTrusted = !!trusted;
    const tier = ((prof as { subscription_tier?: string } | null)?.subscription_tier ?? "free").toLowerCase();
    const isPremium = tier === "premium" || tier === "vip" || tier === "pro";
    if (isAdmin || isTrusted || isPremium) return true;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("shorts_videos").select("created_at").eq("creator_id", user.id)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(1);
    if (recent && recent.length > 0) {
      setNextAllowedAt(new Date(new Date(recent[0].created_at).getTime() + 24 * 60 * 60 * 1000));
      setShowUpsell(true);
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!user) { toast.error("רגע — צריך להיכנס לאולפן"); return; }
    if (!title.trim()) { toast.error("כותרת חובה"); return; }
    if (files.length === 0) { toast.error("יש לבחור סרטון"); return; }
    if (!(await checkQuota())) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "mp4";
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("shorts").upload(path, f, {
          cacheControl: "3600", upsert: false, contentType: f.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("shorts").getPublicUrl(path);
        const { error: insErr } = await supabase.from("shorts_videos").insert({
          creator_id: user.id,
          title: files.length > 1 ? `${title.trim()} (${i + 1})` : title.trim(),
          description: description.trim() || null,
          video_url: pub.publicUrl,
          status: "pending",
          tags: tags.length > 0 ? tags : [],
          course_link: courseLink.trim() || null,
        });
        if (insErr) throw insErr;
      }
      toast.success(files.length > 1 ? `${files.length} סרטונים הועלו!` : "הסרטון הועלה!");
      setTitle(""); setDescription(""); setFiles([]); setTags([]); setTagDraft(""); setCourseLink("");
      onOpenChange(false);
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ההעלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-right">העלאת סרטון שורטס</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!uploading) submit(); }}>
          <div className="space-y-2">
            <Label>כותרת *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="למשל: סולו קלידים בחתונה" />
          </div>
          <div className="space-y-2">
            <Label>תיאור</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>תגיות (עד 10)</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-[42px]">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-semibold">
                  #{t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} aria-label={`הסר ${t}`} className="hover:text-rose-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); addTag(tagDraft); }
                  else if (e.key === "Backspace" && !tagDraft && tags.length > 0) setTags((p) => p.slice(0, -1));
                }}
                onBlur={() => { if (tagDraft.trim()) addTag(tagDraft); }}
                placeholder={tags.length === 0 ? "Enter כדי להוסיף תגית" : "+ עוד תגית"}
                className="flex-1 min-w-[120px] bg-transparent text-sm outline-none" maxLength={32}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>קובץ סרטון (עד 60MB, 9:16) *</Label>
              {isPremiumUser && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/20 to-primary-glow/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Crown className="h-3 w-3" /> פרימיום — מרובה
                </span>
              )}
            </div>
            <Input type="file" accept="video/*" multiple={isPremiumUser}
              onClick={(e) => { if (!tryAddMoreClick()) e.preventDefault(); }}
              onChange={(e) => handleFileChange(e.target.files)} />
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 text-xs">
                    <span className="truncate">{f.name} • {(f.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button type="button" onClick={() => removeFileAt(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              קישור לשיעור מלא (אופציונלי)
            </Label>
            <Input value={courseLink} onChange={(e) => setCourseLink(e.target.value)}
              placeholder="/academy/my-course" maxLength={500} />
          </div>
          <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            💡 הסרטון יישלח לאישור מנהל. משתמשים מאושרים מראש (Trusted) פרסומיהם עולים מיד.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              {uploading && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />}
              <Upload className="ml-1 h-4 w-4" />העלה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              <Crown className="h-6 w-6 text-primary" />הגעת למכסה היומית
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              תוכל להעלות שוב ב-
              <strong className="text-foreground"> {nextAllowedAt ? nextAllowedAt.toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}</strong>.
            </p>
            <div className="rounded-xl border bg-gradient-to-br from-primary/15 via-background to-primary-glow/10 p-5 space-y-2">
              <h3 className="font-display text-lg font-bold">העלאות ללא הגבלה?</h3>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold w-full">
                <Link to="/profile" onClick={() => setShowUpsell(false)}>
                  <Crown className="ml-1 h-4 w-4" />הצטרף לפרימיום
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
