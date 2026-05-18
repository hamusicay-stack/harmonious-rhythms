
-- 1. Extend the calendar events table
ALTER TABLE public.music_pro_calendar_events
  ADD COLUMN IF NOT EXISTS pro_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false;

-- Backfill pro_user_id from music_pros
UPDATE public.music_pro_calendar_events c
   SET pro_user_id = mp.user_id
  FROM public.music_pros mp
 WHERE c.pro_id = mp.id AND c.pro_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pro_calendar_user_date
  ON public.music_pro_calendar_events(pro_user_id, event_date);

-- Allow the owning pro to also access rows via pro_user_id directly
DROP POLICY IF EXISTS "pro_user_select_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_user_select_calendar"
  ON public.music_pro_calendar_events FOR SELECT
  USING (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "pro_user_insert_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_user_insert_calendar"
  ON public.music_pro_calendar_events FOR INSERT
  WITH CHECK (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "pro_user_update_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_user_update_calendar"
  ON public.music_pro_calendar_events FOR UPDATE
  USING (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "pro_user_delete_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_user_delete_calendar"
  ON public.music_pro_calendar_events FOR DELETE
  USING (pro_user_id = auth.uid());

-- 2. Trigger: when an inquiry transitions to 'completed', create a site-gig calendar event
CREATE OR REPLACE FUNCTION public.auto_calendar_from_completed_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_user UUID;
  v_pro_name TEXT;
BEGIN
  -- only on status moving INTO 'completed'
  IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.event_date IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, display_name INTO v_pro_user, v_pro_name
    FROM public.music_pros WHERE id = NEW.pro_id;
  IF v_pro_user IS NULL THEN RETURN NEW; END IF;

  -- prevent duplicates for the same inquiry
  IF EXISTS (
    SELECT 1 FROM public.music_pro_calendar_events
    WHERE source = 'music_pro_inquiry' AND source_ref_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.music_pro_calendar_events (
    pro_id, pro_user_id, event_date, title, description,
    event_type, is_external, source, source_ref_id
  ) VALUES (
    NEW.pro_id,
    v_pro_user,
    NEW.event_date,
    COALESCE(NEW.event_type, 'אירוע') || ' — ' || COALESCE(NEW.sender_name, 'לקוח'),
    NEW.message,
    NEW.event_type,
    false,
    'music_pro_inquiry',
    NEW.id
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_calendar_from_completed_inquiry ON public.music_pro_inquiries;
CREATE TRIGGER trg_auto_calendar_from_completed_inquiry
  AFTER INSERT OR UPDATE OF status ON public.music_pro_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.auto_calendar_from_completed_inquiry();
