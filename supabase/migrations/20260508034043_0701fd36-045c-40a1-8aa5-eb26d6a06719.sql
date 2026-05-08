
ALTER TABLE public.rhythm_sets
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

CREATE TABLE IF NOT EXISTS public.rhythm_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.rhythm_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rhythm_folders_set ON public.rhythm_folders(set_id);
ALTER TABLE public.rhythm_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Folders viewable by everyone" ON public.rhythm_folders FOR SELECT USING (true);
CREATE POLICY "Admins manage folders" ON public.rhythm_folders
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.rhythm_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.rhythm_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rhythm_items_folder ON public.rhythm_items(folder_id);
ALTER TABLE public.rhythm_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items viewable by everyone" ON public.rhythm_items FOR SELECT USING (true);
CREATE POLICY "Admins manage items" ON public.rhythm_items
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

ALTER TABLE public.set_audio_samples
  ADD COLUMN IF NOT EXISTS rhythm_item_id uuid REFERENCES public.rhythm_items(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_set_audio_samples_item ON public.set_audio_samples(rhythm_item_id);

CREATE TABLE IF NOT EXISTS public.rhythm_item_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rhythm_item_id uuid NOT NULL REFERENCES public.rhythm_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, rhythm_item_id)
);
CREATE INDEX IF NOT EXISTS idx_rhythm_item_fav_user ON public.rhythm_item_favorites(user_id);
ALTER TABLE public.rhythm_item_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their favorites" ON public.rhythm_item_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add their favorites" ON public.rhythm_item_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their favorites" ON public.rhythm_item_favorites FOR DELETE USING (auth.uid() = user_id);
