-- 1. Shorts approval settings (global + per-user trust)
CREATE TABLE IF NOT EXISTS public.shorts_settings (
  id integer PRIMARY KEY DEFAULT 1,
  auto_approve_all boolean NOT NULL DEFAULT false,
  require_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shorts_settings_singleton CHECK (id = 1)
);
INSERT INTO public.shorts_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.shorts_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read shorts settings" ON public.shorts_settings FOR SELECT USING (true);
CREATE POLICY "admins manage shorts settings" ON public.shorts_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Trusted shorts uploaders (auto-approve)
CREATE TABLE IF NOT EXISTS public.shorts_trusted_uploaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  granted_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shorts_trusted_uploaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read trusted uploaders" ON public.shorts_trusted_uploaders FOR SELECT USING (true);
CREATE POLICY "admins manage trusted uploaders" ON public.shorts_trusted_uploaders FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Ensure shorts_videos has needed columns (status workflow + admin notes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shorts_videos' AND column_name='admin_notes') THEN
    ALTER TABLE public.shorts_videos ADD COLUMN admin_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shorts_videos' AND column_name='reviewed_by') THEN
    ALTER TABLE public.shorts_videos ADD COLUMN reviewed_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shorts_videos' AND column_name='reviewed_at') THEN
    ALTER TABLE public.shorts_videos ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

-- 4. Auto-approve trigger for shorts uploads
CREATE OR REPLACE FUNCTION public.shorts_auto_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  is_trusted boolean := false;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending','active','rejected','scheduled') THEN
    NEW.status := 'pending';
  END IF;
  SELECT * INTO s FROM public.shorts_settings WHERE id = 1;
  SELECT EXISTS(SELECT 1 FROM public.shorts_trusted_uploaders WHERE user_id = NEW.uploader_id) INTO is_trusted;
  IF (s.auto_approve_all OR is_trusted OR public.has_role(NEW.uploader_id,'admin')) AND NEW.status = 'pending' THEN
    NEW.status := 'active';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS shorts_auto_approve_trg ON public.shorts_videos;
CREATE TRIGGER shorts_auto_approve_trg BEFORE INSERT ON public.shorts_videos
  FOR EACH ROW EXECUTE FUNCTION public.shorts_auto_approve();

-- 5. Universal follows table (any target type)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user','marketplace_seller','music_pro','shorts_creator')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, target_type, target_id)
);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "users follow" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "users unfollow" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_target ON public.user_follows(target_type, target_id);