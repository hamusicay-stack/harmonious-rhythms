
-- Phase 2: Advanced Tag system for forum
ALTER TABLE public.forum_tags
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.forum_tags(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_staff_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS forum_tags_parent_idx ON public.forum_tags(parent_id);

-- Tighten RLS: only staff can create staff-only tags; only staff can update parent/staff flag
DROP POLICY IF EXISTS "forum_tags_insert_auth" ON public.forum_tags;
CREATE POLICY "forum_tags_insert_auth" ON public.forum_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      is_staff_only = false
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );

-- Trigger: prevent non-staff from flipping is_staff_only or setting parent
CREATE OR REPLACE FUNCTION public.forum_tags_guard_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_staff_only = true OR NEW.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Only staff can create staff-only or child tags';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_staff_only IS DISTINCT FROM OLD.is_staff_only
        OR NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
        RAISE EXCEPTION 'Only staff can change staff/parent fields';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS forum_tags_guard_staff_trg ON public.forum_tags;
CREATE TRIGGER forum_tags_guard_staff_trg
BEFORE INSERT OR UPDATE ON public.forum_tags
FOR EACH ROW EXECUTE FUNCTION public.forum_tags_guard_staff_fields();

-- Enforce 5-tag-per-topic limit + staff-only ACL on topic_tags
CREATE OR REPLACE FUNCTION public.forum_topic_tags_enforce_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
  is_staff_tag boolean;
BEGIN
  SELECT count(*) INTO cnt FROM public.forum_topic_tags WHERE topic_id = NEW.topic_id;
  IF cnt >= 5 THEN
    RAISE EXCEPTION 'A topic may have at most 5 tags';
  END IF;

  SELECT is_staff_only INTO is_staff_tag FROM public.forum_tags WHERE id = NEW.tag_id;
  IF is_staff_tag = true THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
      RAISE EXCEPTION 'Only staff can apply staff-only tags';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS forum_topic_tags_enforce_rules_trg ON public.forum_topic_tags;
CREATE TRIGGER forum_topic_tags_enforce_rules_trg
BEFORE INSERT ON public.forum_topic_tags
FOR EACH ROW EXECUTE FUNCTION public.forum_topic_tags_enforce_rules();
