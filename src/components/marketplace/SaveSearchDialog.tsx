import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface Props {
  filters: Record<string, any>;
  trigger?: React.ReactNode;
}

export function SaveSearchDialog({ filters, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (!name.trim()) { toast.error("הזן שם לחיפוש"); return; }
    setSaving(true);
    const { error } = await supabase.from("marketplace_saved_searches").insert({
      user_id: user.id, name: name.trim(), filters, notify_email: notify,
    });
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("החיפוש נשמר! נעדכן אותך כשיופיע מוצר תואם");
    setOpen(false);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1">
            <Bell className="h-4 w-4" />שמור חיפוש והתראה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />שמירת חיפוש והתראות</DialogTitle>
        </DialogHeader>
        {!user ? (
          <div className="py-4 text-sm">
            יש להתחבר כדי לשמור חיפושים ולקבל התראות.
            <div className="mt-3"><Link to="/auth"><Button size="sm">התחבר</Button></Link></div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>שם לחיפוש</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: קלידים Korg עד 5000₪" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border p-3 bg-muted/30">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
              שלח לי התראה במייל כשמופיעה מודעה תואמת
            </label>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              נשמרים: סינוני קטגוריה, מותג, עיר, מצב וטווח מחיר שבחרת כעת.
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving || !user}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
