
-- 1) Order history (audit trail)
CREATE TABLE IF NOT EXISTS public.shop_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  admin_id uuid,
  action text NOT NULL,
  reason text,
  amount numeric(12,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_order_history_order ON public.shop_order_history(order_id, created_at DESC);
ALTER TABLE public.shop_order_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view order history" ON public.shop_order_history;
CREATE POLICY "Admins view order history" ON public.shop_order_history
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert order history" ON public.shop_order_history;
CREATE POLICY "Admins insert order history" ON public.shop_order_history
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Refund + cancel RPC
CREATE OR REPLACE FUNCTION public.admin_refund_shop_order(
  p_order_id uuid,
  p_reason text,
  p_amount numeric DEFAULT NULL,
  p_full_refund boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  ord RECORD;
  it RECORD;
  v_revoked int := 0;
  v_conv int := 0;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can refund orders';
  END IF;
  SELECT * INTO ord FROM public.shop_orders WHERE id = p_order_id FOR UPDATE;
  IF ord IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Update order status
  UPDATE public.shop_orders
    SET status = 'refunded'::shop_order_status,
        payment_status = 'refunded'::shop_payment_status,
        admin_notes = COALESCE(admin_notes || E'\n', '') ||
          '[' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] החזר: ' || COALESCE(p_reason,'')
    WHERE id = p_order_id;

  -- Revoke digital access for course items (and vip tiers if full)
  IF p_full_refund THEN
    FOR it IN
      SELECT * FROM public.shop_order_items
      WHERE order_id = p_order_id AND fulfillment_kind IS NOT NULL
    LOOP
      BEGIN
        IF it.fulfillment_kind = 'course' AND ord.customer_id IS NOT NULL THEN
          DELETE FROM public.academy_enrollments
            WHERE user_id = ord.customer_id
              AND course_id = it.fulfillment_ref_id::uuid
              AND source IN ('purchase','admin_gift');
          v_revoked := v_revoked + 1;
        ELSIF it.fulfillment_kind = 'vip_tier' AND ord.customer_id IS NOT NULL THEN
          UPDATE public.profiles
            SET global_subscription_tier_id = NULL
            WHERE id = ord.customer_id
              AND global_subscription_tier_id = it.fulfillment_ref_id::uuid;
          v_revoked := v_revoked + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- best-effort
        NULL;
      END;
    END LOOP;
  END IF;

  -- Reject affiliate conversions
  UPDATE public.affiliate_conversions
    SET status = 'rejected'
    WHERE order_id = p_order_id AND status IN ('pending','approved');
  GET DIAGNOSTICS v_conv = ROW_COUNT;

  -- Log
  INSERT INTO public.shop_order_history (order_id, admin_id, action, reason, amount, metadata)
  VALUES (p_order_id, v_admin,
    CASE WHEN p_full_refund THEN 'refund_full' ELSE 'refund_partial' END,
    p_reason,
    COALESCE(p_amount, ord.total_amount),
    jsonb_build_object('revoked_items', v_revoked, 'affiliate_conversions_rejected', v_conv));

  RETURN jsonb_build_object('ok', true, 'revoked_items', v_revoked, 'affiliate_conversions_rejected', v_conv);
END $$;

-- 3) Re-trigger CPI webhook manually
CREATE OR REPLACE FUNCTION public.admin_retrigger_cpi_webhook(p_rhythm_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_admin uuid := auth.uid();
  ord RECORD;
  s RECORD;
  email_value text;
  payload jsonb;
  hdrs jsonb;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can retrigger CPI';
  END IF;
  SELECT * INTO ord FROM public.rhythm_orders WHERE id = p_rhythm_order_id;
  IF ord IS NULL THEN RAISE EXCEPTION 'Rhythm order not found'; END IF;
  IF COALESCE(ord.info_file_url,'') = '' THEN
    RAISE EXCEPTION 'No info file uploaded for this order';
  END IF;
  SELECT * INTO s FROM public.rhythm_automation_settings WHERE id = 1;
  IF s IS NULL OR s.enabled = false OR COALESCE(s.webhook_url,'') = '' THEN
    RAISE EXCEPTION 'CPI automation is disabled or webhook URL is not configured';
  END IF;
  email_value := COALESCE(ord.customer_email,
    (SELECT email FROM auth.users WHERE id = ord.user_id LIMIT 1));
  payload := jsonb_build_object(
    'order_id', ord.id,
    'user_email', email_value,
    'purchased_set_id', ord.rhythm_set_id,
    'n27_file_url', ord.info_file_url,
    'manual_retrigger', true
  );
  hdrs := jsonb_build_object('Content-Type','application/json');
  IF COALESCE(s.webhook_secret,'') <> '' THEN
    hdrs := hdrs || jsonb_build_object('x-webhook-secret', s.webhook_secret);
  END IF;
  PERFORM net.http_post(url := s.webhook_url, headers := hdrs, body := payload, timeout_milliseconds := 5000);

  UPDATE public.rhythm_orders SET status = 'processing', updated_at = now() WHERE id = p_rhythm_order_id;

  RETURN jsonb_build_object('ok', true);
END $$;

-- 4) Affiliate conversion status update
CREATE OR REPLACE FUNCTION public.admin_set_affiliate_conversion_status(p_conversion_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN
    RAISE EXCEPTION 'Only admins can update conversions';
  END IF;
  IF p_status NOT IN ('pending','approved','rejected','paid','on_hold') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.affiliate_conversions
    SET status = p_status,
        approved_at = CASE WHEN p_status='approved' AND approved_at IS NULL THEN now() ELSE approved_at END
    WHERE id = p_conversion_id;
END $$;
