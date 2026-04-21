-- Customer tags
CREATE TABLE public.customer_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  tag TEXT NOT NULL,
  color TEXT DEFAULT 'default',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, tag)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer tags"
ON public.customer_tags FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_customer_tags_customer ON public.customer_tags(customer_id);

-- Customer interactions / timeline
CREATE TYPE public.interaction_type AS ENUM ('note', 'call', 'email', 'meeting', 'purchase', 'lesson', 'signup', 'other');

CREATE TABLE public.customer_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  type public.interaction_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer interactions"
ON public.customer_interactions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_customer_interactions_customer ON public.customer_interactions(customer_id, occurred_at DESC);

-- Admin helper: assign/revoke role by email
CREATE OR REPLACE FUNCTION public.admin_assign_role_by_email(_email TEXT, _role public.app_role, _revoke BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage roles';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE email = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. They must sign up first.', _email;
  END IF;

  IF _revoke THEN
    DELETE FROM public.user_roles WHERE user_id = target_id AND role = _role;
    RETURN 'revoked';
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (target_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'granted';
  END IF;
END;
$$;

-- Admin helper: list admins with emails
CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (user_id UUID, email TEXT, granted_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list admins';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, u.email::text, ur.created_at
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at;
END;
$$;