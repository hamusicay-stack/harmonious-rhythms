
-- ============= music_pros =============
CREATE TABLE public.music_pros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  profile_image TEXT,
  cover_image TEXT,
  brand_color TEXT DEFAULT '#D4A24E',
  hourly_price_min NUMERIC,
  region TEXT,
  cities TEXT[] NOT NULL DEFAULT '{}',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  genres TEXT[] NOT NULL DEFAULT '{}',
  gear_list TEXT[] NOT NULL DEFAULT '{}',
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  youtube TEXT,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  views_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_pros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved pros" ON public.music_pros
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own pro profile" ON public.music_pros
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Owners and admins can update" ON public.music_pros
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete" ON public.music_pros
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Protect admin-only fields from owner edits
CREATE OR REPLACE FUNCTION public.protect_music_pro_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.is_featured := OLD.is_featured;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.status := OLD.status;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_music_pros_admin_fields
  BEFORE UPDATE ON public.music_pros
  FOR EACH ROW EXECUTE FUNCTION public.protect_music_pro_admin_fields();

CREATE TRIGGER update_music_pros_updated_at
  BEFORE UPDATE ON public.music_pros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= music_pro_media =============
CREATE TABLE public.music_pro_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('audio', 'video')),
  url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_pro_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view media of approved pros" ON public.music_pro_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.status = 'approved' OR p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Owners can manage own media" ON public.music_pro_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- ============= music_pro_packages =============
CREATE TABLE public.music_pro_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'event' CHECK (unit IN ('event', 'hour', 'song', 'package')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_pro_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view packages of approved pros" ON public.music_pro_packages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.status = 'approved' OR p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Owners can manage own packages" ON public.music_pro_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- ============= music_pro_inquiries =============
CREATE TABLE public.music_pro_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  event_type TEXT NOT NULL,
  event_date DATE,
  location TEXT,
  budget NUMERIC,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_pro_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro owner sender and admin can view inquiries" ON public.music_pro_inquiries
  FOR SELECT USING (
    auth.uid() = sender_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can submit inquiries" ON public.music_pro_inquiries
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND p.status = 'approved')
  );

CREATE POLICY "Pro owner and admin can update inquiries" ON public.music_pro_inquiries
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.music_pros p WHERE p.id = pro_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER update_music_pro_inquiries_updated_at
  BEFORE UPDATE ON public.music_pro_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= music_pro_reviews =============
CREATE TABLE public.music_pro_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id UUID NOT NULL REFERENCES public.music_pros(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  inquiry_id UUID REFERENCES public.music_pro_inquiries(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_pro_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.music_pro_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.music_pro_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewer or admin can delete" ON public.music_pro_reviews
  FOR DELETE USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update reviews" ON public.music_pro_reviews
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Auto-verify reviews if reviewer has a completed inquiry with the pro
CREATE OR REPLACE FUNCTION public.verify_music_pro_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.music_pro_inquiries
    WHERE pro_id = NEW.pro_id AND sender_id = NEW.reviewer_id AND status = 'completed'
  ) THEN
    NEW.is_verified := true;
  ELSE
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_verify_music_pro_review
  BEFORE INSERT ON public.music_pro_reviews
  FOR EACH ROW EXECUTE FUNCTION public.verify_music_pro_review();

-- ============= Storage bucket =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('music-pros', 'music-pros', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Music pros assets are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'music-pros');

CREATE POLICY "Authenticated users can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music-pros' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'music-pros' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'music-pros' AND auth.uid()::text = (storage.foldername(name))[1]);
