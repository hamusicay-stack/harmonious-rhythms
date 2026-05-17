import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { MessageSquare, FileText, Hash } from "lucide-react";
import { UserHoverCard } from "./UserHoverCard";

export type BoardRowData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  topic_count: number;
  post_count: number;
  last_post_at: string | null;
  last_topic: {
    title: string;
    slug: string;
    last_post_at: string | null;
    author: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  } | null;
};

export function BoardRow({ board, accentColor }: { board: BoardRowData; accentColor?: string | null }) {
  return (
    <div className="group relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/40">
      {/* Icon */}
      <Link
        to="/forum/board/$slug"
        params={{ slug: board.slug }}
        preload="intent"
        className="shrink-0 flex h-12 w-12 items-center justify-center rounded-lg border border-border/60 bg-muted/40 transition-all group-hover:scale-105 group-hover:border-primary/40"
        style={accentColor ? { boxShadow: `inset 0 0 0 1px ${accentColor}33` } : undefined}
      >
        <Hash className="h-5 w-5" style={accentColor ? { color: accentColor } : undefined} />
      </Link>

      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <Link
          to="/forum/board/$slug"
          params={{ slug: board.slug }}
          preload="intent"
          className="font-semibold hover:text-primary transition-colors"
        >
          {board.name}
        </Link>
        {board.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{board.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground md:hidden">
          <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{board.topic_count}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{board.post_count}</span>
        </div>
      </div>

      {/* Stats — desktop */}
      <div className="hidden md:flex shrink-0 flex-col items-center gap-0.5 text-xs text-muted-foreground min-w-[70px]">
        <div className="font-semibold text-foreground text-sm">{board.topic_count}</div>
        <div>אשכולות</div>
      </div>
      <div className="hidden md:flex shrink-0 flex-col items-center gap-0.5 text-xs text-muted-foreground min-w-[70px]">
        <div className="font-semibold text-foreground text-sm">{board.post_count}</div>
        <div>הודעות</div>
      </div>

      {/* Last post */}
      <div className="hidden lg:flex shrink-0 items-center gap-2 min-w-[200px] max-w-[220px]">
        {board.last_topic ? (
          <>
            <UserHoverCard user={board.last_topic.author} size="sm" />
            <div className="min-w-0 flex-1 text-xs">
              <Link
                to="/forum/topic/$slug"
                params={{ slug: board.last_topic.slug }}
                className="block font-medium truncate hover:text-primary transition-colors"
              >
                {board.last_topic.title}
              </Link>
              {board.last_topic.last_post_at && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {formatDistanceToNow(new Date(board.last_topic.last_post_at), { addSuffix: true, locale: he })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">אין פעילות עדיין</div>
        )}
      </div>
    </div>
  );
}
