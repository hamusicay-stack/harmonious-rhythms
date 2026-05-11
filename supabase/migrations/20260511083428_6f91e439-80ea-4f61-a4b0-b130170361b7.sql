-- Add cover image to rhythm_sets if missing
ALTER TABLE public.rhythm_sets ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Make rhythm-files bucket public (audio playback)
UPDATE storage.buckets SET public = true WHERE id = 'rhythm-files';

-- Create new public buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('beat-audio', 'beat-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('organ-themes', 'organ-themes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for new buckets
CREATE POLICY "beat-audio public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'beat-audio');

CREATE POLICY "organ-themes public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'organ-themes');

-- Admin write for new buckets
CREATE POLICY "beat-audio admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "beat-audio admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beat-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "beat-audio admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "organ-themes admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organ-themes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "organ-themes admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organ-themes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "organ-themes admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organ-themes' AND public.has_role(auth.uid(), 'admin'));