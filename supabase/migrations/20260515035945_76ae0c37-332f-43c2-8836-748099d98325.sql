
ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS solved_post_id uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-attachments', 'forum-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "forum-attachments public read" ON storage.objects;
CREATE POLICY "forum-attachments public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-attachments');

DROP POLICY IF EXISTS "forum-attachments authed insert" ON storage.objects;
CREATE POLICY "forum-attachments authed insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "forum-attachments owner delete" ON storage.objects;
CREATE POLICY "forum-attachments owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

INSERT INTO public.points_rules (event_key, points, enabled, label)
VALUES
  ('forum_topic_create',     10, true, 'פתיחת דיון בפורום'),
  ('forum_post_create',       3, true, 'תגובה בפורום'),
  ('forum_received_upvote',   2, true, 'קיבלת לייק על הודעה'),
  ('forum_solution_marked',  20, true, 'התשובה שלך סומנה כפתרון')
ON CONFLICT (event_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.points_on_forum_post_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_op THEN
    PERFORM public.award_points_for_event(NEW.author_id, 'forum_topic_create', 'forum_topic', NEW.topic_id::text);
  ELSE
    PERFORM public.award_points_for_event(NEW.author_id, 'forum_post_create', 'forum_post', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_points_on_forum_post ON public.forum_posts;
CREATE TRIGGER trg_points_on_forum_post
AFTER INSERT ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.points_on_forum_post_insert();

CREATE OR REPLACE FUNCTION public.points_on_forum_upvote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  IF NEW.value = 1 THEN
    SELECT author_id INTO v_author FROM public.forum_posts WHERE id = NEW.post_id;
    IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
      PERFORM public.award_points_for_event(v_author, 'forum_received_upvote', 'forum_post', NEW.post_id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_points_on_forum_upvote ON public.forum_post_votes;
CREATE TRIGGER trg_points_on_forum_upvote
AFTER INSERT ON public.forum_post_votes
FOR EACH ROW EXECUTE FUNCTION public.points_on_forum_upvote();

CREATE OR REPLACE FUNCTION public.forum_notify_subscribers_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_topic_title text;
  v_topic_slug text;
  v_actor_name text;
BEGIN
  IF NEW.is_op THEN RETURN NEW; END IF;
  SELECT title, slug INTO v_topic_title, v_topic_slug FROM public.forum_topics WHERE id = NEW.topic_id;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  SELECT s.user_id, 'forum_reply',
    COALESCE(v_actor_name,'משתמש') || ' הגיב באשכול שאתה עוקב אחריו',
    LEFT(NEW.body_md, 120),
    '/forum/topic/' || v_topic_slug,
    NEW.author_id,
    jsonb_build_object('topic_id', NEW.topic_id, 'post_id', NEW.id, 'topic_title', v_topic_title)
  FROM public.forum_subscriptions s
  WHERE s.target_type = 'topic'
    AND s.target_id   = NEW.topic_id
    AND s.user_id    <> NEW.author_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_forum_notify_subscribers ON public.forum_posts;
CREATE TRIGGER trg_forum_notify_subscribers
AFTER INSERT ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.forum_notify_subscribers_on_reply();
