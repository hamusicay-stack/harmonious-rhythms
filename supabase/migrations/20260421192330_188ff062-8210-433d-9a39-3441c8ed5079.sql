ALTER TABLE public.marketplace_settings
  ADD COLUMN IF NOT EXISTS auto_approve_listings boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.marketplace_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auto_flag boolean := false;
  is_trusted boolean := false;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(auto_approve_listings, false) INTO auto_flag
  FROM public.marketplace_settings WHERE id = 1;

  SELECT EXISTS(
    SELECT 1 FROM public.marketplace_trusted_sellers WHERE user_id = NEW.seller_id
  ) INTO is_trusted;

  IF auto_flag OR is_trusted THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_auto_approve ON public.marketplace_listings;
CREATE TRIGGER trg_marketplace_auto_approve
BEFORE INSERT ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.marketplace_auto_approve();