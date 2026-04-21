-- Settings table for marketplace automation
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  followup_days integer NOT NULL DEFAULT 30,
  followup_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read marketplace settings"
  ON public.marketplace_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage marketplace settings"
  ON public.marketplace_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.marketplace_settings (id, followup_days, followup_enabled)
VALUES (1, 30, true)
ON CONFLICT (id) DO NOTHING;

-- Track which listings already received the follow-up
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_followup
  ON public.marketplace_listings (status, created_at, followup_sent_at);