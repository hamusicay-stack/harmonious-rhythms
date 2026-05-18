-- Sources table
CREATE TABLE public.shorts_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shorts_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active shorts sources"
  ON public.shorts_sources FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage shorts sources"
  ON public.shorts_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Curated AI shorts table
CREATE TABLE public.musician_shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (approval_status IN ('pending_review', 'approved', 'rejected')),
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_musician_shorts_status ON public.musician_shorts(approval_status, created_at DESC);

ALTER TABLE public.musician_shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved AI shorts"
  ON public.musician_shorts FOR SELECT
  USING (approval_status = 'approved' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage AI shorts"
  ON public.musician_shorts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));