
-- =================== STORAGE BUCKET ===================
INSERT INTO storage.buckets (id, name, public) VALUES ('academy', 'academy', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage academy bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'academy' AND has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'academy' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read academy bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'academy');

-- =================== COURSES ===================
CREATE TABLE public.academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_url TEXT,
  trailer_url TEXT,
  instructor_id UUID,
  instructor_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  level TEXT NOT NULL DEFAULT 'beginner',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  enrollments_count INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_courses_status ON public.academy_courses(status);
CREATE INDEX idx_academy_courses_slug ON public.academy_courses(slug);
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view published courses" ON public.academy_courses FOR SELECT
  USING (status = 'published' OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage courses" ON public.academy_courses FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_academy_courses_updated BEFORE UPDATE ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================== MODULES ===================
CREATE TABLE public.academy_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_modules_course ON public.academy_modules(course_id);
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view modules" ON public.academy_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = course_id AND (c.status = 'published' OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admins manage modules" ON public.academy_modules FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =================== LESSONS (no enrollment policy yet) ===================
CREATE TABLE public.academy_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_provider TEXT NOT NULL DEFAULT 'storage',
  video_path TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_lessons_module ON public.academy_lessons(module_id);
CREATE INDEX idx_academy_lessons_course ON public.academy_lessons(course_id);
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lessons" ON public.academy_lessons FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_academy_lessons_updated BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================== ENROLLMENTS ===================
CREATE TABLE public.academy_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'purchase',
  order_id UUID,
  access_code TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  last_lesson_id UUID REFERENCES public.academy_lessons(id) ON DELETE SET NULL,
  last_accessed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_academy_enrollments_user ON public.academy_enrollments(user_id);
CREATE INDEX idx_academy_enrollments_course ON public.academy_enrollments(course_id);
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments" ON public.academy_enrollments FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own enrollments" ON public.academy_enrollments FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage enrollments" ON public.academy_enrollments FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Now add the lesson SELECT policy that depends on enrollments
CREATE POLICY "Lessons visible to admin/preview/enrolled" ON public.academy_lessons FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR is_preview = true
    OR EXISTS (SELECT 1 FROM public.academy_enrollments e
               WHERE e.course_id = academy_lessons.course_id
                 AND e.user_id = auth.uid()
                 AND e.status = 'active')
  );

-- =================== ACCESS CODES ===================
CREATE TABLE public.academy_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_access_codes_code ON public.academy_access_codes(code);
ALTER TABLE public.academy_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage access codes" ON public.academy_access_codes FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =================== LESSON PROGRESS ===================
CREATE TABLE public.academy_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_academy_progress_user_course ON public.academy_lesson_progress(user_id, course_id);
ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress" ON public.academy_lesson_progress FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_academy_progress_updated BEFORE UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================== CERTIFICATES ===================
CREATE TABLE public.academy_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  recipient_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_academy_certificates_user ON public.academy_certificates(user_id);
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can verify a certificate" ON public.academy_certificates FOR SELECT USING (true);
CREATE POLICY "Admins manage certificates" ON public.academy_certificates FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =================== WEBINARS ===================
CREATE TABLE public.academy_webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.academy_courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_attendees INTEGER NOT NULL DEFAULT 500,
  provider TEXT NOT NULL DEFAULT 'manual',
  join_url TEXT,
  recording_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_free BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_webinars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view webinars" ON public.academy_webinars FOR SELECT
  USING (status IN ('scheduled','live','ended') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage webinars" ON public.academy_webinars FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_academy_webinars_updated BEFORE UPDATE ON public.academy_webinars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES public.academy_webinars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, user_id)
);
ALTER TABLE public.academy_webinar_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own webinar regs" ON public.academy_webinar_registrations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users register self" ON public.academy_webinar_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage webinar regs" ON public.academy_webinar_registrations FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.academy_webinar_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES public.academy_webinars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_webinar_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registered view Q&A" ON public.academy_webinar_qa FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.academy_webinar_registrations r
               WHERE r.webinar_id = academy_webinar_qa.webinar_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Registered ask Q&A" ON public.academy_webinar_qa FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.academy_webinar_registrations r
                WHERE r.webinar_id = webinar_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Admins manage Q&A" ON public.academy_webinar_qa FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =================== BROADCASTS ===================
CREATE TABLE public.academy_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  sent_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcasts" ON public.academy_broadcasts FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =================== HELPER FUNCTIONS / TRIGGERS ===================
CREATE OR REPLACE FUNCTION public.academy_recompute_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_lessons INTEGER;
  done_lessons INTEGER;
  pct INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons FROM public.academy_lessons WHERE course_id = NEW.course_id;
  SELECT COUNT(*) INTO done_lessons FROM public.academy_lesson_progress
    WHERE course_id = NEW.course_id AND user_id = NEW.user_id AND is_completed = true;
  pct := CASE WHEN total_lessons > 0 THEN ROUND(done_lessons::numeric * 100 / total_lessons) ELSE 0 END;

  UPDATE public.academy_enrollments
  SET progress_percent = pct,
      last_lesson_id = NEW.lesson_id,
      last_accessed_at = now(),
      completed_at = CASE WHEN pct >= 100 THEN COALESCE(completed_at, now()) ELSE completed_at END
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_academy_progress_recompute
  AFTER INSERT OR UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.academy_recompute_progress();

CREATE OR REPLACE FUNCTION public.redeem_academy_access_code(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ac RECORD;
  enr_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO ac FROM public.academy_access_codes
    WHERE upper(code) = upper(_code) AND is_active = true LIMIT 1;
  IF ac IS NULL THEN RAISE EXCEPTION 'Invalid code'; END IF;
  IF ac.expires_at IS NOT NULL AND ac.expires_at < now() THEN RAISE EXCEPTION 'Code expired'; END IF;
  IF ac.used_count >= ac.max_uses THEN RAISE EXCEPTION 'Code already fully used'; END IF;

  INSERT INTO public.academy_enrollments (user_id, course_id, source, access_code)
  VALUES (auth.uid(), ac.course_id, 'access_code', ac.code)
  ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
  RETURNING id INTO enr_id;

  UPDATE public.academy_access_codes SET used_count = used_count + 1 WHERE id = ac.id;
  RETURN enr_id;
END $$;
