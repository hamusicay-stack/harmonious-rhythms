DROP POLICY IF EXISTS "Public read academy bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read academy podcast audio" ON storage.objects;
CREATE POLICY "Public read academy podcast audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'academy'
    AND (
      name LIKE 'podcast-audio/%'
      OR name LIKE 'podcasts/%'
    )
  );