
-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands are viewable by everyone" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Keyboard Models
CREATE TABLE public.keyboard_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  ui_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_keyboard_models_brand ON public.keyboard_models(brand_id);
ALTER TABLE public.keyboard_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Keyboard models are viewable by everyone" ON public.keyboard_models FOR SELECT USING (true);
CREATE POLICY "Admins manage keyboard models" ON public.keyboard_models FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Rhythm Sets
CREATE TABLE public.rhythm_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  creator_name TEXT NOT NULL,
  set_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  requires_info_file BOOLEAN NOT NULL DEFAULT false,
  info_file_extension TEXT,
  is_automated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rhythm_sets_brand ON public.rhythm_sets(brand_id);
ALTER TABLE public.rhythm_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rhythm sets are viewable by everyone" ON public.rhythm_sets FOR SELECT USING (true);
CREATE POLICY "Admins manage rhythm sets" ON public.rhythm_sets FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Set Audio Samples
CREATE TABLE public.set_audio_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES public.rhythm_sets(id) ON DELETE CASCADE,
  button_type TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_set_audio_samples_set ON public.set_audio_samples(set_id);
ALTER TABLE public.set_audio_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Set audio samples are viewable by everyone" ON public.set_audio_samples FOR SELECT USING (true);
CREATE POLICY "Admins manage set audio samples" ON public.set_audio_samples FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
