
INSERT INTO public.points_rules (event_key, points, enabled, label)
VALUES ('forum_solution_accepted', 15, true, 'התשובה שלך סומנה כפתרון בפורום')
ON CONFLICT (event_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.points_on_forum_solution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_author uuid;
BEGIN
  IF NEW.solved_post_id IS NOT NULL
     AND (OLD.solved_post_id IS NULL OR OLD.solved_post_id <> NEW.solved_post_id) THEN
    SELECT author_id INTO v_author FROM public.forum_posts WHERE id = NEW.solved_post_id;
    IF v_author IS NOT NULL THEN
      PERFORM public.award_points_for_event(
        v_author, 'forum_solution_accepted', 'forum_post', NEW.solved_post_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_points_on_forum_solution ON public.forum_topics;
CREATE TRIGGER trg_points_on_forum_solution
AFTER UPDATE OF solved_post_id ON public.forum_topics
FOR EACH ROW EXECUTE FUNCTION public.points_on_forum_solution();
