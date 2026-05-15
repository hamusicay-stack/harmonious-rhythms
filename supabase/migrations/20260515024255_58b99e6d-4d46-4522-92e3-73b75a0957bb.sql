
-- 1. product_types
CREATE TABLE IF NOT EXISTS public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  attribute_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_types public read" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "product_types admin write" ON public.product_types FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_product_types_updated BEFORE UPDATE ON public.product_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. business_rules: tier x product_type => allowed
CREATE TABLE IF NOT EXISTS public.business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL,
  product_type_id uuid NOT NULL REFERENCES public.product_types(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  discount_percent numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, product_type_id)
);
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_rules public read" ON public.business_rules FOR SELECT USING (true);
CREATE POLICY "business_rules admin write" ON public.business_rules FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_business_rules_updated BEFORE UPDATE ON public.business_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. keyboard_model_id on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS keyboard_model_id uuid;
