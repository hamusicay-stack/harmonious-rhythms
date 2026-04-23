
-- 1. Re-create trigger functions with locked search_path
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  owner_id UUID;
  item_label TEXT;
  link_path TEXT;
BEGIN
  IF NEW.item_type = 'shorts_video' THEN
    SELECT creator_id INTO owner_id FROM public.shorts_videos WHERE id = NEW.item_id;
    item_label := 'אהבו את השורט שלך';
    link_path := '/shorts';
  ELSIF NEW.item_type = 'marketplace_listing' THEN
    SELECT seller_id INTO owner_id FROM public.marketplace_listings WHERE id = NEW.item_id;
    item_label := 'אהבו את המודעה שלך';
    link_path := '/marketplace/' || NEW.item_id;
  ELSIF NEW.item_type = 'music_pro' THEN
    SELECT user_id INTO owner_id FROM public.music_pros WHERE id = NEW.item_id;
    item_label := 'אהבו את הפרופיל המקצועי שלך';
    link_path := '/pros/' || NEW.item_id;
  ELSE
    RETURN NEW;
  END IF;

  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, link, actor_id, metadata)
    VALUES (owner_id, 'like', item_label, link_path, NEW.user_id,
      jsonb_build_object('item_type', NEW.item_type, 'item_id', NEW.item_id));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  target_user UUID;
  link_path TEXT;
BEGIN
  IF NEW.target_type = 'user' OR NEW.target_type = 'shorts_creator' THEN
    target_user := NEW.target_id;
    link_path := '/profile';
  ELSIF NEW.target_type = 'music_pro' THEN
    SELECT user_id INTO target_user FROM public.music_pros WHERE id = NEW.target_id;
    link_path := '/pros/' || NEW.target_id;
  ELSIF NEW.target_type = 'marketplace_seller' THEN
    target_user := NEW.target_id;
    link_path := '/seller/' || NEW.target_id;
  ELSE
    RETURN NEW;
  END IF;

  IF target_user IS NOT NULL AND target_user <> NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, type, title, link, actor_id, metadata)
    VALUES (target_user, 'follow', 'יש לך עוקב חדש', link_path, NEW.follower_id,
      jsonb_build_object('target_type', NEW.target_type, 'target_id', NEW.target_id));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_inquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pro_owner UUID;
  pro_name TEXT;
BEGIN
  SELECT user_id, display_name INTO pro_owner, pro_name FROM public.music_pros WHERE id = NEW.pro_id;
  IF pro_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (pro_owner, 'inquiry',
      'בקשה חדשה מ-' || NEW.sender_name,
      COALESCE(NEW.event_type, '') || ' · ' || NEW.contact_phone,
      '/pros/' || NEW.pro_id,
      NEW.sender_id,
      jsonb_build_object('inquiry_id', NEW.id, 'phone', NEW.contact_phone, 'event_date', NEW.event_date));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_short_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  creator UUID;
BEGIN
  SELECT creator_id INTO creator FROM public.shorts_videos WHERE id = NEW.video_id;
  IF creator IS NOT NULL AND creator <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (creator, 'comment', 'תגובה חדשה על השורט שלך', LEFT(NEW.body, 120), '/shorts', NEW.user_id,
      jsonb_build_object('video_id', NEW.video_id));
  END IF;
  RETURN NEW;
END $$;

-- 2. Lock down direct INSERT — only SECURITY DEFINER triggers should write
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "No direct client inserts" ON public.notifications
  FOR INSERT WITH CHECK (false);

-- 3. Revoke direct write privileges from client roles (RLS already blocks, but defense in depth)
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon;
REVOKE INSERT ON public.notifications FROM authenticated;
-- authenticated still needs UPDATE (mark read) and DELETE (remove own) — RLS scopes to own rows
GRANT UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.notifications TO authenticated, anon;
