
-- Add urgent flag + audio_url to listings
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Verified sales counter on business sellers
ALTER TABLE public.marketplace_business_sellers
  ADD COLUMN IF NOT EXISTS verified_sales_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Saved searches
CREATE TABLE IF NOT EXISTS public.marketplace_saved_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_email boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved searches"
  ON public.marketplace_saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches"
  ON public.marketplace_saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON public.marketplace_saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON public.marketplace_saved_searches FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_marketplace_saved_searches_updated_at
  BEFORE UPDATE ON public.marketplace_saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
