
-- Role permissions matrix
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins manage role permissions insert" ON public.role_permissions FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage role permissions update" ON public.role_permissions FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage role permissions delete" ON public.role_permissions FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Points rules
CREATE TABLE IF NOT EXISTS public.points_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view points rules" ON public.points_rules FOR SELECT USING (true);
CREATE POLICY "Admins insert points rules" ON public.points_rules FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update points rules" ON public.points_rules FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete points rules" ON public.points_rules FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER points_rules_updated_at BEFORE UPDATE ON public.points_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_key TEXT NOT NULL,
  points INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_unique_event
  ON public.points_ledger(user_id, event_key, reference_type, reference_id) WHERE reference_id IS NOT NULL;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ledger" ON public.points_ledger FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Aggregate
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view user points" ON public.user_points FOR SELECT USING (true);

-- Award function
CREATE OR REPLACE FUNCTION public.award_points_for_event(
  _user_id UUID, _event_key TEXT, _reference_type TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL, _notes TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rule RECORD; awarded INTEGER := 0;
BEGIN
  IF _user_id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO rule FROM public.points_rules WHERE event_key = _event_key AND enabled = true LIMIT 1;
  IF rule IS NULL OR rule.points = 0 THEN RETURN 0; END IF;
  BEGIN
    INSERT INTO public.points_ledger (user_id, event_key, points, reference_type, reference_id, notes)
    VALUES (_user_id, _event_key, rule.points, _reference_type, _reference_id, _notes);
    awarded := rule.points;
  EXCEPTION WHEN unique_violation THEN RETURN 0; END;
  INSERT INTO public.user_points (user_id, total_points, updated_at)
  VALUES (_user_id, awarded, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = public.user_points.total_points + EXCLUDED.total_points, updated_at = now();
  RETURN awarded;
END; $$;

-- Trigger functions
CREATE OR REPLACE FUNCTION public.points_on_lesson_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_completed = true AND (TG_OP = 'INSERT' OR OLD.is_completed IS DISTINCT FROM true) THEN
    PERFORM public.award_points_for_event(NEW.user_id, 'lesson_complete', 'lesson', NEW.lesson_id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_points_lesson_complete ON public.academy_lesson_progress;
CREATE TRIGGER trg_points_lesson_complete AFTER INSERT OR UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.points_on_lesson_complete();

CREATE OR REPLACE FUNCTION public.points_on_course_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.completed_at IS NULL) THEN
    PERFORM public.award_points_for_event(NEW.user_id, 'course_complete', 'course', NEW.course_id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_points_course_complete ON public.academy_enrollments;
CREATE TRIGGER trg_points_course_complete AFTER INSERT OR UPDATE ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.points_on_course_complete();

CREATE OR REPLACE FUNCTION public.points_on_shop_order_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM public.award_points_for_event(NEW.user_id, 'shop_purchase', 'shop_order', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_points_shop_order_complete ON public.shop_orders;
CREATE TRIGGER trg_points_shop_order_complete AFTER INSERT OR UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.points_on_shop_order_complete();

CREATE OR REPLACE FUNCTION public.points_on_marketplace_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    IF NEW.buyer_id IS NOT NULL THEN
      PERFORM public.award_points_for_event(NEW.buyer_id, 'marketplace_purchase', 'marketplace_thread', NEW.id::text);
    END IF;
    IF NEW.seller_id IS NOT NULL THEN
      PERFORM public.award_points_for_event(NEW.seller_id, 'marketplace_sale', 'marketplace_thread', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_points_marketplace_complete ON public.marketplace_chat_threads;
CREATE TRIGGER trg_points_marketplace_complete AFTER UPDATE ON public.marketplace_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.points_on_marketplace_complete();

-- Seed
INSERT INTO public.points_rules (event_key, label, points) VALUES
  ('lesson_complete', 'השלמת שיעור', 5),
  ('course_complete', 'השלמת קורס', 50),
  ('shop_purchase', 'רכישה בחנות', 20),
  ('marketplace_purchase', 'רכישה ביד שנייה', 15),
  ('marketplace_sale', 'מכירה ביד שנייה', 15)
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  ('user','forum.read',true),('user','forum.post',true),('user','shorts.view',true),('user','academy.preview',true),('user','academy.full',false),('user','shop.discount',false),('user','badge.verified',false),
  ('member','forum.read',true),('member','forum.post',true),('member','shorts.view',true),('member','academy.preview',true),('member','academy.full',false),('member','shop.discount',false),('member','badge.verified',false),
  ('premium','forum.read',true),('premium','forum.post',true),('premium','shorts.view',true),('premium','academy.preview',true),('premium','academy.full',true),('premium','shop.discount',true),('premium','badge.verified',true),
  ('vip','forum.read',true),('vip','forum.post',true),('vip','shorts.view',true),('vip','academy.preview',true),('vip','academy.full',true),('vip','shop.discount',true),('vip','badge.verified',true),('vip','badge.vip',true),
  ('admin','admin.full',true)
ON CONFLICT (role, permission_key) DO NOTHING;
