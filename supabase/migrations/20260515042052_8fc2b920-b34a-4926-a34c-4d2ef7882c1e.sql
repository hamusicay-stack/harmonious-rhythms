
-- 1) FK: seller_id -> profiles(id) (profiles row is auto-created on signup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_listings_seller_profile_fk'
  ) THEN
    ALTER TABLE public.marketplace_listings
      ADD CONSTRAINT marketplace_listings_seller_profile_fk
      FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Privacy Shield: revoke column-level SELECT on phone & whatsapp from public roles
REVOKE SELECT (phone, whatsapp) ON public.marketplace_listings FROM anon;
REVOKE SELECT (phone, whatsapp) ON public.marketplace_listings FROM authenticated;

-- 3) Secure helper for the owner / admin to fetch their own contact info
CREATE OR REPLACE FUNCTION public.get_listing_contact(_listing_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.phone, l.whatsapp
  FROM public.marketplace_listings l
  WHERE l.id = _listing_id
    AND (l.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
END $$;

GRANT EXECUTE ON FUNCTION public.get_listing_contact(uuid) TO authenticated;
