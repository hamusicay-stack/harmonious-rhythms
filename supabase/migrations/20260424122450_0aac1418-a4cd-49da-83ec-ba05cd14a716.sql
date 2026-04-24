-- 1) Function: bump click counter on insert into affiliate_clicks
CREATE OR REPLACE FUNCTION public.affiliate_bump_click_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliates
  SET total_clicks = total_clicks + 1, updated_at = now()
  WHERE id = NEW.affiliate_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_affiliate_bump_click ON public.affiliate_clicks;
CREATE TRIGGER trg_affiliate_bump_click
AFTER INSERT ON public.affiliate_clicks
FOR EACH ROW EXECUTE FUNCTION public.affiliate_bump_click_counter();

-- 2) Function: bump conversion + earnings counters
CREATE OR REPLACE FUNCTION public.affiliate_bump_conversion_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.affiliates
    SET total_conversions = total_conversions + 1,
        total_earned = total_earned + COALESCE(NEW.commission_amount, 0),
        updated_at = now()
    WHERE id = NEW.affiliate_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- when status moves to paid, bump total_paid
    IF NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid' THEN
      UPDATE public.affiliates
      SET total_paid = total_paid + COALESCE(NEW.commission_amount, 0),
          updated_at = now()
      WHERE id = NEW.affiliate_id;
    END IF;
    -- if commission_amount changed and not paid yet, adjust total_earned
    IF NEW.commission_amount <> OLD.commission_amount AND COALESCE(OLD.status,'') <> 'paid' THEN
      UPDATE public.affiliates
      SET total_earned = total_earned + (NEW.commission_amount - OLD.commission_amount),
          updated_at = now()
      WHERE id = NEW.affiliate_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_affiliate_bump_conversion ON public.affiliate_conversions;
CREATE TRIGGER trg_affiliate_bump_conversion
AFTER INSERT OR UPDATE ON public.affiliate_conversions
FOR EACH ROW EXECUTE FUNCTION public.affiliate_bump_conversion_counter();

-- 3) Helper RPC: record a conversion from a ref_code + scope + amount
CREATE OR REPLACE FUNCTION public.record_affiliate_conversion(
  _ref_code text,
  _scope_type text,
  _scope_id text,
  _order_amount numeric,
  _user_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF aff IS NULL THEN
    RETURN NULL;
  END IF;

  -- Resolve commission percent: per-affiliate override > scope override > global default
  SELECT default_commission_percent INTO default_pct FROM public.affiliate_settings WHERE id = 1;
  default_pct := COALESCE(default_pct, 10);

  SELECT commission_percent INTO override_pct
  FROM public.affiliate_commission_overrides
  WHERE scope_type = _scope_type AND scope_id = _scope_id LIMIT 1;

  pct := COALESCE(aff.commission_percent, override_pct, default_pct);
  amount := round((_order_amount * pct / 100.0)::numeric, 2);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, scope_type, scope_id, order_amount,
    commission_percent, commission_amount, status, user_id, notes
  ) VALUES (
    aff.id, _scope_type, _scope_id, _order_amount,
    pct, amount, 'pending', _user_id, _notes
  ) RETURNING id INTO conv_id;

  RETURN conv_id;
END $$;

-- 4) Backfill any existing rows so counters match reality
UPDATE public.affiliates a SET
  total_clicks = COALESCE((SELECT count(*) FROM public.affiliate_clicks c WHERE c.affiliate_id = a.id), 0),
  total_conversions = COALESCE((SELECT count(*) FROM public.affiliate_conversions x WHERE x.affiliate_id = a.id), 0),
  total_earned = COALESCE((SELECT sum(commission_amount) FROM public.affiliate_conversions x WHERE x.affiliate_id = a.id AND x.status <> 'rejected'), 0),
  total_paid   = COALESCE((SELECT sum(commission_amount) FROM public.affiliate_conversions x WHERE x.affiliate_id = a.id AND x.status = 'paid'), 0);