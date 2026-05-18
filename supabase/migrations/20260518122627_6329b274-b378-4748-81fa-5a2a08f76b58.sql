
-- 1. Add approval_status to wiki_articles
ALTER TABLE public.wiki_articles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('approved', 'pending_review', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_wiki_articles_approval_status
  ON public.wiki_articles(approval_status);

-- Backfill: existing verified rows = approved
UPDATE public.wiki_articles
  SET approval_status = CASE WHEN is_verified THEN 'approved' ELSE 'pending_review' END
  WHERE approval_status = 'approved' AND is_verified = false;

-- Refresh public read policy to also require approval_status='approved'
DROP POLICY IF EXISTS "Verified wiki articles are publicly viewable" ON public.wiki_articles;
DROP POLICY IF EXISTS "Wiki articles are viewable by everyone" ON public.wiki_articles;

CREATE POLICY "Approved wiki articles are publicly viewable"
  ON public.wiki_articles FOR SELECT
  USING (approval_status = 'approved' AND is_verified = true);

-- 2. wiki_revisions table for suggested edits to existing articles
CREATE TABLE IF NOT EXISTS public.wiki_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.wiki_articles(id) ON DELETE CASCADE,
  suggested_html TEXT NOT NULL,
  suggested_title TEXT,
  suggested_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_revisions_article ON public.wiki_revisions(article_id);
CREATE INDEX IF NOT EXISTS idx_wiki_revisions_status ON public.wiki_revisions(status);

ALTER TABLE public.wiki_revisions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit a pending revision (must be themselves)
CREATE POLICY "Authenticated users can submit revisions"
  ON public.wiki_revisions FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending_review' AND auth.uid() = submitted_by);

-- Submitter can read own revisions; staff can read all
CREATE POLICY "Submitter or staff can view revisions"
  ON public.wiki_revisions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = submitted_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Only admin/moderator can update (approve/reject)
CREATE POLICY "Staff can update revisions"
  ON public.wiki_revisions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Only admin can delete
CREATE POLICY "Admins can delete revisions"
  ON public.wiki_revisions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
