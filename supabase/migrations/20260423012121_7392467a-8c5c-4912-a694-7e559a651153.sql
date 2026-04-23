
-- Shorts videos table
CREATE TABLE public.shorts_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','scheduled','active','archived')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_shorts_videos_creator ON public.shorts_videos(creator_id);
CREATE INDEX idx_shorts_videos_status_published ON public.shorts_videos(status, published_at DESC);

ALTER TABLE public.shorts_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shorts"
ON public.shorts_videos FOR SELECT
USING (status = 'active' OR creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create shorts"
ON public.shorts_videos FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators and admins can update shorts"
ON public.shorts_videos FOR UPDATE
USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators and admins can delete shorts"
ON public.shorts_videos FOR DELETE
USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shorts_videos_updated_at
BEFORE UPDATE ON public.shorts_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shorts video views table (basic tracking)
CREATE TABLE public.shorts_video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.shorts_videos(id) ON DELETE CASCADE,
  user_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_shorts_video_views_video ON public.shorts_video_views(video_id);

ALTER TABLE public.shorts_video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
ON public.shorts_video_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all view records"
ON public.shorts_video_views FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- View increment function
CREATE OR REPLACE FUNCTION public.increment_short_views(_video_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shorts_videos
  SET views_count = views_count + 1
  WHERE id = _video_id AND status = 'active';
  
  INSERT INTO public.shorts_video_views (video_id, user_id)
  VALUES (_video_id, auth.uid());
END;
$$;

-- Storage bucket for shorts videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shorts', 'shorts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Shorts videos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'shorts');

CREATE POLICY "Authenticated users can upload shorts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shorts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own shorts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shorts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own shorts"
ON storage.objects FOR DELETE
USING (bucket_id = 'shorts' AND auth.uid()::text = (storage.foldername(name))[1]);
