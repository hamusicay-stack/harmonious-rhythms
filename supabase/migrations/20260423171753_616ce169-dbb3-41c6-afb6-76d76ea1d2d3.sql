
-- 1) Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY,
  notify_follow BOOLEAN NOT NULL DEFAULT true,
  notify_like BOOLEAN NOT NULL DEFAULT true,
  notify_comment BOOLEAN NOT NULL DEFAULT true,
  notify_inquiry BOOLEAN NOT NULL DEFAULT true,
  notify_followed_user_activity BOOLEAN NOT NULL DEFAULT false,
  followed_activity_prompt_seen BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper to read pref with default true (false for activity)
CREATE OR REPLACE FUNCTION public.get_notif_pref(_user_id UUID, _kind TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.notification_preferences WHERE user_id = _user_id;
  IF NOT FOUND THEN
    -- defaults
    IF _kind = 'followed_activity' THEN RETURN false; END IF;
    RETURN true;
  END IF;
  IF _kind = 'follow' THEN RETURN rec.notify_follow; END IF;
  IF _kind = 'like' THEN RETURN rec.notify_like; END IF;
  IF _kind = 'comment' THEN RETURN rec.notify_comment; END IF;
  IF _kind = 'inquiry' THEN RETURN rec.notify_inquiry; END IF;
  IF _kind = 'followed_activity' THEN RETURN rec.notify_followed_user_activity; END IF;
  RETURN true;
END $$;

-- 2) Update existing notify functions to honor preferences
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

  IF target_user IS NOT NULL AND target_user <> NEW.follower_id
     AND public.get_notif_pref(target_user, 'follow') THEN
    INSERT INTO public.notifications (user_id, type, title, link, actor_id, metadata)
    VALUES (target_user, 'follow', 'יש לך עוקב חדש', link_path, NEW.follower_id,
      jsonb_build_object('target_type', NEW.target_type, 'target_id', NEW.target_id));
  END IF;
  RETURN NEW;
END $$;

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

  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id
     AND public.get_notif_pref(owner_id, 'like') THEN
    INSERT INTO public.notifications (user_id, type, title, link, actor_id, metadata)
    VALUES (owner_id, 'like', item_label, link_path, NEW.user_id,
      jsonb_build_object('item_type', NEW.item_type, 'item_id', NEW.item_id));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_short_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  creator UUID;
BEGIN
  SELECT creator_id INTO creator FROM public.shorts_videos WHERE id = NEW.video_id;
  IF creator IS NOT NULL AND creator <> NEW.user_id
     AND public.get_notif_pref(creator, 'comment') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (creator, 'comment', 'תגובה חדשה על השורט שלך', LEFT(NEW.body, 120), '/shorts', NEW.user_id,
      jsonb_build_object('video_id', NEW.video_id));
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
  IF pro_owner IS NOT NULL AND public.get_notif_pref(pro_owner, 'inquiry') THEN
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

-- 3) Notify followers on new shorts video (when active)
CREATE OR REPLACE FUNCTION public.notify_followers_on_short()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;

  SELECT display_name INTO creator_name FROM public.profiles WHERE id = NEW.creator_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  SELECT DISTINCT f.follower_id, 'new_short',
    COALESCE(creator_name, 'יוצר') || ' העלה שורט חדש',
    LEFT(COALESCE(NEW.title, ''), 120),
    '/shorts',
    NEW.creator_id,
    jsonb_build_object('video_id', NEW.id, 'creator_id', NEW.creator_id)
  FROM public.user_follows f
  WHERE f.target_id = NEW.creator_id
    AND f.target_type IN ('user','shorts_creator')
    AND f.follower_id <> NEW.creator_id
    AND public.get_notif_pref(f.follower_id, 'followed_activity');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_short ON public.shorts_videos;
CREATE TRIGGER trg_notify_followers_on_short
  AFTER INSERT OR UPDATE OF status ON public.shorts_videos
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_short();

-- 4) Notify followers on new marketplace listing (when approved)
CREATE OR REPLACE FUNCTION public.notify_followers_on_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  seller_name TEXT;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT display_name INTO seller_name FROM public.profiles WHERE id = NEW.seller_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  SELECT DISTINCT f.follower_id, 'new_listing',
    COALESCE(seller_name, 'משתמש') || ' פרסם מודעה חדשה',
    LEFT(COALESCE(NEW.title, ''), 120),
    '/marketplace/' || NEW.id,
    NEW.seller_id,
    jsonb_build_object('listing_id', NEW.id, 'seller_id', NEW.seller_id)
  FROM public.user_follows f
  WHERE f.target_id = NEW.seller_id
    AND f.target_type IN ('user','marketplace_seller')
    AND f.follower_id <> NEW.seller_id
    AND public.get_notif_pref(f.follower_id, 'followed_activity');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_listing ON public.marketplace_listings;
CREATE TRIGGER trg_notify_followers_on_listing
  AFTER INSERT OR UPDATE OF status ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_listing();
