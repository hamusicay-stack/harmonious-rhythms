
-- Marketplace listings
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  item_condition TEXT NOT NULL DEFAULT 'used_good',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  region TEXT,
  phone TEXT,
  whatsapp TEXT,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Everyone can see approved listings
CREATE POLICY "Anyone can view approved listings"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'approved' OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Authenticated users can create listings (pending)
CREATE POLICY "Users can create listings"
  ON public.marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND status = 'pending');

-- Users can update their own listings
CREATE POLICY "Users can update own listings"
  ON public.marketplace_listings FOR UPDATE
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

-- Users can delete their own listings, admins can delete any
CREATE POLICY "Users can delete own listings"
  ON public.marketplace_listings FOR DELETE
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seller reviews
CREATE TABLE public.marketplace_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, listing_id)
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.marketplace_reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.marketplace_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id != seller_id);

CREATE POLICY "Users can update own reviews"
  ON public.marketplace_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews or admin"
  ON public.marketplace_reviews FOR DELETE
  USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));

-- Trusted sellers badge
CREATE TABLE public.marketplace_trusted_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  granted_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_trusted_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see trusted sellers"
  ON public.marketplace_trusted_sellers FOR SELECT USING (true);

CREATE POLICY "Admins manage trusted sellers"
  ON public.marketplace_trusted_sellers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace', 'marketplace', true);

CREATE POLICY "Anyone can view marketplace files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace');

CREATE POLICY "Authenticated users can upload marketplace files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own marketplace files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own marketplace files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_listings_category ON public.marketplace_listings(category);
CREATE INDEX idx_listings_brand ON public.marketplace_listings(brand);
CREATE INDEX idx_listings_seller ON public.marketplace_listings(seller_id);
CREATE INDEX idx_listings_condition ON public.marketplace_listings(item_condition);
CREATE INDEX idx_reviews_seller ON public.marketplace_reviews(seller_id);
