
-- Add ban capability to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_reason text;

-- Helper: check banned status (security definer to bypass RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = _user_id), false);
$$;

-- Admin RPC: list all users with roles, email, ban status
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit int DEFAULT 200,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  email text,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz,
  is_banned boolean,
  banned_at timestamptz,
  banned_reason text,
  subscription_tier text,
  roles text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.display_name,
    p.username,
    p.avatar_url,
    p.created_at,
    COALESCE(p.is_banned, false) AS is_banned,
    p.banned_at,
    p.banned_reason,
    p.subscription_tier,
    COALESCE(
      (SELECT array_agg(ur.role::text ORDER BY ur.role::text)
       FROM public.user_roles ur WHERE ur.user_id = p.id),
      ARRAY[]::text[]
    ) AS roles
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE _search IS NULL
     OR _search = ''
     OR p.display_name ILIKE '%' || _search || '%'
     OR p.username ILIKE '%' || _search || '%'
     OR u.email ILIKE '%' || _search || '%'
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
END;
$$;

-- Admin RPC: set ban state
CREATE OR REPLACE FUNCTION public.admin_set_user_ban(
  _user_id uuid,
  _banned boolean,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  UPDATE public.profiles
     SET is_banned = _banned,
         banned_at = CASE WHEN _banned THEN now() ELSE NULL END,
         banned_reason = CASE WHEN _banned THEN _reason ELSE NULL END
   WHERE id = _user_id;
END;
$$;

-- Admin RPC: set role (assign or revoke any app_role) by user id
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _user_id uuid,
  _role app_role,
  _revoke boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage roles';
  END IF;
  IF _revoke THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
    RETURN 'revoked';
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'granted';
  END IF;
END;
$$;
