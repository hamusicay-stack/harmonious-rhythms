import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsList } from "@/components/NotificationsList";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export function NotificationsBell() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  if (!user) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="התראות">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center bg-rose-500 text-white border-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] max-h-[70vh] overflow-y-auto p-0">
        <div className="border-b p-3 flex items-center justify-between">
          <span className="font-semibold">התראות</span>
          {unreadCount > 0 && <Badge variant="default">{unreadCount}</Badge>}
        </div>
        <NotificationsList compact />
      </PopoverContent>
    </Popover>
  );
}
