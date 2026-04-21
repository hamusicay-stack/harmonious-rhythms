
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  image_url text,
  subcategories text[] NOT NULL DEFAULT '{}',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON public.marketplace_categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert categories"
  ON public.marketplace_categories FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
  ON public.marketplace_categories FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
  ON public.marketplace_categories FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_marketplace_categories_updated
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for category cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-categories', 'marketplace-categories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-categories');

CREATE POLICY "Admins can upload category images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-categories' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update category images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-categories' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete category images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-categories' AND public.has_role(auth.uid(), 'admin'));

-- Seed initial categories
INSERT INTO public.marketplace_categories (slug, label, subcategories, display_order) VALUES
  ('guitars', 'גיטרות', ARRAY['גיטרה אקוסטית','גיטרה חשמלית','גיטרה קלאסית','גיטרת בס','יוקליילי','אחר'], 1),
  ('keyboards', 'קלידים', ARRAY['אורגן חשמלי','אורגנית','סינטיסייזר','מקלדת שליטה (MIDI)','פסנתר חשמלי','אקורדיון','אחר'], 2),
  ('percussion', 'כלי הקשה', ARRAY['מערכת תופים','תופים אלקטרוניים','מצילות (Cymbals)','קונגות / בונגוס','קחון','אחר'], 3),
  ('pianos', 'פסנתרים', ARRAY['פסנתר כנף','פסנתר עומד','פסנתר דיגיטלי','אחר'], 4),
  ('accessories', 'אביזרים לכלי נגינה', ARRAY['סטנדים','כיסויים ונרתיקים','מיתרים','פדלים','כבלים ומתאמים','אוזניות','אחר'], 5),
  ('amplification', 'מגברי אודיו', ARRAY['מגבר גיטרה','מגבר בס','מגבר הגברה','רמקולים פעילים','מיקסר','מיקרופון','אחר'], 6),
  ('strings', 'כלי מיתר', ARRAY['כינור','צ׳לו','ויולה','קונטרבס','מנדולינה','אחר'], 7),
  ('wind', 'כלי נשיפה', ARRAY['סקסופון','חצוצרה','קלרינט','חליל','טרומבון','אחר'], 8),
  ('studio', 'אולפן ביתי', ARRAY['כרטיס קול','אזניות אולפן','מוניטורים','פרוססורים','מיקרופון אולפן','אחר'], 9),
  ('other', 'אחר', ARRAY['אחר'], 10);
