
-- payment_settings singleton
CREATE TABLE public.payment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  test_mode BOOLEAN NOT NULL DEFAULT true,
  stripe_enabled BOOLEAN NOT NULL DEFAULT false,
  paypal_enabled BOOLEAN NOT NULL DEFAULT false,
  local_gateway_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payment_settings" ON public.payment_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update payment_settings" ON public.payment_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert payment_settings" ON public.payment_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_settings_updated
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- service_pricing
CREATE TABLE public.service_pricing (
  service_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active service_pricing" ON public.service_pricing
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert service_pricing" ON public.service_pricing
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update service_pricing" ON public.service_pricing
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete service_pricing" ON public.service_pricing
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_pricing_updated
  BEFORE UPDATE ON public.service_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_pricing (service_key, label, price, is_active) VALUES
  ('boost_24h', 'הקפצת מודעה - 24 שעות', 20, true),
  ('boost_48h', 'הקפצת מודעה - 48 שעות', 35, true)
ON CONFLICT (service_key) DO NOTHING;
