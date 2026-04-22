
-- ============ ENUMS ============
CREATE TYPE public.shop_product_type AS ENUM ('physical', 'digital', 'hybrid');
CREATE TYPE public.shop_fulfillment_type AS ENUM ('in_stock', 'dropship');
CREATE TYPE public.shop_product_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.shop_order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.shop_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.shop_coupon_type AS ENUM ('percent', 'fixed');
CREATE TYPE public.shop_trade_in_status AS ENUM ('new', 'reviewing', 'offered', 'accepted', 'rejected', 'completed');
CREATE TYPE public.shop_vendor_type AS ENUM ('in_house', 'dropship');
CREATE TYPE public.shop_field_type AS ENUM ('text', 'number', 'select', 'multiselect', 'boolean', 'textarea');

-- ============ CATEGORIES ============
CREATE TABLE public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CUSTOM FIELDS ============
CREATE TABLE public.shop_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type public.shop_field_type NOT NULL DEFAULT 'text',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ VENDORS ============
CREATE TABLE public.shop_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  vendor_type public.shop_vendor_type NOT NULL DEFAULT 'in_house',
  payment_notes TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PRODUCTS ============
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.shop_vendors(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  
  product_type public.shop_product_type NOT NULL DEFAULT 'physical',
  fulfillment_type public.shop_fulfillment_type NOT NULL DEFAULT 'in_stock',
  status public.shop_product_status NOT NULL DEFAULT 'draft',
  
  brand TEXT,
  model TEXT,
  sku TEXT,
  
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ILS',
  cost_price NUMERIC(12,2),
  
  manage_stock BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  
  -- Digital
  digital_file_url TEXT,
  digital_file_name TEXT,
  digital_file_size_mb NUMERIC(10,2),
  download_limit INT NOT NULL DEFAULT 5,
  download_expiry_days INT NOT NULL DEFAULT 30,
  current_version TEXT,
  
  -- Physical
  weight_kg NUMERIC(10,3),
  dimensions JSONB,
  warranty_terms TEXT,
  
  -- Media
  main_image TEXT,
  video_demo_url TEXT,
  audio_demo_url TEXT,
  
  -- Custom & status tags
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Stats
  views_count INT NOT NULL DEFAULT 0,
  sales_count INT NOT NULL DEFAULT 0,
  
  is_featured BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_products_status ON public.shop_products(status);
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
CREATE INDEX idx_shop_products_slug ON public.shop_products(slug);
CREATE INDEX idx_shop_products_brand ON public.shop_products(brand);

-- ============ PRODUCT IMAGES ============
CREATE TABLE public.shop_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_product_images_product ON public.shop_product_images(product_id);

-- ============ BUNDLES ============
CREATE TABLE public.shop_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type public.shop_coupon_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.shop_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.shop_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, product_id)
);

-- ============ COUPONS ============
CREATE TABLE public.shop_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type public.shop_coupon_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INT,
  current_uses INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ORDERS ============
CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID,
  
  status public.shop_order_status NOT NULL DEFAULT 'pending',
  payment_status public.shop_payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  external_payment_id TEXT,
  
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  
  coupon_code TEXT,
  
  -- Customer info
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  
  -- Shipping
  shipping_address JSONB,
  tracking_number TEXT,
  shipping_carrier TEXT,
  
  notes TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_orders_customer ON public.shop_orders(customer_id);
CREATE INDEX idx_shop_orders_status ON public.shop_orders(status);

CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  product_sku TEXT,
  product_type public.shop_product_type NOT NULL DEFAULT 'physical',
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);

-- ============ DIGITAL DOWNLOADS ============
CREATE TABLE public.shop_digital_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.shop_order_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  customer_id UUID,
  download_token TEXT NOT NULL UNIQUE,
  download_count INT NOT NULL DEFAULT 0,
  max_downloads INT NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_digital_downloads_customer ON public.shop_digital_downloads(customer_id);
CREATE INDEX idx_shop_digital_downloads_token ON public.shop_digital_downloads(download_token);

-- ============ TRADE IN ============
CREATE TABLE public.shop_trade_in_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  intro_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.shop_trade_in_settings (id, is_enabled, intro_text) 
VALUES (1, false, 'יש לכם כלי ישן? אנחנו נקנה אותו ממכם או נציע לכם זיכוי לרכישה חדשה.');

CREATE TABLE public.shop_trade_in_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  item_brand TEXT,
  item_model TEXT,
  item_year TEXT,
  item_condition TEXT,
  item_description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  asking_price NUMERIC(12,2),
  admin_offer NUMERIC(12,2),
  status public.shop_trade_in_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  related_product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Q&A ============
CREATE TABLE public.shop_product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  asker_id UUID,
  asker_name TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX idx_shop_questions_product ON public.shop_product_questions(product_id);

-- ============ REVIEWS ============
CREATE TABLE public.shop_product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  order_id UUID REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  content TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_reviews_product ON public.shop_product_reviews(product_id);

-- ============ WISHLISTS ============
CREATE TABLE public.shop_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ============ SETTINGS ============
CREATE TABLE public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'החנות',
  default_currency TEXT NOT NULL DEFAULT 'ILS',
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 17,
  default_shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 30,
  free_shipping_threshold NUMERIC(12,2) NOT NULL DEFAULT 500,
  contact_email TEXT,
  contact_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.shop_settings (id) VALUES (1);

-- ============ TRIGGERS for updated_at ============
CREATE TRIGGER set_shop_categories_updated_at BEFORE UPDATE ON public.shop_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_shop_vendors_updated_at BEFORE UPDATE ON public.shop_vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_shop_bundles_updated_at BEFORE UPDATE ON public.shop_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_shop_orders_updated_at BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_shop_trade_in_requests_updated_at BEFORE UPDATE ON public.shop_trade_in_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENABLE RLS ============
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_digital_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_trade_in_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_trade_in_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Categories
CREATE POLICY "Anyone can view active categories" ON public.shop_categories FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage categories" ON public.shop_categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Custom Fields
CREATE POLICY "Anyone can view custom fields" ON public.shop_custom_fields FOR SELECT USING (true);
CREATE POLICY "Admins manage custom fields" ON public.shop_custom_fields FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vendors
CREATE POLICY "Admins manage vendors" ON public.shop_vendors FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Anyone can view active products" ON public.shop_products FOR SELECT USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.shop_products FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Product Images
CREATE POLICY "Anyone can view product images" ON public.shop_product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.shop_product_images FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bundles
CREATE POLICY "Anyone can view active bundles" ON public.shop_bundles FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage bundles" ON public.shop_bundles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view bundle items" ON public.shop_bundle_items FOR SELECT USING (true);
CREATE POLICY "Admins manage bundle items" ON public.shop_bundle_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coupons
CREATE POLICY "Anyone can view active coupons" ON public.shop_coupons FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage coupons" ON public.shop_coupons FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE POLICY "Customers view own orders" ON public.shop_orders FOR SELECT USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users create orders" ON public.shop_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);
CREATE POLICY "Admins update orders" ON public.shop_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.shop_orders FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Order Items
CREATE POLICY "View order items via order" ON public.shop_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = shop_order_items.order_id AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Insert order items via order" ON public.shop_order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = shop_order_items.order_id AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)));
CREATE POLICY "Admins manage order items" ON public.shop_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Digital Downloads
CREATE POLICY "Customers view own downloads" ON public.shop_digital_downloads FOR SELECT USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage downloads" ON public.shop_digital_downloads FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trade-in
CREATE POLICY "Anyone reads trade-in settings" ON public.shop_trade_in_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage trade-in settings" ON public.shop_trade_in_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers view own trade-in" ON public.shop_trade_in_requests FOR SELECT USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit trade-in" ON public.shop_trade_in_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins update trade-in" ON public.shop_trade_in_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete trade-in" ON public.shop_trade_in_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Q&A
CREATE POLICY "View approved questions" ON public.shop_product_questions FOR SELECT USING (is_approved = true OR auth.uid() = asker_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users ask questions" ON public.shop_product_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = asker_id);
CREATE POLICY "Admins manage questions" ON public.shop_product_questions FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete questions" ON public.shop_product_questions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Reviews
CREATE POLICY "View approved reviews" ON public.shop_product_reviews FOR SELECT USING (is_approved = true OR auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users create reviews" ON public.shop_product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewer or admin update" ON public.shop_product_reviews FOR UPDATE USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reviewer or admin delete" ON public.shop_product_reviews FOR DELETE USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));

-- Wishlists
CREATE POLICY "Users view own wishlist" ON public.shop_wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add to own wishlist" ON public.shop_wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove from own wishlist" ON public.shop_wishlists FOR DELETE USING (auth.uid() = user_id);

-- Settings
CREATE POLICY "Anyone reads shop settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Admins update shop settings" ON public.shop_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-products', 'shop-products', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-digital', 'shop-digital', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-trade-in', 'shop-trade-in', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies: shop-products (public read, admin write)
CREATE POLICY "Public read shop-products" ON storage.objects FOR SELECT USING (bucket_id = 'shop-products');
CREATE POLICY "Admins upload shop-products" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update shop-products" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete shop-products" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: shop-digital (admin only access; download via signed URLs)
CREATE POLICY "Admins read shop-digital" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-digital' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload shop-digital" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-digital' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update shop-digital" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-digital' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete shop-digital" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-digital' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: shop-trade-in (anyone can upload, admin can read/manage)
CREATE POLICY "Anyone upload trade-in images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-trade-in');
CREATE POLICY "Admins read trade-in images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-trade-in' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete trade-in images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-trade-in' AND public.has_role(auth.uid(), 'admin'));
