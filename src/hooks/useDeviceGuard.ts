import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEVICE_KEY = "musician_device_id";

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

  useEffect(() => {
    if (!user) return;
    const deviceId = getDeviceId();
    const ua = navigator.userAgent;

    const register = async () => {
      const { data, error } = await supabase.rpc("register_device", { _device_id: deviceId, _user_agent: ua });
      if (!error && data === false) {
        toast.error("חרגת מהמגבלה של 2 מכשירים פעילים. התנתק ממכשיר אחר.");
      }
    };
    register();
    const i = setInterval(register, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [user]);
}
