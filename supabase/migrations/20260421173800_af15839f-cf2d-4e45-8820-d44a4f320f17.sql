-- Supplier purchase orders
CREATE TYPE public.supplier_order_status AS ENUM ('draft', 'sent', 'received', 'paid', 'cancelled');

CREATE TABLE public.supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  order_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_delivery_date TIMESTAMPTZ,
  status public.supplier_order_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_orders_supplier ON public.supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON public.supplier_orders(status);

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage supplier orders"
  ON public.supplier_orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_supplier_orders_updated_at
  BEFORE UPDATE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add custom_source column to leads for "other" free text
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_source TEXT;

-- Add custom_category to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS custom_category TEXT;

-- Add custom_type to customer_interactions
ALTER TABLE public.customer_interactions ADD COLUMN IF NOT EXISTS custom_type TEXT;