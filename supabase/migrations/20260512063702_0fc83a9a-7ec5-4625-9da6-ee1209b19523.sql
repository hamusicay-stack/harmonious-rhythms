-- Extend cart_items to carry info-file requirements through the cart
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS requires_info_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS info_file_extension text;

-- Persist the uploaded instrument identification file on the unified order
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS info_file_url text,
  ADD COLUMN IF NOT EXISTS info_file_name text;