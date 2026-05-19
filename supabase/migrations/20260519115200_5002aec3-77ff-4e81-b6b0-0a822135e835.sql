
-- ============================================================
-- 1. AUTOMATION SETTINGS (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_enabled boolean NOT NULL DEFAULT true,
  abandoned_cart_delay_hours integer NOT NULL DEFAULT 2,
  newsletter_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage automation_settings" ON public.automation_settings;
CREATE POLICY "admins manage automation_settings" ON public.automation_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.automation_settings (abandoned_cart_enabled, abandoned_cart_delay_hours, newsletter_enabled)
SELECT true, 2, true WHERE NOT EXISTS (SELECT 1 FROM public.automation_settings);

-- ============================================================
-- 2. ADMIN_TASKS: 3 new optional FKs
-- ============================================================
ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS related_deal_id uuid,
  ADD COLUMN IF NOT EXISTS related_order_id uuid,
  ADD COLUMN IF NOT EXISTS related_pro_id uuid;
CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_deal_id   ON public.admin_tasks(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_order_id  ON public.admin_tasks(related_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_pro_id    ON public.admin_tasks(related_pro_id);

-- ============================================================
-- 3. CART_ITEMS: abandoned-cart notification marker
-- ============================================================
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS abandoned_notified_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_cart_items_abandoned_notified ON public.cart_items(abandoned_notified_at);

-- ============================================================
-- 4. NEWSLETTER_CAMPAIGNS: ensure scheduling columns exist
-- ============================================================
ALTER TABLE public.newsletter_campaigns
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
CREATE INDEX IF NOT EXISTS idx_newsletter_status_sched ON public.newsletter_campaigns(status, scheduled_for);

-- ============================================================
-- 5. PROCESS ABANDONED CARTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_abandoned_carts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record;
  cutoff timestamptz;
  c record;
  created int := 0;
  v_name text;
  v_email text;
BEGIN
  SELECT * INTO s FROM public.automation_settings LIMIT 1;
  IF NOT FOUND OR NOT s.abandoned_cart_enabled THEN RETURN 0; END IF;

  cutoff := now() - make_interval(hours => s.abandoned_cart_delay_hours);

  FOR c IN
    SELECT user_id, MIN(added_at) AS first_added, SUM(price * qty) AS cart_value, COUNT(*) AS line_count
    FROM public.cart_items
    WHERE added_at < cutoff
      AND abandoned_notified_at IS NULL
      AND user_id IS NOT NULL
    GROUP BY user_id
  LOOP
    SELECT COALESCE(display_name, full_name, email, 'לקוח'), email
      INTO v_name, v_email
    FROM public.profiles WHERE id = c.user_id;

    -- Skip if a recent abandoned-cart deal already exists for this user (idempotency)
    IF NOT EXISTS (
      SELECT 1 FROM public.deals
      WHERE customer_id = c.user_id
        AND source_type = 'shop_abandoned_cart'
        AND created_at > now() - interval '7 days'
    ) THEN
      INSERT INTO public.deals (
        title, customer_name, customer_id, value, status, source_type, notes
      ) VALUES (
        'נטישת עגלה',
        COALESCE(v_name,'לקוח'),
        c.user_id,
        COALESCE(c.cart_value,0),
        'new_lead',
        'shop_abandoned_cart',
        FORMAT('עגלה נטושה: %s פריטים בסך ₪%s. אימייל: %s', c.line_count, COALESCE(c.cart_value::text,'0'), COALESCE(v_email,'—'))
      );
      created := created + 1;
    END IF;

    -- Mark notified (atomic per user)
    UPDATE public.cart_items
       SET abandoned_notified_at = now()
     WHERE user_id = c.user_id AND abandoned_notified_at IS NULL;
  END LOOP;

  RETURN created;
END $$;

-- ============================================================
-- 6. PROCESS PENDING NEWSLETTER CAMPAIGNS (drain scheduled queue)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_pending_newsletter_campaigns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record;
  campaign record;
  processed int := 0;
BEGIN
  SELECT * INTO s FROM public.automation_settings LIMIT 1;
  IF NOT FOUND OR NOT s.newsletter_enabled THEN RETURN 0; END IF;

  FOR campaign IN
    SELECT id FROM public.newsletter_campaigns
    WHERE status = 'scheduled' AND COALESCE(scheduled_for, now()) <= now()
    ORDER BY created_at ASC LIMIT 50
  LOOP
    -- Mark sending; actual per-recipient delivery is handled by the worker
    -- consuming the existing email queue (campaigns table holds the rendered html).
    UPDATE public.newsletter_campaigns
       SET status = 'sent', sent_at = now()
     WHERE id = campaign.id;
    processed := processed + 1;
  END LOOP;

  RETURN processed;
END $$;

-- ============================================================
-- 7. INVENTORY: RECEIVED PURCHASE ORDER  (auto increment stock)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_received_purchase_order(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record;
  item jsonb;
  v_pid uuid;
  v_qty int;
  v_name text;
  updated int := 0;
BEGIN
  SELECT * INTO o FROM public.supplier_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR item IN SELECT jsonb_array_elements(COALESCE(o.items,'[]'::jsonb))
  LOOP
    v_pid := NULL;
    BEGIN v_pid := (item->>'product_id')::uuid; EXCEPTION WHEN OTHERS THEN v_pid := NULL; END;
    v_qty := COALESCE((item->>'quantity')::int, (item->>'qty')::int, 0);
    v_name := item->>'name';

    IF v_pid IS NOT NULL THEN
      UPDATE public.shop_products
         SET stock_quantity = COALESCE(stock_quantity,0) + v_qty,
             updated_at = now()
       WHERE id = v_pid;
      IF FOUND THEN updated := updated + 1; END IF;
    ELSIF v_name IS NOT NULL AND length(v_name) > 1 THEN
      UPDATE public.shop_products
         SET stock_quantity = COALESCE(stock_quantity,0) + v_qty,
             updated_at = now()
       WHERE id = (SELECT id FROM public.shop_products WHERE title ILIKE v_name LIMIT 1);
      IF FOUND THEN updated := updated + 1; END IF;
    END IF;
  END LOOP;

  INSERT INTO public.security_audit_log (event_type, actor_id, target_kind, target_ref, details)
  VALUES ('supplier_order_received', auth.uid(), 'supplier_order', p_order_id::text,
          jsonb_build_object('items_updated', updated));

  RETURN updated;
END $$;

CREATE OR REPLACE FUNCTION public.trg_supplier_order_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'received' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'received') THEN
    PERFORM public.process_received_purchase_order(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS supplier_orders_received_trg ON public.supplier_orders;
CREATE TRIGGER supplier_orders_received_trg
AFTER INSERT OR UPDATE OF status ON public.supplier_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_order_received();

-- ============================================================
-- 8. EXTEND REFUND FUNCTION: restore physical stock
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_order_refund_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  it RECORD;
  v_free_tier_id UUID;
  v_revoked INT := 0;
  v_restored INT := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM 'refunded' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'refunded' THEN RETURN NEW; END IF;

  SELECT id INTO v_free_tier_id FROM public.subscription_tiers WHERE slug = 'free' LIMIT 1;

  FOR it IN
    SELECT * FROM public.shop_order_items WHERE order_id = NEW.id
  LOOP
    BEGIN
      -- Digital access revocation
      IF it.fulfillment_kind = 'course' AND NEW.customer_id IS NOT NULL THEN
        DELETE FROM public.academy_enrollments
          WHERE user_id = NEW.customer_id
            AND course_id = it.fulfillment_ref_id::uuid
            AND source IN ('purchase','admin_gift');
        IF FOUND THEN v_revoked := v_revoked + 1; END IF;

      ELSIF it.fulfillment_kind = 'vip_tier' AND NEW.customer_id IS NOT NULL THEN
        UPDATE public.profiles
          SET global_subscription_tier_id = v_free_tier_id
          WHERE id = NEW.customer_id
            AND global_subscription_tier_id = it.fulfillment_ref_id::uuid;
        IF FOUND THEN v_revoked := v_revoked + 1; END IF;
      END IF;

      -- Physical stock restoration (regardless of fulfillment_kind, when product is physical)
      IF it.product_id IS NOT NULL THEN
        UPDATE public.shop_products
           SET stock_quantity = COALESCE(stock_quantity,0) + COALESCE(it.quantity,1),
               updated_at = now()
         WHERE id = it.product_id
           AND product_type = 'physical';
        IF FOUND THEN v_restored := v_restored + 1; END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.security_audit_log
        (event_type, actor_id, target_user_id, target_kind, target_ref, details)
      VALUES ('refund_revoke_error', auth.uid(), NEW.customer_id, COALESCE(it.fulfillment_kind,'item'),
        COALESCE(it.fulfillment_ref_id, it.product_id::text),
        jsonb_build_object('order_id', NEW.id, 'error', SQLERRM));
    END;
  END LOOP;

  INSERT INTO public.security_audit_log
    (event_type, actor_id, target_user_id, target_kind, target_ref, details)
  VALUES ('order_refunded', auth.uid(), NEW.customer_id, 'shop_order', NEW.id::text,
    jsonb_build_object('revoked_items', v_revoked, 'restored_stock', v_restored));

  RETURN NEW;
END $$;

-- ============================================================
-- 9. SYSTEM AUDIT LOGS (global)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_type text,         -- 'admin' | 'user' | 'system'
  action text NOT NULL,   -- e.g. 'order.refunded', 'storage.delete', 'upload.complete'
  entity text,            -- e.g. 'shop_order', 'short', 'cpi_file'
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sys_audit_created ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_audit_action  ON public.system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sys_audit_user    ON public.system_audit_logs(user_id);
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read system audit" ON public.system_audit_logs;
CREATE POLICY "admins read system audit" ON public.system_audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "service inserts audit" ON public.system_audit_logs;
CREATE POLICY "service inserts audit" ON public.system_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 10. PG_CRON SCHEDULES
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('process-abandoned-carts','process-pending-newsletter');
    PERFORM cron.schedule('process-abandoned-carts', '*/15 * * * *', $cron$SELECT public.process_abandoned_carts();$cron$);
    PERFORM cron.schedule('process-pending-newsletter', '*/5 * * * *', $cron$SELECT public.process_pending_newsletter_campaigns();$cron$);
  END IF;
END $$;
