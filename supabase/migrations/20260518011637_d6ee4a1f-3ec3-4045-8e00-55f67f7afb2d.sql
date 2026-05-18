ALTER TABLE public.music_news
  ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_status TEXT
    CHECK (approval_status IN ('pending_review', 'approved', 'rejected'))
    DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by_pr BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_news_approval_status
  ON public.music_news(approval_status);