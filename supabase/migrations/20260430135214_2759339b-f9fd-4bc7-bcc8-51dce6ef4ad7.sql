-- Add privacy flags for pros: phone/whatsapp public visibility (premium-only)
ALTER TABLE public.music_pros
  ADD COLUMN IF NOT EXISTS show_phone_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_whatsapp_public boolean NOT NULL DEFAULT false;

-- Allow the music pro (recipient) to also start the chat thread, not just the sender.
-- The existing policies allow participants to view their threads.
-- We need to ensure the pro_user_id can also INSERT a thread (in case it doesn't already).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pro_chat_threads'
      AND policyname = 'Pro can create thread with sender'
  ) THEN
    CREATE POLICY "Pro can create thread with sender"
      ON public.pro_chat_threads
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = pro_user_id);
  END IF;
END $$;