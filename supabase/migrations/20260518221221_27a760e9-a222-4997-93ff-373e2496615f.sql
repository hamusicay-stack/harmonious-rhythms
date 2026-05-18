
-- 1. Extend lead_source enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'music_pro_inquiry'
                 AND enumtypid = 'public.lead_source'::regtype) THEN
    ALTER TYPE public.lead_source ADD VALUE 'music_pro_inquiry';
  END IF;
END $$;

-- 2. Add customer_id to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_customer ON public.leads(customer_id);

-- 3. Extend deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source_type   text,
  ADD COLUMN IF NOT EXISTS source_ref_id uuid,
  ADD COLUMN IF NOT EXISTS lead_id       uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title         text;
CREATE INDEX IF NOT EXISTS idx_deals_customer ON public.deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_source   ON public.deals(source_type, source_ref_id);

-- 4. Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_pro_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_pro_name    text;
  v_lead_id     uuid;
  v_pos         int;
  v_title       text;
BEGIN
  -- Resolve customer profile
  v_customer_id := NEW.sender_id;
  IF v_customer_id IS NULL AND NEW.contact_email IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.profiles
      WHERE lower(email) = lower(NEW.contact_email) LIMIT 1;
  END IF;
  IF v_customer_id IS NULL AND NEW.contact_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.profiles
      WHERE phone = NEW.contact_phone LIMIT 1;
  END IF;

  SELECT display_name INTO v_pro_name FROM public.music_pros WHERE id = NEW.pro_id;

  -- Create lead
  INSERT INTO public.leads (name, email, phone, source, status, notes, customer_id)
  VALUES (
    NEW.sender_name,
    NEW.contact_email,
    NEW.contact_phone,
    'music_pro_inquiry'::lead_source,
    'new'::lead_status,
    'פנייה אוטומטית מטופס "' || COALESCE(v_pro_name, 'מוזיקאי') || '". סוג אירוע: ' ||
      COALESCE(NEW.event_type,'—') ||
      CASE WHEN NEW.message IS NOT NULL THEN E'\n\n' || NEW.message ELSE '' END,
    v_customer_id
  )
  RETURNING id INTO v_lead_id;

  -- Compute deal position at top of new_lead column
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_pos
    FROM public.deals WHERE status = 'new_lead';

  v_title := 'פנייה למוזיקאי: ' || COALESCE(v_pro_name, '—') ||
             ' — ' || COALESCE(NEW.event_type, 'אירוע');

  -- Create deal
  INSERT INTO public.deals (
    customer_name, customer_id, value, status, position, notes,
    source_type, source_ref_id, lead_id, title
  )
  VALUES (
    NEW.sender_name,
    v_customer_id,
    COALESCE(NEW.budget, 0),
    'new_lead',
    v_pos,
    'מקור: פנייה מאינדקס המוזיקאים (' || COALESCE(v_pro_name,'') || ')',
    'music_pro_inquiry',
    NEW.id,
    v_lead_id,
    v_title
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_inquiry_to_crm ON public.music_pro_inquiries;
CREATE TRIGGER trg_inquiry_to_crm
AFTER INSERT ON public.music_pro_inquiries
FOR EACH ROW EXECUTE FUNCTION public.handle_new_pro_inquiry();
