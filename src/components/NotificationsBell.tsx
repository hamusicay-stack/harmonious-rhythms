import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsList } from "@/components/NotificationsList";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export function NotificationsBell() {
  const { user, loading } = useAuth();
  const { unreadCount, markAllRead } = useNotifications();
  if (loading || !user) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="התראות">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-0 shadow-gold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] max-h-[70vh] overflow-y-auto p-0">
        <div className="border-b p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">התראות</span>
            {unreadCount > 0 && <Badge variant="default">{unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        <NotificationsList compact />
      </PopoverContent>
    </Popover>
  );
}
