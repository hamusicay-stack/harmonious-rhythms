import { Link } from "@tanstack/react-router";
import { Bell, Heart, UserPlus, MessageCircle, Mail, Phone, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function iconFor(type: string) {
  switch (type) {
    case "like": return <Heart className="h-4 w-4 text-primary fill-primary/30" />;
    case "follow": return <UserPlus className="h-4 w-4 text-primary" />;
    case "comment": return <MessageCircle className="h-4 w-4 text-primary-glow" />;
    case "inquiry": return <Mail className="h-4 w-4 text-primary" />;
    default: return <Bell className="h-4 w-4 text-primary" />;
  }
}

function formatAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

function NotificationRow({ n, onRead, onRemove }: { n: Notification; onRead: (id: string) => void; onRemove: (id: string) => void }) {
  const phone = n.metadata?.phone as string | undefined;
  const content = (
    <div className="flex items-start gap-3 p-3">
      <div className="mt-1 rounded-full bg-primary/10 p-2 ring-1 ring-primary/20">{iconFor(n.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", !n.read_at && "text-foreground")}>{n.title}</p>
          {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
        </div>
        {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
        {n.type === "inquiry" && phone && (
          <a href={`tel:${phone}`} dir="ltr" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Phone className="h-3 w-3" />{phone}
          </a>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">{formatAgo(n.created_at)}</p>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(n.id); }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  if (n.link) {
    return (
      <Link to={n.link as any} onClick={() => !n.read_at && onRead(n.id)} className={cn("block hover:bg-muted/40 transition-colors", !n.read_at && "bg-primary/5")}>
        {content}
      </Link>
    );
  }
  return <div onClick={() => !n.read_at && onRead(n.id)} className={cn("cursor-pointer hover:bg-muted/40", !n.read_at && "bg-primary/5")}>{content}</div>;
}

export function NotificationsList({ compact }: { compact?: boolean }) {
  const { items, loading, unreadCount, markRead, markAllRead, remove } = useNotifications();

  return (
    <div className={cn(!compact && "space-y-3")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">התראות</h3>
            {unreadCount > 0 && <Badge variant="default">{unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              <CheckCheck className="ml-1 h-4 w-4" />סמן הכל כנקרא
            </Button>
          )}
        </div>
      )}
      <Card className={cn("divide-y overflow-hidden", compact && "border-0 shadow-none")}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />
            אין התראות חדשות
          </div>
        ) : (
          items.map((n) => <NotificationRow key={n.id} n={n} onRead={markRead} onRemove={remove} />)
        )}
      </Card>
    </div>
  );
}
