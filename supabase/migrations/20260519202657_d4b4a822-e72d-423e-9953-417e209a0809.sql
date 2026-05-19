
-- 1. Daily limit column on points rules
ALTER TABLE public.points_rules
  ADD COLUMN IF NOT EXISTS daily_limit integer;

-- 2. Hardened award_points_for_event: daily-limit check + audit log
CREATE OR REPLACE FUNCTION public.award_points_for_event(
  _user_id uuid,
  _event_key text,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rule RECORD;
  awarded integer := 0;
  v_today_count integer;
BEGIN
  IF _user_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO rule FROM public.points_rules WHERE event_key = _event_key AND enabled = true LIMIT 1;
  IF rule IS NULL OR rule.points = 0 THEN RETURN 0; END IF;

  -- Daily limit (abuse prevention)
  IF rule.daily_limit IS NOT NULL AND rule.daily_limit > 0 THEN
    SELECT COUNT(*) INTO v_today_count
      FROM public.points_ledger
     WHERE user_id = _user_id
       AND event_key = _event_key
       AND created_at > now() - interval '24 hours';
    IF v_today_count >= rule.daily_limit THEN
      INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
      VALUES (_user_id, 'system', 'points_award_denied', 'points_ledger', _reference_id,
        jsonb_build_object('event_key', _event_key, 'reason', 'daily_limit_exceeded',
          'limit', rule.daily_limit, 'count_24h', v_today_count));
      RETURN 0;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.points_ledger (user_id, event_key, points, reference_type, reference_id, notes)
    VALUES (_user_id, _event_key, rule.points, _reference_type, _reference_id, _notes);
    awarded := rule.points;
  EXCEPTION WHEN unique_violation THEN RETURN 0; END;

  INSERT INTO public.user_points (user_id, total_points, updated_at)
  VALUES (_user_id, awarded, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = public.user_points.total_points + EXCLUDED.total_points, updated_at = now();

  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (_user_id, 'system', 'points_awarded', 'points_ledger', _reference_id,
    jsonb_build_object('event_key', _event_key, 'points', awarded,
      'reference_type', _reference_type, 'reason', COALESCE(_notes, rule.label)));

  RETURN awarded;
END;
$$;

-- 3. Split god-function: update_crm_status (status only) + award_booking_points (points only)

CREATE OR REPLACE FUNCTION public.update_crm_status(
  p_inquiry_id uuid,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inquiry RECORD;
  v_pro_user uuid;
  v_pro_name text;
  v_deal_id uuid;
  v_deal_status text;
  v_lead_status lead_status;
  v_status_label text;
  v_user_a uuid;
  v_user_b uuid;
  v_thread_id uuid;
  v_body text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_new_status NOT IN ('new','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  SELECT * INTO v_inquiry FROM public.music_pro_inquiries WHERE id = p_inquiry_id;
  IF v_inquiry IS NULL THEN RAISE EXCEPTION 'Inquiry not found'; END IF;

  SELECT user_id, display_name INTO v_pro_user, v_pro_name
    FROM public.music_pros WHERE id = v_inquiry.pro_id;

  IF v_pro_user IS DISTINCT FROM v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Only the music professional or an admin can update this inquiry';
  END IF;

  UPDATE public.music_pro_inquiries SET status = p_new_status, updated_at = now()
   WHERE id = p_inquiry_id;

  v_deal_status := CASE p_new_status
    WHEN 'new' THEN 'new_lead' WHEN 'in_progress' THEN 'contacted'
    WHEN 'completed' THEN 'closed_won' WHEN 'cancelled' THEN 'cancelled' END;

  UPDATE public.deals SET status = v_deal_status, updated_at = now()
   WHERE source_type = 'music_pro_inquiry' AND source_ref_id = p_inquiry_id
  RETURNING id INTO v_deal_id;

  v_lead_status := CASE p_new_status
    WHEN 'new' THEN 'new'::lead_status WHEN 'in_progress' THEN 'in_progress'::lead_status
    WHEN 'completed' THEN 'converted'::lead_status WHEN 'cancelled' THEN 'lost'::lead_status END;

  UPDATE public.leads l SET status = v_lead_status, updated_at = now()
   FROM public.deals d WHERE d.id = v_deal_id AND d.lead_id = l.id;

  IF v_inquiry.sender_id IS NOT NULL AND v_pro_user IS NOT NULL AND v_inquiry.sender_id <> v_pro_user THEN
    IF v_inquiry.sender_id < v_pro_user THEN
      v_user_a := v_inquiry.sender_id; v_user_b := v_pro_user;
    ELSE
      v_user_a := v_pro_user; v_user_b := v_inquiry.sender_id;
    END IF;
    SELECT id INTO v_thread_id FROM public.core_chat_threads
     WHERE context_type = 'PRO' AND user_a = v_user_a AND user_b = v_user_b
     ORDER BY created_at DESC LIMIT 1;
    IF v_thread_id IS NOT NULL THEN
      v_status_label := CASE p_new_status
        WHEN 'new' THEN 'חדש' WHEN 'in_progress' THEN 'בטיפול'
        WHEN 'completed' THEN 'הושלם ונסגר' WHEN 'cancelled' THEN 'לא רלוונטי' END;
      v_body := '🔔 סטטוס הפנייה עודכן על ידי המוזיקאי ל: ' || v_status_label;
      INSERT INTO public.core_chat_messages (thread_id, sender_id, body)
      VALUES (v_thread_id, v_pro_user, v_body);
      UPDATE public.core_chat_threads
        SET last_message_at = now(), last_message_preview = LEFT(v_body, 200),
            unread_a = CASE WHEN user_a = v_inquiry.sender_id THEN unread_a + 1 ELSE unread_a END,
            unread_b = CASE WHEN user_b = v_inquiry.sender_id THEN unread_b + 1 ELSE unread_b END,
            updated_at = now()
        WHERE id = v_thread_id;
    END IF;
  END IF;

  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (v_caller, 'pro', 'crm_status_change', 'music_pro_inquiry', p_inquiry_id::text,
    jsonb_build_object('new_status', p_new_status, 'deal_id', v_deal_id, 'reason', 'inquiry_status_update'));

  RETURN jsonb_build_object('ok', true, 'inquiry_status', p_new_status,
    'deal_id', v_deal_id, 'deal_status', v_deal_status, 'thread_id', v_thread_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_booking_points(
  p_inquiry_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inquiry RECORD;
  v_pro_user uuid;
  v_pro_name text;
  v_awarded integer := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_inquiry FROM public.music_pro_inquiries WHERE id = p_inquiry_id;
  IF v_inquiry IS NULL THEN RAISE EXCEPTION 'Inquiry not found'; END IF;
  SELECT user_id, display_name INTO v_pro_user, v_pro_name FROM public.music_pros WHERE id = v_inquiry.pro_id;
  IF v_pro_user IS DISTINCT FROM v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Only the pro or admin can award booking points';
  END IF;
  IF v_inquiry.status <> 'completed' THEN
    RAISE EXCEPTION 'Inquiry is not completed';
  END IF;
  IF v_inquiry.sender_id IS NULL THEN RETURN 0; END IF;

  v_awarded := public.award_points_for_event(
    v_inquiry.sender_id, 'booking_closed', 'music_pro_inquiry', p_inquiry_id::text,
    'Booking completed with ' || COALESCE(v_pro_name, 'pro')
  );
  RETURN v_awarded;
END;
$$;

-- Backward-compat wrapper: keep old combined function, delegating to the two new atomic ones
CREATE OR REPLACE FUNCTION public.update_pro_inquiry_and_crm_status(
  p_inquiry_id uuid,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_awarded integer := 0;
BEGIN
  v_result := public.update_crm_status(p_inquiry_id, p_new_status);
  IF p_new_status = 'completed' THEN
    BEGIN
      v_awarded := public.award_booking_points(p_inquiry_id);
    EXCEPTION WHEN OTHERS THEN v_awarded := 0; END;
  END IF;
  RETURN v_result || jsonb_build_object('points_awarded', v_awarded);
END;
$$;

-- 4. Reconciliation procedure (drift fix from ledger truth)
CREATE OR REPLACE FUNCTION public.reconcile_points_balance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_corrected integer := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT l.user_id,
           COALESCE(SUM(l.points), 0)::int AS ledger_total,
           COALESCE(up.total_points, 0)    AS current_total
      FROM public.points_ledger l
      LEFT JOIN public.user_points up ON up.user_id = l.user_id
     GROUP BY l.user_id, up.total_points
    HAVING COALESCE(SUM(l.points),0)::int <> COALESCE(up.total_points, 0)
  LOOP
    INSERT INTO public.user_points (user_id, total_points, updated_at)
    VALUES (r.user_id, r.ledger_total, now())
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = EXCLUDED.total_points, updated_at = now();

    INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
    VALUES (r.user_id, 'system', 'points_reconciled', 'user_points', r.user_id::text,
      jsonb_build_object('from', r.current_total, 'to', r.ledger_total,
        'delta', r.ledger_total - r.current_total, 'reason', 'daily_reconcile'));
    v_corrected := v_corrected + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'corrected', v_corrected, 'ran_at', now());
END;
$$;

-- 5. Schedule daily reconciliation via pg_cron (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('reconcile-points-balance')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-points-balance');
    PERFORM cron.schedule(
      'reconcile-points-balance',
      '10 3 * * *',
      $cron$ SELECT public.reconcile_points_balance(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Seed reasonable daily limits on engagement rules (idempotent)
UPDATE public.points_rules SET daily_limit = 1   WHERE event_key = 'daily_login'    AND daily_limit IS NULL;
UPDATE public.points_rules SET daily_limit = 20  WHERE event_key = 'forum_post'     AND daily_limit IS NULL;
UPDATE public.points_rules SET daily_limit = 50  WHERE event_key = 'forum_like'     AND daily_limit IS NULL;
UPDATE public.points_rules SET daily_limit = 10  WHERE event_key = 'forum_solution' AND daily_limit IS NULL;
