CREATE OR REPLACE FUNCTION public.shorts_auto_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  is_trusted boolean := false;
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending','active','rejected','scheduled') THEN
    NEW.status := 'pending';
  END IF;
  SELECT * INTO s FROM public.shorts_settings WHERE id = 1;
  SELECT EXISTS(SELECT 1 FROM public.shorts_trusted_uploaders WHERE user_id = NEW.creator_id) INTO is_trusted;
  IF (s.auto_approve_all OR is_trusted OR public.has_role(NEW.creator_id,'admin')) AND NEW.status = 'pending' THEN
    NEW.status := 'active';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $$;