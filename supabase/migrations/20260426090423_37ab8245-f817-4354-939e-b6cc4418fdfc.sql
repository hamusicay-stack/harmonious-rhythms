-- Analytics events for academy
CREATE TABLE IF NOT EXISTS public.academy_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('lesson','podcast')),
  item_id UUID NOT NULL,
  course_id UUID,
  series_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('start','progress','complete','seek','dropoff')),
  position_seconds INTEGER,
  duration_seconds INTEGER,
  percent INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_view_events_item ON public.academy_view_events(item_type, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_view_events_user ON public.academy_view_events(user_id, created_at DESC);

ALTER TABLE public.academy_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert view events"
  ON public.academy_view_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all events"
  ON public.academy_view_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own events"
  ON public.academy_view_events FOR SELECT
  USING (auth.uid() = user_id);

-- Grant access to a course by email (admin only)
CREATE OR REPLACE FUNCTION public.admin_grant_course_access_by_email(_email TEXT, _course_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  enr_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant access';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE email = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. They must sign up first.', _email;
  END IF;

  INSERT INTO public.academy_enrollments (user_id, course_id, source, status)
  VALUES (target_id, _course_id, 'admin_gift', 'active')
  ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
  RETURNING id INTO enr_id;

  -- notify the recipient
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (target_id, 'course_gift',
    'קיבלת גישה לקורס במתנה!',
    'נכנס לאקדמיה כדי להתחיל ללמוד',
    '/academy',
    jsonb_build_object('course_id', _course_id, 'enrollment_id', enr_id));

  RETURN enr_id;
END $$;