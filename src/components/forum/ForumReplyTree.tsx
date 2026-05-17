import { Fragment, useMemo } from "react";
import { ForumPostCard, type ForumPostData, type ForumPostAuthor } from "./ForumPostCard";
import { BannerSlot } from "@/components/BannerSlot";

export type ForumReplyTreeHandlers = {
  me: string | null;
  isLocked: boolean;
  isOpAuthorId: string | null;
  solvedPostId: string | null;
  editingId: string | null;
  editBody: string;
  votes: { scores: Record<string, number>; votes: Record<string, -1 | 0 | 1> };
  onEditBodyChange: (v: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (postId: string, body: string) => void;
  onDelete: (postId: string) => void;
  onVote: (postId: string, value: -1 | 0 | 1) => void;
  onReply: (postId: string) => void;
  onQuote: (post: ForumPostData) => void;
  onReport: (postId: string) => void;
  onMessage: (authorId: string) => void;
  onToggleSolution: (postId: string) => void;
};

export function ForumReplyTree({
  posts,
  authors,
  handlers,
}: {
  posts: ForumPostData[];
  authors: Record<string, ForumPostAuthor>;
  handlers: ForumReplyTreeHandlers;
}) {
  // Build parent→children map. Render OP separately (handled by parent route);
  // here we render all top-level *replies* (parent_post_id == null && !is_op)
  // along with their full nested descendants. No depth is dropped.
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, ForumPostData[]>();
    for (const p of posts) {
      const key = p.parent_post_id ?? null;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const postById = useMemo(() => {
    const m = new Map<string, ForumPostData>();
    for (const p of posts) m.set(p.id, p);
    return m;
  }, [posts]);

  const topLevel = (childrenByParent.get(null) ?? []).filter((p) => !p.is_op);

  return (
    <div className="space-y-3">
      {topLevel.map((p, index) => {
        const showAd = index === 0 || (index > 0 && index % 5 === 0);
        return (
          <Fragment key={p.id}>
            <RecursiveNode
              post={p}
              depth={0}
              childrenByParent={childrenByParent}
              postById={postById}
              authors={authors}
              handlers={handlers}
            />
            {showAd && (
              <div className="w-full my-4">
                <BannerSlot position="forum_in_feed" />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const MAX_INDENT_DEPTH = 5;

function RecursiveNode({
  post,
  depth,
  childrenByParent,
  postById,
  authors,
  handlers,
}: {
  post: ForumPostData;
  depth: number;
  childrenByParent: Map<string | null, ForumPostData[]>;
  postById: Map<string, ForumPostData>;
  authors: Record<string, ForumPostAuthor>;
  handlers: ForumReplyTreeHandlers;
}) {
  const a = authors[post.author_id] ?? null;
  const parentPost = post.parent_post_id ? postById.get(post.parent_post_id) : undefined;
  const parentAuthor = parentPost ? authors[parentPost.author_id] ?? null : null;
  const score = handlers.votes.scores?.[post.id] ?? 0;
  const myVote = (handlers.votes.votes?.[post.id] ?? 0) as -1 | 0 | 1;
  const isMine = handlers.me === post.author_id;
  const isSolution = handlers.solvedPostId === post.id;
  const isOpAuthor = !!handlers.me && handlers.me === handlers.isOpAuthorId;

  // Progressive indent that softens after MAX_INDENT_DEPTH
  const effectiveDepth = Math.min(depth, MAX_INDENT_DEPTH);
  const indentClass =
    depth === 0
      ? ""
      : effectiveDepth === 1
      ? "mr-3 sm:mr-6 border-r-2 border-border/60 pr-3 sm:pr-4"
      : effectiveDepth === 2
      ? "mr-4 sm:mr-8 border-r-2 border-amber-500/30 pr-3 sm:pr-4"
      : effectiveDepth === 3
      ? "mr-4 sm:mr-10 border-r border-border/50 pr-3 sm:pr-4"
      : "mr-3 sm:mr-6 border-r border-dashed border-border/40 pr-3 sm:pr-4";

  const kids = childrenByParent.get(post.id) ?? [];

  return (
    <div className={indentClass}>
      <ForumPostCard
        post={post}
        author={a}
        parentAuthor={parentAuthor}
        depth={depth}
        score={score}
        myVote={myVote}
        isSolution={isSolution}
        isLocked={handlers.isLocked}
        isMine={isMine}
        isOpAuthor={isOpAuthor}
        editing={handlers.editingId === post.id}
        editBody={handlers.editBody}
        onEditBodyChange={handlers.onEditBodyChange}
        onSubmitEdit={handlers.onSubmitEdit}
        onCancelEdit={handlers.onCancelEdit}
        onStartEdit={() => handlers.onStartEdit(post.id, post.body_md)}
        onDelete={() => handlers.onDelete(post.id)}
        onVote={(v) => handlers.onVote(post.id, v)}
        onReply={() => handlers.onReply(post.id)}
        onQuote={() => handlers.onQuote(post)}
        onReport={() => handlers.onReport(post.id)}
        onMessage={() => handlers.onMessage(post.author_id)}
        onToggleSolution={() => handlers.onToggleSolution(post.id)}
      />
      {kids.length > 0 && (
        <div className="mt-3 space-y-3">
          {kids.map((child) => (
            <RecursiveNode
              key={child.id}
              post={child}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              postById={postById}
              authors={authors}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
