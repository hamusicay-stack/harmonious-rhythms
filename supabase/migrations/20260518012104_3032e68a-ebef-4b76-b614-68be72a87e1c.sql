INSERT INTO storage.buckets (id, name, public)
VALUES ('news-covers', 'news-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "News covers public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-covers');

CREATE POLICY "Users upload own news covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own news covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'news-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own news covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'news-covers'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
);

-- Allow authenticated users to submit PR articles (pending review)
CREATE POLICY "Users can submit PR news articles"
ON public.music_news FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by_pr = true
  AND approval_status = 'pending_review'
  AND author_id = auth.uid()
);