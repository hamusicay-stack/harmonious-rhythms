-- Banner ads table
CREATE TABLE public.ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'home_top',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live banners"
ON public.ad_banners FOR SELECT
USING (
  is_active = true
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at > now())
);

CREATE POLICY "Admins manage banners"
ON public.ad_banners FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ad_banners_updated_at
BEFORE UPDATE ON public.ad_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Banner events (impressions & clicks)
CREATE TABLE public.ad_banner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES public.ad_banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  user_id UUID,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_banner_events_banner ON public.ad_banner_events(banner_id, event_type);

ALTER TABLE public.ad_banner_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log banner events"
ON public.ad_banner_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read banner events"
ON public.ad_banner_events FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to atomically increment counters
CREATE OR REPLACE FUNCTION public.track_banner_event(_banner_id UUID, _event_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_banner_events (banner_id, event_type, user_id)
  VALUES (_banner_id, _event_type, auth.uid());

  IF _event_type = 'view' THEN
    UPDATE public.ad_banners SET views_count = views_count + 1 WHERE id = _banner_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.ad_banners SET clicks_count = clicks_count + 1 WHERE id = _banner_id;
  END IF;
END;
$$;

-- Storage bucket for banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

CREATE POLICY "Banner images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));