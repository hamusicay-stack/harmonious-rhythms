
-- Private calendar events table for music pros.
-- Only the owning pro can read/write. Clients never see this data.
CREATE TABLE IF NOT EXISTS public.music_pro_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  title TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_calendar_pro_date
  ON public.music_pro_calendar_events(pro_id, event_date);

ALTER TABLE public.music_pro_calendar_events ENABLE ROW LEVEL SECURITY;

-- Only the owning pro (user_id on music_pros) may view/manage their calendar.
DROP POLICY IF EXISTS "pro_owner_select_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_owner_select_calendar"
  ON public.music_pro_calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.music_pros mp
      WHERE mp.id = music_pro_calendar_events.pro_id
        AND mp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pro_owner_insert_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_owner_insert_calendar"
  ON public.music_pro_calendar_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.music_pros mp
      WHERE mp.id = music_pro_calendar_events.pro_id
        AND mp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pro_owner_update_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_owner_update_calendar"
  ON public.music_pro_calendar_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.music_pros mp
      WHERE mp.id = music_pro_calendar_events.pro_id
        AND mp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pro_owner_delete_calendar" ON public.music_pro_calendar_events;
CREATE POLICY "pro_owner_delete_calendar"
  ON public.music_pro_calendar_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.music_pros mp
      WHERE mp.id = music_pro_calendar_events.pro_id
        AND mp.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_pro_calendar_updated ON public.music_pro_calendar_events;
CREATE TRIGGER trg_pro_calendar_updated
  BEFORE UPDATE ON public.music_pro_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
