DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Public can submit basic leads" ON public.leads
  FOR INSERT
  WITH CHECK (
    assigned_to IS NULL
    AND status = 'new'
    AND source IN ('website','whatsapp','facebook','phone','referral','other')
  );