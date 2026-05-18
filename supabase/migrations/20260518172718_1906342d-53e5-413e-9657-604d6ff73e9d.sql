CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  t RECORD;
  recipient UUID;
  sender_name TEXT;
  listing_title TEXT;
BEGIN
  SELECT * INTO t FROM public.marketplace_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.buyer_id THEN
    recipient := t.seller_id;
    UPDATE public.marketplace_chat_threads
      SET last_message_at = NEW.created_at,
          last_message_preview = LEFT(NEW.body, 200),
          seller_unread = seller_unread + 1
      WHERE id = t.id;
  ELSE
    recipient := t.buyer_id;
    UPDATE public.marketplace_chat_threads
      SET last_message_at = NEW.created_at,
          last_message_preview = LEFT(NEW.body, 200),
          buyer_unread = buyer_unread + 1
      WHERE id = t.id;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT title INTO listing_title FROM public.marketplace_listings WHERE id = t.listing_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  VALUES (recipient, 'chat_message',
    COALESCE(sender_name,'משתמש') || ' שלח/ה הודעה',
    LEFT(NEW.body, 120),
    '/profile?tab=messages',
    NEW.sender_id,
    jsonb_build_object('thread_id', t.id, 'listing_id', t.listing_id, 'listing_title', listing_title, 'source','marketplace'));

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.handle_pro_chat_message_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  t RECORD;
  recipient UUID;
  sender_name TEXT;
  pro_display TEXT;
BEGIN
  SELECT * INTO t FROM public.pro_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.sender_id THEN
    recipient := t.pro_user_id;
    UPDATE public.pro_chat_threads SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.body, 200), pro_unread = pro_unread + 1
      WHERE id = t.id;
  ELSIF NEW.sender_id = t.pro_user_id THEN
    recipient := t.sender_id;
    UPDATE public.pro_chat_threads SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.body, 200), sender_unread = sender_unread + 1
      WHERE id = t.id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT display_name INTO pro_display FROM public.music_pros WHERE id = t.pro_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  VALUES (recipient, 'pro_chat_message',
    COALESCE(sender_name,'משתמש') || ' שלח/ה הודעה',
    LEFT(NEW.body, 120),
    '/profile?tab=messages',
    NEW.sender_id,
    jsonb_build_object('thread_id', t.id, 'pro_id', t.pro_id, 'pro_name', pro_display, 'source','pro'));
  RETURN NEW;
END $function$;