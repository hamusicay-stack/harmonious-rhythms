INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-audio', 'podcast-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read podcast audio" ON storage.objects;
CREATE POLICY "Public read podcast audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'podcast-audio');

DROP POLICY IF EXISTS "Admins upload podcast audio" ON storage.objects;
CREATE POLICY "Admins upload podcast audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update podcast audio" ON storage.objects;
CREATE POLICY "Admins update podcast audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete podcast audio" ON storage.objects;
CREATE POLICY "Admins delete podcast audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'podcast-audio' AND public.has_role(auth.uid(), 'admin'));