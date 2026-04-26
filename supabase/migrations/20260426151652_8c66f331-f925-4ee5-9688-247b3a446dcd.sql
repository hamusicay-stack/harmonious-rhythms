CREATE TABLE IF NOT EXISTS public.affiliate_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','paypal','bit','other')),
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_affiliate ON public.affiliate_payout_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.affiliate_payout_requests(status, requested_at DESC);

ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own payout requests"
ON public.affiliate_payout_requests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance')
);

CREATE POLICY "Affiliates create own payout requests"
ON public.affiliate_payout_requests FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid() AND a.is_active = true)
);

CREATE POLICY "Admin/finance update payout requests"
ON public.affiliate_payout_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.affiliate_payout_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.affiliate_apply_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid' THEN
    UPDATE public.affiliates
    SET total_paid = total_paid + NEW.amount, updated_at = now()
    WHERE id = NEW.affiliate_id;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  ELSIF NEW.status IN ('approved','rejected') AND COALESCE(OLD.status,'') = 'pending' THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_apply_affiliate_payout
BEFORE UPDATE ON public.affiliate_payout_requests
FOR EACH ROW EXECUTE FUNCTION public.affiliate_apply_payout();

CREATE OR REPLACE FUNCTION public.notify_on_payout_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  aff_user UUID;
  status_label TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT user_id INTO aff_user FROM public.affiliates WHERE id = NEW.affiliate_id;
  IF aff_user IS NULL THEN RETURN NEW; END IF;

  status_label := CASE NEW.status
    WHEN 'approved' THEN 'בקשת המשיכה שלך אושרה'
    WHEN 'paid' THEN 'בקשת המשיכה שלך שולמה!'
    WHEN 'rejected' THEN 'בקשת המשיכה נדחתה'
    ELSE NULL END;

  IF status_label IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (aff_user, 'payout_' || NEW.status, status_label,
      '₪' || NEW.amount::text || COALESCE(' • ' || NEW.admin_notes, ''),
      '/profile',
      jsonb_build_object('payout_id', NEW.id, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_payout_update
AFTER UPDATE ON public.affiliate_payout_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_payout_update();