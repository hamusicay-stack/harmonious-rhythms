-- Fix kind constraint to allow audio/video
ALTER TABLE public.academy_podcasts DROP CONSTRAINT IF EXISTS academy_podcasts_kind_check;
ALTER TABLE public.academy_podcasts ADD CONSTRAINT academy_podcasts_kind_check
  CHECK (kind = ANY (ARRAY['youtube'::text, 'upload'::text, 'audio'::text, 'video'::text]));

-- Create podcast series (folders)
CREATE TABLE IF NOT EXISTS public.academy_podcast_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  host_name text,
  youtube_playlist_url text,
  youtube_playlist_id text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_podcast_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Series viewable by everyone"
  ON public.academy_podcast_series FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage series insert"
  ON public.academy_podcast_series FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage series update"
  ON public.academy_podcast_series FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage series delete"
  ON public.academy_podcast_series FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_academy_podcast_series_updated_at
  BEFORE UPDATE ON public.academy_podcast_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link episodes to series
ALTER TABLE public.academy_podcasts
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.academy_podcast_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS episode_number integer,
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

CREATE INDEX IF NOT EXISTS idx_academy_podcasts_series ON public.academy_podcasts(series_id, episode_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_podcasts_series_youtube ON public.academy_podcasts(series_id, youtube_video_id) WHERE youtube_video_id IS NOT NULL;