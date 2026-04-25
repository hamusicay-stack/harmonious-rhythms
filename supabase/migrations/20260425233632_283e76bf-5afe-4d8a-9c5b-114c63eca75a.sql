-- 1. Add sold/urgent to listings (urgent already exists as is_urgent)
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_is_sold ON public.marketplace_listings(is_sold);

-- 2. Chat threads (one per buyer<->seller<->listing)
CREATE TABLE IF NOT EXISTS public.marketplace_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  buyer_unread INT NOT NULL DEFAULT 0,
  seller_unread INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);

ALTER TABLE public.marketplace_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own threads"
  ON public.marketplace_chat_threads FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Buyers can create thread"
  ON public.marketplace_chat_threads FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);

CREATE POLICY "Participants can update thread"
  ON public.marketplace_chat_threads FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 3. Chat messages
CREATE TABLE IF NOT EXISTS public.marketplace_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.marketplace_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.marketplace_chat_messages(thread_id, created_at DESC);

ALTER TABLE public.marketplace_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.marketplace_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_chat_threads t
    WHERE t.id = thread_id AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id OR has_role(auth.uid(),'admin'))
  ));

CREATE POLICY "Participants can send messages"
  ON public.marketplace_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.marketplace_chat_threads t
    WHERE t.id = thread_id AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
  ));

CREATE POLICY "Participants can update read_at"
  ON public.marketplace_chat_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_chat_threads t
    WHERE t.id = thread_id AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
  ));

-- 4. Trigger: update thread + notify recipient
CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  t RECORD;
  recipient UUID;
  sender_name TEXT;
  listing_title TEXT;
BEGIN
  SELECT * INTO t FROM public.marketplace_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.buyer_id THEN
    recipient := t.seller_id;
    UPDATE public.marketplace_chat_threads
      SET last_message_at = NEW.created_at,
          last_message_preview = LEFT(NEW.body, 200),
          seller_unread = seller_unread + 1
      WHERE id = t.id;
  ELSE
    recipient := t.buyer_id;
    UPDATE public.marketplace_chat_threads
      SET last_message_at = NEW.created_at,
          last_message_preview = LEFT(NEW.body, 200),
          buyer_unread = buyer_unread + 1
      WHERE id = t.id;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT title INTO listing_title FROM public.marketplace_listings WHERE id = t.listing_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  VALUES (recipient, 'chat_message',
    COALESCE(sender_name,'משתמש') || ' שלח/ה הודעה',
    LEFT(NEW.body, 120),
    '/marketplace/' || t.listing_id,
    NEW.sender_id,
    jsonb_build_object('thread_id', t.id, 'listing_id', t.listing_id, 'listing_title', listing_title));

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_message_insert ON public.marketplace_chat_messages;
CREATE TRIGGER trg_chat_message_insert
  AFTER INSERT ON public.marketplace_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_insert();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chat_threads;