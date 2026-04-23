
-- Fix shorts_videos status check constraint to allow pending/rejected
ALTER TABLE public.shorts_videos DROP CONSTRAINT IF EXISTS shorts_videos_status_check;
ALTER TABLE public.shorts_videos ADD CONSTRAINT shorts_videos_status_check
  CHECK (status = ANY (ARRAY['draft','pending','scheduled','active','rejected','archived']));

-- Notifications table — central inbox for users
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- like, follow, comment, inquiry, system
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  actor_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- System inserts via SECURITY DEFINER triggers
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Trigger: on like → notify item owner
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.user_likes;
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.user_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: on follow → notify target
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.user_follows;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger: on music pro inquiry → notify pro owner
CREATE OR REPLACE FUNCTION public.notify_on_inquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_notify_on_inquiry ON public.music_pro_inquiries;
CREATE TRIGGER trg_notify_on_inquiry AFTER INSERT ON public.music_pro_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_inquiry();

-- Trigger: on shorts comment → notify video creator
CREATE OR REPLACE FUNCTION public.notify_on_short_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_notify_on_short_comment ON public.shorts_comments;
CREATE TRIGGER trg_notify_on_short_comment AFTER INSERT ON public.shorts_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_short_comment();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
