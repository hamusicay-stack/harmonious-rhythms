-- 1. Upgrade shorts_videos with Hi-Res, ABR, LRC, conversion columns
ALTER TABLE public.shorts_videos
  ADD COLUMN IF NOT EXISTS hls_playlist_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_url_720p TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_url_360p TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audio_bitrate INT DEFAULT 320,
  ADD COLUMN IF NOT EXISTS is_hi_res BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS lyrics_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lyrics_offset NUMERIC DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketplace_listing_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_streaming_links JSONB DEFAULT '{}'::jsonb;

-- 2. Analytics logs table
CREATE TABLE IF NOT EXISTS public.shorts_analytics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NULL,
  session_id TEXT NOT NULL,
  seconds_watched NUMERIC NOT NULL DEFAULT 0.0,
  max_seconds_reached NUMERIC NOT NULL DEFAULT 0.0,
  is_completed BOOLEAN DEFAULT FALSE,
  rewatch_count INT DEFAULT 0,
  buffered_seconds NUMERIC DEFAULT 0.0,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_shorts_analytics_video ON public.shorts_analytics_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_shorts_analytics_session ON public.shorts_analytics_logs(session_id);

-- 4. RLS
ALTER TABLE public.shorts_analytics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics logs"
  ON public.shorts_analytics_logs FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Creators and admins can read their video analytics"
  ON public.shorts_analytics_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.shorts_videos v
      WHERE v.id = shorts_analytics_logs.video_id AND v.creator_id = auth.uid()
    )
  );