import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CourseGiftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void supabase.from("academy_courses").select("id,title").order("title").then(({ data }) => {
      setCourses(data ?? []);
    });
  }, [open]);

  async function grant() {
    if (!email.trim() || !courseId) return toast.error("בחר קורס והזן מייל");
    setBusy(true);
    const { error } = await supabase.rpc("admin_grant_course_access_by_email", {
      _email: email.trim().toLowerCase(),
      _course_id: courseId,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`הקורס ניתן במתנה ל-${email}`);
    setEmail("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />מתנת גישה לקורס</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>קורס</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="בחר קורס..." /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>מייל הנמען</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">המשתמש חייב להיות רשום באתר. נשלח לו התראה.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>ביטול</Button>
          <Button onClick={grant} disabled={busy}>
            {busy && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}העניק גישה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
