import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetName?: string;
};

/**
 * Asked once after the user follows someone for the first time.
 * Sets the global "notify on followed user activity" preference.
 */
export function FollowActivityDialog({ open, onOpenChange, targetName }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const save = async (notify: boolean) => {
    if (!user) { onOpenChange(false); return; }
    setBusy(true);
    await supabase.from("notification_preferences" as any).upsert(
      {
        user_id: user.id,
        notify_followed_user_activity: notify,
        followed_activity_prompt_seen: true,
      },
      { onConflict: "user_id" }
    );
    try { localStorage.setItem("follow_activity_prompt_seen", "1"); } catch { /* ignore */ }
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-end flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            לעקוב גם אחרי הפעילות?
          </DialogTitle>
          <DialogDescription className="text-end">
            האם תרצה לקבל התראה על כל פעילות של {targetName ? <strong>{targetName}</strong> : "המשתמש"} —
            סרטוני שורטס חדשים ומודעות יד 2 שהוא יעלה?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => save(false)}
            disabled={busy}
            className="gap-1"
          >
            <BellOff className="h-4 w-4" />
            לא, רק לעקוב
          </Button>
          <Button
            onClick={() => save(true)}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground gap-1"
          >
            <Bell className="h-4 w-4" />
            כן, התריעו לי
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
