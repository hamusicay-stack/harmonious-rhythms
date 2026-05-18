CREATE TABLE IF NOT EXISTS public.wiki_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT CHECK (category IN ('instruments', 'audio_tech', 'artists', 'music_theory')) NOT NULL,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    views_count INT DEFAULT 0,
    related_product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
    related_gear_keywords TEXT[],
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_slug ON public.wiki_articles(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON public.wiki_articles(category);

ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified wiki articles are publicly viewable"
ON public.wiki_articles FOR SELECT
USING (is_verified = true);

CREATE POLICY "Staff can view all wiki articles"
ON public.wiki_articles FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authenticated users can create wiki articles"
ON public.wiki_articles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors and staff can update wiki articles"
ON public.wiki_articles FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Admins can delete wiki articles"
ON public.wiki_articles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_wiki_articles_updated_at
BEFORE UPDATE ON public.wiki_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();