DROP POLICY IF EXISTS "Public read podcast audio" ON storage.objects;
CREATE POLICY "Public read podcast audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'podcast-audio' AND name LIKE 'episodes/%');