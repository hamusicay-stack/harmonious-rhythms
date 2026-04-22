-- Global likes table for any item type across the site
CREATE TABLE public.user_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('shop_product', 'academy_course', 'marketplace_listing', 'music_pro', 'forum_post')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX idx_user_likes_user ON public.user_likes(user_id, item_type);
CREATE INDEX idx_user_likes_item ON public.user_likes(item_type, item_id);

ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own likes" ON public.user_likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users add own likes" ON public.user_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own likes" ON public.user_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all likes" ON public.user_likes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));