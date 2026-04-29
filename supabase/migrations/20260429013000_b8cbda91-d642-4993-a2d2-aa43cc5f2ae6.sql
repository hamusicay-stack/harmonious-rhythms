
CREATE TABLE IF NOT EXISTS public.pro_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  pro_user_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  pro_unread INTEGER NOT NULL DEFAULT 0,
  sender_unread INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pro_id, sender_id)
);
ALTER TABLE public.pro_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pro_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.pro_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pro_chat_messages_thread ON public.pro_chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pro_chat_threads_pro ON public.pro_chat_threads(pro_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_chat_threads_sender ON public.pro_chat_threads(sender_id, last_message_at DESC);

CREATE POLICY "pro_chat_threads_select" ON public.pro_chat_threads FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = pro_user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'chat_oversight')
  );

CREATE POLICY "pro_chat_threads_insert" ON public.pro_chat_threads FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND auth.uid() <> pro_user_id);

CREATE POLICY "pro_chat_threads_update" ON public.pro_chat_threads FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = pro_user_id);

CREATE POLICY "pro_chat_messages_select" ON public.pro_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pro_chat_threads t WHERE t.id = thread_id AND (
        t.sender_id = auth.uid() OR t.pro_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'chat_oversight')
      )
    )
  );

CREATE POLICY "pro_chat_messages_insert" ON public.pro_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.pro_chat_threads t
      WHERE t.id = thread_id AND (t.sender_id = auth.uid() OR t.pro_user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.handle_pro_chat_message_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp' AS $$
DECLARE
  t RECORD;
  recipient UUID;
  sender_name TEXT;
  pro_display TEXT;
BEGIN
  SELECT * INTO t FROM public.pro_chat_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.sender_id THEN
    recipient := t.pro_user_id;
    UPDATE public.pro_chat_threads SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.body, 200), pro_unread = pro_unread + 1
      WHERE id = t.id;
  ELSIF NEW.sender_id = t.pro_user_id THEN
    recipient := t.sender_id;
    UPDATE public.pro_chat_threads SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.body, 200), sender_unread = sender_unread + 1
      WHERE id = t.id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT display_name INTO pro_display FROM public.music_pros WHERE id = t.pro_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id, metadata)
  VALUES (recipient, 'pro_chat_message',
    COALESCE(sender_name,'משתמש') || ' שלח/ה הודעה',
    LEFT(NEW.body, 120),
    '/pros/' || t.pro_id,
    NEW.sender_id,
    jsonb_build_object('thread_id', t.id, 'pro_id', t.pro_id, 'pro_name', pro_display));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pro_chat_message_after_insert ON public.pro_chat_messages;
CREATE TRIGGER pro_chat_message_after_insert
  AFTER INSERT ON public.pro_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_pro_chat_message_insert();

ALTER TABLE public.pro_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.pro_chat_threads REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pro_chat_messages';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_chat_messages'; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pro_chat_threads';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_chat_threads'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(lower(email), created_at DESC);
