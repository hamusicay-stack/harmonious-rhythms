
CREATE OR REPLACE FUNCTION public.handle_new_pro_inquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_pro_user_id uuid;
  v_pro_name    text;
  v_lead_id     uuid;
  v_pos         int;
  v_title       text;
  v_thread_id   uuid;
  v_user_a      uuid;
  v_user_b      uuid;
  v_msg_body    text;
  v_event_label text;
  v_date_label  text;
  v_budget_label text;
BEGIN
  -- Resolve customer profile
  v_customer_id := NEW.sender_id;
  IF v_customer_id IS NULL AND NEW.contact_email IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.profiles
      WHERE lower(email) = lower(NEW.contact_email) LIMIT 1;
  END IF;
  IF v_customer_id IS NULL AND NEW.contact_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.profiles
      WHERE phone = NEW.contact_phone LIMIT 1;
  END IF;

  SELECT display_name, user_id INTO v_pro_name, v_pro_user_id
    FROM public.music_pros WHERE id = NEW.pro_id;

  -- =========================================================
  -- CRM: Lead + Deal
  -- =========================================================
  INSERT INTO public.leads (name, email, phone, source, status, notes, customer_id)
  VALUES (
    NEW.sender_name,
    NEW.contact_email,
    NEW.contact_phone,
    'music_pro_inquiry'::lead_source,
    'new'::lead_status,
    'פנייה אוטומטית מטופס "' || COALESCE(v_pro_name, 'מוזיקאי') || '". סוג אירוע: ' ||
      COALESCE(NEW.event_type,'—') ||
      CASE WHEN NEW.message IS NOT NULL THEN E'\n\n' || NEW.message ELSE '' END,
    v_customer_id
  )
  RETURNING id INTO v_lead_id;

  SELECT COALESCE(MAX(position), -1) + 1 INTO v_pos
    FROM public.deals WHERE status = 'new_lead';

  v_title := 'פנייה למוזיקאי: ' || COALESCE(v_pro_name, '—') ||
             ' — ' || COALESCE(NEW.event_type, 'אירוע');

  INSERT INTO public.deals (
    customer_name, customer_id, value, status, position, notes,
    source_type, source_ref_id, lead_id, title
  )
  VALUES (
    NEW.sender_name,
    v_customer_id,
    COALESCE(NEW.budget, 0),
    'new_lead',
    v_pos,
    'מקור: פנייה מאינדקס המוזיקאים (' || COALESCE(v_pro_name,'') || ')',
    'music_pro_inquiry',
    NEW.id,
    v_lead_id,
    v_title
  );

  -- =========================================================
  -- CHAT: core_chat_threads + initial system message
  -- Only when both parties are real authenticated users.
  -- =========================================================
  IF v_customer_id IS NOT NULL
     AND v_pro_user_id IS NOT NULL
     AND v_customer_id <> v_pro_user_id THEN

    -- Canonical ordering so (user_a, user_b) is stable
    IF v_customer_id < v_pro_user_id THEN
      v_user_a := v_customer_id;
      v_user_b := v_pro_user_id;
    ELSE
      v_user_a := v_pro_user_id;
      v_user_b := v_customer_id;
    END IF;

    -- Look for an existing PRO thread between the two
    SELECT id INTO v_thread_id
      FROM public.core_chat_threads
     WHERE context_type = 'PRO'
       AND user_a = v_user_a
       AND user_b = v_user_b
     LIMIT 1;

    IF v_thread_id IS NULL THEN
      INSERT INTO public.core_chat_threads (
        context_type, context_id, user_a, user_b,
        last_message_at, last_message_preview, unread_a, unread_b
      ) VALUES (
        'PRO', NEW.pro_id, v_user_a, v_user_b,
        now(), NULL, 0, 0
      )
      RETURNING id INTO v_thread_id;
    END IF;

    -- Build greeting message in Hebrew
    v_event_label  := COALESCE(NEW.event_type, '—');
    v_date_label   := COALESCE(to_char(NEW.event_date, 'DD/MM/YYYY'), 'גמיש');
    v_budget_label := CASE
      WHEN NEW.budget IS NOT NULL
        THEN to_char(NEW.budget, 'FM999,999,990') || ' ש״ח'
      ELSE 'לא צוין'
    END;

    v_msg_body :=
      'שלום! שלחתי לך בקשת הצעת מחיר רשמית דרך האתר לאירוע שלי.' || E'\n\n' ||
      '🗓 סוג אירוע: ' || v_event_label || E'\n' ||
      '📅 תאריך: ' || v_date_label || E'\n' ||
      '💰 תקציב מוערך: ' || v_budget_label ||
      CASE WHEN NEW.location IS NOT NULL AND length(trim(NEW.location)) > 0
           THEN E'\n📍 מיקום: ' || NEW.location ELSE '' END ||
      CASE WHEN NEW.message IS NOT NULL AND length(trim(NEW.message)) > 0
           THEN E'\n\n' || NEW.message ELSE '' END ||
      E'\n\nנשמח להמשיך את ההתכתבות ולסגור פרטים כאן בצ׳אט!';

    INSERT INTO public.core_chat_messages (thread_id, sender_id, body)
    VALUES (v_thread_id, v_customer_id, v_msg_body);

    -- Update thread preview + bump unread for the recipient (the pro)
    UPDATE public.core_chat_threads
      SET last_message_at = now(),
          last_message_preview = LEFT(v_msg_body, 200),
          unread_a = CASE WHEN user_a = v_pro_user_id THEN unread_a + 1 ELSE unread_a END,
          unread_b = CASE WHEN user_b = v_pro_user_id THEN unread_b + 1 ELSE unread_b END,
          updated_at = now()
      WHERE id = v_thread_id;

    -- Notify the pro about the new chat
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (
      v_pro_user_id,
      'chat_message',
      COALESCE(NEW.sender_name, 'משתמש') || ' פתח/ה שיחה חדשה',
      LEFT(v_msg_body, 120),
      '/profile?tab=messages&thread=core:' || v_thread_id::text,
      v_customer_id,
      jsonb_build_object(
        'thread_id', v_thread_id,
        'source', 'core',
        'context_type', 'PRO',
        'pro_id', NEW.pro_id,
        'inquiry_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END $function$;

-- Ensure core_chat_threads + core_chat_messages publish realtime events
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.core_chat_threads;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.core_chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
