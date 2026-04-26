ALTER TABLE public.academy_courses REPLICA IDENTITY FULL;
ALTER TABLE public.academy_lessons REPLICA IDENTITY FULL;
ALTER TABLE public.academy_podcasts REPLICA IDENTITY FULL;
ALTER TABLE public.academy_podcast_series REPLICA IDENTITY FULL;
ALTER TABLE public.academy_enrollments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_podcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_podcast_series;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_enrollments;