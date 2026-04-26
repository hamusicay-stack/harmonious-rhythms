
-- Add order_id column to affiliate_conversions
ALTER TABLE public.affiliate_conversions
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_order ON public.affiliate_conversions(order_id);

-- Function to auto-approve/reject conversions when order status changes
CREATE OR REPLACE FUNCTION public.affiliate_sync_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' THEN
    UPDATE public.affiliate_conversions
    SET status = 'approved', approved_at = now()
    WHERE order_id = NEW.id AND status = 'pending';
  ELSIF NEW.status IN ('cancelled', 'refunded') THEN
    UPDATE public.affiliate_conversions
    SET status = 'rejected'
    WHERE order_id = NEW.id AND status IN ('pending', 'approved');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_order_status ON public.shop_orders;
CREATE TRIGGER trg_affiliate_order_status
AFTER UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.affiliate_sync_on_order_status();
