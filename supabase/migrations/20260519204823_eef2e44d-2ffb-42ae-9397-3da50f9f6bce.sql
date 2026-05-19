-- citext for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email      citext PRIMARY KEY,
  added_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "admins read allowed_emails"
  ON public.allowed_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert allowed_emails"
  ON public.allowed_emails FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete allowed_emails"
  ON public.allowed_emails FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update allowed_emails"
  ON public.allowed_emails FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SECURITY DEFINER helper for runtime checks (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails WHERE email = _email::citext
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;

-- Block signup of non-allowlisted emails at the auth.users level
CREATE OR REPLACE FUNCTION public.enforce_allowed_emails_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT public.is_email_allowed(NEW.email) THEN
    RAISE EXCEPTION 'Email not authorized'
      USING ERRCODE = '42501', HINT = 'access_restricted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_allowed_emails_on_signup ON auth.users;
CREATE TRIGGER enforce_allowed_emails_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_allowed_emails_on_signup();

-- Admin RPCs with audit logging
CREATE OR REPLACE FUNCTION public.admin_add_allowed_email(
  _email text,
  _note  text DEFAULT NULL,
  _reason text DEFAULT 'admin_add'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.allowed_emails (email, added_by, note)
    VALUES (_email::citext, _actor, _note)
    ON CONFLICT (email) DO UPDATE SET note = COALESCE(EXCLUDED.note, public.allowed_emails.note);

  INSERT INTO public.system_audit_logs (actor_id, action, entity_type, entity_id, payload)
    VALUES (_actor, 'allowed_email_added', 'allowed_email', _email,
            jsonb_build_object('email', _email, 'note', _note, 'reason', _reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_allowed_email(
  _email text,
  _reason text DEFAULT 'admin_remove'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.allowed_emails WHERE email = _email::citext;

  INSERT INTO public.system_audit_logs (actor_id, action, entity_type, entity_id, payload)
    VALUES (_actor, 'allowed_email_removed', 'allowed_email', _email,
            jsonb_build_object('email', _email, 'reason', _reason));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_allowed_email(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_allowed_email(text, text) TO authenticated;

-- Seed all existing users + admins so we don't lock anyone out
INSERT INTO public.allowed_emails (email, note)
SELECT email::citext, 'seeded_existing_user'
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;