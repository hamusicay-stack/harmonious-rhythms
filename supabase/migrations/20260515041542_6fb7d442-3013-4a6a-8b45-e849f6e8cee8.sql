
-- Seed missing shop categories
INSERT INTO public.shop_categories (slug, label, display_order, is_active)
VALUES
  ('instruments', 'כלי נגינה', 10, true),
  ('software', 'תוכנות ופלאגינים', 30, true),
  ('courses', 'קורסים ולימודים', 40, true)
ON CONFLICT (slug) DO NOTHING;

-- Storage bucket for CPI / .n27 / .info uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cpi-uploads', 'cpi-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own user_id folder
CREATE POLICY "Users upload own CPI files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cpi-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own CPI files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cpi-uploads'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users delete own CPI files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cpi-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
