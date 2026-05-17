import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { MessageSquare, FileText, Hash, Lock, Shield, ChevronLeft } from "lucide-react";
import { UserHoverCard } from "./UserHoverCard";

export type ForumBoardData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  topic_count: number;
  post_count: number;
  last_post_at: string | null;
  post_min_role?: "user" | "moderator" | "admin" | null;
  last_topic: {
    title: string;
    slug: string;
    last_post_at: string | null;
    author: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  } | null;
};

export type ForumCategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  boards: ForumBoardData[];
};

function AclBadge({ role }: { role?: string | null }) {
  if (!role || role === "user") return null;
  const label = role === "admin" ? "הנהלה בלבד" : "מנהלי לוח";
  const Icon = role === "admin" ? Shield : Lock;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
      title="אזור זה סגור לכתיבה על ידי ההנהלה בלבד"
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function BoardItem({ board, accent }: { board: ForumBoardData; accent?: string | null }) {
  return (
    <div className="group relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/40">
      <Link
        to="/forum/board/$slug"
        params={{ slug: board.slug }}
        preload="intent"
        className="shrink-0 flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-muted/40 transition-all group-hover:scale-105 group-hover:border-primary/40"
        style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}33` } : undefined}
      >
        <Hash className="h-5 w-5" style={accent ? { color: accent } : undefined} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/forum/board/$slug"
            params={{ slug: board.slug }}
            preload="intent"
            className="font-semibold hover:text-primary transition-colors"
          >
            {board.name}
          </Link>
          <AclBadge role={board.post_min_role ?? "user"} />
        </div>
        {board.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{board.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground md:hidden">
          <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{board.topic_count}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{board.post_count}</span>
        </div>
      </div>

      <div className="hidden md:flex shrink-0 flex-col items-center gap-0.5 text-xs text-muted-foreground min-w-[64px]">
        <div className="font-semibold text-foreground text-sm">{board.topic_count}</div>
        <div>אשכולות</div>
      </div>
      <div className="hidden md:flex shrink-0 flex-col items-center gap-0.5 text-xs text-muted-foreground min-w-[64px]">
        <div className="font-semibold text-foreground text-sm">{board.post_count}</div>
        <div>הודעות</div>
      </div>

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

export function ForumCategoryCard({ category }: { category: ForumCategoryData }) {
  const accent = category.color ?? undefined;
  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/60 overflow-hidden shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="h-1 w-full" style={{ background: accent ?? "hsl(var(--primary))" }} />
      <header
        className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/70 bg-gradient-to-l from-transparent via-transparent to-muted/30"
        style={accent ? { boxShadow: `inset 4px 0 0 0 ${accent}` } : undefined}
      >
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border"
            style={accent ? { borderColor: `${accent}55`, background: `${accent}1a`, color: accent } : undefined}
          >
            <Hash className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight" style={accent ? { color: accent } : undefined}>
              {category.name}
            </h2>
            {category.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
            )}
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground shrink-0 inline-flex items-center gap-1">
          {category.boards.length} לוחות <ChevronLeft className="h-3 w-3" />
        </div>
      </header>
      <div className="divide-y divide-border/60">
        {category.boards.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">אין לוחות בקטגוריה זו עדיין.</div>
        ) : (
          category.boards.map((b) => <BoardItem key={b.id} board={b} accent={accent} />)
        )}
      </div>
    </section>
  );
}
