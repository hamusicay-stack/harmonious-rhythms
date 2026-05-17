
-- 1) marketplace_offers
CREATE TABLE public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_amount NUMERIC NOT NULL CHECK (offer_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','counter_offered')),
  counter_amount NUMERIC CHECK (counter_amount IS NULL OR counter_amount > 0),
  buyer_message TEXT,
  seller_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_offers_listing ON public.marketplace_offers(listing_id);
CREATE INDEX idx_mp_offers_buyer ON public.marketplace_offers(buyer_id);
CREATE INDEX idx_mp_offers_seller ON public.marketplace_offers(seller_id);

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers: buyer or seller can view"
  ON public.marketplace_offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "offers: buyer can create"
  ON public.marketplace_offers FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() <> seller_id
    AND EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.seller_id = seller_id AND l.status = 'approved')
  );

CREATE POLICY "offers: seller can update"
  ON public.marketplace_offers FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "offers: buyer can update own"
  ON public.marketplace_offers FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE TRIGGER trg_mp_offers_updated_at
  BEFORE UPDATE ON public.marketplace_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) marketplace_wanted
CREATE TABLE public.marketplace_wanted (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 5 AND 4000),
  category TEXT,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  budget_min NUMERIC CHECK (budget_min IS NULL OR budget_min >= 0),
  budget_max NUMERIC CHECK (budget_max IS NULL OR budget_max >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_wanted_active ON public.marketplace_wanted(status, created_at DESC);
CREATE INDEX idx_mp_wanted_user ON public.marketplace_wanted(user_id);

ALTER TABLE public.marketplace_wanted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wanted: public can view active"
  ON public.marketplace_wanted FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "wanted: owner can insert"
  ON public.marketplace_wanted FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wanted: owner can update"
  ON public.marketplace_wanted FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wanted: owner or admin can delete"
  ON public.marketplace_wanted FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_mp_wanted_updated_at
  BEFORE UPDATE ON public.marketplace_wanted
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) chat_blocks
CREATE TABLE public.chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_chat_blocks_blocker ON public.chat_blocks(blocker_id);
CREATE INDEX idx_chat_blocks_blocked ON public.chat_blocks(blocked_id);

ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks: blocker can view own"
  ON public.chat_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocks: blocker can insert"
  ON public.chat_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks: blocker can delete"
  ON public.chat_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- 4) Trigger: prevent chat messages if either party blocked the other
CREATE OR REPLACE FUNCTION public.enforce_chat_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  other UUID;
BEGIN
  SELECT * INTO t FROM public.marketplace_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  other := CASE WHEN NEW.sender_id = t.buyer_id THEN t.seller_id ELSE t.buyer_id END;
  IF EXISTS (
    SELECT 1 FROM public.chat_blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = other)
       OR (blocker_id = other AND blocked_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED: לא ניתן לשלוח הודעות — אחד הצדדים חסם את השני' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_chat_block_check
  BEFORE INSERT ON public.marketplace_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_block();
