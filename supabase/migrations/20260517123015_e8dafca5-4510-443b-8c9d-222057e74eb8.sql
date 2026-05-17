
-- 1) Authorization helper: enrolled OR preview lesson OR VIP tier OR admin
CREATE OR REPLACE FUNCTION public.user_can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course uuid;
  v_preview boolean;
BEGIN
  SELECT course_id, is_preview INTO v_course, v_preview
  FROM public.academy_lessons WHERE id = _lesson_id;
  IF v_course IS NULL THEN RETURN false; END IF;

  -- public preview lesson
  IF v_preview THEN RETURN true; END IF;
  IF v_uid IS NULL THEN RETURN false; END IF;

  -- admin
  IF public.has_role(v_uid, 'admin') THEN RETURN true; END IF;

  -- enrolled
  IF EXISTS (
    SELECT 1 FROM public.academy_enrollments
    WHERE user_id = v_uid AND course_id = v_course AND status = 'active'
  ) THEN RETURN true; END IF;

  -- active VIP tier
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND global_subscription_tier_id IS NOT NULL
  ) THEN RETURN true; END IF;

  RETURN false;
END $$;

GRANT EXECUTE ON FUNCTION public.user_can_access_lesson(uuid) TO anon, authenticated;

-- 2) Secure media fetcher: returns video fields only when authorized
CREATE OR REPLACE FUNCTION public.get_lesson_media(_lesson_id uuid)
RETURNS TABLE (
  lesson_id uuid,
  video_provider text,
  video_url text,
  video_path text,
  duration_seconds integer,
  authorized boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := public.user_can_access_lesson(_lesson_id);
BEGIN
  RETURN QUERY
  SELECT l.id,
         CASE WHEN v_ok THEN l.video_provider ELSE NULL END,
         CASE WHEN v_ok THEN l.video_url      ELSE NULL END,
         CASE WHEN v_ok THEN l.video_path     ELSE NULL END,
         l.duration_seconds,
         v_ok
  FROM public.academy_lessons l
  WHERE l.id = _lesson_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_lesson_media(uuid) TO anon, authenticated;

-- 3) Loosen lesson SELECT policy so listings (titles, ordering, descriptions)
--    are visible to everyone. Media fields must be fetched via get_lesson_media().
DROP POLICY IF EXISTS "Lessons visible to admin/preview/enrolled" ON public.academy_lessons;

CREATE POLICY "Lessons listing is public"
ON public.academy_lessons
FOR SELECT
USING (true);

-- 4) Storage RLS for the private `academy` bucket — only authorized users can
--    fetch (and therefore obtain a signed URL for) a course video file.
DROP POLICY IF EXISTS "Academy bucket: authorized read" ON storage.objects;

CREATE POLICY "Academy bucket: authorized read"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'academy'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.academy_lessons l
      WHERE l.video_path = storage.objects.name
        AND public.user_can_access_lesson(l.id)
    )
  )
);
