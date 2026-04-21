CREATE TABLE public.marketplace_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_marketplace_likes_user ON public.marketplace_likes(user_id);
CREATE INDEX idx_marketplace_likes_listing ON public.marketplace_likes(listing_id);

ALTER TABLE public.marketplace_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.marketplace_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like"
ON public.marketplace_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own likes"
ON public.marketplace_likes FOR DELETE
USING (auth.uid() = user_id);