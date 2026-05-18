-- Music News Articles
CREATE TABLE IF NOT EXISTS public.music_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    category TEXT CHECK (category IN ('singles', 'albums', 'events', 'gear_reviews', 'interviews')) NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    short_video_id UUID DEFAULT NULL,
    views_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_slug ON public.music_news(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.music_news(category);
CREATE INDEX IF NOT EXISTS idx_news_featured ON public.music_news(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.music_news(created_at DESC);

ALTER TABLE public.music_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Music news are viewable by everyone"
ON public.music_news FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can insert music news"
ON public.music_news FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update music news"
ON public.music_news FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can delete music news"
ON public.music_news FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_music_news_updated_at
BEFORE UPDATE ON public.music_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();