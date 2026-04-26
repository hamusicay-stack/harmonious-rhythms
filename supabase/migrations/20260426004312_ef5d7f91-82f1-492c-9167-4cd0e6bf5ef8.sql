
-- Reviews
CREATE TABLE public.academy_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
ALTER TABLE public.academy_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.academy_reviews FOR SELECT USING (true);
CREATE POLICY "Enrolled write own review" ON public.academy_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM academy_enrollments e WHERE e.user_id = auth.uid() AND e.course_id = academy_reviews.course_id
  ));
CREATE POLICY "Update own review" ON public.academy_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own or admin" ON public.academy_reviews FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_academy_reviews_course ON public.academy_reviews(course_id);

-- Quizzes
CREATE TABLE public.academy_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  module_id uuid,
  title text NOT NULL,
  description text,
  pass_percent smallint NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quizzes" ON public.academy_quizzes FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Enrolled view quizzes" ON public.academy_quizzes FOR SELECT USING (
  has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM academy_enrollments e WHERE e.user_id = auth.uid() AND e.course_id = academy_quizzes.course_id
  )
);

CREATE TABLE public.academy_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index smallint NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.academy_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage q" ON public.academy_quiz_questions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Enrolled view q" ON public.academy_quiz_questions FOR SELECT USING (
  has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM academy_quizzes qz JOIN academy_enrollments e ON e.course_id = qz.course_id
    WHERE qz.id = academy_quiz_questions.quiz_id AND e.user_id = auth.uid()
  )
);

CREATE TABLE public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score_percent smallint NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own attempts" ON public.academy_quiz_attempts FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- Lesson Q&A
CREATE TABLE public.academy_lesson_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  body text NOT NULL,
  is_instructor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_lesson_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled view qa" ON public.academy_lesson_qa FOR SELECT USING (
  has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM academy_enrollments e WHERE e.user_id = auth.uid() AND e.course_id = academy_lesson_qa.course_id
  )
);
CREATE POLICY "Enrolled write qa" ON public.academy_lesson_qa FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM academy_enrollments e WHERE e.user_id = auth.uid() AND e.course_id = academy_lesson_qa.course_id
  )
);
CREATE POLICY "Edit own qa" ON public.academy_lesson_qa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own or admin qa" ON public.academy_lesson_qa FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_lesson_qa_lesson ON public.academy_lesson_qa(lesson_id);

-- Device sessions
CREATE TABLE public.user_device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own devices" ON public.user_device_sessions FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- Push subscriptions
CREATE TABLE public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own push" ON public.user_push_subscriptions FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id);

-- Helper RPC: register/heartbeat device. Returns true if allowed (within 2-device limit), false if denied.
CREATE OR REPLACE FUNCTION public.register_device(_device_id text, _user_agent text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cnt int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  -- Upsert this device
  INSERT INTO user_device_sessions (user_id, device_id, user_agent, last_seen_at)
  VALUES (uid, _device_id, _user_agent, now())
  ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen_at = now(), user_agent = EXCLUDED.user_agent;

  -- Count distinct active devices in last 30 days
  SELECT count(*) INTO cnt FROM user_device_sessions
   WHERE user_id = uid AND last_seen_at > now() - interval '30 days';

  IF cnt > 2 THEN
    -- Remove this device since it exceeded the limit
    DELETE FROM user_device_sessions WHERE user_id = uid AND device_id = _device_id;
    RETURN false;
  END IF;
  RETURN true;
END; $$;
