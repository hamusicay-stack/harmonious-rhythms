
ALTER TABLE public.customer_tags ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_customer_tags_category ON public.customer_tags(category);

INSERT INTO public.points_rules (event_key, label, points, enabled)
VALUES ('booking_closed', 'סגירת עסקה (booking)', 500, true)
ON CONFLICT (event_key) DO UPDATE SET points = EXCLUDED.points, enabled = true;

CREATE OR REPLACE FUNCTION public.assign_user_tag(
  _user_id uuid, _tag text, _category text DEFAULT NULL, _color text DEFAULT 'default'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_id uuid;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign tags';
  END IF;
  IF _tag IS NULL OR length(trim(_tag)) = 0 THEN
    RAISE EXCEPTION 'Tag is required';
  END IF;
  INSERT INTO public.customer_tags (customer_id, tag, category, color, created_by)
  VALUES (_user_id, trim(_tag), _category, COALESCE(_color, 'default'), v_admin)
  ON CONFLICT (customer_id, tag) DO UPDATE
    SET category = EXCLUDED.category, color = EXCLUDED.color
  RETURNING id INTO v_id;
  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (v_admin, 'admin', 'user_tag_assigned', 'user', _user_id::text,
    jsonb_build_object('tag', _tag, 'category', _category, 'color', _color));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.remove_user_tag(_user_id uuid, _tag text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can remove tags';
  END IF;
  DELETE FROM public.customer_tags WHERE customer_id = _user_id AND tag = _tag;
  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (v_admin, 'admin', 'user_tag_removed', 'user', _user_id::text,
    jsonb_build_object('tag', _tag));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_wiki_approval(
  _article_id uuid, _status text, _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate wiki articles';
  END IF;
  IF _status NOT IN ('approved','pending_review','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.wiki_articles
     SET approval_status = _status,
         is_verified = (_status = 'approved'),
         last_edited_by = v_admin,
         updated_at = now()
   WHERE id = _article_id;
  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (v_admin, 'admin', 'wiki_approval_' || _status, 'wiki_article', _article_id::text,
    jsonb_build_object('reason', _reason));
END $$;

CREATE OR REPLACE FUNCTION public.update_pro_inquiry_and_crm_status(p_inquiry_id uuid, p_new_status text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  v_awarded int := 0;
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

  IF p_new_status = 'completed' AND v_inquiry.sender_id IS NOT NULL THEN
    v_awarded := public.award_points_for_event(
      v_inquiry.sender_id, 'booking_closed', 'music_pro_inquiry', p_inquiry_id::text,
      'Booking completed with ' || COALESCE(v_pro_name, 'pro')
    );
    INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
    VALUES (v_caller, 'pro', 'booking_closed', 'music_pro_inquiry', p_inquiry_id::text,
      jsonb_build_object('sender_id', v_inquiry.sender_id, 'points_awarded', v_awarded));
  END IF;

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

  RETURN jsonb_build_object('ok', true, 'inquiry_status', p_new_status,
    'deal_id', v_deal_id, 'deal_status', v_deal_status,
    'thread_id', v_thread_id, 'points_awarded', v_awarded);
END $function$;
