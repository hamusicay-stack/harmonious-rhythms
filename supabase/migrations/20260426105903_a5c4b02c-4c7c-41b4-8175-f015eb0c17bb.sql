
CREATE OR REPLACE FUNCTION public.record_affiliate_conversion(
  _ref_code text,
  _scope_type text,
  _scope_id text,
  _order_amount numeric,
  _user_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aff RECORD;
  pct numeric;
  override_pct numeric;
  default_pct numeric;
  amount numeric;
  conv_id uuid;
BEGIN
  IF _ref_code IS NULL OR _scope_type IS NULL OR _scope_id IS NULL OR _order_amount IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO aff FROM public.affiliates
  WHERE ref_code = upper(_ref_code) AND is_active = true LIMIT 1;
  IF aff IS NULL THEN RETURN NULL; END IF;

  SELECT default_commission_percent INTO default_pct FROM public.affiliate_settings WHERE id = 1;
  default_pct := COALESCE(default_pct, 10);

  SELECT commission_percent INTO override_pct
  FROM public.affiliate_commission_overrides
  WHERE scope_type = _scope_type AND scope_id = _scope_id LIMIT 1;

  pct := COALESCE(aff.commission_percent, override_pct, default_pct);
  amount := round((_order_amount * pct / 100.0)::numeric, 2);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, scope_type, scope_id, order_amount,
    commission_percent, commission_amount, status, user_id, notes, order_id
  ) VALUES (
    aff.id, _scope_type, _scope_id, _order_amount,
    pct, amount, 'pending', _user_id, _notes, _order_id
  ) RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$;
