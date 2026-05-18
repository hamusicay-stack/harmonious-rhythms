
-- =========================================================
-- Unified Core Messaging
-- =========================================================

CREATE TABLE IF NOT EXISTS public.core_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('MARKETPLACE','PRO','FORUM','DIRECT')),
  context_id UUID,
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  unread_a INTEGER NOT NULL DEFAULT 0,
  unread_b INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_chat_threads_distinct_users CHECK (user_a <> user_b),
  CONSTRAINT core_chat_threads_unique UNIQUE (context_type, context_id, user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_core_threads_user_a ON public.core_chat_threads(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_threads_user_b ON public.core_chat_threads(user_b, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_threads_context ON public.core_chat_threads(context_type, context_id);

CREATE TABLE IF NOT EXISTS public.core_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.core_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_messages_thread ON public.core_chat_messages(thread_id, created_at);

ALTER TABLE public.core_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: threads
CREATE POLICY "core_threads_select_participants"
  ON public.core_chat_threads FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "core_threads_insert_participants"
  ON public.core_chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "core_threads_update_participants"
  ON public.core_chat_threads FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(),'admin'));

-- RLS: messages
CREATE POLICY "core_messages_select_participants"
  ON public.core_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.core_chat_threads t
      WHERE t.id = thread_id
        AND (auth.uid() = t.user_a OR auth.uid() = t.user_b OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "core_messages_insert_sender"
  ON public.core_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.core_chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

CREATE POLICY "core_messages_update_own"
  ON public.core_chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.core_chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

-- Block enforcement on core messages
CREATE OR REPLACE FUNCTION public.enforce_core_chat_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  other UUID;
BEGIN
  SELECT * INTO t FROM public.core_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  other := CASE WHEN NEW.sender_id = t.user_a THEN t.user_b ELSE t.user_a END;
  IF EXISTS (
    SELECT 1 FROM public.chat_blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = other)
       OR (blocker_id = other AND blocked_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED: לא ניתן לשלוח הודעות — אחד הצדדים חסם את השני'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_core_chat_block ON public.core_chat_messages;
CREATE TRIGGER trg_core_chat_block
BEFORE INSERT ON public.core_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_core_chat_block();

-- Update thread on new message (last_message_at/preview + unread counters)
CREATE OR REPLACE FUNCTION public.handle_core_chat_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT * INTO t FROM public.core_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.user_a THEN
    UPDATE public.core_chat_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_b = unread_b + 1,
           updated_at = now()
     WHERE id = t.id;
  ELSE
    UPDATE public.core_chat_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_a = unread_a + 1,
           updated_at = now()
     WHERE id = t.id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_core_chat_message_insert ON public.core_chat_messages;
CREATE TRIGGER trg_core_chat_message_insert
AFTER INSERT ON public.core_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_core_chat_message_insert();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.core_chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.core_chat_messages;
