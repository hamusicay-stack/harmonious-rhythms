ALTER TABLE public.shorts_videos
ADD COLUMN IF NOT EXISTS course_link text;

COMMENT ON COLUMN public.shorts_videos.course_link IS 'Optional link to the full lesson/course this short relates to (e.g. /academy/slug or external URL)';