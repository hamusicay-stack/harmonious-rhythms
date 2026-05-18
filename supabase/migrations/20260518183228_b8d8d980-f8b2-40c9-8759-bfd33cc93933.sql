-- Restrictive RLS policies blocking banned users from writing to user-generated tables
-- Restrictive policies AND with permissive ones, so banned users cannot bypass.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'marketplace_listings',
    'marketplace_chat_threads',
    'marketplace_chat_messages',
    'pro_chat_threads',
    'pro_chat_messages',
    'core_chat_threads',
    'core_chat_messages',
    'forum_topics',
    'forum_posts',
    'shorts_videos',
    'shorts_comments',
    'music_pros',
    'music_pro_inquiries',
    'shop_orders',
    'item_likes',
    'user_follows',
    'marketplace_listing_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "block_banned_users_write" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "block_banned_users_write" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_user_banned(auth.uid())) WITH CHECK (NOT public.is_user_banned(auth.uid()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- When a user gets banned, revoke their active sessions so they're logged out immediately
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.is_banned = true AND COALESCE(OLD.is_banned, false) = false THEN
    DELETE FROM auth.sessions WHERE user_id = NEW.id;
    DELETE FROM auth.refresh_tokens WHERE user_id::text = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_sessions_on_ban ON public.profiles;
CREATE TRIGGER trg_revoke_sessions_on_ban
AFTER UPDATE OF is_banned ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.revoke_sessions_on_ban();