
-- Organ UI themes — per keyboard model visual customization
CREATE TABLE public.organ_ui_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL UNIQUE REFERENCES public.keyboard_models(id) ON DELETE CASCADE,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organ_ui_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organ themes"
  ON public.organ_ui_themes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert organ themes"
  ON public.organ_ui_themes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update organ themes"
  ON public.organ_ui_themes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organ themes"
  ON public.organ_ui_themes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_organ_ui_themes_updated_at
  BEFORE UPDATE ON public.organ_ui_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
