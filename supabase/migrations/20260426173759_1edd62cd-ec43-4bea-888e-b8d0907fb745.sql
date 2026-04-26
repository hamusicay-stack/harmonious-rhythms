ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS preview_percent INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.academy_courses
  DROP CONSTRAINT IF EXISTS academy_courses_preview_percent_check;
ALTER TABLE public.academy_courses
  ADD CONSTRAINT academy_courses_preview_percent_check
  CHECK (preview_percent >= 0 AND preview_percent <= 100);