
-- Add per-domain benefit columns to subscription tiers
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS shop_discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS academy_discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_free_boosts integer NOT NULL DEFAULT 0;

-- Backfill: shop_discount uses existing legacy discount_percent
UPDATE public.subscription_tiers
SET shop_discount_percent = COALESCE(discount_percent, 0)
WHERE shop_discount_percent = 0 AND COALESCE(discount_percent, 0) > 0;

-- Singleton settings row for points economy
CREATE TABLE IF NOT EXISTS public.points_settings (
  id integer PRIMARY KEY DEFAULT 1,
  points_per_nis numeric NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_points_settings CHECK (id = 1)
);

INSERT INTO public.points_settings (id, points_per_nis)
VALUES (1, 100)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read points settings" ON public.points_settings;
CREATE POLICY "anyone read points settings"
  ON public.points_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins manage points settings" ON public.points_settings;
CREATE POLICY "admins manage points settings"
  ON public.points_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS points_settings_updated_at ON public.points_settings;
CREATE TRIGGER points_settings_updated_at
  BEFORE UPDATE ON public.points_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
