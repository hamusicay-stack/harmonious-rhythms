-- Broadcast history log
CREATE TABLE IF NOT EXISTS public.broadcast_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  target_group TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  admin_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcast_history_admin_read" ON public.broadcast_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "broadcast_history_admin_insert" ON public.broadcast_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_broadcast_history_sent_at ON public.broadcast_history (sent_at DESC);

-- Bulk broadcast RPC
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_link TEXT,
  p_target_group TEXT
) RETURNS TABLE(broadcast_id UUID, recipient_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can broadcast notifications';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Message is required';
  END IF;
  IF p_target_group NOT IN ('ALL', 'PROS', 'ADMINS') THEN
    RAISE EXCEPTION 'Invalid target_group';
  END IF;

  WITH targets AS (
    SELECT DISTINCT u.id AS user_id
    FROM auth.users u
    WHERE
      CASE p_target_group
        WHEN 'ALL' THEN
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id
                  AND COALESCE(p.is_banned, false) = false)
        WHEN 'PROS' THEN
          EXISTS (SELECT 1 FROM public.music_pros mp WHERE mp.user_id = u.id)
        WHEN 'ADMINS' THEN
          EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')
      END
  ), inserted AS (
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
    SELECT t.user_id, 'broadcast', p_title, p_message, p_link, v_admin,
      jsonb_build_object('broadcast', true, 'target_group', p_target_group)
    FROM targets t
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM inserted;

  INSERT INTO public.broadcast_history (title, message, link, target_group, recipient_count, admin_id)
  VALUES (p_title, p_message, p_link, p_target_group, v_count, v_admin)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_count;
END;
$$;