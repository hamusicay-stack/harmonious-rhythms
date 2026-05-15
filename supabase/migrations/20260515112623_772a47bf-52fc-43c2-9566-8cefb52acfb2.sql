
-- 1. Extend profiles with global status + public toggle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_global_status') THEN
    CREATE TYPE public.profile_global_status AS ENUM ('active','suspended','banned','pending');
  END IF;
END$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_status public.profile_global_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_public_profile_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_global_status ON public.profiles(global_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public_profile_active);

-- 2. Sync event log
CREATE TABLE IF NOT EXISTS public.profile_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_events_user ON public.profile_sync_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_sync_events_type ON public.profile_sync_events(event_type);

ALTER TABLE public.profile_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their sync events" ON public.profile_sync_events;
CREATE POLICY "Owners can read their sync events"
  ON public.profile_sync_events FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- No client INSERT/UPDATE/DELETE — only the trigger (security definer) writes.

-- 3. Trigger: log + pg_notify on relevant profile changes
CREATE OR REPLACE FUNCTION public.profiles_emit_sync_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
  payload jsonb;
BEGIN
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    changed := changed || jsonb_build_object('avatar_url', true);
  END IF;
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    changed := changed || jsonb_build_object('display_name', true);
  END IF;
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    changed := changed || jsonb_build_object('bio', true);
  END IF;
  IF NEW.global_status IS DISTINCT FROM OLD.global_status THEN
    changed := changed || jsonb_build_object('global_status', true);
  END IF;
  IF NEW.is_public_profile_active IS DISTINCT FROM OLD.is_public_profile_active THEN
    changed := changed || jsonb_build_object('is_public_profile_active', true);
  END IF;

  IF changed = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profile_sync_events (user_id, event_type, changed_fields, old_values, new_values)
  VALUES (
    NEW.id,
    'profile_updated',
    changed,
    jsonb_build_object(
      'avatar_url', OLD.avatar_url,
      'display_name', OLD.display_name,
      'bio', OLD.bio,
      'global_status', OLD.global_status,
      'is_public_profile_active', OLD.is_public_profile_active
    ),
    jsonb_build_object(
      'avatar_url', NEW.avatar_url,
      'display_name', NEW.display_name,
      'bio', NEW.bio,
      'global_status', NEW.global_status,
      'is_public_profile_active', NEW.is_public_profile_active
    )
  );

  payload := jsonb_build_object(
    'user_id', NEW.id,
    'changed', changed,
    'at', extract(epoch from now())
  );
  PERFORM pg_notify('profile_sync', payload::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_emit_sync_event ON public.profiles;
CREATE TRIGGER trg_profiles_emit_sync_event
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_emit_sync_event();

-- 4. Refresh RLS on profiles: public read of public profiles, owner-only update
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (
    is_public_profile_active = true
    OR auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Realtime: ensure profile_sync_events streams to clients (optional but useful)
ALTER TABLE public.profile_sync_events REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_sync_events';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;
