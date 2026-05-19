
-- Entitlement control plane (singleton)
CREATE TABLE IF NOT EXISTS public.entitlement_control_plane (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'dual' CHECK (mode IN ('legacy','dual','ssot')),
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  allow_auto_rollback boolean NOT NULL DEFAULT false,
  drift_threshold_warning double precision NOT NULL DEFAULT 0.05,
  drift_threshold_rollback double precision NOT NULL DEFAULT 0.15,
  confidence_threshold_ssot double precision NOT NULL DEFAULT 0.7,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entitlement_control_plane_singleton
  ON public.entitlement_control_plane ((1)) WHERE is_active = true;

ALTER TABLE public.entitlement_control_plane ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read control plane"
  ON public.entitlement_control_plane FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write control plane"
  ON public.entitlement_control_plane FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Audit log
CREATE TABLE IF NOT EXISTS public.entitlement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('mode_change','drift_event','rollback_recommendation','config_change')),
  previous_mode text,
  new_mode text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entitlement_audit_log_created_idx
  ON public.entitlement_audit_log (created_at DESC);

ALTER TABLE public.entitlement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit log"
  ON public.entitlement_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated insert audit log"
  ON public.entitlement_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed singleton
INSERT INTO public.entitlement_control_plane (mode, rollout_percentage)
SELECT 'dual', 0
WHERE NOT EXISTS (SELECT 1 FROM public.entitlement_control_plane WHERE is_active = true);
