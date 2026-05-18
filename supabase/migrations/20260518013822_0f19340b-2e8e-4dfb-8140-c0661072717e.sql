ALTER TABLE public.music_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "News are viewable by everyone" ON public.music_news;
DROP POLICY IF EXISTS "News can only be inserted by authenticated users" ON public.music_news;
DROP POLICY IF EXISTS "News can only be updated by authors or admins" ON public.music_news;

CREATE POLICY "News are viewable by everyone"
ON public.music_news FOR SELECT USING (true);

CREATE POLICY "News can only be inserted by authenticated users"
ON public.music_news FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "News can only be updated by authors or admins"
ON public.music_news FOR UPDATE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Wiki articles are viewable by everyone" ON public.wiki_articles;
DROP POLICY IF EXISTS "Wiki articles can be inserted by authenticated users" ON public.wiki_articles;
DROP POLICY IF EXISTS "Wiki articles can be updated by authenticated users (crowdsourcing)" ON public.wiki_articles;

CREATE POLICY "Wiki articles are viewable by everyone"
ON public.wiki_articles FOR SELECT USING (true);

CREATE POLICY "Wiki articles can be inserted by authenticated users"
ON public.wiki_articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Wiki articles can be updated by authenticated users (crowdsourcing)"
ON public.wiki_articles FOR UPDATE USING (auth.role() = 'authenticated');