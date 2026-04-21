
-- Automation rules table
CREATE TYPE public.automation_trigger AS ENUM (
  'lead_status_changed',
  'order_paid',
  'subscription_expiring',
  'supplier_order_status_changed',
  'new_lead_created'
);

CREATE TYPE public.automation_action AS ENUM (
  'send_email',
  'open_whatsapp',
  'create_task'
);

CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type public.automation_trigger NOT NULL,
  trigger_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type public.automation_action NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation rules"
ON public.automation_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automation run log
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  context JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read automation runs"
ON public.automation_runs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert automation runs"
ON public.automation_runs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));
