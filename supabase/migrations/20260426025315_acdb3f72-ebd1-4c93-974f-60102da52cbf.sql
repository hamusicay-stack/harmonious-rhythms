ALTER TABLE public.academy_podcasts
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS audio_error text,
  ADD COLUMN IF NOT EXISTS audio_generated_at timestamp with time zone;

ALTER TABLE public.academy_podcasts DROP CONSTRAINT IF EXISTS academy_podcasts_audio_status_check;
ALTER TABLE public.academy_podcasts
  ADD CONSTRAINT academy_podcasts_audio_status_check
  CHECK (audio_status IN ('none', 'manual', 'pending', 'ready', 'failed'));

DROP POLICY IF EXISTS "Public read academy bucket" ON storage.objects;
CREATE POLICY "Public read academy bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'academy');