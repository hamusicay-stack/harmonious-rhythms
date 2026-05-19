
-- 1) Add CPI status column to shop_orders
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS cpi_status TEXT NOT NULL DEFAULT 'none';

-- 2) Trigger: when cpi_status changes to 'failed', insert a CRM deal labeled "שגיאת קידוד CPI"
CREATE OR REPLACE FUNCTION public.handle_cpi_failed_create_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE'
      AND NEW.cpi_status = 'failed'
      AND (OLD.cpi_status IS DISTINCT FROM NEW.cpi_status)) THEN

    -- Skip if a deal already exists for this order's CPI failure
    IF EXISTS (
      SELECT 1 FROM public.deals
      WHERE source_type = 'cpi_encoding_error'
        AND source_ref_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    v_customer_name := COALESCE(NEW.customer_name, NEW.customer_email, 'הזמנה ' || NEW.order_number);

    INSERT INTO public.deals (
      customer_name, customer_id, value, status, position,
      source_type, source_ref_id, title, notes
    ) VALUES (
      v_customer_name,
      NEW.customer_id,
      COALESCE(NEW.total_amount, 0),
      'new_lead',
      0,
      'cpi_encoding_error',
      NEW.id,
      'שגיאת קידוד CPI',
      'הזמנה #' || NEW.order_number || ' נכשלה בקידוד CPI ודורשת טיפול ידני.'
    );

    INSERT INTO public.system_audit_logs (action, entity, entity_id, details)
    VALUES ('cpi_failed_deal_created', 'shop_order', NEW.id::text,
            jsonb_build_object('order_number', NEW.order_number));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shop_orders_cpi_failed ON public.shop_orders;
CREATE TRIGGER trg_shop_orders_cpi_failed
AFTER UPDATE OF cpi_status ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_cpi_failed_create_deal();

-- 3) Admin RPC: manual points adjustment (positive or negative)
CREATE OR REPLACE FUNCTION public.admin_adjust_user_points(
  _user_id UUID,
  _delta INTEGER,
  _reason TEXT
)
RETURNS TABLE(new_balance BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access_denied: admin only';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  IF _delta IS NULL OR _delta = 0 THEN
    RAISE EXCEPTION 'delta must be a non-zero integer';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 2 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  INSERT INTO public.points_ledger (
    user_id, event_key, points, reference_type, reference_id, notes
  ) VALUES (
    _user_id,
    'admin_manual_adjustment',
    _delta,
    'admin_adjustment',
    gen_random_uuid()::text,
    btrim(_reason)
  );

  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (
    auth.uid(), 'admin', 'points_adjustment', 'profile', _user_id::text,
    jsonb_build_object('delta', _delta, 'reason', btrim(_reason))
  );

  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM public.points_ledger
  WHERE user_id = _user_id;

  RETURN QUERY SELECT v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_user_points(UUID, INTEGER, TEXT) TO authenticated;
