
-- Rhythm orders table
CREATE TABLE public.rhythm_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rhythm_set_id UUID NOT NULL REFERENCES public.rhythm_sets(id) ON DELETE RESTRICT,
  keyboard_model_id UUID REFERENCES public.keyboard_models(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed','cancelled')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  info_file_url TEXT,
  info_file_path TEXT,
  cpi_file_url TEXT,
  cpi_file_path TEXT,
  customer_email TEXT,
  admin_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rhythm_orders_user ON public.rhythm_orders(user_id);
CREATE INDEX idx_rhythm_orders_status ON public.rhythm_orders(status);
CREATE INDEX idx_rhythm_orders_set ON public.rhythm_orders(rhythm_set_id);

ALTER TABLE public.rhythm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rhythm orders"
  ON public.rhythm_orders FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users create own rhythm orders"
  ON public.rhythm_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update rhythm orders"
  ON public.rhythm_orders FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete rhythm orders"
  ON public.rhythm_orders FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_rhythm_orders_updated_at
  BEFORE UPDATE ON public.rhythm_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('rhythm-files','rhythm-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own rhythm info files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rhythm-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own rhythm files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'rhythm-files'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "Admins upload rhythm CPI files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rhythm-files' AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Admins update rhythm files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'rhythm-files' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete rhythm files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'rhythm-files' AND public.has_role(auth.uid(),'admin'));
