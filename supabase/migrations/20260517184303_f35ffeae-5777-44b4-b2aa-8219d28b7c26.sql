
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.marketplace_deal_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_buyer_confirmation'
    CHECK (status IN ('pending_buyer_confirmation','confirmed','rejected')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_conf_buyer ON public.marketplace_deal_confirmations (buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_deal_conf_seller ON public.marketplace_deal_confirmations (seller_id);
CREATE INDEX IF NOT EXISTS idx_deal_conf_listing ON public.marketplace_deal_confirmations (listing_id);

ALTER TABLE public.marketplace_deal_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their confirmations"
  ON public.marketplace_deal_confirmations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can create confirmations for their listings"
  ON public.marketplace_deal_confirmations FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM public.marketplace_listings ml
      WHERE ml.id = listing_id AND ml.seller_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can respond to their confirmations"
  ON public.marketplace_deal_confirmations FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can cancel pending confirmations"
  ON public.marketplace_deal_confirmations FOR DELETE
  USING (auth.uid() = seller_id AND status = 'pending_buyer_confirmation');

-- Notify buyer + flip listing on confirm
CREATE OR REPLACE FUNCTION public.handle_deal_confirmation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_title TEXT;
  seller_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT title INTO l_title FROM public.marketplace_listings WHERE id = NEW.listing_id;
    SELECT display_name INTO seller_name FROM public.profiles WHERE id = NEW.seller_id;
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (
      NEW.buyer_id,
      'deal_confirmation_request',
      'המוכר מבקש לאשר רכישה',
      COALESCE(seller_name, 'המוכר') || ' סימן שרכשת את: ' || COALESCE(l_title, 'הפריט'),
      '/marketplace/' || NEW.listing_id,
      NEW.seller_id,
      jsonb_build_object('confirmation_id', NEW.id, 'listing_id', NEW.listing_id, 'listing_title', l_title)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    NEW.responded_at := now();
    IF NEW.status = 'confirmed' THEN
      UPDATE public.marketplace_listings
         SET is_sold = true,
             sold_at = COALESCE(sold_at, now()),
             buyer_id = NEW.buyer_id
       WHERE id = NEW.listing_id;
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
      VALUES (NEW.seller_id, 'deal_confirmed', 'הקונה אישר את הרכישה 🎉',
        'המכירה אומתה במערכת — הקונה יכול כעת לכתוב ביקורת מאומתת.',
        '/marketplace/' || NEW.listing_id, NEW.buyer_id,
        jsonb_build_object('confirmation_id', NEW.id, 'listing_id', NEW.listing_id));
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
      VALUES (NEW.seller_id, 'deal_rejected', 'הקונה לא אישר את הרכישה',
        'ניתן להעלות מועמד אחר מתוך השיחות הפעילות.',
        '/marketplace/' || NEW.listing_id, NEW.buyer_id,
        jsonb_build_object('confirmation_id', NEW.id, 'listing_id', NEW.listing_id));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_confirmation_insert ON public.marketplace_deal_confirmations;
CREATE TRIGGER trg_deal_confirmation_insert
  AFTER INSERT ON public.marketplace_deal_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_confirmation_change();

DROP TRIGGER IF EXISTS trg_deal_confirmation_update ON public.marketplace_deal_confirmations;
CREATE TRIGGER trg_deal_confirmation_update
  BEFORE UPDATE ON public.marketplace_deal_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_confirmation_change();
