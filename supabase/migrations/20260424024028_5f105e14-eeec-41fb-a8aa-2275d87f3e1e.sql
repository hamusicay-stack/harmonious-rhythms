
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c TEXT;
BEGIN
  LOOP
    c := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE ref_code = c);
  END LOOP;
  RETURN c;
END $$;
