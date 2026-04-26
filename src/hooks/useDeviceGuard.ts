import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEVICE_KEY = "musician_device_id";
const TOAST_ID = "device-limit-exceeded";
// Per-tab guard so the toast doesn't re-fire on every heartbeat
let toastShownThisSession = false;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Registers current device + sends heartbeat every 5 minutes. Limits to 2 active devices per user. */
export function useDeviceGuard() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    const deviceId = getDeviceId();
    const ua = navigator.userAgent;

    const register = async () => {
      const { data, error } = await supabase.rpc("register_device", { _device_id: deviceId, _user_agent: ua });
      if (!error && data === false && !toastShownThisSession) {
        toastShownThisSession = true;
        toast.error("חרגת מהמגבלה של 2 מכשירים פעילים", {
          id: TOAST_ID, // dedupe — same id replaces existing toast
          duration: 10000,
          description: "כדי להמשיך להשתמש כאן, נתק מכשיר אחר",
          action: {
            label: "נתק שאר המכשירים",
            onClick: async () => {
              const { error: delErr } = await supabase
                .from("user_device_sessions" as any)
                .delete()
                .eq("user_id", user.id)
                .neq("device_id", deviceId);
              if (delErr) {
                toast.error("שגיאה בניתוק המכשירים");
              } else {
                toast.success("שאר המכשירים נותקו — רענן את הדף");
                toastShownThisSession = false;
                // Re-register this device now that the slot freed up
                void supabase.rpc("register_device", { _device_id: deviceId, _user_agent: ua });
              }
            },
          },
        });
      } else if (!error && data === true) {
        // Reset gate on success so a future hit can re-toast
        toastShownThisSession = false;
      }
    };
    void register();
    intervalRef.current = setInterval(register, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
