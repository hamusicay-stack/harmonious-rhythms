-- Board-level posting permissions for forum
ALTER TABLE public.forum_boards
  ADD COLUMN IF NOT EXISTS post_min_role text NOT NULL DEFAULT 'user'
    CHECK (post_min_role IN ('user', 'moderator', 'admin'));

COMMENT ON COLUMN public.forum_boards.post_min_role IS
  'Minimum role required to create new topics in this board. user=everyone, moderator=mods+admins, admin=admins only. Reading is always allowed for authenticated users.';

-- Enforce ACL inside createTopic via a security-definer guard the server fn can call.
-- We do it in the application layer (server fn) to keep RLS simple; this trigger is a backstop.
CREATE OR REPLACE FUNCTION public.enforce_forum_board_post_acl()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required text;
BEGIN
  SELECT post_min_role INTO required FROM public.forum_boards WHERE id = NEW.board_id;
  IF required IS NULL OR required = 'user' THEN
    RETURN NEW;
  END IF;
  IF required = 'admin' AND NOT public.has_role(NEW.author_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can post new topics in this board';
  END IF;
  IF required = 'moderator'
     AND NOT public.has_role(NEW.author_id, 'admin'::app_role)
     AND NOT public.has_role(NEW.author_id, 'moderator'::app_role) THEN
    RAISE EXCEPTION 'Only moderators or admins can post new topics in this board';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_topics_board_acl ON public.forum_topics;
CREATE TRIGGER forum_topics_board_acl
  BEFORE INSERT ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_board_post_acl();