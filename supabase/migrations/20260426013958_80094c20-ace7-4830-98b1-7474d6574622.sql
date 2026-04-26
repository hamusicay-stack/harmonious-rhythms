DROP INDEX IF EXISTS public.uq_academy_podcasts_series_youtube;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_podcasts_youtube_video_id
ON public.academy_podcasts(youtube_video_id)
WHERE youtube_video_id IS NOT NULL;

UPDATE public.academy_podcasts
SET youtube_video_id = substring(source_url from '(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})')
WHERE youtube_video_id IS NULL
  AND kind = 'youtube'
  AND source_url ~ '(?:v=|youtu\.be/|embed/|shorts/)[A-Za-z0-9_-]{11}';