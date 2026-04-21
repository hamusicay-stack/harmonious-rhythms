-- Re-create function with explicit search_path (already had it, but ensure)
CREATE OR REPLACE FUNCTION public.track_banner_event(_banner_id UUID, _event_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event_type NOT IN ('view', 'click') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  INSERT INTO public.ad_banner_events (banner_id, event_type, user_id)
  VALUES (_banner_id, _event_type, auth.uid());

  IF _event_type = 'view' THEN
    UPDATE public.ad_banners SET views_count = views_count + 1 WHERE id = _banner_id;
  ELSE
    UPDATE public.ad_banners SET clicks_count = clicks_count + 1 WHERE id = _banner_id;
  END IF;
END;
$$;

-- Replace the overly-permissive insert policy: require valid event type
DROP POLICY IF EXISTS "Anyone can log banner events" ON public.ad_banner_events;

CREATE POLICY "Anyone can log valid banner events"
ON public.ad_banner_events FOR INSERT
WITH CHECK (event_type IN ('view', 'click'));