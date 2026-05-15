
-- 1) Update forum post trigger to write into public.notifications
CREATE OR REPLACE FUNCTION public.forum_post_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quoted_author uuid;
  v_topic_title text;
  v_topic_slug text;
  m text;
  v_target uuid;
BEGIN
  SELECT title, slug INTO v_topic_title, v_topic_slug FROM public.forum_topics WHERE id = NEW.topic_id;

  -- Quote notification
  IF NEW.quoted_post_id IS NOT NULL THEN
    SELECT author_id INTO v_quoted_author FROM public.forum_posts WHERE id = NEW.quoted_post_id;
    IF v_quoted_author IS NOT NULL AND v_quoted_author <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
      VALUES (v_quoted_author, 'forum_quote', 'ציטטו את ההודעה שלך בפורום',
        LEFT(NEW.body_md, 120),
        '/forum/topic/' || v_topic_slug,
        NEW.author_id,
        jsonb_build_object('topic_id', NEW.topic_id, 'post_id', NEW.id, 'topic_title', v_topic_title));
    END IF;
  END IF;

  -- @mentions
  FOR m IN SELECT DISTINCT (regexp_matches(NEW.body_md, '@([a-zA-Z0-9_\.\-]{2,40})', 'g'))[1]
  LOOP
    SELECT id INTO v_target FROM public.profiles WHERE username = m LIMIT 1;
    IF v_target IS NOT NULL AND v_target <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
      VALUES (v_target, 'forum_mention', 'תייגו אותך בפורום: ' || COALESCE(v_topic_title,''),
        LEFT(NEW.body_md, 120),
        '/forum/topic/' || v_topic_slug,
        NEW.author_id,
        jsonb_build_object('topic_id', NEW.topic_id, 'post_id', NEW.id, 'topic_title', v_topic_title));
    END IF;
  END LOOP;

  RETURN NEW;
END $function$;

-- 2) Update DM trigger to write into public.notifications
CREATE OR REPLACE FUNCTION public.forum_after_dm_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t RECORD;
  recipient uuid;
  sender_name text;
BEGIN
  SELECT * INTO t FROM public.forum_dm_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.user_a THEN
    UPDATE public.forum_dm_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_b = unread_b + 1
     WHERE id = t.id;
    recipient := t.user_b;
  ELSE
    UPDATE public.forum_dm_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_a = unread_a + 1
     WHERE id = t.id;
    recipient := t.user_a;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  VALUES (recipient, 'forum_dm',
    COALESCE(sender_name, 'משתמש') || ' שלח/ה לך הודעה בפורום',
    LEFT(NEW.body, 120),
    '/forum/messages/' || t.id,
    NEW.sender_id,
    jsonb_build_object('thread_id', t.id));

  RETURN NEW;
END $function$;

-- 3) Backfill existing forum_notifications into the unified table (one-time)
INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata, read_at, created_at)
SELECT user_id,
       'forum_' || kind,
       title,
       body,
       link,
       actor_id,
       metadata,
       read_at,
       created_at
FROM public.forum_notifications fn
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = fn.user_id
    AND n.created_at = fn.created_at
    AND n.type LIKE 'forum_%'
);
