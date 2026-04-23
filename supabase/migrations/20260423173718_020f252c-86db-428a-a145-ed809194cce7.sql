
-- 1. Fix the broken comment notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_short_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  creator UUID;
BEGIN
  SELECT creator_id INTO creator FROM public.shorts_videos WHERE id = NEW.video_id;
  IF creator IS NOT NULL AND creator <> NEW.author_id
     AND public.get_notif_pref(creator, 'comment') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    VALUES (creator, 'comment', 'תגובה חדשה על השורט שלך', LEFT(NEW.content, 120), '/shorts', NEW.author_id,
      jsonb_build_object('video_id', NEW.video_id));
  END IF;
  RETURN NEW;
END $function$;

-- 2. Add banner_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- 3. Add scheduled_for to shorts_videos (if missing) and update auto_approve
ALTER TABLE public.shorts_videos ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;

CREATE OR REPLACE FUNCTION public.shorts_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  is_trusted boolean := false;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending','active','rejected','scheduled') THEN
    NEW.status := 'pending';
  END IF;
  -- Honor scheduled status
  IF NEW.scheduled_for IS NOT NULL AND NEW.scheduled_for > now() THEN
    NEW.status := 'scheduled';
    RETURN NEW;
  END IF;
  SELECT * INTO s FROM public.shorts_settings WHERE id = 1;
  SELECT EXISTS(SELECT 1 FROM public.shorts_trusted_uploaders WHERE user_id = NEW.creator_id) INTO is_trusted;
  IF (s.auto_approve_all OR is_trusted OR public.has_role(NEW.creator_id,'admin')) AND NEW.status = 'pending' THEN
    NEW.status := 'active';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $function$;

-- 4. Function to publish scheduled shorts (called by cron)
CREATE OR REPLACE FUNCTION public.publish_scheduled_shorts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cnt integer;
BEGIN
  WITH upd AS (
    UPDATE public.shorts_videos
    SET status = 'active', reviewed_at = now()
    WHERE status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO cnt FROM upd;
  RETURN cnt;
END $function$;

-- 5. Storage bucket for banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-banners', 'profile-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-banners
DO $$ BEGIN
  CREATE POLICY "banners public read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users upload own banner" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users update own banner" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users delete own banner" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Schedule cron to publish scheduled shorts every minute
DO $$ BEGIN
  PERFORM cron.unschedule('publish-scheduled-shorts');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'publish-scheduled-shorts',
  '* * * * *',
  $$ SELECT public.publish_scheduled_shorts(); $$
);
