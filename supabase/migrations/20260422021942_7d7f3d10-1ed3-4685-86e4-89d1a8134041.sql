-- 1. Increment listing views RPC (bypasses RLS update restriction)
CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET views_count = views_count + 1
  WHERE id = _listing_id AND status = 'approved';
END;
$$;

-- 2. Increment pro views RPC
CREATE OR REPLACE FUNCTION public.increment_pro_views(_pro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.music_pros
  SET views_count = views_count + 1
  WHERE id = _pro_id AND status = 'approved';
END;
$$;

-- 3. Add is_approved column to music_pro_reviews
ALTER TABLE public.music_pro_reviews
ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- 4. Update RLS for reviews — only approved reviews are public
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.music_pro_reviews;

CREATE POLICY "Public can view approved reviews"
ON public.music_pro_reviews FOR SELECT
USING (
  is_approved = true
  OR auth.uid() = reviewer_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.music_pros p
    WHERE p.id = music_pro_reviews.pro_id AND p.user_id = auth.uid()
  )
);

-- 5. Allow pro owner to update (approve/reject) reviews on their profile
DROP POLICY IF EXISTS "Admin can update reviews" ON public.music_pro_reviews;

CREATE POLICY "Pro owner and admin can update reviews"
ON public.music_pro_reviews FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.music_pros p
    WHERE p.id = music_pro_reviews.pro_id AND p.user_id = auth.uid()
  )
);

-- 6. Lock display_name on music_pros — only admins can change it after creation
CREATE OR REPLACE FUNCTION public.protect_music_pro_locked_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.display_name := OLD.display_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_music_pro_locked_fields_trg ON public.music_pros;
CREATE TRIGGER protect_music_pro_locked_fields_trg
BEFORE UPDATE ON public.music_pros
FOR EACH ROW
EXECUTE FUNCTION public.protect_music_pro_locked_fields();