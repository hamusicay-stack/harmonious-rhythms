ALTER TABLE public.academy_podcasts
  DROP CONSTRAINT IF EXISTS academy_podcasts_series_id_fkey;

ALTER TABLE public.academy_podcasts
  ADD CONSTRAINT academy_podcasts_series_id_fkey
  FOREIGN KEY (series_id)
  REFERENCES public.academy_podcast_series(id)
  ON DELETE CASCADE;