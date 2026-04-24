
-- ============ AFFILIATES ============

CREATE TABLE IF NOT EXISTS public.affiliate_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  cookie_days INTEGER NOT NULL DEFAULT 30,
  min_payout NUMERIC(10,2) NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_affiliate_settings CHECK (id = 1)
);
INSERT INTO public.affiliate_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_applications_user_pending_idx
  ON public.affiliate_applications (user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  ref_code TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC(5,2),
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL, -- 'shop_product' | 'academy_course' | 'shop_category'
  scope_id TEXT NOT NULL,   -- product/course id or category slug
  commission_percent NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  target_path TEXT,
  visitor_id TEXT, -- random cookie id
  user_id UUID,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS affiliate_clicks_affiliate_idx ON public.affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_clicks_visitor_idx ON public.affiliate_clicks(visitor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id UUID,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|paid|rejected
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS affiliate_conversions_affiliate_idx ON public.affiliate_conversions(affiliate_id, created_at DESC);

-- RLS
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- settings: anyone read, admins manage
CREATE POLICY "anyone read affiliate settings" ON public.affiliate_settings FOR SELECT USING (true);
CREATE POLICY "admins manage affiliate settings" ON public.affiliate_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- applications
CREATE POLICY "users see own applications" ON public.affiliate_applications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users create own application" ON public.affiliate_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins update applications" ON public.affiliate_applications FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete applications" ON public.affiliate_applications FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

-- affiliates
CREATE POLICY "anyone read active affiliates" ON public.affiliates FOR SELECT
  USING (is_active = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage affiliates" ON public.affiliates FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- overrides
CREATE POLICY "anyone read overrides" ON public.affiliate_commission_overrides FOR SELECT USING (true);
CREATE POLICY "admins manage overrides" ON public.affiliate_commission_overrides FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- clicks: anyone insert (server-side path), affiliates/admins read own
CREATE POLICY "anyone insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "affiliate read own clicks" ON public.affiliate_clicks FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_clicks.affiliate_id AND a.user_id = auth.uid()
  ));

-- conversions: affiliates/admins read own, only admins write
CREATE POLICY "affiliate read own conversions" ON public.affiliate_conversions FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_conversions.affiliate_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "admins manage conversions" ON public.affiliate_conversions FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- helper: generate ref code
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE c TEXT;
BEGIN
  LOOP
    c := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE ref_code = c);
  END LOOP;
  RETURN c;
END $$;

-- approve application -> create affiliate
CREATE OR REPLACE FUNCTION public.affiliate_approve_application(_app_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE app RECORD; aff_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  SELECT * INTO app FROM public.affiliate_applications WHERE id = _app_id;
  IF app IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  UPDATE public.affiliate_applications SET status='approved', reviewed_at=now(), reviewed_by=auth.uid() WHERE id=_app_id;

  INSERT INTO public.affiliates (user_id, ref_code)
  VALUES (app.user_id, public.generate_ref_code())
  ON CONFLICT (user_id) DO UPDATE SET is_active = true
  RETURNING id INTO aff_id;

  -- notify
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (app.user_id, 'affiliate_approved',
    'אושרת כשותף!', 'היכנס לפרופיל ולחץ על "הלוח שלי" כדי לראות לינקים',
    '/profile', jsonb_build_object('affiliate_id', aff_id));

  RETURN aff_id;
END $$;

-- ============ SHORTS TAGS ============
ALTER TABLE public.shorts_videos
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS shorts_videos_tags_idx ON public.shorts_videos USING GIN(tags);
