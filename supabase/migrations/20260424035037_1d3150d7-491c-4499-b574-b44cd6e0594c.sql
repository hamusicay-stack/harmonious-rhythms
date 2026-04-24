
CREATE TABLE IF NOT EXISTS public.academy_podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'youtube',
  source_url TEXT NOT NULL,
  thumbnail_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT academy_podcasts_kind_check CHECK (kind IN ('youtube','upload')),
  CONSTRAINT academy_podcasts_visibility_check CHECK (visibility IN ('public','members'))
);

ALTER TABLE public.academy_podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active podcasts viewable by everyone"
  ON public.academy_podcasts FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert podcasts"
  ON public.academy_podcasts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update podcasts"
  ON public.academy_podcasts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete podcasts"
  ON public.academy_podcasts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_academy_podcasts_updated_at
  BEFORE UPDATE ON public.academy_podcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_academy_podcasts_active_sort ON public.academy_podcasts (is_active, sort_order DESC, created_at DESC);
