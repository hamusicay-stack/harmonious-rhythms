
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS parent_post_id uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON public.forum_posts(parent_post_id);

UPDATE public.points_rules SET points = 5 WHERE event_key = 'forum_post_create';
