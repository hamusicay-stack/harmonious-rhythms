-- Add new columns for the expanded marketplace
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS seller_type TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS custom_category TEXT,
  ADD COLUMN IF NOT EXISTS custom_brand TEXT,
  ADD COLUMN IF NOT EXISTS custom_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bump_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_bumped ON public.marketplace_listings(bump_expires_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_city ON public.marketplace_listings(city);

-- Business sellers table
CREATE TABLE IF NOT EXISTS public.marketplace_business_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_business_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business sellers"
  ON public.marketplace_business_sellers FOR SELECT USING (true);

CREATE POLICY "Admins manage business sellers"
  ON public.marketplace_business_sellers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_marketplace_business_sellers_updated_at
  BEFORE UPDATE ON public.marketplace_business_sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();