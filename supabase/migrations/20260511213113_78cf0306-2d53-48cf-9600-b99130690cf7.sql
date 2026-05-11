ALTER TABLE public.rhythm_sets
  ADD COLUMN IF NOT EXISTS video_source_type text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.rhythm_items
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('beat-video', 'beat-video', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "beat-video public read" ON storage.objects FOR SELECT USING (bucket_id = 'beat-video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "beat-video admin write" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'beat-video' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "beat-video admin update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'beat-video' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "beat-video admin delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'beat-video' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;