ALTER TABLE public.subscription_tiers ADD COLUMN IF NOT EXISTS beat_access boolean NOT NULL DEFAULT false;
UPDATE public.subscription_tiers SET beat_access = true WHERE is_vip = true;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS points_discount_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.redeem_points_for_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE uid uuid := auth.uid(); ord RECORD; available integer; per_nis numeric; discount numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _points IS NULL OR _points <= 0 THEN RETURN 0; END IF;
  SELECT * INTO ord FROM public.shop_orders WHERE id = _order_id;
  IF ord IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF ord.customer_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Not your order'; END IF;
  IF ord.points_redeemed > 0 THEN RAISE EXCEPTION 'Points already redeemed on this order'; END IF;
  SELECT COALESCE(total_points, 0) INTO available FROM public.user_points WHERE user_id = uid;
  IF available IS NULL THEN available := 0; END IF;
  IF available < _points THEN RAISE EXCEPTION 'Insufficient points'; END IF;
  SELECT COALESCE(points_per_nis, 100) INTO per_nis FROM public.points_settings WHERE id = 1;
  IF per_nis IS NULL OR per_nis <= 0 THEN per_nis := 100; END IF;
  discount := round((_points::numeric / per_nis)::numeric, 2);
  IF discount > ord.subtotal THEN discount := ord.subtotal; END IF;
  INSERT INTO public.points_ledger (user_id, event_key, points, reference_type, reference_id, notes)
  VALUES (uid, 'redeem_shop_order', -_points, 'shop_order', _order_id::text, 'Redeemed for cash discount');
  UPDATE public.user_points SET total_points = total_points - _points, updated_at = now() WHERE user_id = uid;
  UPDATE public.shop_orders SET points_redeemed = _points, points_discount_amount = discount,
    discount_amount = discount_amount + discount,
    total_amount = GREATEST(0, total_amount - discount), updated_at = now()
    WHERE id = _order_id;
  RETURN discount;
END;
$fn$;