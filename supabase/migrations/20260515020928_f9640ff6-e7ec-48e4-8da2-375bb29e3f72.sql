
-- Unified Global VIP system
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tiers readable by all" ON public.subscription_tiers;
CREATE POLICY "Tiers readable by all" ON public.subscription_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tiers managed by admins" ON public.subscription_tiers;
CREATE POLICY "Tiers managed by admins" ON public.subscription_tiers FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.subscription_tiers (slug, name, rank, is_vip, color) VALUES
  ('free', 'חינם', 0, false, 'default'),
  ('basic', 'בסיסי', 10, false, 'blue'),
  ('premium', 'פרימיום', 20, true, 'gold'),
  ('vip', 'VIP', 30, true, 'gold')
ON CONFLICT (slug) DO NOTHING;

-- Add global tier reference + WhatsApp flag on profiles (single source of truth)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_subscription_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN NOT NULL DEFAULT false;

-- Backfill from legacy subscription_tier text column
UPDATE public.profiles p
SET global_subscription_tier_id = t.id
FROM public.subscription_tiers t
WHERE p.global_subscription_tier_id IS NULL
  AND lower(COALESCE(p.subscription_tier,'free')) = t.slug;

-- Keep legacy text column in sync going forward (compatibility for existing code paths)
CREATE OR REPLACE FUNCTION public.sync_profile_tier_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s TEXT;
BEGIN
  IF NEW.global_subscription_tier_id IS NULL THEN
    NEW.subscription_tier := COALESCE(NEW.subscription_tier, 'free');
  ELSE
    SELECT slug INTO s FROM public.subscription_tiers WHERE id = NEW.global_subscription_tier_id;
    IF s IS NOT NULL THEN NEW.subscription_tier := s; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_sync_tier_slug ON public.profiles;
CREATE TRIGGER profiles_sync_tier_slug
BEFORE INSERT OR UPDATE OF global_subscription_tier_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_tier_slug();
