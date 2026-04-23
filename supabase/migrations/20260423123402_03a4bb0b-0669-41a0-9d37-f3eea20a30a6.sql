
CREATE TABLE IF NOT EXISTS public.shorts_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shorts_comments_video ON public.shorts_comments(video_id, created_at DESC);

ALTER TABLE public.shorts_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shorts comments"
ON public.shorts_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
ON public.shorts_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own comments"
ON public.shorts_comments FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete comments"
ON public.shorts_comments FOR DELETE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shorts_comments_updated_at
BEFORE UPDATE ON public.shorts_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
