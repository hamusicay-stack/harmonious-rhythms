
-- 1. Schema upgrade
ALTER TABLE public.shop_order_items
  ADD COLUMN IF NOT EXISTS fulfillment_kind TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_ref_id TEXT;

CREATE INDEX IF NOT EXISTS idx_shop_order_items_fulfillment
  ON public.shop_order_items(fulfillment_kind)
  WHERE fulfillment_kind IS NOT NULL;

-- 2. Fulfillment RPC
CREATE OR REPLACE FUNCTION public.process_order_fulfillment(_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  it  RECORD;
  v_listing_id UUID;
  v_hours INT;
  v_parts TEXT[];
  v_tier_id UUID;
BEGIN
  SELECT * INTO ord FROM public.shop_orders WHERE id = _order_id;
  IF ord IS NULL THEN RETURN; END IF;
  IF ord.payment_status <> 'paid' THEN RETURN; END IF;
  IF ord.customer_id IS NULL THEN RETURN; END IF;

  FOR it IN
    SELECT * FROM public.shop_order_items
    WHERE order_id = _order_id AND fulfillment_kind IS NOT NULL
  LOOP
    BEGIN
      IF it.fulfillment_kind = 'course' THEN
        INSERT INTO public.academy_enrollments (user_id, course_id, source, status)
        VALUES (ord.customer_id, it.fulfillment_ref_id::uuid, 'purchase', 'active')
        ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active';

      ELSIF it.fulfillment_kind = 'vip_tier' THEN
        v_tier_id := it.fulfillment_ref_id::uuid;
        UPDATE public.profiles
           SET global_subscription_tier_id = v_tier_id
         WHERE id = ord.customer_id;

      ELSIF it.fulfillment_kind = 'marketplace_boost' THEN
        -- ref_id shape: "{listingId}:{hours}"
        v_parts := string_to_array(it.fulfillment_ref_id, ':');
        v_listing_id := v_parts[1]::uuid;
        v_hours := COALESCE(NULLIF(v_parts[2], '')::int, 24);
        UPDATE public.marketplace_listings
           SET bumped_at = now(),
               bump_expires_at = now() + (v_hours || ' hours')::interval
         WHERE id = v_listing_id;

      ELSIF it.fulfillment_kind = 'rhythm_set' THEN
        -- Rhythm sets currently rely on order row + info_file_url webhook;
        -- nothing extra to grant at this stage.
        NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'process_order_fulfillment: item % failed: %', it.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.process_order_fulfillment(UUID) FROM PUBLIC, anon, authenticated;

-- 3. Trigger: auto-fulfill when payment_status flips to 'paid'
CREATE OR REPLACE FUNCTION public.trg_shop_orders_auto_fulfill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    PERFORM public.process_order_fulfillment(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_orders_auto_fulfill ON public.shop_orders;
CREATE TRIGGER shop_orders_auto_fulfill
AFTER INSERT OR UPDATE OF payment_status ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_shop_orders_auto_fulfill();
