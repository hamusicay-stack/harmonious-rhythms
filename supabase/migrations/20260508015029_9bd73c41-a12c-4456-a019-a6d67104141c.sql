
-- Enable pg_net for outbound HTTP from the database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings table (single row, admin-managed)
CREATE TABLE IF NOT EXISTS public.rhythm_automation_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  webhook_url TEXT,
  webhook_secret TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.rhythm_automation_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.rhythm_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation settings"
  ON public.rhythm_automation_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update automation settings"
  ON public.rhythm_automation_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger function: POST to external webhook when conditions are met
CREATE OR REPLACE FUNCTION public.trigger_cpi_generation_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s RECORD;
  email_value TEXT;
  payload JSONB;
  hdrs JSONB;
BEGIN
  -- Only fire when row is processing AND has an info file URL
  IF NEW.status <> 'processing' OR COALESCE(NEW.info_file_url, '') = '' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only fire if conditions just became true
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'processing' AND COALESCE(OLD.info_file_url,'') = COALESCE(NEW.info_file_url,'') THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT * INTO s FROM public.rhythm_automation_settings WHERE id = 1;
  IF s IS NULL OR s.enabled = false OR COALESCE(s.webhook_url, '') = '' THEN
    RETURN NEW;
  END IF;

  -- Best-effort email lookup
  email_value := COALESCE(NEW.customer_email,
    (SELECT email FROM auth.users WHERE id = NEW.user_id LIMIT 1));

  payload := jsonb_build_object(
    'order_id', NEW.id,
    'user_email', email_value,
    'purchased_set_id', NEW.rhythm_set_id,
    'n27_file_url', NEW.info_file_url
  );

  hdrs := jsonb_build_object('Content-Type', 'application/json');
  IF COALESCE(s.webhook_secret, '') <> '' THEN
    hdrs := hdrs || jsonb_build_object('x-webhook-secret', s.webhook_secret);
  END IF;

  PERFORM net.http_post(
    url := s.webhook_url,
    headers := hdrs,
    body := payload,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rhythm_orders_cpi_webhook ON public.rhythm_orders;
CREATE TRIGGER rhythm_orders_cpi_webhook
AFTER INSERT OR UPDATE OF status, info_file_url ON public.rhythm_orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_cpi_generation_webhook();
