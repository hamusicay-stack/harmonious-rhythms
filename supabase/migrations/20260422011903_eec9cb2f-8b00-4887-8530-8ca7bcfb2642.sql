
CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reports_listing ON public.marketplace_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reports_status ON public.marketplace_reports(status);

ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit reports"
  ON public.marketplace_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.marketplace_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.marketplace_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports"
  ON public.marketplace_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reports"
  ON public.marketplace_reports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
