
CREATE TABLE IF NOT EXISTS public.marketplace_listing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('phone_click','whatsapp_click','like','unlike')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_events_listing ON public.marketplace_listing_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_events_type ON public.marketplace_listing_events(listing_id, event_type);

ALTER TABLE public.marketplace_listing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert listing events"
  ON public.marketplace_listing_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Listing owners can view their events"
  ON public.marketplace_listing_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings ml
      WHERE ml.id = marketplace_listing_events.listing_id
        AND ml.seller_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.get_listing_stats(_listing_id UUID)
RETURNS TABLE (event_type TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_type, COUNT(*)::BIGINT AS total
  FROM public.marketplace_listing_events
  WHERE listing_id = _listing_id
    AND (
      EXISTS (
        SELECT 1 FROM public.marketplace_listings ml
        WHERE ml.id = _listing_id AND ml.seller_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  GROUP BY event_type;
$$;

CREATE OR REPLACE FUNCTION public.track_listing_event(_listing_id UUID, _event_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event_type NOT IN ('phone_click','whatsapp_click','like','unlike') THEN
    RAISE EXCEPTION 'invalid event_type';
  END IF;
  INSERT INTO public.marketplace_listing_events (listing_id, event_type, user_id)
  VALUES (_listing_id, _event_type, auth.uid());
END;
$$;
