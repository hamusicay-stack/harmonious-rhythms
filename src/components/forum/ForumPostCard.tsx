import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { he } from "date-fns/locale";
import {
  ArrowUp,
  ArrowDown,
  Quote,
  Flag,
  Pencil,
  Trash2,
  MessageCircle,
  CheckCircle2,
  CornerDownRight,
  Reply,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ForumEditor } from "@/components/forum/ForumEditor";
import { UserHoverCard } from "@/components/forum/UserHoverCard";
import { UserBadges, useUserBadges } from "@/components/UserBadges";
import { sanitizeForumHtml } from "@/lib/sanitize";
import { RankBadge } from "@/components/gamification/RankBadge";

export type ForumPostAuthor = {
  id?: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  forum_rank?: string | null;
  forum_post_count?: number | null;
  forum_reputation?: number | null;
  forum_signature?: string | null;
};

export type ForumPostData = {
  id: string;
  author_id: string;
  body_md: string;
  created_at: string;
  edited_at?: string | null;
  is_deleted?: boolean | null;
  is_op?: boolean | null;
  parent_post_id?: string | null;
};

export type ForumPostCardProps = {
  post: ForumPostData;
  author: ForumPostAuthor | null | undefined;
  parentAuthor?: ForumPostAuthor | null;
  depth: number;
  score: number;
  myVote: -1 | 0 | 1;
  isSolution: boolean;
  isLocked: boolean;
  isMine: boolean;
  isOpAuthor: boolean;
  editing: boolean;
  editBody: string;
  onEditBodyChange: (v: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onVote: (value: -1 | 0 | 1) => void;
  onReply: () => void;
  onQuote: () => void;
  onReport: () => void;
  onMessage: () => void;
  onToggleSolution: () => void;
};

export function ForumPostCard({
  post: p,
  author: a,
  parentAuthor,
  depth,
  score,
  myVote,
  isSolution,
  isLocked,
  isMine,
  isOpAuthor,
  editing,
  editBody,
  onEditBodyChange,
  onSubmitEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onVote,
  onReply,
  onQuote,
  onReport,
  onMessage,
  onToggleSolution,
}: ForumPostCardProps) {
  // SSoT economy: tier + points come from useUserBadges (reads
  // global_subscription_tier_id + subscription_tiers + user_points)
  const meta = useUserBadges(p.author_id);
  const isVip = !!meta?.tier?.is_vip;
  const tierColor = meta?.tier?.color ?? null;
  const points = meta?.points ?? 0;

  // Intercept inline <audio> elements inside post HTML and route them
  // through the global SoundCloud-style player.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudioPlayer();
  const authorDisplay = a?.display_name ?? a?.username ?? "Forum Upload";
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const audios = Array.from(root.querySelectorAll("audio"));
    if (audios.length === 0) return;
    const cleanups: Array<() => void> = [];
    audios.forEach((el, idx) => {
      el.removeAttribute("autoplay");
      const onPlay = (e: Event) => {
        e.preventDefault();
        el.pause();
        const src = el.currentSrc || el.getAttribute("src") || "";
        if (!src) return;
        play({
          id: `${p.id}-audio-${idx}`,
          url: src,
          title: el.getAttribute("title") || "Audio Attached",
          artist: authorDisplay,
        });
      };
      el.addEventListener("play", onPlay);
      cleanups.push(() => el.removeEventListener("play", onPlay));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [p.id, p.body_md, play, authorDisplay]);

  const borderClass = isSolution
    ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
    : isVip
    ? "border-amber-400/60 ring-1 ring-amber-400/30 shadow-[0_0_24px_-12px_rgba(251,191,36,0.55)]"
    : "border-border";

  const accentStyle: React.CSSProperties | undefined =
    isVip || tierColor
      ? {
          background:
            "linear-gradient(180deg, rgba(251,191,36,0.06) 0%, transparent 60%)",
        }
      : undefined;

  const authorMini = {
    id: p.author_id,
    username: a?.username ?? null,
    display_name: a?.display_name ?? null,
    avatar_url: a?.avatar_url ?? null,
  };

  return (
    <div
      className={`rounded-xl border bg-card p-3 sm:p-4 transition-colors ${borderClass}`}
      style={accentStyle}
    >
      {depth > 0 && (
        <div className="mb-2 text-[11px] text-muted-foreground inline-flex items-center gap-1 flex-wrap">
          <CornerDownRight className="h-3 w-3" />
          תגובה ל־
          {parentAuthor?.username ? (
            <Link
              to="/u/$username"
              params={{ username: parentAuthor.username }}
              className="font-medium text-foreground/80 hover:text-primary"
            >
              @{parentAuthor.username}
            </Link>
          ) : (
            <span className="font-medium text-foreground/80">
              @{parentAuthor?.display_name ?? "משתמש"}
            </span>
          )}
        </div>
      )}

      {isSolution && (
        <div className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          פתרון מאושר
        </div>
      )}

      {/* Header: avatar + identity + meta */}
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <UserHoverCard user={authorMini} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {a?.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: a.username }}
                  className="font-medium hover:underline truncate"
                >
                  {a.display_name ?? a.username}
                </Link>
              ) : (
                <span className="font-medium truncate">
                  {a?.display_name ?? "משתמש"}
                </span>
              )}
              {/* SSoT badges: admin chip + tier (with crown for VIP) + points */}
              <UserBadges userId={p.author_id} size="xs" showPoints={false} />
              {/* Gamification rank — drives social proof */}
              <RankBadge points={points} size="xs" />
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
              {a?.forum_rank && (
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {a.forum_rank}
                </span>
              )}
              <span>· {a?.forum_post_count ?? 0} הודעות</span>
              <span>· {a?.forum_reputation ?? 0} מוניטין</span>
              {points > 0 && (
                <Badge
                  variant="outline"
                  className="gap-0.5 px-1.5 py-0 text-[10px] border-amber-400/40 bg-amber-500/10 text-amber-300"
                  title="נקודות גיימיפיקציה"
                >
                  <Sparkles className="h-3 w-3" />
                  {points}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(p.created_at), {
            addSuffix: true,
            locale: he,
          })}
          {p.edited_at && " · עודכן"}
        </div>
      </div>

      {/* Body */}
      {p.is_deleted ? (
        <p className="text-muted-foreground italic">[הודעה נמחקה]</p>
      ) : editing ? (
        <div className="space-y-2">
          <ForumEditor value={editBody} onChange={onEditBodyChange} rows={6} />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSubmitEdit}>
              שמור
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              בטל
            </Button>
          </div>
        </div>
      ) : (
        <div
          ref={bodyRef}
          className="prose prose-sm dark:prose-invert max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: sanitizeForumHtml(p.body_md) }}
        />
      )}

      {a?.forum_signature && !p.is_deleted && (
        <div className="mt-3 pt-3 border-t border-border/70 text-xs text-muted-foreground italic whitespace-pre-wrap">
          {a.forum_signature}
        </div>
      )}

      {/* Action bar */}
      {!p.is_deleted && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/70 flex-wrap">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/30">
            <Button
              size="sm"
              variant={myVote === 1 ? "default" : "ghost"}
              onClick={() => onVote(myVote === 1 ? 0 : 1)}
              className="min-h-[36px] h-9 rounded-r-full rounded-l-none px-2"
              aria-label="הצבע חיובי"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-8 text-center">
              {score}
            </span>
            <Button
              size="sm"
              variant={myVote === -1 ? "default" : "ghost"}
              onClick={() => onVote(myVote === -1 ? 0 : -1)}
              className="min-h-[36px] h-9 rounded-l-full rounded-r-none px-2"
              aria-label="הצבע שלילי"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {!isLocked && (
            <Button size="sm" variant="ghost" onClick={onReply}>
              <Reply className="h-4 w-4 ml-1" />
              השב
            </Button>
          )}
          {!isLocked && !p.is_op && (
            <Button size="sm" variant="ghost" onClick={onQuote}>
              <Quote className="h-4 w-4 ml-1" />
              ציטוט
            </Button>
          )}
          {isOpAuthor && !p.is_op && (
            <Button
              size="sm"
              variant={isSolution ? "default" : "ghost"}
              onClick={onToggleSolution}
            >
              <CheckCircle2 className="h-4 w-4 ml-1" />
              {isSolution ? "בטל פתרון" : "סמן כפתרון"}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1 flex-wrap">
            {!isMine && (
              <>
                <Button size="sm" variant="ghost" onClick={onMessage}>
                  <MessageCircle className="h-4 w-4 ml-1" />
                  הודעה
                </Button>
                <Button size="sm" variant="ghost" onClick={onReport}>
                  <Flag className="h-4 w-4 ml-1" />
                  דווח
                </Button>
              </>
            )}
            {isMine && (
              <>
                <Button size="sm" variant="ghost" onClick={onStartEdit}>
                  <Pencil className="h-4 w-4 ml-1" />
                  ערוך
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  מחק
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
