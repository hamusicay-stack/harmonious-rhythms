DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('open','in_progress','done');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'open',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  due_date timestamptz,
  related_customer_id uuid,
  related_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  related_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_by uuid,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tasks" ON public.admin_tasks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_tasks_updated BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_admin_tasks_status ON public.admin_tasks(status);
CREATE INDEX idx_admin_tasks_due ON public.admin_tasks(due_date);
CREATE INDEX idx_admin_tasks_customer ON public.admin_tasks(related_customer_id);