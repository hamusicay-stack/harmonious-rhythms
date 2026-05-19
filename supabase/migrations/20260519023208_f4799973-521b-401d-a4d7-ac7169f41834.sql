
-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id UUID,
  target_user_id UUID,
  target_kind TEXT,
  target_ref TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security audit log" ON public.security_audit_log;
CREATE POLICY "Admins can view security audit log"
  ON public.security_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_security_audit_log_created ON public.security_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_target_user ON public.security_audit_log (target_user_id);

-- 2) Revocation function fired on status -> refunded
CREATE OR REPLACE FUNCTION public.process_order_refund_revocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it RECORD;
  v_free_tier_id UUID;
  v_revoked INT := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM 'refunded' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'refunded' THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_free_tier_id FROM public.subscription_tiers WHERE slug = 'free' LIMIT 1;

  FOR it IN
    SELECT * FROM public.shop_order_items
    WHERE order_id = NEW.id AND fulfillment_kind IS NOT NULL
  LOOP
    BEGIN
      IF it.fulfillment_kind = 'course' THEN
        DELETE FROM public.academy_enrollments
          WHERE user_id = NEW.customer_id
            AND course_id = it.fulfillment_ref_id::uuid
            AND source IN ('purchase','admin_gift');
        IF FOUND THEN
          v_revoked := v_revoked + 1;
          INSERT INTO public.security_audit_log
            (event_type, actor_id, target_user_id, target_kind, target_ref, details)
          VALUES ('refund_revoke_course', auth.uid(), NEW.customer_id, 'academy_course',
            it.fulfillment_ref_id,
            jsonb_build_object('order_id', NEW.id, 'order_item_id', it.id));
        END IF;

      ELSIF it.fulfillment_kind = 'vip_tier' THEN
        UPDATE public.profiles
          SET global_subscription_tier_id = v_free_tier_id
          WHERE id = NEW.customer_id
            AND global_subscription_tier_id = it.fulfillment_ref_id::uuid;
        IF FOUND THEN
          v_revoked := v_revoked + 1;
          INSERT INTO public.security_audit_log
            (event_type, actor_id, target_user_id, target_kind, target_ref, details)
          VALUES ('refund_revoke_vip_tier', auth.uid(), NEW.customer_id, 'subscription_tier',
            it.fulfillment_ref_id,
            jsonb_build_object('order_id', NEW.id, 'reset_to_tier_id', v_free_tier_id));
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.security_audit_log
        (event_type, actor_id, target_user_id, target_kind, target_ref, details)
      VALUES ('refund_revoke_error', auth.uid(), NEW.customer_id, it.fulfillment_kind,
        it.fulfillment_ref_id,
        jsonb_build_object('order_id', NEW.id, 'error', SQLERRM));
    END;
  END LOOP;

  INSERT INTO public.security_audit_log
    (event_type, actor_id, target_user_id, target_kind, target_ref, details)
  VALUES ('order_refunded', auth.uid(), NEW.customer_id, 'shop_order', NEW.id::text,
    jsonb_build_object('revoked_items', v_revoked));

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_shop_orders_refund_revocation ON public.shop_orders;
CREATE TRIGGER trg_shop_orders_refund_revocation
  AFTER UPDATE OF status ON public.shop_orders
  FOR EACH ROW
  WHEN (NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded')
  EXECUTE FUNCTION public.process_order_refund_revocation();
