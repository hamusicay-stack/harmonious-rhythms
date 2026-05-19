
-- 1) Harden lesson access: require an is_vip tier (not just "any non-null tier")
CREATE OR REPLACE FUNCTION public.user_can_access_lesson(_lesson_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_course uuid;
  v_preview boolean;
BEGIN
  SELECT course_id, is_preview INTO v_course, v_preview
  FROM public.academy_lessons WHERE id = _lesson_id;
  IF v_course IS NULL THEN RETURN false; END IF;

  IF v_preview THEN RETURN true; END IF;
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF public.has_role(v_uid, 'admin') THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.academy_enrollments
    WHERE user_id = v_uid AND course_id = v_course AND status = 'active'
  ) THEN RETURN true; END IF;

  -- Only VIP-flagged tiers grant blanket access (was: any non-null tier)
  IF EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.subscription_tiers t ON t.id = p.global_subscription_tier_id
     WHERE p.id = v_uid AND t.is_vip = true
  ) THEN RETURN true; END IF;

  RETURN false;
END $function$;

-- 2) Centralised admin RPC to set/clear a user's global tier
CREATE OR REPLACE FUNCTION public.admin_set_user_global_tier(_user_id uuid, _tier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can change subscription tiers';
  END IF;

  IF _tier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subscription_tiers WHERE id = _tier_id
  ) THEN
    RAISE EXCEPTION 'Tier not found';
  END IF;

  UPDATE public.profiles
     SET global_subscription_tier_id = _tier_id,
         updated_at = now()
   WHERE id = _user_id;

  RETURN jsonb_build_object('ok', true, 'user_id', _user_id, 'tier_id', _tier_id);
END $function$;
